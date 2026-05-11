import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");
  const address = searchParams.get("address");

  if (!propertyId && !address) {
    return NextResponse.json(
      { error: "propertyId or address is required" },
      { status: 400 }
    );
  }

  // Always query by address to capture ALL work orders at the same property,
  // including those without a propertyId set.
  // Extract the street portion (before first comma) for broader matching.
  const where: any = {};
  const streetAddress = address?.split(",")[0]?.trim() || null;

  if (streetAddress) {
    // Match by street address for all work orders (with or without propertyId)
    // Use street portion to match "6442 Valley Drive" across variations like
    // "6442 Valley Drive" and "6442 Valley Drive, Springfield, IL"
    where.OR = [
      { address: { contains: streetAddress, mode: "insensitive" } },
      { property: { address: { contains: streetAddress, mode: "insensitive" } } },
    ];
  } else if (propertyId) {
    // Fallback: if only propertyId given, also find by the property's address
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { address: true },
    });
    if (property?.address) {
      const propStreet = property.address.split(",")[0]?.trim();
      if (propStreet) {
        where.OR = [
          { propertyId: propertyId },
          { address: { contains: propStreet, mode: "insensitive" } },
          { property: { address: { contains: propStreet, mode: "insensitive" } } },
        ];
      } else {
        where.OR = [
          { propertyId: propertyId },
          { address: { contains: property.address, mode: "insensitive" } },
        ];
      }
    } else {
      where.propertyId = propertyId;
    }
  }

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: {
      contractor: { select: { id: true, name: true, image: true } },
      coordinator: { select: { id: true, name: true } },
      property: { select: { id: true, address: true, city: true, state: true, zipCode: true, imageUrl: true } },
      files: {
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          path: true,
          category: true,
          createdAt: true,
        },
      },
      history: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { files: true, threads: true, invoices: true, history: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ workOrders });
}
