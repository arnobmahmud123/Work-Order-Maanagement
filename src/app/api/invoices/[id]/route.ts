import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, email: true, company: true, phone: true } },
      workOrder: { select: { id: true, title: true, address: true } },
      items: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: body.status,
      notes: body.notes,
      paidAt: body.status === "PAID" ? new Date() : undefined,
    },
    include: { items: true, workOrder: { select: { contractorId: true } } },
  });

  // Auto-credit contractor balance when invoice is paid
  if (body.status === "PAID" && invoice.workOrder?.contractorId && invoice.total > 0) {
    try {
      const contractorId = invoice.workOrder.contractorId;
      // Upsert contractor balance
      const balance = await prisma.contractorBalance.upsert({
        where: { contractorId },
        update: {
          totalEarned: { increment: invoice.total },
          availableBalance: { increment: invoice.total },
        },
        create: {
          contractorId,
          totalEarned: invoice.total,
          availableBalance: invoice.total,
        },
      });

      // Create balance transaction
      await prisma.balanceTransaction.create({
        data: {
          contractorId,
          type: "CREDIT",
          amount: invoice.total,
          description: `Payment received for invoice ${invoice.invoiceNumber}`,
          referenceId: invoice.id,
          balanceAfter: balance.availableBalance + invoice.total,
        },
      });
    } catch (err) {
      console.error("Failed to credit contractor balance:", err);
    }
  }

  return NextResponse.json(invoice);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { items, notes, dueDate, noCharge, tax } = body;

  if (!items?.length) {
    return NextResponse.json(
      { error: "Items are required" },
      { status: 400 }
    );
  }

  const subtotal = items.reduce(
    (sum: number, item: any) => sum + (item.quantity * item.unitPrice),
    0
  );
  const totalDiscount = items.reduce(
    (sum: number, item: any) => sum + (item.quantity * item.unitPrice * (item.discountPercent || 0)) / 100,
    0
  );
  const total = subtotal - totalDiscount + (tax || 0);

  // Use a transaction to delete old items and create new ones
  const invoice = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    return tx.invoice.update({
      where: { id },
      data: {
        subtotal,
        tax: tax || 0,
        total: noCharge ? 0 : total,
        noCharge: noCharge || false,
        notes,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: {
          create: items.map((item: any) => ({
            taskName: item.taskName,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            amount: (item.quantity * item.unitPrice) * (1 - (item.discountPercent || 0) / 100),
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        items: true,
      },
    });
  });

  return NextResponse.json(invoice);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.invoice.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
