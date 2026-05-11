import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const threads = await prisma.thread.findMany({
    where: {
      participants: {
        some: { userId, blocked: false },
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, role: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { author: { select: { id: true, name: true, image: true } } },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(threads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, workOrderId, participantIds, isGeneral } = body;
  const userId = (session.user as any).id;

  const thread = await prisma.thread.create({
    data: {
      title,
      workOrderId,
      isGeneral: isGeneral || false,
      participants: {
        create: [
          { userId, role: "ADMIN" },
          ...(participantIds || []).map((id: string) => ({
            userId: id,
            role: "MEMBER",
          })),
        ],
      },
    },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  return NextResponse.json(thread, { status: 201 });
}
