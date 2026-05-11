import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Coordinator Directory ───────────────────────────────────────────────────
// Returns all coordinators with contact info, active work orders, and stats.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const where: any = {
    role: "COORDINATOR",
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const coordinators = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      company: true,
      createdAt: true,
      coordinatedWorkOrders: {
        select: {
          id: true,
          title: true,
          status: true,
          address: true,
          serviceType: true,
          dueDate: true,
          contractor: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();

  const coordinatorProfiles = coordinators.map((c) => {
    const orders = c.coordinatedWorkOrders;
    const active = orders.filter(
      (wo) => !["CLOSED", "CANCELLED"].includes(wo.status)
    );
    const overdue = orders.filter(
      (wo) =>
        wo.dueDate &&
        new Date(wo.dueDate) < now &&
        !["CLOSED", "CANCELLED"].includes(wo.status)
    );
    const completed = orders.filter(
      (wo) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
    );

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      image: c.image,
      company: c.company,
      memberSince: c.createdAt,
      stats: {
        totalWorkOrders: orders.length,
        activeWorkOrders: active.length,
        completedWorkOrders: completed.length,
        overdueWorkOrders: overdue.length,
      },
      recentWorkOrders: orders.slice(0, 5).map((wo) => ({
        id: wo.id,
        title: wo.title,
        status: wo.status,
        address: wo.address,
        serviceType: wo.serviceType,
        dueDate: wo.dueDate,
        contractor: wo.contractor,
      })),
    };
  });

  return NextResponse.json({
    coordinators: coordinatorProfiles,
    total: coordinatorProfiles.length,
  });
}
