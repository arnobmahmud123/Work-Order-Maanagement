import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/network/posts/[id]/comments - Get comments for a post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;

    const comments = await prisma.postComment.findMany({
      where: { postId, parentId: null },
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
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
        reactions: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Comments fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/network/posts/[id]/comments - Create a comment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;
    const userId = (session.user as any).id;
    const { content, parentId, isUrgent } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Verify post exists
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // If replying, verify parent comment exists
    if (parentId) {
      const parent = await prisma.postComment.findUnique({ where: { id: parentId } });
      if (!parent || parent.postId !== postId) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    const comment = await prisma.postComment.create({
      data: {
        content,
        postId,
        authorId: userId,
        parentId: parentId || null,
        isUrgent: isUrgent || false,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true, role: true },
        },
        reactions: true,
        replies: {
          include: {
            author: {
              select: { id: true, name: true, image: true, role: true },
            },
          },
        },
      },
    });

    // Extract @mentions and create notifications
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);
    if (mentions) {
      for (const mention of mentions) {
        const username = mention.slice(1);
        const mentionedUser = await prisma.user.findFirst({
          where: { name: { contains: username, mode: "insensitive" } },
        });
        if (mentionedUser && mentionedUser.id !== userId) {
          await prisma.notification.create({
            data: {
              title: "You were mentioned",
              message: `${(session.user as any).name || "Someone"} mentioned you in a comment`,
              type: "MENTION",
              userId: mentionedUser.id,
              workOrderId: post.workOrderId,
            },
          });
        }
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Comment create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
