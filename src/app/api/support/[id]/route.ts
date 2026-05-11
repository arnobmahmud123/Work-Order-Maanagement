import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true, image: true } },
      assignee: { select: { id: true, name: true, email: true, image: true } },
      comments: {
        include: { author: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(ticket);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: {
      status: body.status,
      priority: body.priority,
      assigneeId: body.assigneeId,
    },
  });

  // Notify ticket creator about status changes
  if (body.status) {
    try {
      await prisma.notification.create({
        data: {
          type: "SUPPORT",
          title: "Support Ticket Updated",
          message: `Your ticket "${ticket.subject}" status changed to ${body.status}`,
          userId: ticket.creatorId,
          ticketId: id,
        },
      });
    } catch {}
  }

  return NextResponse.json(ticket);
}
