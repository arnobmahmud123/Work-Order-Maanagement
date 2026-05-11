import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};

  if (role !== "ADMIN") {
    where.OR = [{ raisedById: userId }, { assignedToId: userId }];
  }

  if (status) where.status = status;

  const disputes = await prisma.dispute.findMany({
    where,
    include: {
      raisedBy: { select: { id: true, name: true, email: true, image: true } },
      assignedTo: { select: { id: true, name: true, email: true, image: true } },
      workOrder: { select: { id: true, title: true, address: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ disputes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { workOrderId, title, description, priority, assignedToId } = body;

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description are required" },
      { status: 400 }
    );
  }

  const dispute = await prisma.dispute.create({
    data: {
      workOrderId,
      raisedById: (session.user as any).id,
      assignedToId,
      title,
      description,
      priority: priority || "MEDIUM",
    },
    include: {
      raisedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      workOrder: { select: { id: true, title: true } },
    },
  });

  // Notify assigned admin
  if (assignedToId) {
    try {
      await prisma.notification.create({
        data: {
          type: "DISPUTE",
          title: "New Dispute Filed",
          message: `A new dispute has been filed: "${title}"`,
          userId: assignedToId,
        },
      });
    } catch {}
  }

  return NextResponse.json(dispute, { status: 201 });
}
