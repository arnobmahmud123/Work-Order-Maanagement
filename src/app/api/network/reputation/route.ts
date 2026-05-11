import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/network/reputation - Get leaderboard / top contractors
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "rating"; // rating, jobs, reliability
    const limit = parseInt(searchParams.get("limit") || "20");

    let orderBy: any;
    switch (sort) {
      case "jobs":
        orderBy = { completedJobs: "desc" };
        break;
      case "reliability":
        orderBy = { reliabilityScore: "desc" };
        break;
      case "rating":
      default:
        orderBy = { avgRating: "desc" };
    }

    const profiles = await prisma.contractorProfile.findMany({
      orderBy,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, image: true, company: true, role: true },
        },
        badges: true,
      },
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Reputation fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/network/reputation - Rate a contractor
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raterId = (session.user as any).id;
    const { ratedId, workOrderId, score, comment, punctuality, quality, communication } = await req.json();

    if (!ratedId || !score || score < 1 || score > 5) {
      return NextResponse.json({ error: "Valid ratedId and score (1-5) required" }, { status: 400 });
    }

    if (ratedId === raterId) {
      return NextResponse.json({ error: "Cannot rate yourself" }, { status: 400 });
    }

    // Check for duplicate rating
    if (workOrderId) {
      const existing = await prisma.rating.findUnique({
        where: { ratedId_raterId_workOrderId: { ratedId, raterId, workOrderId } },
      });
      if (existing) {
        return NextResponse.json({ error: "Already rated for this work order" }, { status: 409 });
      }
    }

    const rating = await prisma.rating.create({
      data: {
        ratedId,
        raterId,
        workOrderId: workOrderId || null,
        score,
        comment: comment || null,
        punctuality: punctuality || null,
        quality: quality || null,
        communication: communication || null,
      },
    });

    // Update contractor profile stats
    const allRatings = await prisma.rating.findMany({
      where: { ratedId },
      select: { score: true },
    });

    const totalRatings = allRatings.length;
    const avgRating = allRatings.reduce((sum, r) => sum + r.score, 0) / totalRatings;

    await prisma.contractorProfile.upsert({
      where: { userId: ratedId },
      update: { avgRating: Math.round(avgRating * 10) / 10, totalRatings },
      create: {
        userId: ratedId,
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings,
      },
    });

    // Check for badge eligibility
    await checkBadgeEligibility(ratedId);

    return NextResponse.json({ rating }, { status: 201 });
  } catch (error) {
    console.error("Rating error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function checkBadgeEligibility(userId: string) {
  const profile = await prisma.contractorProfile.findUnique({
    where: { userId },
    include: { badges: true },
  });
  if (!profile) return;

  const existingBadgeTypes = new Set(profile.badges.map((b) => b.type));
  const newBadges: Array<{ type: any; label: string; description: string }> = [];

  // Five Star badge
  if (profile.avgRating >= 4.8 && !existingBadgeTypes.has("FIVE_STAR")) {
    newBadges.push({ type: "FIVE_STAR", label: "⭐ Five Star", description: "Maintained 4.8+ average rating" });
  }

  // Top Vendor
  if (profile.completedJobs >= 10 && profile.avgRating >= 4.5 && !existingBadgeTypes.has("TOP_VENDOR")) {
    newBadges.push({ type: "TOP_VENDOR", label: "🏆 Top Vendor", description: "10+ completed jobs with 4.5+ rating" });
  }

  // Completed milestones
  if (profile.completedJobs >= 10 && !existingBadgeTypes.has("COMPLETED_10")) {
    newBadges.push({ type: "COMPLETED_10", label: "🔟 10 Jobs", description: "Completed 10 jobs" });
  }
  if (profile.completedJobs >= 50 && !existingBadgeTypes.has("COMPLETED_50")) {
    newBadges.push({ type: "COMPLETED_50", label: "5️⃣0️⃣ 50 Jobs", description: "Completed 50 jobs" });
  }
  if (profile.completedJobs >= 100 && !existingBadgeTypes.has("COMPLETED_100")) {
    newBadges.push({ type: "COMPLETED_100", label: "💯 100 Jobs", description: "Completed 100 jobs" });
  }

  // Quality Work
  if (profile.totalRatings >= 5 && profile.avgRating >= 4.5 && !existingBadgeTypes.has("QUALITY_WORK")) {
    newBadges.push({ type: "QUALITY_WORK", label: "✨ Quality Work", description: "Consistently high quality" });
  }

  for (const badge of newBadges) {
    await prisma.contractorBadge.create({
      data: { profileId: profile.id, ...badge },
    });
  }
}
