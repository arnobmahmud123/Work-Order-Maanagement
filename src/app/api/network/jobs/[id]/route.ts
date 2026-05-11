import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/network/jobs/[id] - Get job request details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const job = await prisma.jobRequest.findUnique({
      where: { id },
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, image: true, role: true, company: true } },
            attachments: true,
            comments: {
              where: { parentId: null },
              include: {
                author: { select: { id: true, name: true, image: true, role: true } },
                replies: {
                  include: { author: { select: { id: true, name: true, image: true, role: true } } },
                },
              },
            },
          },
        },
        requester: {
          select: { id: true, name: true, image: true, company: true, role: true, email: true, phone: true },
        },
        assignedTo: {
          select: { id: true, name: true, image: true, company: true, email: true, phone: true },
        },
        workOrder: true,
        offers: {
          orderBy: { createdAt: "desc" },
          include: {
            offeror: {
              select: { id: true, name: true, image: true, company: true },
            },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job request not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Job fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/network/jobs/[id] - Update job request status or assignment
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const body = await req.json();

    const job = await prisma.jobRequest.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: "Job request not found" }, { status: 404 });
    }

    const { action, assignedToId, adminApproved, status } = body;

    let updateData: any = {};

    switch (action) {
      case "take_it":
        // Contractor accepts the job directly
        if (job.status !== "OPEN") {
          return NextResponse.json({ error: "Job is not open" }, { status: 400 });
        }
        updateData = {
          assignedToId: userId,
          assignedAt: new Date(),
          status: "ASSIGNED",
        };
        break;

      case "assign":
        // Admin assigns to someone
        if (role !== "ADMIN") {
          return NextResponse.json({ error: "Only admins can assign jobs" }, { status: 403 });
        }
        updateData = {
          assignedToId: assignedToId,
          assignedAt: new Date(),
          status: "ASSIGNED",
        };
        break;

      case "approve":
        // Admin approves the coverage
        if (role !== "ADMIN") {
          return NextResponse.json({ error: "Only admins can approve" }, { status: 403 });
        }
        updateData = {
          adminApproved: true,
          approvedById: userId,
        };
        break;

      case "complete":
        if (job.requesterId !== userId && job.assignedToId !== userId && role !== "ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        updateData = {
          status: "COMPLETED",
          completedAt: new Date(),
        };
        break;

      case "cancel":
        if (job.requesterId !== userId && role !== "ADMIN") {
          return NextResponse.json({ error: "Only requester or admin can cancel" }, { status: 403 });
        }
        updateData = { status: "CANCELLED" };
        break;

      case "update_status":
        if (status) updateData.status = status;
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await prisma.jobRequest.update({
      where: { id },
      data: updateData,
      include: {
        post: true,
        requester: { select: { id: true, name: true, image: true, company: true } },
        assignedTo: { select: { id: true, name: true, image: true, company: true } },
        offers: true,
      },
    });

    // Create notification for relevant parties
    if (action === "take_it" || action === "assign") {
      const notifyUserId = action === "take_it" ? job.requesterId : assignedToId;
      if (notifyUserId) {
        await prisma.notification.create({
          data: {
            title: action === "take_it" ? "Job Taken!" : "Job Assigned",
            message: action === "take_it"
              ? `${(session.user as any).name} wants to take your job request`
              : `You've been assigned a new job`,
            type: "JOB_ASSIGNMENT",
            userId: notifyUserId,
            workOrderId: job.workOrderId,
          },
        });
      }
    }

    return NextResponse.json({ job: updated });
  } catch (error) {
    console.error("Job update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
