import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/network/posts - List posts (with optional filters)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const authorId = searchParams.get("authorId");
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = { status: "ACTIVE" };
    if (authorId) where.authorId = authorId;
    if (category && category !== "ALL") where.category = category;

    const posts = await prisma.post.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: {
          select: { id: true, name: true, image: true, role: true, company: true },
        },
        workOrder: {
          select: { id: true, title: true, address: true, status: true, dueDate: true },
        },
        _count: { select: { comments: true, reactions: true } },
        jobRequest: {
          select: { id: true, status: true, urgency: true, budget: true },
        },
      },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Posts fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/network/posts - Create a new post
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const body = await req.json();
    const { title, content, category, workOrderId, location, city, state, zipCode, latitude, longitude, tags, isUrgent, attachments } = body;

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    // Only admins can create announcements
    if (category === "ANNOUNCEMENT" && role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can create announcements" }, { status: 403 });
    }

    // Validate work order exists if provided
    if (workOrderId) {
      const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
      if (!wo) {
        return NextResponse.json({ error: "Work order not found" }, { status: 404 });
      }
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        category: category || "GENERAL",
        authorId: userId,
        workOrderId: workOrderId || null,
        location: location || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        latitude: latitude || null,
        longitude: longitude || null,
        tags: tags || [],
        isUrgent: isUrgent || false,
        attachments: attachments?.length
          ? {
              create: attachments.map((a: any) => ({
                filename: a.filename,
                originalName: a.originalName,
                mimeType: a.mimeType,
                size: a.size,
                path: a.path,
                url: a.url,
                thumbnailUrl: a.thumbnailUrl,
                uploaderId: userId,
              })),
            }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true, role: true, company: true },
        },
        workOrder: {
          select: { id: true, title: true, address: true, status: true, dueDate: true },
        },
        attachments: true,
        _count: { select: { comments: true, reactions: true } },
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Post create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
