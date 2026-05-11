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
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = {};
  if (role !== "ADMIN") {
    where.OR = [{ initiatorId: userId }, { recipientId: userId }];
  }
  if (status) where.status = status;

  const [calls, total] = await Promise.all([
    prisma.callLog.findMany({
      where,
      include: {
        initiator: { select: { id: true, name: true, email: true, image: true } },
        recipient: { select: { id: true, name: true, email: true, image: true } },
        voiceProfile: true,
        inspector: { select: { id: true, name: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.callLog.count({ where }),
  ]);

  return NextResponse.json({ calls, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { recipientPhone, recipientName, recipientId, inspectorId, voiceProfileId, purpose } = body;

  if (!recipientPhone) {
    return NextResponse.json({ error: "Recipient phone is required" }, { status: 400 });
  }

  // Mock: Create call log with simulated Twilio integration
  const call = await prisma.callLog.create({
    data: {
      initiatorId: userId,
      recipientId: recipientId || null,
      recipientPhone,
      recipientName: recipientName || "Unknown",
      inspectorId: inspectorId || null,
      voiceProfileId: voiceProfileId || null,
      purpose: purpose || null,
      status: "RINGING",
      startedAt: new Date(),
    },
    include: {
      initiator: { select: { id: true, name: true, email: true } },
      voiceProfile: true,
    },
  });

  // Mock: Simulate call connecting after 2 seconds
  setTimeout(async () => {
    try {
      await prisma.callLog.update({
        where: { id: call.id },
        data: {
          status: "IN_PROGRESS",
        },
      });
    } catch {}
  }, 2000);

  // Mock: Simulate call completion after random duration
  const duration = Math.floor(Math.random() * 300) + 30;
  setTimeout(async () => {
    try {
      await prisma.callLog.update({
        where: { id: call.id },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
          duration,
          transcription: `[Mock Transcription] Call with ${recipientName || "recipient"} regarding ${purpose || "general discussion"}. The call lasted approximately ${Math.floor(duration / 60)} minutes and ${duration % 60} seconds. Key topics discussed included property inspection scheduling and service coordination.`,
          summary: `Completed call with ${recipientName || "recipient"}. Duration: ${Math.floor(duration / 60)}m ${duration % 60}s. Purpose: ${purpose || "General discussion"}.`,
        },
      });
    } catch {}
  }, 5000);

  return NextResponse.json(call, { status: 201 });
}
