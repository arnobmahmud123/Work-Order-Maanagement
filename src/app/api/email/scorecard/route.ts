import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── AI Email Scorecard ──────────────────────────────────────────────────────
// Analyzes email activity and generates a business performance scorecard
// based on response times, volume, topics, and trends.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "30"; // days

  const periodDays = parseInt(period);
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Gather work order data for the scorecard
  const where: any = {};
  if (role === "CONTRACTOR") where.contractorId = userId;
  if (role === "CLIENT") where.createdById = userId;

  const [workOrders, invoices, messages, tickets] = await Promise.all([
    prisma.workOrder.findMany({
      where: {
        ...where,
        createdAt: { gte: periodStart },
      },
      select: {
        id: true,
        title: true,
        status: true,
        serviceType: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        ...(role === "ADMIN" ? {} : { clientId: userId }),
        createdAt: { gte: periodStart },
      },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        paidAt: true,
      },
    }),
    prisma.message.count({
      where: {
        createdAt: { gte: periodStart },
        ...(role !== "ADMIN"
          ? { thread: { participants: { some: { userId } } } }
          : {}),
      },
    }),
    prisma.supportTicket.findMany({
      where: {
        createdAt: { gte: periodStart },
        ...(role !== "ADMIN" ? { creatorId: userId } : {}),
      },
      select: {
        id: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    }),
  ]);

  // Calculate metrics
  const totalWorkOrders = workOrders.length;
  const completedWorkOrders = workOrders.filter(
    (wo) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
  );
  const overdueWorkOrders = workOrders.filter(
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

  // Revenue metrics
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidInvoices = invoices.filter((inv) => inv.status === "PAID");
  const paidRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE");
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Service type breakdown
  const serviceBreakdown = workOrders.reduce(
    (acc: Record<string, number>, wo) => {
      acc[wo.serviceType] = (acc[wo.serviceType] || 0) + 1;
      return acc;
    },
    {}
  );

  // Status breakdown
  const statusBreakdown = workOrders.reduce(
    (acc: Record<string, number>, wo) => {
      acc[wo.status] = (acc[wo.status] || 0) + 1;
      return acc;
    },
    {}
  );

  // Weekly trend (last 4 weeks)
  const weeklyTrend: { week: string; orders: number; revenue: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekOrders = workOrders.filter(
      (wo) =>
        new Date(wo.createdAt) >= weekStart && new Date(wo.createdAt) < weekEnd
    );
    const weekRevenue = invoices
      .filter(
        (inv) =>
          new Date(inv.createdAt) >= weekStart && new Date(inv.createdAt) < weekEnd
      )
      .reduce((sum, inv) => sum + inv.total, 0);

    weeklyTrend.push({
      week: `Week ${4 - i}`,
      orders: weekOrders.length,
      revenue: weekRevenue,
    });
  }

  // Performance score (0-100)
  const scores = {
    completion: Math.min(100, parseFloat(completionRate as string)),
    onTime: Math.min(100, parseFloat(onTimeRate as string)),
    overdue: Math.max(0, 100 - overdueWorkOrders.length * 10),
    revenue: totalRevenue > 0 ? Math.min(100, (paidRevenue / totalRevenue) * 100) : 50,
  };
  const overallScore = Math.round(
    (scores.completion * 0.3 +
      scores.onTime * 0.3 +
      scores.overdue * 0.2 +
      scores.revenue * 0.2)
  );

  // AI insights
  const insights: string[] = [];
  if (overdueWorkOrders.length > 0) {
    insights.push(
      `⚠️ ${overdueWorkOrders.length} work order(s) are overdue — prioritize these to improve on-time rate.`
    );
  }
  if (parseFloat(onTimeRate as string) < 80) {
    insights.push(
      `📈 On-time completion rate is ${onTimeRate}% — aim for 90%+ to improve client satisfaction.`
    );
  }
  if (overdueAmount > 0) {
    insights.push(
      `💰 $${overdueAmount.toFixed(2)} in overdue invoices — follow up on payment collection.`
    );
  }
  if (totalWorkOrders > 0 && completedWorkOrders.length === 0) {
    insights.push(
      `🔄 ${totalWorkOrders} work orders created but none completed yet — check pipeline status.`
    );
  }
  if (insights.length === 0) {
    insights.push(
      `✅ Great performance! All metrics are within healthy ranges. Keep it up!`
    );
  }

  return NextResponse.json({
    period: `${periodDays} days`,
    overallScore,
    scores,
    metrics: {
      totalWorkOrders,
      completedWorkOrders: completedWorkOrders.length,
      overdueWorkOrders: overdueWorkOrders.length,
      completionRate,
      onTimeRate,
      avgCompletionDays,
      totalMessages: messages,
      totalTickets: tickets.length,
    },
    revenue: {
      total: totalRevenue,
      paid: paidRevenue,
      overdue: overdueAmount,
      invoiceCount: invoices.length,
      paidCount: paidInvoices.length,
      overdueCount: overdueInvoices.length,
    },
    serviceBreakdown,
    statusBreakdown,
    weeklyTrend,
    insights,
  });
}
