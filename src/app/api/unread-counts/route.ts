import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  // Chat unread: count messages in channels the user belongs to,
  // created after the user's lastReadAt for that channel
  const channelMembers = await prisma.channelMember.findMany({
    where: { userId },
    select: { channelId: true, lastReadAt: true },
  });

  let chatUnread = 0;
  for (const cm of channelMembers) {
    const where: any = { channelId: cm.channelId, authorId: { not: userId } };
    if (cm.lastReadAt) {
      where.createdAt = { gt: cm.lastReadAt };
    }
    const count = await prisma.chatMessage.count({ where });
    chatUnread += count;
  }

  // Notification unread
  const notifUnread = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return NextResponse.json({
    chat: chatUnread,
    email: 0, // Email uses in-memory store; will be updated when email is DB-backed
    notifications: notifUnread,
  });
}
