import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const files = await prisma.fileUpload.findMany({
    where: { workOrderId: id },
    include: { uploader: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ files });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workOrderId } = await params;

  // Verify work order exists
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
  });
  if (!workOrder) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const category = (formData.get("category") as string) || "DOCS";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Max 10MB for work order photos
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  // Validate category
  const validCategories = ["BEFORE", "DURING", "AFTER", "BID", "INSPECTION", "DOCS"];
  const fileCategory = validCategories.includes(category) ? category : "DOCS";

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create upload directory
  const uploadDir = path.join(process.cwd(), "public", "uploads", "work-orders", workOrderId);
  await mkdir(uploadDir, { recursive: true });

  // Generate unique filename
  const ext = path.extname(file.name);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filepath = path.join(uploadDir, filename);

  await writeFile(filepath, buffer);

  const url = `/uploads/work-orders/${workOrderId}/${filename}`;

  // Create FileUpload record in database
  const fileRecord = await prisma.fileUpload.create({
    data: {
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: url,
      category: fileCategory as any,
      workOrderId,
      uploaderId: (session.user as any).id,
    },
    include: {
      uploader: { select: { id: true, name: true } },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "FILE_UPLOADED",
      details: `Uploaded "${file.name}" (${fileCategory})`,
      userId: (session.user as any).id,
      workOrderId,
    },
  });

  return NextResponse.json(fileRecord, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workOrderId } = await params;
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }

  // Verify the file belongs to this work order
  const file = await prisma.fileUpload.findFirst({
    where: { id: fileId, workOrderId },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Delete from database
  await prisma.fileUpload.delete({ where: { id: fileId } });

  // Try to delete the physical file (best effort)
  try {
    const fs = await import("fs/promises");
    const physicalPath = path.join(process.cwd(), "public", file.path);
    await fs.unlink(physicalPath);
  } catch {
    // File may already be gone, that's ok
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "FILE_DELETED",
      details: `Deleted "${file.originalName}"`,
      userId: (session.user as any).id,
      workOrderId,
    },
  });

  return NextResponse.json({ success: true });
}
