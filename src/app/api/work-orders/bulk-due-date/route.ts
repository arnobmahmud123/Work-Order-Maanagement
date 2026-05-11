import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR", "PROCESSOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { workOrderIds, dueDate } = body;

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0 || !dueDate) {
    return NextResponse.json({ error: "workOrderIds and dueDate are required" }, { status: 400 });
  }

  const result = await prisma.workOrder.updateMany({
    where: { id: { in: workOrderIds } },
    data: { dueDate: new Date(dueDate) },
  });

  await prisma.activityLog.createMany({
    data: workOrderIds.map((id: string) => ({
      action: "BULK_DUE_DATE",
      details: `Due date changed to ${dueDate}`,
      userId: (session.user as any).id,
      workOrderId: id,
    })),
  });

  return NextResponse.json({ updated: result.count });
}
