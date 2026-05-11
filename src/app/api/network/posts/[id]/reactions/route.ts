import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/network/posts/[id]/reactions - Toggle reaction on post
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;
    const userId = (session.user as any).id;
    const { type = "LIKE" } = await req.json();

    // Check if reaction already exists
    const existing = await prisma.postReaction.findUnique({
      where: {
        userId_postId_type: { userId, postId, type },
      },
    });

    if (existing) {
      // Remove reaction (toggle off)
      await prisma.postReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed", type });
    }

    // Add reaction
    const reaction = await prisma.postReaction.create({
      data: { type, userId, postId },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ action: "added", reaction }, { status: 201 });
  } catch (error) {
    console.error("Reaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
