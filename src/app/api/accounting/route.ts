import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Accounting / Profit Analysis ────────────────────────────────────────────
// Returns financial breakdown: profit per work order, per property, chargebacks,
// cost breakdowns, and overall financial health.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "30";
  const propertyId = searchParams.get("propertyId") || "";
  const workOrderId = searchParams.get("workOrderId") || "";

  const periodDays = parseInt(period);
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Fetch all invoices with related data
  const invoiceWhere: any = {};
  if (workOrderId) invoiceWhere.workOrderId = workOrderId;

  const [invoices, workOrders, chargebacks] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        client: { select: { id: true, name: true, company: true } },
        workOrder: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            state: true,
            serviceType: true,
            status: true,
            contractorId: true,
            contractor: { select: { id: true, name: true } },
            propertyId: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workOrder.findMany({
      select: {
        id: true,
        title: true,
        address: true,
        city: true,
        state: true,
        serviceType: true,
        status: true,
        propertyId: true,
        contractorId: true,
        contractor: { select: { id: true, name: true } },
        invoices: { select: { id: true, total: true, status: true, items: true } },
      },
    }),
    // Chargebacks are invoices with negative or disputed amounts
    prisma.invoice.findMany({
      where: { status: "CANCELLED" },
      include: {
        workOrder: { select: { id: true, title: true, address: true } },
        client: { select: { id: true, name: true } },
      },
    }),
  ]);

  // ─── Overall Financials ──────────────────────────────────────────────────

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidRevenue = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.total, 0);
  const pendingRevenue = invoices
    .filter((inv) => ["DRAFT", "SENT"].includes(inv.status))
    .reduce((sum, inv) => sum + inv.total, 0);
  const overdueRevenue = invoices
    .filter((inv) => inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.total, 0);
  const cancelledRevenue = invoices
    .filter((inv) => inv.status === "CANCELLED")
    .reduce((sum, inv) => sum + inv.total, 0);

  // Period comparison
  const periodInvoices = invoices.filter(
    (inv) => new Date(inv.createdAt) >= periodStart
  );
  const periodRevenue = periodInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const periodPaid = periodInvoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.total, 0);

  // ─── Cost Breakdown ──────────────────────────────────────────────────────

  // Categorize invoice items
  const costCategories: Record<string, number> = {
    labor: 0,
    materials: 0,
    trip: 0,
    equipment: 0,
    disposal: 0,
    other: 0,
  };

  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const desc = (item.description || "").toLowerCase();
      if (desc.includes("labor") || desc.includes("hour") || desc.includes("work")) {
        costCategories.labor += item.amount;
      } else if (
        desc.includes("material") ||
        desc.includes("plywood") ||
        desc.includes("supply") ||
        desc.includes("hardware") ||
        desc.includes("antifreeze")
      ) {
        costCategories.materials += item.amount;
      } else if (desc.includes("trip") || desc.includes("mobilization")) {
        costCategories.trip += item.amount;
      } else if (desc.includes("equipment") || desc.includes("tool")) {
        costCategories.equipment += item.amount;
      } else if (desc.includes("disposal") || desc.includes("dumpster") || desc.includes("haul")) {
        costCategories.disposal += item.amount;
      } else {
        costCategories.other += item.amount;
      }
    });
  });

  // ─── Profit Per Work Order ───────────────────────────────────────────────

  const workOrderProfits = workOrders
    .filter((wo) => wo.invoices.length > 0)
    .map((wo) => {
      const invoiceTotal = wo.invoices.reduce((sum, inv) => sum + inv.total, 0);
      const paidTotal = wo.invoices
        .filter((inv) => inv.status === "PAID")
        .reduce((sum, inv) => sum + inv.total, 0);

      return {
        id: wo.id,
        title: wo.title,
        address: wo.address,
        city: wo.city,
        state: wo.state,
        serviceType: wo.serviceType,
        status: wo.status,
        contractor: wo.contractor,
        invoiceTotal,
        paidTotal,
        profit: invoiceTotal, // Revenue = profit for service business
        invoiceCount: wo.invoices.length,
      };
    })
    .sort((a, b) => b.invoiceTotal - a.invoiceTotal);

  // ─── Profit Per Property ─────────────────────────────────────────────────

  const propertyMap = new Map<
    string,
    {
      address: string;
      city: string | null;
      state: string | null;
      workOrders: number;
      totalRevenue: number;
      paidRevenue: number;
      invoiceCount: number;
    }
  >();

  workOrders.forEach((wo) => {
    const key = wo.propertyId || wo.address;
    if (!propertyMap.has(key)) {
      propertyMap.set(key, {
        address: wo.address,
        city: wo.city,
        state: wo.state,
        workOrders: 0,
        totalRevenue: 0,
        paidRevenue: 0,
        invoiceCount: 0,
      });
    }
    const prop = propertyMap.get(key)!;
    prop.workOrders++;
    wo.invoices.forEach((inv) => {
      prop.totalRevenue += inv.total;
      prop.invoiceCount++;
      if (inv.status === "PAID") prop.paidRevenue += inv.total;
    });
  });

  const propertyProfits = Array.from(propertyMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // ─── Contractor Financials ───────────────────────────────────────────────

  const contractorMap = new Map<
    string,
    {
      name: string;
      workOrders: number;
      totalBilled: number;
      paidAmount: number;
    }
  >();

  workOrders.forEach((wo) => {
    if (!wo.contractorId || !wo.contractor) return;
    if (!contractorMap.has(wo.contractorId)) {
      contractorMap.set(wo.contractorId, {
        name: wo.contractor.name || "Unknown",
        workOrders: 0,
        totalBilled: 0,
        paidAmount: 0,
      });
    }
    const c = contractorMap.get(wo.contractorId)!;
    c.workOrders++;
    wo.invoices.forEach((inv) => {
      c.totalBilled += inv.total;
      if (inv.status === "PAID") c.paidAmount += inv.total;
    });
  });

  const contractorFinancials = Array.from(contractorMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalBilled - a.totalBilled);

  // ─── Service Type Revenue ────────────────────────────────────────────────

  const serviceRevenue: Record<string, { count: number; revenue: number }> = {};
  workOrders.forEach((wo) => {
    if (!serviceRevenue[wo.serviceType]) {
      serviceRevenue[wo.serviceType] = { count: 0, revenue: 0 };
    }
    serviceRevenue[wo.serviceType].count++;
    wo.invoices.forEach((inv) => {
      serviceRevenue[wo.serviceType].revenue += inv.total;
    });
  });

  // ─── Monthly Trend ───────────────────────────────────────────────────────

  const monthlyTrend: {
    month: string;
    revenue: number;
    paid: number;
    invoices: number;
  }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthInvoices = invoices.filter(
      (inv) =>
        new Date(inv.createdAt) >= monthStart &&
        new Date(inv.createdAt) <= monthEnd
    );
    monthlyTrend.push({
      month: monthStart.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      revenue: monthInvoices.reduce((sum, inv) => sum + inv.total, 0),
      paid: monthInvoices
        .filter((inv) => inv.status === "PAID")
        .reduce((sum, inv) => sum + inv.total, 0),
      invoices: monthInvoices.length,
    });
  }

  return NextResponse.json({
    overview: {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      overdueRevenue,
      cancelledRevenue,
      invoiceCount: invoices.length,
      paidCount: invoices.filter((inv) => inv.status === "PAID").length,
      pendingCount: invoices.filter((inv) => ["DRAFT", "SENT"].includes(inv.status)).length,
      overdueCount: invoices.filter((inv) => inv.status === "OVERDUE").length,
    },
    period: {
      days: periodDays,
      revenue: periodRevenue,
      paid: periodPaid,
      invoiceCount: periodInvoices.length,
    },
    costBreakdown: costCategories,
    workOrderProfits: workOrderProfits.slice(0, 50),
    propertyProfits: propertyProfits.slice(0, 30),
    contractorFinancials: contractorFinancials.slice(0, 20),
    serviceRevenue,
    monthlyTrend,
    chargebacks: chargebacks.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.total,
      client: inv.client,
      workOrder: inv.workOrder,
      createdAt: inv.createdAt,
    })),
  });
}
