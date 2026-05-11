import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── User Performance Metrics ────────────────────────────────────────────────
// Returns detailed performance data for a specific user or all users.
// Metrics: working hours, work orders processed, invoices, payments, earnings.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");
  const period = searchParams.get("period") || "30";
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const periodDays = parseInt(period);
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Admin can view anyone; others can only view themselves
  const effectiveUserId =
    role === "ADMIN" && targetUserId ? targetUserId : userId;

  // Gather user data
  const user = await prisma.user.findUnique({
    where: { id: effectiveUserId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      company: true,
      image: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userRole = user.role;

  // ─── Work Orders ─────────────────────────────────────────────────────────

  const workOrderWhere: any = {};

  if (userRole === "CONTRACTOR") {
    workOrderWhere.contractorId = effectiveUserId;
  } else if (userRole === "COORDINATOR") {
    workOrderWhere.coordinatorId = effectiveUserId;
  } else if (userRole === "PROCESSOR") {
    workOrderWhere.processorId = effectiveUserId;
  }
  // Admin sees all

  const [allWorkOrders, periodWorkOrders] = await Promise.all([
    prisma.workOrder.findMany({
      where: workOrderWhere,
      select: {
        id: true,
        title: true,
        status: true,
        serviceType: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
        invoices: { select: { total: true, status: true } },
      },
    }),
    prisma.workOrder.findMany({
      where: {
        ...workOrderWhere,
        createdAt: { gte: periodStart },
      },
      select: {
        id: true,
        status: true,
        completedAt: true,
        createdAt: true,
        dueDate: true,
        invoices: { select: { total: true, status: true } },
      },
    }),
  ]);

  // ─── Calculations ─────────────────────────────────────────────────────────

  // All time
  const totalWorkOrders = allWorkOrders.length;
  const completedWorkOrders = allWorkOrders.filter(
    (wo) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
  );
  const activeWorkOrders = allWorkOrders.filter(
    (wo) => !["CLOSED", "CANCELLED"].includes(wo.status)
  );
  const overdueWorkOrders = allWorkOrders.filter(
    (wo) =>
      wo.dueDate &&
      new Date(wo.dueDate) < now &&
      !["CLOSED", "CANCELLED"].includes(wo.status)
  );

  // Period
  const periodCompleted = periodWorkOrders.filter(
    (wo) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
  );
  const periodOverdue = periodWorkOrders.filter(
    (wo) =>
      wo.dueDate &&
      new Date(wo.dueDate) < now &&
      !["CLOSED", "CANCELLED"].includes(wo.status)
  );

  // Completion rate
  const completionRate =
    totalWorkOrders > 0
      ? ((completedWorkOrders.length / totalWorkOrders) * 100).toFixed(1)
      : "0";

  // On-time rate
  const onTimeCompleted = completedWorkOrders.filter(
    (wo) => !wo.dueDate || (wo.completedAt && new Date(wo.completedAt) <= new Date(wo.dueDate))
  );
  const onTimeRate =
    completedWorkOrders.length > 0
      ? ((onTimeCompleted.length / completedWorkOrders.length) * 100).toFixed(1)
      : "0";

  // Average completion time (days)
  const completionTimes = completedWorkOrders
    .filter((wo) => wo.completedAt)
    .map(
      (wo) =>
        new Date(wo.completedAt!).getTime() - new Date(wo.createdAt).getTime()
    );
  const avgCompletionDays =
    completionTimes.length > 0
      ? (
          completionTimes.reduce((a, b) => a + b, 0) /
          completionTimes.length /
          (1000 * 60 * 60 * 24)
        ).toFixed(1)
      : "N/A";

  // Working hours estimate (based on completion times, 8hr/day baseline)
  const totalWorkingHours =
    completionTimes.length > 0
      ? Math.round(
          completionTimes.reduce((a, b) => a + b, 0) /
            (1000 * 60 * 60) // Convert ms to hours
        )
      : 0;
  const periodWorkingHours = periodCompleted
    .filter((wo) => wo.completedAt)
    .reduce((sum, wo) => {
      const hours =
        (new Date(wo.completedAt!).getTime() -
          new Date(wo.createdAt).getTime()) /
        (1000 * 60 * 60);
      return sum + hours;
    }, 0);

  // ─── Financial ────────────────────────────────────────────────────────────

  const invoiceWhere: any = {};
  if (userRole === "CLIENT") {
    invoiceWhere.clientId = effectiveUserId;
  }

  const [allInvoices, periodInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      select: {
        id: true,
        total: true,
        subtotal: true,
        status: true,
        createdAt: true,
        paidAt: true,
        clientId: true,
        workOrder: { select: { contractorId: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { ...invoiceWhere, createdAt: { gte: periodStart } },
      select: {
        id: true,
        total: true,
        subtotal: true,
        status: true,
        createdAt: true,
        paidAt: true,
      },
    }),
  ]);

  const totalRevenue = allInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidRevenue = allInvoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.total, 0);
  const overdueRevenue = allInvoices
    .filter((inv) => inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.total, 0);

  const periodRevenue = periodInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const periodPaidRevenue = periodInvoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.total, 0);

  // Contractor-specific: earnings from work orders
  const contractorEarnings =
    userRole === "CONTRACTOR"
      ? allInvoices
          .filter((inv) => inv.workOrder?.contractorId === effectiveUserId)
          .reduce((sum, inv) => sum + inv.subtotal, 0)
      : 0;

  const periodContractorEarnings =
    userRole === "CONTRACTOR"
      ? periodInvoices.reduce((sum, inv) => sum + inv.subtotal, 0)
      : 0;

  // Payment count
  const paymentCount = allInvoices.filter(
    (inv) => inv.status === "PAID"
  ).length;

  // ─── Service Type Breakdown ───────────────────────────────────────────────

  const serviceBreakdown = allWorkOrders.reduce(
    (acc: Record<string, number>, wo) => {
      acc[wo.serviceType] = (acc[wo.serviceType] || 0) + 1;
      return acc;
    },
    {}
  );

  // ─── Weekly Trend ─────────────────────────────────────────────────────────

  const weeklyTrend: {
    week: string;
    orders: number;
    completed: number;
    revenue: number;
  }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(
      now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000
    );
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekOrders = allWorkOrders.filter(
      (wo) =>
        new Date(wo.createdAt) >= weekStart && new Date(wo.createdAt) < weekEnd
    );
    const weekCompleted = weekOrders.filter(
      (wo) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
    );
    const weekRevenue = allInvoices
      .filter(
        (inv) =>
          new Date(inv.createdAt) >= weekStart &&
          new Date(inv.createdAt) < weekEnd
      )
      .reduce((sum, inv) => sum + inv.total, 0);

    weeklyTrend.push({
      week: `Week ${4 - i}`,
      orders: weekOrders.length,
      completed: weekCompleted.length,
      revenue: weekRevenue,
    });
  }

  // ─── Performance Score ────────────────────────────────────────────────────

  const scores = {
    completion: Math.min(100, parseFloat(completionRate as string)),
    onTime: Math.min(100, parseFloat(onTimeRate as string)),
    overdue: Math.max(0, 100 - overdueWorkOrders.length * 10),
    efficiency:
      completionTimes.length > 0
        ? Math.min(
            100,
            Math.max(
              0,
              100 -
                (parseFloat(avgCompletionDays as string) - 3) * 10
            )
          )
        : 50,
  };
  const overallScore = Math.round(
    (scores.completion * 0.3 +
      scores.onTime * 0.3 +
      scores.overdue * 0.2 +
      scores.efficiency * 0.2)
  );

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      image: user.image,
      memberSince: user.createdAt,
    },
    period: `${periodDays} days`,
    overallScore,
    scores,
    workOrders: {
      total: totalWorkOrders,
      completed: completedWorkOrders.length,
      active: activeWorkOrders.length,
      overdue: overdueWorkOrders.length,
      completionRate,
      onTimeRate,
      avgCompletionDays,
      periodTotal: periodWorkOrders.length,
      periodCompleted: periodCompleted.length,
      periodOverdue: periodOverdue.length,
    },
    hours: {
      total: totalWorkingHours,
      period: Math.round(periodWorkingHours),
      avgPerOrder:
        completionTimes.length > 0
          ? (totalWorkingHours / completionTimes.length).toFixed(1)
          : "N/A",
    },
    financial: {
      totalRevenue,
      paidRevenue,
      overdueRevenue,
      periodRevenue,
      periodPaidRevenue,
      invoiceCount: allInvoices.length,
      paymentCount,
      contractorEarnings,
      periodContractorEarnings,
    },
    serviceBreakdown,
    weeklyTrend,
  });
}
