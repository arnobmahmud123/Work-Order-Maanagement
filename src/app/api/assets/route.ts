import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Asset Inventory ─────────────────────────────────────────────────────────
// Returns all properties with photos, metadata, work order stats, and financials.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const city = searchParams.get("city") || "";
  const state = searchParams.get("state") || "";
  const sortBy = searchParams.get("sortBy") || "recent"; // recent, address, orders, revenue

  const where: any = {};
  if (search) {
    where.OR = [
      { address: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { state: { contains: search, mode: "insensitive" } },
      { zipCode: { contains: search } },
    ];
  }
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (state) where.state = { contains: state, mode: "insensitive" };

  const properties = await prisma.property.findMany({
    where,
    include: {
      workOrders: {
        select: {
          id: true,
          title: true,
          status: true,
          serviceType: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          contractor: { select: { id: true, name: true } },
          invoices: { select: { total: true, status: true } },
          files: {
            where: { mimeType: { startsWith: "image/" } },
            select: { id: true, path: true, originalName: true, category: true },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: { createdAt: "desc" },
      },
      photos: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const now = new Date();

  const assetInventory = properties.map((prop) => {
    const orders = prop.workOrders;
    const active = orders.filter(
      (wo) => !["CLOSED", "CANCELLED"].includes(wo.status)
    );
    const completed = orders.filter(
      (wo) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
    );
    const overdue = orders.filter(
      (wo) =>
        wo.dueDate &&
        new Date(wo.dueDate) < now &&
        !["CLOSED", "CANCELLED"].includes(wo.status)
    );

    // Total revenue
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

    // Get front photo — prioritize property-level photos, then fallback to work order files
    const allPhotos = orders.flatMap((wo) => wo.files);
    const propertyPhotos = (prop as any).photos || [];
    const propertyFrontPhoto = propertyPhotos.find((p: any) => p.category === "FRONT") || propertyPhotos[0];
    const frontPhoto = propertyFrontPhoto
      ? { path: propertyFrontPhoto.path, name: propertyFrontPhoto.originalName }
      : allPhotos.find(
          (f) =>
            f.category === "BEFORE" ||
            f.category === "AFTER" ||
            f.category === "INSPECTION"
        ) || allPhotos[0];

    // Service types used
    const serviceTypes = [...new Set(orders.map((wo) => wo.serviceType))];

    // Latest activity
    const latestOrder = orders[0];

    // Status breakdown
    const statusBreakdown = orders.reduce(
      (acc: Record<string, number>, wo) => {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      id: prop.id,
      address: prop.address,
      city: prop.city,
      state: prop.state,
      zipCode: prop.zipCode,
      latitude: prop.latitude,
      longitude: prop.longitude,
      imageUrl: prop.imageUrl,
      frontPhoto: frontPhoto
        ? { path: frontPhoto.path, name: (frontPhoto as any).name || (frontPhoto as any).originalName }
        : null,
      metadata: prop.metadata,
      createdAt: prop.createdAt,
      stats: {
        totalOrders: orders.length,
        activeOrders: active.length,
        completedOrders: completed.length,
        overdueOrders: overdue.length,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        paidRevenue: parseFloat(paidRevenue.toFixed(2)),
        photoCount: allPhotos.length + propertyPhotos.length,
      },
      serviceTypes,
      statusBreakdown,
      latestOrder: latestOrder
        ? {
            id: latestOrder.id,
            title: latestOrder.title,
            status: latestOrder.status,
            serviceType: latestOrder.serviceType,
            createdAt: latestOrder.createdAt,
          }
        : null,
      recentPhotos: [
        ...propertyPhotos.map((photo: any) => ({
          id: photo.id,
          path: photo.path,
          originalName: photo.originalName,
          category: photo.category,
        })),
        ...allPhotos,
      ].slice(0, 6),
    };
  });

  // Sort
  switch (sortBy) {
    case "address":
      assetInventory.sort((a, b) => a.address.localeCompare(b.address));
      break;
    case "orders":
      assetInventory.sort((a, b) => b.stats.totalOrders - a.stats.totalOrders);
      break;
    case "revenue":
      assetInventory.sort(
        (a, b) => b.stats.totalRevenue - a.stats.totalRevenue
      );
      break;
    case "recent":
    default:
      break;
  }

  // Summary stats
  const summary = {
    totalProperties: assetInventory.length,
    totalWorkOrders: assetInventory.reduce(
      (sum, p) => sum + p.stats.totalOrders,
      0
    ),
    totalActive: assetInventory.reduce(
      (sum, p) => sum + p.stats.activeOrders,
      0
    ),
    totalOverdue: assetInventory.reduce(
      (sum, p) => sum + p.stats.overdueOrders,
      0
    ),
    totalRevenue: assetInventory.reduce(
      (sum, p) => sum + p.stats.totalRevenue,
      0
    ),
    cities: [...new Set(assetInventory.map((p) => p.city).filter(Boolean))],
    states: [...new Set(assetInventory.map((p) => p.state).filter(Boolean))],
  };

  return NextResponse.json({
    properties: assetInventory,
    summary,
    total: assetInventory.length,
  });
}
