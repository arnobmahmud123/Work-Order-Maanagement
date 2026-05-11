import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/network/feed - Fetch feed with filtering
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const tags = searchParams.get("tags")?.split(",").filter(Boolean);
    const workOrderId = searchParams.get("workOrderId");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius"); // in miles
    const sort = searchParams.get("sort") || "newest"; // newest, popular, urgent
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      status: "ACTIVE",
    };

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (workOrderId) {
      where.workOrderId = workOrderId;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    // Location filtering (simple bounding box)
    if (lat && lng && radius) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radiusNum = parseFloat(radius);
      const latDelta = radiusNum / 69; // ~69 miles per degree
      const lngDelta = radiusNum / (69 * Math.cos((latNum * Math.PI) / 180));

      where.latitude = {
        gte: latNum - latDelta,
        lte: latNum + latDelta,
      };
      where.longitude = {
        gte: lngNum - lngDelta,
        lte: lngNum + lngDelta,
      };
    }

    // Sort order
    let orderBy: any;
    switch (sort) {
      case "popular":
        orderBy = { viewCount: "desc" };
        break;
      case "urgent":
        orderBy = [{ isUrgent: "desc" }, { isPinned: "desc" }, { createdAt: "desc" }];
        break;
      case "newest":
      default:
        orderBy = [{ isPinned: "desc" }, { createdAt: "desc" }];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              company: true,
            },
          },
          workOrder: {
            select: {
              id: true,
              title: true,
              address: true,
              status: true,
              dueDate: true,
              serviceType: true,
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
          reactions: {
            where: { userId: (session.user as any).id },
            select: { type: true },
          },
          attachments: {
            select: {
              id: true,
              filename: true,
              originalName: true,
              mimeType: true,
              url: true,
              thumbnailUrl: true,
            },
          },
          jobRequest: {
            select: {
              id: true,
              status: true,
              urgency: true,
              budget: true,
              deadline: true,
              location: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Feed fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
