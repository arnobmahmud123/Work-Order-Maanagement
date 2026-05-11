import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const channel = await prisma.channel.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      type: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: {
          id: true,
          userId: true,
          role: true,
          lastReadAt: true,
          user: { select: { id: true, name: true, email: true, image: true, role: true, isActive: true } },
        },
      },
      _count: { select: { messages: true, members: true } },
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  return NextResponse.json(channel);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { id } = await params;
  const body = await req.json();

  if (body.markRead) {
    await prisma.channelMember.updateMany({
      where: { channelId: id, userId },
      data: { lastReadAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  let updateData: any = {};

  if (body.action === "updatePhoto" && body.imageUrl !== undefined) {
    updateData.imageUrl = body.imageUrl;
  } else {
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isArchived !== undefined) updateData.isArchived = body.isArchived;
  }

  const channel = await prisma.channel.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, description: true, type: true, imageUrl: true },
  });

  return NextResponse.json(channel);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.channel.update({ where: { id }, data: { isArchived: true } });

  return NextResponse.json({ success: true });
}
