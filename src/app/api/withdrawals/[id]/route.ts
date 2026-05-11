import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, rejectionReason } = body;

  const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
  if (!withdrawal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: any = {};
  if (status) updateData.status = status;
  if (status === "PROCESSING") updateData.processedAt = new Date();
  if (status === "COMPLETED") updateData.completedAt = new Date();
  if (status === "REJECTED") {
    updateData.rejectionReason = rejectionReason || "No reason provided";
  }

  const updated = await prisma.withdrawal.update({
    where: { id },
    data: updateData,
    include: {
      contractor: { select: { id: true, name: true, email: true } },
    },
  });

  // Handle balance updates on completion or rejection
  if (status === "COMPLETED") {
    // Move from pending to withdrawn
    await prisma.contractorBalance.update({
      where: { contractorId: withdrawal.contractorId },
      data: {
        pendingAmount: { decrement: withdrawal.amount },
        totalWithdrawn: { increment: withdrawal.amount },
      },
    }).catch(() => {});
  } else if (status === "REJECTED") {
    // Return to available balance
    await prisma.contractorBalance.update({
      where: { contractorId: withdrawal.contractorId },
      data: {
        pendingAmount: { decrement: withdrawal.amount },
        availableBalance: { increment: withdrawal.amount },
      },
    }).catch(() => {});
  }

  // Notify contractor
  if (status) {
    try {
      const statusMsg: Record<string, string> = {
        PROCESSING: "Your withdrawal is being processed",
        COMPLETED: "Your withdrawal has been completed",
        REJECTED: `Your withdrawal was rejected${rejectionReason ? `: ${rejectionReason}` : ""}`,
      };
      if (statusMsg[status]) {
        await prisma.notification.create({
          data: {
            type: "WITHDRAWAL",
            title: "Withdrawal Update",
            message: statusMsg[status],
            userId: withdrawal.contractorId,
          },
        });
      }
    } catch {}
  }

  return NextResponse.json(updated);
}
