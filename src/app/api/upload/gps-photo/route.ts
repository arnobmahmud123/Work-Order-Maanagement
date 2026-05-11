import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// ─── GPS Photo Upload ────────────────────────────────────────────────────────
// Accepts photos with GPS metadata and stores them with full EXIF data.
// Photos are saved to public/uploads/gps/ and a FileUpload record is created.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "DURING";
    const workOrderId = formData.get("workOrderId") as string | null;
    const latitude = formData.get("latitude") as string | null;
    const longitude = formData.get("longitude") as string | null;
    const altitude = formData.get("altitude") as string | null;
    const accuracy = formData.get("accuracy") as string | null;
    const capturedAt = formData.get("capturedAt") as string | null;
    const address = formData.get("address") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Max 20MB for GPS photos
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 20MB)" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "gps");
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const filename = `gps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const filepath = path.join(uploadDir, filename);
    const url = `/uploads/gps/${filename}`;

    await writeFile(filepath, buffer);

    // Build metadata JSON
    const metadata: Record<string, any> = {
      capturedAt: capturedAt || new Date().toISOString(),
      uploadedBy: (session.user as any).id,
    };

    if (latitude && longitude) {
      metadata.gps = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        altitude: altitude ? parseFloat(altitude) : null,
        accuracy: accuracy ? parseFloat(accuracy) : null,
      };
    }

    if (address) {
      metadata.address = address;
    }

    // Create FileUpload record
    const fileUpload = await prisma.fileUpload.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: "image/jpeg",
        size: file.size,
        path: url,
        category: category as any, // BEFORE, DURING, AFTER
        workOrderId: workOrderId || null,
        uploaderId: (session.user as any).id,
      },
    });

    // Log activity if linked to work order
    if (workOrderId) {
      await prisma.activityLog.create({
        data: {
          action: "GPS_PHOTO_UPLOADED",
          details: `GPS photo uploaded${metadata.gps ? ` at (${metadata.gps.latitude.toFixed(6)}, ${metadata.gps.longitude.toFixed(6)})` : ""}${address ? ` — ${address}` : ""}`,
          userId: (session.user as any).id,
          workOrderId,
        },
      });
    }

    return NextResponse.json({
      id: fileUpload.id,
      url,
      filename,
      size: file.size,
      metadata,
    });
  } catch (error) {
    console.error("GPS photo upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
