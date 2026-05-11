import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can bulk delete" }, { status: 403 });
  }

  const body = await req.json();
  const { workOrderIds } = body;

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
    return NextResponse.json({ error: "workOrderIds are required" }, { status: 400 });
  }

  // Delete related records first
  await prisma.activityLog.deleteMany({ where: { workOrderId: { in: workOrderIds } } });
  await prisma.notification.deleteMany({ where: { workOrderId: { in: workOrderIds } } });

  const result = await prisma.workOrder.deleteMany({
    where: { id: { in: workOrderIds } },
  });

  return NextResponse.json({ deleted: result.count });
}
