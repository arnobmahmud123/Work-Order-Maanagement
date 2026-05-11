import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Team Performance Overview ───────────────────────────────────────────────
// Admin-only: returns performance metrics for all users.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filterRole = searchParams.get("role") || "";

  const where: any = { isActive: true };
  if (filterRole) where.role = filterRole;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      company: true,
      image: true,
      createdAt: true,
      assignedWorkOrders: {
        select: {
          id: true,
          status: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          invoices: { select: { total: true, status: true } },
        },
      },
      coordinatedWorkOrders: {
        select: {
          id: true,
          status: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          invoices: { select: { total: true, status: true } },
        },
      },
      processedWorkOrders: {
        select: {
          id: true,
          status: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          invoices: { select: { total: true, status: true } },
        },
      },
      invoices: {
        select: { id: true, total: true, status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();

  const userMetrics = users.map((u) => {
    // Get relevant work orders based on role
    let workOrders: any[];
    if (u.role === "CONTRACTOR") {
      workOrders = u.assignedWorkOrders;
    } else if (u.role === "COORDINATOR") {
      workOrders = u.coordinatedWorkOrders;
    } else if (u.role === "PROCESSOR") {
      workOrders = u.processedWorkOrders;
    } else {
      workOrders = [
        ...u.assignedWorkOrders,
        ...u.coordinatedWorkOrders,
        ...u.processedWorkOrders,
      ];
    }

    const completed = workOrders.filter(
      (wo) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
    );
    const active = workOrders.filter(
      (wo) => !["CLOSED", "CANCELLED"].includes(wo.status)
    );
    const overdue = workOrders.filter(
      (wo) =>
        wo.dueDate &&
        new Date(wo.dueDate) < now &&
        !["CLOSED", "CANCELLED"].includes(wo.status)
    );

    // Completion times
    const completionTimes = completed
      .filter((wo) => wo.completedAt)
      .map(
        (wo) =>
          new Date(wo.completedAt!).getTime() -
          new Date(wo.createdAt).getTime()
      );

    const avgDays =
      completionTimes.length > 0
        ? (
            completionTimes.reduce((a, b) => a + b, 0) /
            completionTimes.length /
            (1000 * 60 * 60 * 24)
          ).toFixed(1)
        : "N/A";

    const totalHours =
      completionTimes.length > 0
        ? Math.round(
            completionTimes.reduce((a, b) => a + b, 0) / (1000 * 60 * 60)
          )
        : 0;

    // On-time
    const onTime = completed.filter(
      (wo) =>
        !wo.dueDate ||
        (wo.completedAt && new Date(wo.completedAt) <= new Date(wo.dueDate))
    );
    const onTimeRate =
      completed.length > 0
        ? ((onTime.length / completed.length) * 100).toFixed(1)
        : "N/A";

    // Financial
    const totalRevenue = u.invoices.reduce((sum, inv) => sum + inv.total, 0);
    const paidRevenue = u.invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.total, 0);
    const paymentCount = u.invoices.filter(
      (inv) => inv.status === "PAID"
    ).length;

    // Performance score
    const completionRate =
      workOrders.length > 0
        ? (completed.length / workOrders.length) * 100
        : 0;
    const onTimeScore = onTimeRate !== "N/A" ? parseFloat(onTimeRate) : 50;
    const overdueScore = Math.max(0, 100 - overdue.length * 10);
    const score = Math.round(
      completionRate * 0.3 +
        onTimeScore * 0.3 +
        overdueScore * 0.2 +
        50 * 0.2
    );

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      company: u.company,
      image: u.image,
      memberSince: u.createdAt,
      metrics: {
        totalJobs: workOrders.length,
        completedJobs: completed.length,
        activeJobs: active.length,
        overdueJobs: overdue.length,
        completionRate:
          workOrders.length > 0
            ? ((completed.length / workOrders.length) * 100).toFixed(1)
            : "N/A",
        onTimeRate,
        avgCompletionDays: avgDays,
        totalHours,
        totalRevenue,
        paidRevenue,
        paymentCount,
      },
      score,
    };
  });

  // Sort by score descending
  userMetrics.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    users: userMetrics,
    total: userMetrics.length,
  });
}
