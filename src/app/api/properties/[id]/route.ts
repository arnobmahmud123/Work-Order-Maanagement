import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      workOrders: {
        include: {
          contractor: { select: { id: true, name: true, image: true } },
          coordinator: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          files: true,
          invoices: true,
          history: {
            include: { user: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          _count: { select: { files: true, history: true, invoices: true, threads: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      photos: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // Aggregate stats
  const workOrders = property.workOrders;
  const allFiles = workOrders.flatMap((wo: any) => wo.files || []);
  const allInvoices = workOrders.flatMap((wo: any) => wo.invoices || []);
  const allHistory = workOrders.flatMap((wo: any) => wo.history || []);

  const now = new Date();
  const activeOrders = workOrders.filter(
    (wo: any) => !["CLOSED", "CANCELLED", "OFFICE_COMPLETE"].includes(wo.status)
  );
  const completedOrders = workOrders.filter(
    (wo: any) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
  );
  const overdueOrders = workOrders.filter(
    (wo: any) =>
      wo.dueDate &&
      new Date(wo.dueDate) < now &&
      !["CLOSED", "CANCELLED", "OFFICE_COMPLETE"].includes(wo.status)
  );
  const pendingReviewOrders = workOrders.filter(
    (wo: any) => wo.status === "QC_REVIEW" || wo.status === "PENDING_REVIEW"
  );
  const assignedOrders = workOrders.filter((wo: any) => wo.contractorId);
  const unassignedOrders = workOrders.filter((wo: any) => !wo.contractorId);

  const totalBilled = allInvoices.reduce(
    (s: number, inv: any) => s + (inv.total || 0),
    0
  );
  const totalPaid = allInvoices
    .filter((inv: any) => inv.status === "PAID")
    .reduce((s: number, inv: any) => s + (inv.total || 0), 0);
  const totalPending = allInvoices
    .filter((inv: any) => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((s: number, inv: any) => s + (inv.total || 0), 0);

  const beforePhotos = allFiles.filter((f: any) => f.category === "BEFORE");
  const duringPhotos = allFiles.filter((f: any) => f.category === "DURING");
  const afterPhotos = allFiles.filter((f: any) => f.category === "AFTER");
  const inspectionPhotos = allFiles.filter(
    (f: any) => f.category === "INSPECTION"
  );
  const propertyPhotos = (property as any).photos || [];

  // Service type breakdown
  const serviceBreakdown: Record<string, number> = {};
  workOrders.forEach((wo: any) => {
    serviceBreakdown[wo.serviceType] =
      (serviceBreakdown[wo.serviceType] || 0) + 1;
  });

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  workOrders.forEach((wo: any) => {
    statusBreakdown[wo.status] = (statusBreakdown[wo.status] || 0) + 1;
  });

  // Timeline: merge all history + invoices + work order events
  const timeline: any[] = [];

  workOrders.forEach((wo: any) => {
    timeline.push({
      type: "WORK_ORDER_CREATED",
      date: wo.createdAt,
      title: `Work order created: ${wo.title}`,
      user: wo.createdBy,
      workOrderId: wo.id,
      workOrderTitle: wo.title,
    });

    (wo.history || []).forEach((h: any) => {
      timeline.push({
        type: h.action,
        date: h.createdAt,
        title: h.details || h.action,
        user: h.user,
        workOrderId: wo.id,
        workOrderTitle: wo.title,
      });
    });

    (wo.invoices || []).forEach((inv: any) => {
      timeline.push({
        type: "INVOICE",
        date: inv.createdAt,
        title: `Invoice ${inv.invoiceNumber}: $${inv.total?.toLocaleString()} (${inv.status})`,
        user: null,
        workOrderId: wo.id,
        workOrderTitle: wo.title,
      });
    });
  });

  timeline.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Recent completed work orders (last 10)
  const recentCompleted = completedOrders.slice(0, 10).map((wo: any) => ({
    id: wo.id,
    title: wo.title,
    serviceType: wo.serviceType,
    status: wo.status,
    completedAt: wo.completedAt,
    contractor: wo.contractor,
    filesCount: wo._count.files,
    invoicesCount: wo._count.invoices,
  }));

  // Access details from most recent work order
  const latestOrder = workOrders[0];

  return NextResponse.json({
    property: {
      id: property.id,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      latitude: property.latitude,
      longitude: property.longitude,
      imageUrl: property.imageUrl,
      metadata: property.metadata,
      createdAt: property.createdAt,
    },
    stats: {
      totalOrders: workOrders.length,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      overdueOrders: overdueOrders.length,
      pendingReview: pendingReviewOrders.length,
      assignedOrders: assignedOrders.length,
      unassignedOrders: unassignedOrders.length,
      totalBilled,
      totalPaid,
      totalPending,
      totalPhotos: allFiles.length + propertyPhotos.length,
      beforePhotos: beforePhotos.length,
      duringPhotos: duringPhotos.length,
      afterPhotos: afterPhotos.length,
      inspectionPhotos: inspectionPhotos.length,
      totalInvoices: allInvoices.length,
      totalHistoryEvents: allHistory.length,
    },
    serviceBreakdown,
    statusBreakdown,
    accessDetails: latestOrder
      ? {
          lockCode: latestOrder.lockCode,
          gateCode: latestOrder.gateCode,
          keyCode: latestOrder.keyCode,
          specialInstructions: latestOrder.specialInstructions,
        }
      : null,
    recentCompleted,
    overdueOrders: overdueOrders.map((wo: any) => ({
      id: wo.id,
      title: wo.title,
      dueDate: wo.dueDate,
      status: wo.status,
      contractor: wo.contractor,
    })),
    pendingReviewOrders: pendingReviewOrders.map((wo: any) => ({
      id: wo.id,
      title: wo.title,
      status: wo.status,
      updatedAt: wo.updatedAt,
    })),
    workOrders: workOrders.map((wo: any) => ({
      id: wo.id,
      title: wo.title,
      serviceType: wo.serviceType,
      status: wo.status,
      dueDate: wo.dueDate,
      completedAt: wo.completedAt,
      contractor: wo.contractor,
      coordinator: wo.coordinator,
      filesCount: wo._count.files,
      historyCount: wo._count.history,
      invoicesCount: wo._count.invoices,
      createdAt: wo.createdAt,
    })),
    invoices: allInvoices.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      total: inv.total,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      createdAt: inv.createdAt,
    })),
    timeline: timeline.slice(0, 100),
    files: allFiles.map((f: any) => ({
      id: f.id,
      filename: f.filename,
      originalName: f.originalName,
      mimeType: f.mimeType,
      size: f.size,
      path: f.path,
      category: f.category,
      workOrderId: f.workOrderId,
      createdAt: f.createdAt,
    })),
    propertyPhotos: propertyPhotos.map((p: any) => ({
      id: p.id,
      filename: p.filename,
      originalName: p.originalName,
      mimeType: p.mimeType,
      size: p.size,
      path: p.path,
      category: p.category,
      createdAt: p.createdAt,
    })),
  });
}
