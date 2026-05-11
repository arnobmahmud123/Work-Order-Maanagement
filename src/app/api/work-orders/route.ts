import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function cleanString(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned || null;
}

async function findOrCreateProperty({
  propertyId,
  address,
  city,
  state,
  zipCode,
}: {
  propertyId?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}) {
  if (propertyId) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (property) return property.id;
  }

  const normalizedAddress = address.trim();
  const normalizedCity = cleanString(city);
  const normalizedState = cleanString(state);
  const normalizedZip = cleanString(zipCode);

  const existing = await prisma.property.findFirst({
    where: {
      address: { equals: normalizedAddress, mode: "insensitive" },
      ...(normalizedCity ? { city: { equals: normalizedCity, mode: "insensitive" } } : {}),
      ...(normalizedState ? { state: { equals: normalizedState, mode: "insensitive" } } : {}),
      ...(normalizedZip ? { zipCode: normalizedZip } : {}),
    } as any,
  });

  if (existing) return existing.id;

  const existingByAddress = await prisma.property.findFirst({
    where: {
      address: { equals: normalizedAddress, mode: "insensitive" },
    } as any,
  });

  if (existingByAddress) return existingByAddress.id;

  const created = await prisma.property.create({
    data: {
      address: normalizedAddress,
      city: normalizedCity,
      state: normalizedState,
      zipCode: normalizedZip,
    },
  });

  return created.id;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const serviceType = searchParams.get("serviceType");
  const contractorId = searchParams.get("contractorId");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const where: any = {};

  // Role-based filtering: non-admin users only see their assigned orders
  if (role === "ADMIN") {
    // Admin sees everything
  } else if (role === "CONTRACTOR") {
    where.contractorId = userId;
  } else if (role === "COORDINATOR") {
    where.coordinatorId = userId;
  } else if (role === "PROCESSOR") {
    where.processorId = userId;
  } else if (role === "CLIENT") {
    where.createdById = userId;
  } else {
    // Any other role: only show orders assigned to them
    where.contractorId = userId;
  }

  // Support multiple statuses (comma-separated: "NEW,ASSIGNED,IN_PROGRESS")
  if (statusParam) {
    const statuses = statusParam.split(",").filter(Boolean);
    if (statuses.length === 1) {
      where.status = statuses[0];
    } else if (statuses.length > 1) {
      where.status = { in: statuses };
    }
  }
  if (serviceType) where.serviceType = serviceType;
  if (contractorId) where.contractorId = contractorId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { contractor: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [workOrders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      include: {
        contractor: { select: { id: true, name: true, email: true, image: true } },
        coordinator: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, address: true, city: true, state: true, zipCode: true, imageUrl: true } },
        _count: { select: { threads: true, files: true, invoices: true, history: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.workOrder.count({ where }),
  ]);

  return NextResponse.json({
    workOrders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR", "PROCESSOR", "CLIENT"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    description,
    address,
    city,
    state,
    zipCode,
    serviceType,
    dueDate,
    priority,
    lockCode,
    gateCode,
    keyCode,
    specialInstructions,
    contractorId,
    coordinatorId,
    processorId,
    propertyId,
    tasks,
  } = body;

  if (!title || !address || !serviceType) {
    return NextResponse.json(
      { error: "Title, address, and service type are required" },
      { status: 400 }
    );
  }

  const resolvedPropertyId = await findOrCreateProperty({
    propertyId,
    address,
    city,
    state,
    zipCode,
  });

  const workOrder = await prisma.workOrder.create({
    data: {
      title,
      description,
      address,
      city,
      state,
      zipCode,
      serviceType,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 0,
      lockCode,
      gateCode,
      keyCode,
      specialInstructions,
      tasks,
      contractorId,
      coordinatorId,
      processorId,
      propertyId: resolvedPropertyId,
      createdById: (session.user as any).id,
      status: contractorId ? "ASSIGNED" : "NEW",
    },
    include: {
      contractor: { select: { id: true, name: true, email: true } },
      coordinator: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, address: true, city: true, state: true, zipCode: true, imageUrl: true } },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "WORK_ORDER_CREATED",
      details: `Work order "${title}" created`,
      userId: (session.user as any).id,
      workOrderId: workOrder.id,
    },
  });

  // Notify contractor if assigned
  if (contractorId) {
    try {
      await prisma.notification.create({
        data: {
          type: "WORK_ORDER",
          title: "New Work Order Assignment",
          message: `You have been assigned to "${title}" at ${address}`,
          userId: contractorId,
          workOrderId: workOrder.id,
        },
      });
    } catch {}
  }

  return NextResponse.json(workOrder, { status: 201 });
}
