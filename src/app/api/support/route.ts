import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const where: any = {};

  if (!["ADMIN", "COORDINATOR"].includes(role)) {
    where.creatorId = userId;
  }

  const tickets = await prisma.supportTicket.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { subject, description, priority, category } = body;

  if (!subject || !description) {
    return NextResponse.json(
      { error: "Subject and description are required" },
      { status: 400 }
    );
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      subject,
      description,
      priority: priority || "MEDIUM",
      category,
      creatorId: (session.user as any).id,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(ticket, { status: 201 });
}
