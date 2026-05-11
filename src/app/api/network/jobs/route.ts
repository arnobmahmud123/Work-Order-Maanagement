import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/network/jobs - List job coverage requests
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "OPEN";
    const urgency = searchParams.get("urgency");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (urgency) where.urgency = urgency;

    // Location filtering
    if (lat && lng && radius) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radiusNum = parseFloat(radius);
      const latDelta = radiusNum / 69;
      const lngDelta = radiusNum / (69 * Math.cos((latNum * Math.PI) / 180));
      where.latitude = { gte: latNum - latDelta, lte: latNum + latDelta };
      where.longitude = { gte: lngNum - lngDelta, lte: lngNum + lngDelta };
    }

    const [jobs, total] = await Promise.all([
      prisma.jobRequest.findMany({
        where,
        orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          post: {
            select: { id: true, title: true, content: true, tags: true, attachments: true },
          },
          requester: {
            select: { id: true, name: true, image: true, company: true, role: true },
          },
          assignedTo: {
            select: { id: true, name: true, image: true, company: true },
          },
          workOrder: {
            select: { id: true, title: true, address: true, status: true, dueDate: true, serviceType: true },
          },
          _count: { select: { offers: true } },
        },
      }),
      prisma.jobRequest.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/network/jobs - Create a job coverage request
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const {
      title, content, workOrderId, scopeOfWork, budget, deadline,
      urgency, location, city, state, zipCode, latitude, longitude, tags,
    } = body;

    if (!title || !scopeOfWork || !location) {
      return NextResponse.json({ error: "Title, scope of work, and location are required" }, { status: 400 });
    }

    // Create the parent post first
    const post = await prisma.post.create({
      data: {
        title,
        content: content || scopeOfWork,
        category: "JOB_COVERAGE",
        authorId: userId,
        workOrderId: workOrderId || null,
        location,
        city,
        state,
        zipCode,
        latitude,
        longitude,
        tags: tags || [],
        isUrgent: urgency === "CRITICAL" || urgency === "HIGH",
      },
    });

    // Create the job request
    const jobRequest = await prisma.jobRequest.create({
      data: {
        postId: post.id,
        requesterId: userId,
        workOrderId: workOrderId || null,
        scopeOfWork,
        budget: budget || null,
        deadline: deadline ? new Date(deadline) : null,
        urgency: urgency || "MEDIUM",
        location,
        city,
        state,
        zipCode,
        latitude,
        longitude,
      },
      include: {
        post: true,
        requester: {
          select: { id: true, name: true, image: true, company: true },
        },
        workOrder: {
          select: { id: true, title: true, address: true, status: true, dueDate: true },
        },
      },
    });

    return NextResponse.json({ jobRequest }, { status: 201 });
  } catch (error) {
    console.error("Job request create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
