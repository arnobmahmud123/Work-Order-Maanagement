import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workOrderId, taskId } = await params;

  // Find or create task thread
  let thread = await prisma.thread.findFirst({
    where: {
      workOrderId,
      title: `task:${taskId}`,
    },
    include: {
      messages: {
        include: {
          author: { select: { id: true, name: true, image: true } },
          attachments: true,
          readReceipts: true,
        },
        orderBy: { createdAt: "asc" },
      },
      participants: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ messages: [], threadId: null });
  }

  // Mark as read
  const userId = (session.user as any).id;
  const unreadIds = thread.messages
    .filter(
      (m) => m.authorId !== userId && !m.readReceipts.some((r) => r.userId === userId)
    )
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await prisma.messageReadReceipt.createMany({
      data: unreadIds.map((messageId) => ({ messageId, userId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json(thread);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workOrderId, taskId } = await params;
  const body = await req.json();
  const { content, type } = body;
  const userId = (session.user as any).id;

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Find or create task thread
  let thread = await prisma.thread.findFirst({
    where: {
      workOrderId,
      title: `task:${taskId}`,
    },
  });

  if (!thread) {
    // Get work order title for thread name
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { title: true },
    });

    // Find the task name from the tasks JSON
    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { tasks: true },
    });
    let taskName = `Task ${taskId}`;
    if (wo?.tasks) {
      const tasks = wo.tasks as any[];
      const task = tasks.find((t: any) => t.id === taskId);
      if (task) taskName = task.title;
    }

    thread = await prisma.thread.create({
      data: {
        title: `task:${taskId}`,
        workOrderId,
        isGeneral: false,
        participants: {
          create: [{ userId, role: "ADMIN" }],
        },
      },
    });
  }

  // Verify participant
  const participant = await prisma.threadParticipant.findUnique({
    where: {
      threadId_userId: { threadId: thread.id, userId },
    },
  });

  if (!participant) {
    await prisma.threadParticipant.create({
      data: { threadId: thread.id, userId, role: "MEMBER" },
    });
  }

  const message = await prisma.message.create({
    data: {
      content,
      type: type || "COMMENT",
      visibility: "INTERNAL",
      threadId: thread.id,
      authorId: userId,
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
      attachments: true,
    },
  });

  await prisma.thread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(message, { status: 201 });
}
