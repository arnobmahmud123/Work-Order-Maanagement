import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  // Single query: get channels with members, last message, and counts
  const channels = await prisma.channel.findMany({
    where: {
      isArchived: false,
      OR: [
        { type: { in: ["GENERAL", "WORK_ORDERS"] } },
        { members: { some: { userId } } },
      ],
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, role: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          authorId: true,
          author: { select: { id: true, name: true, image: true } },
        },
      },
      _count: { select: { messages: true, members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Batch unread counts: single query for all channels at once
  const userMemberships = await prisma.channelMember.findMany({
    where: { userId },
    select: { channelId: true, lastReadAt: true },
  });

  const membershipMap = new Map(
    userMemberships.map((m) => [m.channelId, m.lastReadAt])
  );

  // Get unread counts in a single grouped query
  const channelIds = channels.map((c) => c.id);
  const unreadCountsRaw = channelIds.length > 0
    ? await prisma.chatMessage.groupBy({
        by: ["channelId"],
        where: {
          channelId: { in: channelIds },
          authorId: { not: userId },
          // For channels with lastReadAt, count messages after that time
          // For channels without membership (GENERAL/WORK_ORDERS), count all
        },
        _count: { id: true },
      })
    : [];

  // Also get counts filtered by lastReadAt for each channel
  const unreadMap = new Map<string, number>();

  // For channels where user has membership with lastReadAt
  for (const ch of channels) {
    const lastRead = membershipMap.get(ch.id);
    if (lastRead) {
      // Count messages after lastRead
      const count = await prisma.chatMessage.count({
        where: {
          channelId: ch.id,
          authorId: { not: userId },
          createdAt: { gt: lastRead },
        },
      });
      unreadMap.set(ch.id, count);
    } else {
      // No membership or no lastReadAt - show total count for GENERAL/WORK_ORDERS
      if (ch.type === "GENERAL" || ch.type === "WORK_ORDERS") {
        const total = unreadCountsRaw.find((u) => u.channelId === ch.id);
        unreadMap.set(ch.id, total?._count?.id || 0);
      } else {
        unreadMap.set(ch.id, 0);
      }
    }
  }

  // Batch fetch work order photos for WORK_ORDERS channels
  const woChannels = channels.filter(c => c.type === "WORK_ORDERS");
  const woIds = woChannels.map(c => {
    const cuidMatch = (c.name || "").match(/[a-z0-9]{24,}/i) || (c.description || "").match(/[a-z0-9]{24,}/i);
    return cuidMatch ? cuidMatch[0] : null;
  }).filter(Boolean) as string[];

  const workOrders = woIds.length > 0 
    ? await prisma.workOrder.findMany({
        where: { id: { in: woIds } },
        select: { id: true, property: { select: { imageUrl: true } } }
      })
    : [];

  const woPhotoMap = new Map(workOrders.map(wo => [wo.id, wo.property?.imageUrl]));

  const result = channels.map((channel) => {
    let image = null;
    if (channel.type === "WORK_ORDERS") {
      const cuidMatch = (channel.name || "").match(/[a-z0-9]{24,}/i) || (channel.description || "").match(/[a-z0-9]{24,}/i);
      if (cuidMatch) image = woPhotoMap.get(cuidMatch[0]);
    }

    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      type: channel.type,
      isArchived: channel.isArchived,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      members: channel.members,
      lastMessage: channel.messages[0] || null,
      messageCount: channel._count.messages,
      unreadCount: unreadMap.get(channel.id) || 0,
      image,
      imageUrl: channel.imageUrl,
    };
  });

  return NextResponse.json({ channels: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { name, description, type, memberIds } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const channel = await prisma.channel.create({
    data: {
      name,
      description,
      type: type || "CUSTOM",
      createdById: userId,
      members: {
        create: [
          { userId, role: "ADMIN" },
          ...(memberIds || []).map((id: string) => ({ userId: id, role: "MEMBER" })),
        ],
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      _count: { select: { messages: true, members: true } },
    },
  });

  return NextResponse.json(channel, { status: 201 });
}
