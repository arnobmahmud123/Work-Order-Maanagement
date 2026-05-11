import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/network/reputation/[userId] - Get contractor profile
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    let profile = await prisma.contractorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, image: true, company: true, role: true, email: true, phone: true },
        },
        badges: true,
      },
    });

    // Auto-create profile if doesn't exist
    if (!profile) {
      profile = await prisma.contractorProfile.create({
        data: { userId },
        include: {
          user: {
            select: { id: true, name: true, image: true, company: true, role: true, email: true, phone: true },
          },
          badges: true,
        },
      });
    }

    // Get recent ratings
    const ratings = await prisma.rating.findMany({
      where: { ratedId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        raterUser: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Get completed jobs count
    const completedJobs = await prisma.jobRequest.count({
      where: { assignedToId: userId, status: "COMPLETED" },
    });

    // Get active jobs
    const activeJobs = await prisma.jobRequest.count({
      where: { assignedToId: userId, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
    });

    return NextResponse.json({
      profile: {
        ...profile,
        completedJobs,
        activeJobs,
      },
      ratings,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/network/reputation/[userId] - Update own profile
export async function PUT(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const currentUserId = (session.user as any).id;

    if (userId !== currentUserId) {
      return NextResponse.json({ error: "Can only edit your own profile" }, { status: 403 });
    }

    const body = await req.json();
    const { bio, skills, specialties, serviceRadius, isAvailable, hourlyRate, latitude, longitude, city, state, address, zipCode } = body;

    const profile = await prisma.contractorProfile.upsert({
      where: { userId },
      update: {
        ...(bio !== undefined && { bio }),
        ...(skills !== undefined && { skills }),
        ...(specialties !== undefined && { specialties }),
        ...(serviceRadius !== undefined && { serviceRadius }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(hourlyRate !== undefined && { hourlyRate }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(address !== undefined && { address }),
        ...(zipCode !== undefined && { zipCode }),
      },
      create: {
        userId,
        bio: bio || null,
        skills: skills || [],
        specialties: specialties || [],
        serviceRadius: serviceRadius || 50,
        isAvailable: isAvailable !== false,
        hourlyRate: hourlyRate || null,
        latitude: latitude || null,
        longitude: longitude || null,
        city: city || null,
        state: state || null,
        address: address || null,
        zipCode: zipCode || null,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, company: true, role: true },
        },
        badges: true,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
