import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const search = searchParams.get("search");

  const where: any = { channelId: id, parentId: null };
  if (before) where.createdAt = { lt: new Date(before) };
  if (search) {
    where.content = { contains: search, mode: "insensitive" };
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    select: {
      id: true,
      content: true,
      type: true,
      createdAt: true,
      authorId: true,
      parentId: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      fileMime: true,
      author: { select: { id: true, name: true, email: true, image: true, role: true } },
      reactions: {
        select: {
          id: true,
          emoji: true,
          userId: true,
          user: { select: { id: true, name: true } },
        },
      },
      replies: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 3,
      },
      _count: { select: { replies: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ messages: messages.reverse() });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { id } = await params;
  const body = await req.json();
  const { content, type, parentId, fileUrl, fileName, fileSize, fileMime } = body;

  if (!content && !fileUrl) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Check membership — use findUnique for speed
  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId } },
    select: { id: true },
  });

  if (!membership) {
    const channel = await prisma.channel.findUnique({
      where: { id },
      select: { type: true },
    });
    if (channel && ["GENERAL", "WORK_ORDERS"].includes(channel.type)) {
      await prisma.channelMember.create({
        data: { channelId: id, userId, role: "MEMBER" },
      });
    } else {
      return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 });
    }
  }

  const message = await prisma.chatMessage.create({
    data: {
      content: content || "",
      type: type || (fileUrl ? "FILE" : "TEXT"),
      channelId: id,
      authorId: userId,
      parentId: parentId || null,
      fileUrl,
      fileName,
      fileSize,
      fileMime,
    },
    select: {
      id: true,
      content: true,
      type: true,
      createdAt: true,
      authorId: true,
      fileUrl: true,
      fileName: true,
      fileSize: true,
      fileMime: true,
      author: { select: { id: true, name: true, email: true, image: true, role: true } },
      reactions: true,
      _count: { select: { replies: true } },
    },
  });

  // Update channel timestamp and mark sender as having read — fire and forget
  prisma.channel.update({
    where: { id },
    data: { updatedAt: new Date() },
  }).catch(() => {});

  // Mark sender as having read the channel (so their own messages don't leave unread state)
  prisma.channelMember.updateMany({
    where: { channelId: id, userId },
    data: { lastReadAt: new Date() },
  }).catch(() => {});

  // Notify other channel members about the new message
  const authorName = (session.user as any).name || "Someone";
  prisma.channelMember.findMany({
    where: { channelId: id, userId: { not: userId } },
    select: { userId: true },
  }).then(async (members) => {
    for (const m of members) {
      await prisma.notification.create({
        data: {
          type: "MESSAGE",
          title: "New Message",
          message: `${authorName}: ${content ? content.slice(0, 100) : "Sent a file"}`,
          userId: m.userId,
        },
      }).catch(() => {});
    }
  }).catch(() => {});

  return NextResponse.json(message, { status: 201 });
}
