import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Vendor Matrix / Contractor Directory ────────────────────────────────────
// Returns contractors with full performance metrics: rating, efficiency,
// accuracy, core capacities, area coverage, active orders.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const serviceType = searchParams.get("serviceType") || "";
  const area = searchParams.get("area") || "";
  const minRating = parseFloat(searchParams.get("minRating") || "0");
  const sortBy = searchParams.get("sortBy") || "score"; // score, rating, name, active

  const where: any = {
    role: "CONTRACTOR",
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const contractors = await prisma.user.findMany({
    where,
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
          isAvailable: true,
          avgRating: true,
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
          files: { select: { id: true, category: true } },
          invoices: { select: { total: true, status: true } },
          history: {
            where: { action: "QC_PASS" },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();

  const vendorProfiles = contractors.map((c) => {
    const orders = c.assignedWorkOrders;
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
    const cancelled = orders.filter((wo) => wo.status === "CANCELLED");

    // ─── Service areas (cities/states) ───────────────────────────────────
    const profileArea = c.contractorProfile?.city
      ? [c.contractorProfile.city, c.contractorProfile.state].filter(Boolean).join(", ")
      : null;
    const woAreas = [
      ...new Set(
        orders
          .map((wo) => [wo.city, wo.state].filter(Boolean).join(", "))
          .filter(Boolean)
      ),
    ];
    const areas = [
      ...(profileArea ? [profileArea] : []),
      ...woAreas,
    ];

    // ─── Core capacities (service types handled) ────────────────────────
    const capacities: string[] = [
      ...new Set(orders.map((wo) => wo.serviceType)),
    ];

    // ─── Service type breakdown ──────────────────────────────────────────
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

    // ─── Completion times ────────────────────────────────────────────────
    const completionTimes = completed
      .filter((wo) => wo.completedAt)
      .map(
        (wo) =>
          new Date(wo.completedAt!).getTime() -
          new Date(wo.createdAt).getTime()
      );

    const avgCompletionDays =
      completionTimes.length > 0
        ? parseFloat(
            (
              completionTimes.reduce((a, b) => a + b, 0) /
              completionTimes.length /
              (1000 * 60 * 60 * 24)
            ).toFixed(1)
          )
        : null;

    // ─── On-time rate ────────────────────────────────────────────────────
    const onTimeCompleted = completed.filter(
      (wo) =>
        !wo.dueDate ||
        (wo.completedAt && new Date(wo.completedAt) <= new Date(wo.dueDate))
    );
    const onTimeRate =
      completed.length > 0
        ? parseFloat(
            ((onTimeCompleted.length / completed.length) * 100).toFixed(1)
          )
        : null;

    // ─── Photo compliance rate ───────────────────────────────────────────
    const withAfterPhotos = completed.filter((wo) =>
      wo.files?.some((f) => f.category === "AFTER")
    );
    const photoCompliance =
      completed.length > 0
        ? parseFloat(
            ((withAfterPhotos.length / completed.length) * 100).toFixed(1)
          )
        : null;

    // ─── QC pass rate ───────────────────────────────────────────────────
    const qcPassed = orders.filter(
      (wo) => wo.history && wo.history.length > 0
    ).length;
    const qcRate =
      completed.length > 0
        ? parseFloat(((qcPassed / completed.length) * 100).toFixed(1))
        : null;

    // ─── Efficiency (0-100) ──────────────────────────────────────────────
    // Based on: on-time rate, avg completion time, photo compliance
    const efficiencyScore = Math.round(
      ((onTimeRate || 50) * 0.4 +
        (avgCompletionDays
          ? Math.max(0, 100 - (avgCompletionDays - 2) * 10)
          : 50) *
          0.3 +
        (photoCompliance || 50) * 0.3)
    );

    // ─── Accuracy (0-100) ───────────────────────────────────────────────
    // Based on: QC pass rate, revision rate
    const revisionsNeeded = orders.filter(
      (wo) => wo.status === "REVISIONS_NEEDED"
    ).length;
    const revisionRate =
      orders.length > 0 ? revisionsNeeded / orders.length : 0;
    const accuracyScore = Math.round(
      (qcRate || 50) * 0.6 + (1 - revisionRate) * 100 * 0.4
    );

    // ─── Overall rating (1-5 stars) ─────────────────────────────────────
    // Derived from efficiency + accuracy
    const rating = parseFloat(
      Math.min(
        5,
        Math.max(1, (efficiencyScore * 0.5 + accuracyScore * 0.5) / 20)
      ).toFixed(1)
    );

    // ─── Total revenue ──────────────────────────────────────────────────
    const totalRevenue = orders.reduce(
      (sum, wo) =>
        sum + wo.invoices.reduce((s, inv) => s + inv.total, 0),
      0
    );

    // ─── Overall score (0-100) ──────────────────────────────────────────
    const completionRate =
      orders.length > 0 ? (completed.length / orders.length) * 100 : 0;
    const overallScore = Math.round(
      completionRate * 0.25 +
        efficiencyScore * 0.25 +
        accuracyScore * 0.25 +
        (onTimeRate || 50) * 0.25
    );

    // ─── Filter matching ────────────────────────────────────────────────
    const matchesService =
      !serviceType || capacities.includes(serviceType);
    const matchesArea =
      !area ||
      areas.some((a) => a.toLowerCase().includes(area.toLowerCase()));
    const matchesRating = rating >= minRating;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      image: c.image,
      company: c.company,
      memberSince: c.createdAt,
      profile: c.contractorProfile
        ? {
            address: c.contractorProfile.address,
            city: c.contractorProfile.city,
            state: c.contractorProfile.state,
            zipCode: c.contractorProfile.zipCode,
            isAvailable: c.contractorProfile.isAvailable,
            avgRating: c.contractorProfile.avgRating,
          }
        : null,
      areas,
      capacities,
      serviceBreakdown,
      stats: {
        totalJobs: orders.length,
        completedJobs: completed.length,
        activeJobs: active.length,
        overdueJobs: overdue.length,
        cancelledJobs: cancelled.length,
        completionRate:
          orders.length > 0
            ? parseFloat(
                ((completed.length / orders.length) * 100).toFixed(1)
              )
            : null,
        onTimeRate,
        avgCompletionDays,
        photoCompliance,
        qcRate,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalHours:
          completionTimes.length > 0
            ? Math.round(
                completionTimes.reduce((a, b) => a + b, 0) / (1000 * 60 * 60)
              )
            : 0,
      },
      scores: {
        efficiency: efficiencyScore,
        accuracy: accuracyScore,
        overall: overallScore,
      },
      rating,
      matchesService,
      matchesArea,
      matchesRating,
    };
  });

  // Filter
  let filtered = vendorProfiles.filter(
    (v) => v.matchesService && v.matchesArea && v.matchesRating
  );

  // Sort
  switch (sortBy) {
    case "rating":
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case "name":
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      break;
    case "active":
      filtered.sort((a, b) => b.stats.activeJobs - a.stats.activeJobs);
      break;
    case "score":
    default:
      filtered.sort((a, b) => b.scores.overall - a.scores.overall);
      break;
  }

  return NextResponse.json({
    vendors: filtered,
    total: filtered.length,
    filters: { search, serviceType, area, minRating, sortBy },
  });
}
