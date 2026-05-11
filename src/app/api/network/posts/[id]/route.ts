import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/network/posts/[id] - Get single post with full details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true, role: true, company: true },
        },
        workOrder: {
          select: { id: true, title: true, description: true, address: true, city: true, state: true, status: true, dueDate: true, serviceType: true, tasks: true },
        },
        comments: {
          where: { parentId: null },
          orderBy: [{ isPinned: "desc" }, { createdAt: "asc" }],
          include: {
            author: {
              select: { id: true, name: true, image: true, role: true },
            },
            replies: {
              orderBy: { createdAt: "asc" },
              include: {
                author: {
                  select: { id: true, name: true, image: true, role: true },
                },
                reactions: {
                  include: {
                    user: { select: { id: true, name: true } },
                  },
                },
              },
            },
            reactions: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        attachments: true,
        jobRequest: {
          include: {
            offers: {
              include: {
                offeror: {
                  select: { id: true, name: true, image: true, company: true },
                },
              },
            },
            assignedTo: {
              select: { id: true, name: true, image: true, company: true },
            },
          },
        },
        _count: { select: { comments: true, reactions: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Increment view count
    await prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Post fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/network/posts/[id] - Update post
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Only author or admin can edit
    if (existing.authorId !== userId && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, category, tags, isUrgent, status, location, workOrderId } = body;

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
        ...(tags !== undefined && { tags }),
        ...(isUrgent !== undefined && { isUrgent }),
        ...(status !== undefined && role === "ADMIN" && { status }),
        ...(location !== undefined && { location }),
        ...(workOrderId !== undefined && { workOrderId: workOrderId || null }),
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

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Post update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/network/posts/[id] - Delete post
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Only author or admin can delete
    if (existing.authorId !== userId && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.post.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Post delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
