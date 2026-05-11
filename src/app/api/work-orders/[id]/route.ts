import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function cleanString(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned || null;
}

type PropertyFrontPhoto = {
  id: string;
  propertyId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  category: string;
  uploaderId: string | null;
  createdAt: Date;
};

async function findPropertyFrontPhotos(propertyId: string) {
  const propertyPhotoDelegate = (prisma as any).propertyPhoto;
  if (propertyPhotoDelegate) {
    return propertyPhotoDelegate
      .findMany({
        where: { propertyId, category: "FRONT" },
        orderBy: { createdAt: "desc" },
        take: 1,
      })
      .catch((error: any) => {
        if (error?.code === "P2021") return [];
        throw error;
      });
  }

  return (prisma as any).$queryRaw<PropertyFrontPhoto[]>`
    SELECT *
    FROM "PropertyPhoto"
    WHERE "propertyId" = ${propertyId}
      AND "category" = 'FRONT'
    ORDER BY "createdAt" DESC
    LIMIT 1
  `.catch((error: any) => {
    if (error?.code === "P2021") return [];
    throw error;
  });
}

async function findOrCreatePropertyForWorkOrder(workOrder: {
  id: string;
  address: string;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}) {
  const normalizedAddress = workOrder.address.trim();
  const normalizedCity = cleanString(workOrder.city);
  const normalizedState = cleanString(workOrder.state);
  const normalizedZip = cleanString(workOrder.zipCode);

  const existing = await prisma.property.findFirst({
    where: {
      address: { equals: normalizedAddress, mode: "insensitive" },
      ...(normalizedCity ? { city: { equals: normalizedCity, mode: "insensitive" } } : {}),
      ...(normalizedState ? { state: { equals: normalizedState, mode: "insensitive" } } : {}),
      ...(normalizedZip ? { zipCode: normalizedZip } : {}),
    } as any,
  });

  if (existing) return existing;

  const existingByAddress = await prisma.property.findFirst({
    where: {
      address: { equals: normalizedAddress, mode: "insensitive" },
    } as any,
  });

  if (existingByAddress) return existingByAddress;

  return prisma.property.create({
    data: {
      address: normalizedAddress,
      city: normalizedCity,
      state: normalizedState,
      zipCode: normalizedZip,
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        contractor: { select: { id: true, name: true, email: true, image: true, phone: true } },
        coordinator: { select: { id: true, name: true, email: true, phone: true, image: true } },
        processor: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        property: true,
        files: { include: { uploader: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        threads: {
          include: {
            messages: {
              include: { author: { select: { id: true, name: true, image: true } } },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
        invoices: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
        history: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let property = workOrder.property;

    if (!property) {
      property = await findOrCreatePropertyForWorkOrder(workOrder);
      await prisma.workOrder.update({
        where: { id: workOrder.id },
        data: { propertyId: property.id },
      }).catch(() => {});
    }

    const propertyFrontPhotos = property ? await findPropertyFrontPhotos(property.id) : [];

    return NextResponse.json({
      ...workOrder,
      propertyId: property?.id || workOrder.propertyId,
      property: property || workOrder.property,
      propertyFrontPhotos,
    });
  } catch (error: any) {
    console.error("Failed to fetch work order", error);
    return NextResponse.json(
      {
        error: "Failed to fetch work order",
        details:
          process.env.NODE_ENV === "development"
            ? error?.message || String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.workOrder.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: any = {};
  const allowedFields = [
    "title", "description", "address", "city", "state", "zipCode",
    "serviceType", "status", "priority", "dueDate", "lockCode",
    "gateCode", "keyCode", "specialInstructions", "contractorId",
    "coordinatorId", "processorId", "tasks", "metadata",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
  if (updates.status === "CLOSED" || updates.status === "CANCELLED") {
    updates.completedAt = new Date();
  }

  const workOrder = await prisma.workOrder.update({
    where: { id },
    data: updates,
    include: {
      contractor: { select: { id: true, name: true, email: true } },
      coordinator: { select: { id: true, name: true, email: true } },
    },
  });

  // Log activity
  const changedFields = Object.keys(updates).filter(
    (k) => (updates as any)[k] !== (existing as any)[k]
  );
  if (changedFields.length > 0) {
    await prisma.activityLog.create({
      data: {
        action: "WORK_ORDER_UPDATED",
        details: `Updated: ${changedFields.join(", ")}`,
        userId: (session.user as any).id,
        workOrderId: id,
      },
    });

    // Create notifications for important changes
    if (changedFields.includes("status")) {
      const statusLabel = updates.status;
      // Notify contractor if assigned
      if (workOrder.contractorId) {
        await prisma.notification.create({
          data: {
            type: "WORK_ORDER",
            title: "Work Order Status Changed",
            message: `"${workOrder.title}" status changed to ${statusLabel}`,
            userId: workOrder.contractorId,
            workOrderId: id,
          },
        }).catch(() => {});
      }
      // Notify coordinator if assigned
      if (workOrder.coordinatorId && workOrder.coordinatorId !== workOrder.contractorId) {
        await prisma.notification.create({
          data: {
            type: "WORK_ORDER",
            title: "Work Order Status Changed",
            message: `"${workOrder.title}" status changed to ${statusLabel}`,
            userId: workOrder.coordinatorId,
            workOrderId: id,
          },
        }).catch(() => {});
      }
    }

    if (changedFields.includes("contractorId") && workOrder.contractorId) {
      await prisma.notification.create({
        data: {
          type: "WORK_ORDER",
          title: "New Work Order Assignment",
          message: `You have been assigned to "${workOrder.title}"`,
          userId: workOrder.contractorId,
          workOrderId: id,
        },
      }).catch(() => {});
    }

    // Create ActivityLog entries for status changes and contractor changes
    if (changedFields.includes("status")) {
      await prisma.activityLog.create({
        data: {
          action: "STATUS_CHANGED",
          details: `Status changed from ${existing.status} to ${updates.status}`,
          userId: (session.user as any).id,
          workOrderId: id,
        },
      }).catch(() => {});
    }

    if (changedFields.includes("contractorId")) {
      const oldContractorId = existing.contractorId;
      const newContractorId = workOrder.contractorId;
      await prisma.activityLog.create({
        data: {
          action: "CONTRACTOR_CHANGED",
          details: newContractorId
            ? `Contractor assigned${oldContractorId ? ` (changed from previous contractor)` : ""}`
            : "Contractor unassigned",
          userId: (session.user as any).id,
          workOrderId: id,
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json(workOrder);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.workOrder.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
