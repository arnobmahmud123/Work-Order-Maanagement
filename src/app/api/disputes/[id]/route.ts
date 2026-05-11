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

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      raisedBy: { select: { id: true, name: true, email: true, image: true } },
      assignedTo: { select: { id: true, name: true, email: true, image: true } },
      workOrder: { select: { id: true, title: true, address: true, status: true } },
    },
  });

  if (!dispute) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(dispute);
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
  const { status, assignedToId, resolution, adjustmentAmount, adjustmentType } = body;

  const dispute = await prisma.dispute.findUnique({ where: { id } });
  if (!dispute) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: any = {};
  if (status) updateData.status = status;
  if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
  if (resolution) updateData.resolution = resolution;
  if (adjustmentAmount !== undefined) updateData.adjustmentAmount = adjustmentAmount;
  if (adjustmentType) updateData.adjustmentType = adjustmentType;

  const updated = await prisma.dispute.update({
    where: { id },
    data: updateData,
    include: {
      raisedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      workOrder: { select: { id: true, title: true, contractorId: true } },
    },
  });

  // When dispute is resolved with adjustment, update contractor balance
  if (
    status === "RESOLVED" &&
    adjustmentAmount &&
    adjustmentType &&
    updated.workOrder?.contractorId
  ) {
    try {
      const contractorId = updated.workOrder.contractorId;
      const isCredit = adjustmentType === "CREDIT";
      const amount = Math.abs(adjustmentAmount);

      const balance = await prisma.contractorBalance.upsert({
        where: { contractorId },
        update: {
          totalEarned: isCredit ? { increment: amount } : undefined,
          availableBalance: isCredit ? { increment: amount } : { decrement: amount },
        },
        create: {
          contractorId,
          totalEarned: isCredit ? amount : 0,
          availableBalance: isCredit ? amount : 0,
        },
      });

      await prisma.balanceTransaction.create({
        data: {
          contractorId,
          type: "ADJUSTMENT",
          amount: isCredit ? amount : -amount,
          description: `Dispute resolution: ${updated.title} - ${resolution || "No details"}`,
          referenceId: id,
          balanceAfter: balance.availableBalance + (isCredit ? amount : -amount),
        },
      });

      // Notify contractor
      await prisma.notification.create({
        data: {
          type: "DISPUTE",
          title: "Dispute Resolved",
          message: `Your dispute "${updated.title}" has been resolved. Adjustment: ${isCredit ? "+" : "-"}$${amount.toFixed(2)}`,
          userId: contractorId,
        },
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to process dispute adjustment:", err);
    }
  } else if (status && status !== dispute.status) {
    // Notify dispute creator about status changes
    try {
      await prisma.notification.create({
        data: {
          type: "DISPUTE",
          title: "Dispute Updated",
          message: `Your dispute "${updated.title}" status changed to ${status}`,
          userId: updated.raisedById,
        },
      });
    } catch {}
  }

  return NextResponse.json(updated);
}
