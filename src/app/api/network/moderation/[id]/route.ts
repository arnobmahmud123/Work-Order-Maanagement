import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT /api/network/moderation/[id] - Review a report (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const { action, resolution } = await req.json();

    const report = await prisma.postReport.findUnique({
      where: { id },
      include: { post: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    let reportStatus: "REVIEWED" | "RESOLVED" | "DISMISSED" = "REVIEWED";
    let postUpdate: any = {};

    switch (action) {
      case "resolve":
        reportStatus = "RESOLVED";
        break;
      case "dismiss":
        reportStatus = "DISMISSED";
        break;
      case "remove_post":
        reportStatus = "RESOLVED";
        postUpdate = { status: "REMOVED" };
        break;
      case "flag_post":
        reportStatus = "REVIEWED";
        postUpdate = { status: "FLAGGED" };
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await prisma.postReport.update({
      where: { id },
      data: {
        status: reportStatus,
        reviewedById: userId,
        resolution: resolution || null,
      },
    });

    if (Object.keys(postUpdate).length > 0) {
      await prisma.post.update({
        where: { id: report.postId },
        data: postUpdate,
      });
    }

    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error("Moderation action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
