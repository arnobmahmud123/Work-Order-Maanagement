import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/network/jobs/[id]/offers - Get offers for a job
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobRequestId } = await params;

    const offers = await prisma.jobOffer.findMany({
      where: { jobRequestId },
      orderBy: { createdAt: "desc" },
      include: {
        offeror: {
          select: { id: true, name: true, image: true, company: true },
        },
      },
    });

    return NextResponse.json({ offers });
  } catch (error) {
    console.error("Offers fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/network/jobs/[id]/offers - Submit an offer
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobRequestId } = await params;
    const userId = (session.user as any).id;
    const { message, proposedBudget, proposedDeadline } = await req.json();

    // Verify job exists and is open
    const job = await prisma.jobRequest.findUnique({
      where: { id: jobRequestId },
      include: { requester: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job request not found" }, { status: 404 });
    }

    if (job.status !== "OPEN") {
      return NextResponse.json({ error: "Job is no longer accepting offers" }, { status: 400 });
    }

    if (job.requesterId === userId) {
      return NextResponse.json({ error: "Cannot offer on your own job" }, { status: 400 });
    }

    // Check for existing offer
    const existing = await prisma.jobOffer.findUnique({
      where: { jobRequestId_offerorId: { jobRequestId, offerorId: userId } },
    });

    if (existing) {
      return NextResponse.json({ error: "You already submitted an offer" }, { status: 409 });
    }

    const offer = await prisma.jobOffer.create({
      data: {
        jobRequestId,
        offerorId: userId,
        message: message || null,
        proposedBudget: proposedBudget || null,
        proposedDeadline: proposedDeadline ? new Date(proposedDeadline) : null,
      },
      include: {
        offeror: {
          select: { id: true, name: true, image: true, company: true },
        },
      },
    });

    // Notify requester
    await prisma.notification.create({
      data: {
        title: "New Offer Received",
        message: `${(session.user as any).name} submitted an offer for your job request`,
        type: "JOB_OFFER",
        userId: job.requesterId,
        workOrderId: job.workOrderId,
      },
    });

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    console.error("Offer create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/network/jobs/[id]/offers - Accept/reject an offer
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobRequestId } = await params;
    const userId = (session.user as any).id;
    const { offerId, action } = await req.json(); // action: "accept" | "reject" | "withdraw"

    const job = await prisma.jobRequest.findUnique({ where: { id: jobRequestId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const offer = await prisma.jobOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.jobRequestId !== jobRequestId) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    if (action === "accept") {
      // Only job requester can accept
      if (job.requesterId !== userId) {
        return NextResponse.json({ error: "Only job owner can accept offers" }, { status: 403 });
      }

      // Accept this offer, reject all others
      await prisma.$transaction([
        prisma.jobOffer.update({
          where: { id: offerId },
          data: { status: "ACCEPTED" },
        }),
        prisma.jobOffer.updateMany({
          where: { jobRequestId, id: { not: offerId }, status: "PENDING" },
          data: { status: "REJECTED" },
        }),
        prisma.jobRequest.update({
          where: { id: jobRequestId },
          data: {
            assignedToId: offer.offerorId,
            assignedAt: new Date(),
            status: "ASSIGNED",
          },
        }),
      ]);

      // Notify the accepted offeror
      await prisma.notification.create({
        data: {
          title: "Offer Accepted!",
          message: `Your offer for the job has been accepted`,
          type: "JOB_OFFER_ACCEPTED",
          userId: offer.offerorId,
          workOrderId: job.workOrderId,
        },
      });

      return NextResponse.json({ success: true, action: "accepted" });
    }

    if (action === "reject") {
      if (job.requesterId !== userId) {
        return NextResponse.json({ error: "Only job owner can reject offers" }, { status: 403 });
      }
      await prisma.jobOffer.update({
        where: { id: offerId },
        data: { status: "REJECTED" },
      });
      return NextResponse.json({ success: true, action: "rejected" });
    }

    if (action === "withdraw") {
      if (offer.offerorId !== userId) {
        return NextResponse.json({ error: "Only offeror can withdraw" }, { status: 403 });
      }
      await prisma.jobOffer.update({
        where: { id: offerId },
        data: { status: "WITHDRAWN" },
      });
      return NextResponse.json({ success: true, action: "withdrawn" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Offer action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
