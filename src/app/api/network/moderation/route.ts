import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/network/moderation - List reports (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;

    const reports = await prisma.postReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, image: true, role: true } },
          },
        },
        reporter: {
          select: { id: true, name: true, image: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
      },
    });

    const total = await prisma.postReport.count({ where });

    return NextResponse.json({
      reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Moderation fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/network/moderation - Report a post
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reporterId = (session.user as any).id;
    const { postId, reason, description } = await req.json();

    if (!postId || !reason) {
      return NextResponse.json({ error: "Post ID and reason are required" }, { status: 400 });
    }

    // Check if already reported by this user
    const existing = await prisma.postReport.findUnique({
      where: { postId_reporterId: { postId, reporterId } },
    });

    if (existing) {
      return NextResponse.json({ error: "Already reported" }, { status: 409 });
    }

    const report = await prisma.postReport.create({
      data: {
        postId,
        reporterId,
        reason,
        description: description || null,
      },
      include: {
        post: true,
        reporter: { select: { id: true, name: true } },
      },
    });

    // Auto-flag post if 3+ reports
    const reportCount = await prisma.postReport.count({ where: { postId } });
    if (reportCount >= 3) {
      await prisma.post.update({
        where: { id: postId },
        data: { status: "FLAGGED" },
      });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
