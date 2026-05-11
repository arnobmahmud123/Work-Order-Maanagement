import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const userId = (session.user as any).id;

  // Verify participant
  const participant = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId } },
  });

  if (!participant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, role: true } },
        },
      },
      messages: {
        include: {
          author: { select: { id: true, name: true, image: true } },
          replies: {
            include: { author: { select: { id: true, name: true, image: true } } },
          },
          readReceipts: true,
        },
        orderBy: { createdAt: "asc" },
      },
      workOrder: { select: { id: true, title: true, address: true, status: true } },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark messages as read
  const unreadMessageIds = thread.messages
    .filter(
      (m) =>
        m.authorId !== userId &&
        !m.readReceipts.some((r) => r.userId === userId)
    )
    .map((m) => m.id);

  if (unreadMessageIds.length > 0) {
    await prisma.messageReadReceipt.createMany({
      data: unreadMessageIds.map((messageId) => ({
        messageId,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json(thread);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const body = await req.json();
  const { content, type, visibility, parentId, isUrgent } = body;
  const userId = (session.user as any).id;

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      content,
      type: type || "COMMENT",
      visibility: visibility || "INTERNAL",
      threadId,
      authorId: userId,
      parentId,
      isUrgent: isUrgent || false,
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  });

  // Update thread timestamp
  await prisma.thread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  // Notify thread participants (except sender)
  try {
    const participants = await prisma.threadParticipant.findMany({
      where: { threadId, userId: { not: userId } },
      select: { userId: true },
    });
    for (const p of participants) {
      await prisma.notification.create({
        data: {
          type: "MESSAGE",
          title: "New Message",
          message: `New message in thread: ${content.slice(0, 80)}${content.length > 80 ? "..." : ""}`,
          userId: p.userId,
        },
      }).catch(() => {});
    }
  } catch {}

  return NextResponse.json(message, { status: 201 });
}
