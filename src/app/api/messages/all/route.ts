import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workOrderId = searchParams.get("workOrderId");
  const userId = searchParams.get("userId");
  const type = searchParams.get("type");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const role = (session.user as any).role;
  const currentUserId = (session.user as any).id;

  const where: any = {};

  // Role-based access
  if (role === "CLIENT") {
    where.thread = {
      participants: { some: { userId: currentUserId } },
    };
  } else if (role === "CONTRACTOR") {
    where.thread = {
      participants: { some: { userId: currentUserId } },
    };
  }

  if (workOrderId) {
    where.thread = {
      ...where.thread,
      workOrderId,
    };
  }

  if (userId) {
    where.authorId = userId;
  }

  if (type) {
    where.type = type;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, email: true, image: true, role: true } },
        thread: {
          select: {
            id: true,
            title: true,
            workOrder: { select: { id: true, title: true, address: true } },
          },
        },
        attachments: true,
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.message.count({ where }),
  ]);

  return NextResponse.json({
    messages,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
