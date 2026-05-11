import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const workOrderWhere: any = {};
  if (role === "CONTRACTOR") {
    workOrderWhere.contractorId = userId;
  }

  const [
    totalWorkOrders,
    activeWorkOrders,
    completedThisMonth,
    pendingInvoices,
    openTickets,
    allWorkOrders,
  ] = await Promise.all([
    prisma.workOrder.count({ where: workOrderWhere }),
    prisma.workOrder.count({
      where: { ...workOrderWhere, status: { notIn: ["CLOSED", "CANCELLED"] } },
    }),
    prisma.workOrder.count({
      where: {
        ...workOrderWhere,
        status: "CLOSED",
        completedAt: { gte: startOfMonth },
      },
    }),
    prisma.invoice.count({
      where: { status: { in: ["DRAFT", "SENT", "OVERDUE"] } },
    }),
    prisma.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.workOrder.findMany({
      where: workOrderWhere,
      select: { status: true, dueDate: true, serviceType: true },
    }),
  ]);

  // Status breakdown
  const statusBreakdown = allWorkOrders.reduce(
    (acc: Record<string, number>, wo) => {
      acc[wo.status] = (acc[wo.status] || 0) + 1;
      return acc;
    },
    {}
  );

  // Overdue count
  const overdueCount = allWorkOrders.filter(
    (wo) =>
      wo.dueDate &&
      new Date(wo.dueDate) < now &&
      !["CLOSED", "CANCELLED"].includes(wo.status)
  ).length;

  // Service type breakdown
  const serviceBreakdown = allWorkOrders.reduce(
    (acc: Record<string, number>, wo) => {
      acc[wo.serviceType] = (acc[wo.serviceType] || 0) + 1;
      return acc;
    },
    {}
  );

  return NextResponse.json({
    totalWorkOrders,
    activeWorkOrders,
    completedThisMonth,
    pendingInvoices,
    openTickets,
    overdueCount,
    statusBreakdown,
    serviceBreakdown,
  });
}
