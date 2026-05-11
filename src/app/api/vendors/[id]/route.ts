import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Vendor Detail ───────────────────────────────────────────────────────────
// Returns full contractor profile with work order history and financial data.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contractor = await prisma.user.findUnique({
    where: { id, role: "CONTRACTOR" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      company: true,
      createdAt: true,
      contractorProfile: {
        select: {
          address: true,
          city: true,
          state: true,
          zipCode: true,
          bio: true,
          skills: true,
          specialties: true,
          serviceRadius: true,
          hourlyRate: true,
          isAvailable: true,
          avgRating: true,
          totalRatings: true,
          reliabilityScore: true,
        },
      },
      assignedWorkOrders: {
        select: {
          id: true,
          title: true,
          status: true,
          serviceType: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          specialInstructions: true,
          files: { select: { id: true, category: true, originalName: true } },
          invoices: { select: { id: true, total: true, status: true, invoiceNumber: true, createdAt: true } },
          coordinator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const orders = contractor.assignedWorkOrders;
  const now = new Date();

  const completed = orders.filter(
    (wo) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
  );
  const active = orders.filter(
    (wo) => !["CLOSED", "CANCELLED"].includes(wo.status)
  );
  const overdue = orders.filter(
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
      ? parseFloat(
          (
            completionTimes.reduce((a, b) => a + b, 0) /
            completionTimes.length /
            (1000 * 60 * 60 * 24)
          ).toFixed(1)
        )
      : null;

  // On-time
  const onTime = completed.filter(
    (wo) =>
      !wo.dueDate ||
      (wo.completedAt && new Date(wo.completedAt) <= new Date(wo.dueDate))
  );
  const onTimeRate =
    completed.length > 0
      ? parseFloat(((onTime.length / completed.length) * 100).toFixed(1))
      : null;

  // Revenue
  const totalRevenue = orders.reduce(
    (sum, wo) => sum + wo.invoices.reduce((s, inv) => s + inv.total, 0),
    0
  );
  const paidRevenue = orders.reduce(
    (sum, wo) =>
      sum +
      wo.invoices
        .filter((inv) => inv.status === "PAID")
        .reduce((s, inv) => s + inv.total, 0),
    0
  );

  // Service breakdown
  const serviceBreakdown = orders.reduce(
    (acc: Record<string, { total: number; completed: number }>, wo) => {
      if (!acc[wo.serviceType]) acc[wo.serviceType] = { total: 0, completed: 0 };
      acc[wo.serviceType].total++;
      if (wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE") {
        acc[wo.serviceType].completed++;
      }
      return acc;
    },
    {}
  );

  // Monthly trend (last 6 months)
  const monthlyTrend: { month: string; orders: number; completed: number; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthOrders = orders.filter(
      (wo) =>
        new Date(wo.createdAt) >= monthStart &&
        new Date(wo.createdAt) <= monthEnd
    );
    const monthCompleted = monthOrders.filter(
      (wo) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
    );
    const monthRevenue = orders.reduce(
      (sum, wo) =>
        sum +
        wo.invoices
          .filter(
            (inv) =>
              new Date(inv.createdAt) >= monthStart &&
              new Date(inv.createdAt) <= monthEnd
          )
          .reduce((s, inv) => s + inv.total, 0),
      0
    );

    monthlyTrend.push({
      month: monthStart.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      orders: monthOrders.length,
      completed: monthCompleted.length,
      revenue: monthRevenue,
    });
  }

  return NextResponse.json({
    contractor: {
      id: contractor.id,
      name: contractor.name,
      email: contractor.email,
      phone: contractor.phone,
      image: contractor.image,
      company: contractor.company,
      memberSince: contractor.createdAt,
      profile: contractor.contractorProfile
        ? {
            address: contractor.contractorProfile.address,
            city: contractor.contractorProfile.city,
            state: contractor.contractorProfile.state,
            zipCode: contractor.contractorProfile.zipCode,
            bio: contractor.contractorProfile.bio,
            skills: contractor.contractorProfile.skills,
            specialties: contractor.contractorProfile.specialties,
            serviceRadius: contractor.contractorProfile.serviceRadius,
            hourlyRate: contractor.contractorProfile.hourlyRate,
            isAvailable: contractor.contractorProfile.isAvailable,
            avgRating: contractor.contractorProfile.avgRating,
            totalRatings: contractor.contractorProfile.totalRatings,
            reliabilityScore: contractor.contractorProfile.reliabilityScore,
          }
        : null,
    },
    stats: {
      totalJobs: orders.length,
      completedJobs: completed.length,
      activeJobs: active.length,
      overdueJobs: overdue.length,
      completionRate:
        orders.length > 0
          ? parseFloat(
              ((completed.length / orders.length) * 100).toFixed(1)
            )
          : null,
      onTimeRate,
      avgCompletionDays: avgDays,
      totalHours:
        completionTimes.length > 0
          ? Math.round(
              completionTimes.reduce((a, b) => a + b, 0) / (1000 * 60 * 60)
            )
          : 0,
    },
    financial: {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      paidRevenue: parseFloat(paidRevenue.toFixed(2)),
      invoiceCount: orders.reduce((sum, wo) => sum + wo.invoices.length, 0),
    },
    serviceBreakdown,
    monthlyTrend,
    recentWorkOrders: orders.slice(0, 20).map((wo) => ({
      id: wo.id,
      title: wo.title,
      status: wo.status,
      serviceType: wo.serviceType,
      address: wo.address,
      city: wo.city,
      state: wo.state,
      dueDate: wo.dueDate,
      completedAt: wo.completedAt,
      createdAt: wo.createdAt,
      coordinator: wo.coordinator,
      fileCount: wo.files.length,
      invoiceTotal: wo.invoices.reduce((s, inv) => s + inv.total, 0),
    })),
  });
}
