import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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

function propertyPhotoDelegate() {
  return (prisma as any).propertyPhoto;
}

async function findFrontPhotos(propertyId: string) {
  const delegate = propertyPhotoDelegate();
  if (delegate) {
    return delegate.findMany({
      where: { propertyId, category: "FRONT" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
  }

  return (prisma as any).$queryRaw<PropertyFrontPhoto[]>`
    SELECT *
    FROM "PropertyPhoto"
    WHERE "propertyId" = ${propertyId}
      AND "category" = 'FRONT'
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
}

async function createPropertyPhoto(data: {
  propertyId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  category: string;
  uploaderId: string | null;
}) {
  const delegate = propertyPhotoDelegate();
  if (delegate) {
    return delegate.create({ data });
  }

  const id = randomUUID();
  const created = await (prisma as any).$queryRaw<PropertyFrontPhoto[]>`
    INSERT INTO "PropertyPhoto" (
      "id", "propertyId", "filename", "originalName", "mimeType",
      "size", "path", "category", "uploaderId", "createdAt"
    )
    VALUES (
      ${id}, ${data.propertyId}, ${data.filename}, ${data.originalName},
      ${data.mimeType}, ${data.size}, ${data.path}, ${data.category},
      ${data.uploaderId}, NOW()
    )
    RETURNING *
  `;
  return created[0];
}

async function deletePropertyPhoto(photoId: string) {
  const delegate = propertyPhotoDelegate();
  if (delegate) {
    return delegate.delete({ where: { id: photoId } });
  }

  const deleted = await (prisma as any).$queryRaw<PropertyFrontPhoto[]>`
    DELETE FROM "PropertyPhoto"
    WHERE "id" = ${photoId}
    RETURNING *
  `;
  return deleted[0] || null;
}

async function deleteFrontPhotosForProperty(propertyId: string) {
  const delegate = propertyPhotoDelegate();
  if (delegate) {
    return delegate.deleteMany({ where: { propertyId, category: "FRONT" } });
  }

  return (prisma as any).$executeRaw`
    DELETE FROM "PropertyPhoto"
    WHERE "propertyId" = ${propertyId}
      AND "category" = 'FRONT'
  `;
}

// GET — return property front photos
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const photos = await findFrontPhotos(id);

  return NextResponse.json({ photos });
}

// POST — upload a property front photo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as any).id;

  // Verify property exists
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const category = (formData.get("category") as string) || "FRONT";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Save file to disk
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = path.extname(file.name) || ".jpg";
  const filename = `property-${id}-${category.toLowerCase()}-${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "properties");

  try {
    await mkdir(uploadDir, { recursive: true });
  } catch {}

  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  const publicPath = `/uploads/properties/${filename}`;

  // A property keeps one canonical front photo; replacing it keeps every order consistent.
  if (category === "FRONT") {
    await deleteFrontPhotosForProperty(id);
  }

  // Save to database
  const photo = await createPropertyPhoto({
    propertyId: id,
    filename,
    originalName: file.name,
    mimeType: file.type || "image/jpeg",
    size: buffer.length,
    path: publicPath,
    category,
    uploaderId: userId,
  });

  // Also update property imageUrl if this is a FRONT photo (for backward compat)
  if (category === "FRONT") {
    await prisma.property.update({
      where: { id },
      data: { imageUrl: publicPath },
    });
  }

  return NextResponse.json({
    id: photo.id,
    path: publicPath,
    filename: photo.filename,
    originalName: photo.originalName,
    mimeType: photo.mimeType,
    size: photo.size,
    category: photo.category,
    createdAt: photo.createdAt,
  });
}

// DELETE — remove a property front photo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get("photoId");

  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  await deletePropertyPhoto(photoId);

  const [nextFrontPhoto] = await findFrontPhotos(id);

  await prisma.property.update({
    where: { id },
    data: { imageUrl: nextFrontPhoto?.path || null },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
