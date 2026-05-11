import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { id: channelId } = await params;
  const body = await req.json();
  const { messageId, emoji } = body;

  if (!messageId || !emoji) {
    return NextResponse.json({ error: "messageId and emoji are required" }, { status: 400 });
  }

  // Toggle reaction
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: "removed", emoji });
  }

  const reaction = await prisma.messageReaction.create({
    data: { messageId, userId, emoji },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ action: "added", reaction });
}
