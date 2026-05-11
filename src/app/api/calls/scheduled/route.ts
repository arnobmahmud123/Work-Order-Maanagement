import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (role !== "ADMIN") {
    where.creatorId = userId;
  }
  if (status) where.status = status;

  const calls = await prisma.scheduledCall.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, email: true, image: true } },
      recipient: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({ calls });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { recipientPhone, recipientName, recipientId, purpose, scheduledAt, reminderBefore, voiceProfileId, notes } = body;

  if (!recipientPhone || !scheduledAt) {
    return NextResponse.json({ error: "Phone and scheduled time are required" }, { status: 400 });
  }

  const call = await prisma.scheduledCall.create({
    data: {
      creatorId: userId,
      recipientId: recipientId || null,
      recipientPhone,
      recipientName: recipientName || "Unknown",
      purpose,
      scheduledAt: new Date(scheduledAt),
      reminderBefore: reminderBefore ?? 15,
      voiceProfileId: voiceProfileId || null,
      notes,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(call, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, status, notes } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const call = await prisma.scheduledCall.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    },
  });

  return NextResponse.json(call);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.scheduledCall.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true });
}
