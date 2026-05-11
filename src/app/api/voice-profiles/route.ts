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

  const where: any = {};
  if (role !== "ADMIN") {
    where.userId = userId;
  }

  const profiles = await prisma.voiceProfile.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { callLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { name, description, voiceId, stability, clarity, style } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Mock: Generate ElevenLabs voice ID
  const mockVoiceId = voiceId || `voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const profile = await prisma.voiceProfile.create({
    data: {
      userId,
      name,
      description,
      voiceId: mockVoiceId,
      stability: stability ?? 0.5,
      clarity: clarity ?? 0.75,
      style: style ?? 0,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
