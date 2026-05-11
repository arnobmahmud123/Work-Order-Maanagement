import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── AI Image Search ─────────────────────────────────────────────────────────
// Search uploaded photos by natural language description.
// Matches against: filename, category, work order title, address, service type.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const workOrderId = searchParams.get("workOrderId") || "";
  const limit = parseInt(searchParams.get("limit") || "50");

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (!query && !category && !workOrderId) {
    return NextResponse.json(
      { error: "Search query, category, or work order ID required" },
      { status: 400 }
    );
  }

  // Build search conditions
  const where: any = {
    mimeType: { startsWith: "image/" },
  };

  // Role-based access
  if (role === "CONTRACTOR") {
    where.workOrder = { contractorId: userId };
  } else if (role === "CLIENT") {
    where.workOrder = { contractorId: userId }; // Simplified
  }

  if (workOrderId) {
    where.workOrderId = workOrderId;
  }

  if (category) {
    where.category = category.toUpperCase();
  }

  // Text search across filename and work order details
  if (query) {
    const searchTerms = query.toLowerCase().split(/\s+/);

    // Map common search terms to categories and service types
    const categoryMap: Record<string, string> = {
      before: "BEFORE",
      during: "DURING",
      after: "AFTER",
      bid: "BID",
      inspection: "INSPECTION",
      doc: "DOCS",
      document: "DOCS",
    };

    const serviceMap: Record<string, string> = {
      grass: "GRASS_CUT",
      lawn: "GRASS_CUT",
      debris: "DEBRIS_REMOVAL",
      trash: "DEBRIS_REMOVAL",
      winter: "WINTERIZATION",
      winterize: "WINTERIZATION",
      board: "BOARD_UP",
      mold: "MOLD_REMEDIATION",
      lock: "WINTERIZATION",
      key: "WINTERIZATION",
      window: "BOARD_UP",
    };

    const matchedCategories = searchTerms
      .filter((t) => categoryMap[t])
      .map((t) => categoryMap[t]);

    const matchedServices = searchTerms
      .filter((t) => serviceMap[t])
      .map((t) => serviceMap[t]);

    const textTerms = searchTerms.filter(
      (t) => !categoryMap[t] && !serviceMap[t] && t.length > 2
    );

    const orConditions: any[] = [];

    if (matchedCategories.length > 0 && !category) {
      orConditions.push({ category: { in: matchedCategories } });
    }

    if (matchedServices.length > 0) {
      orConditions.push({
        workOrder: { serviceType: { in: matchedServices } },
      });
    }

    if (textTerms.length > 0) {
      orConditions.push(
        ...textTerms.map((term) => ({
          originalName: { contains: term, mode: "insensitive" },
        })),
        ...textTerms.map((term) => ({
          workOrder: {
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { address: { contains: term, mode: "insensitive" } },
              { description: { contains: term, mode: "insensitive" } },
            ],
          },
        }))
      );
    }

    if (orConditions.length > 0) {
      where.AND = where.AND || [];
      where.AND.push({ OR: orConditions });
    }
  }

  const files = await prisma.fileUpload.findMany({
    where,
    include: {
      workOrder: {
        select: {
          id: true,
          title: true,
          address: true,
          city: true,
          state: true,
          serviceType: true,
          status: true,
        },
      },
      uploader: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Group by work order for better presentation
  const grouped = files.reduce((acc: any, file: any) => {
    const woId = file.workOrderId || "no-work-order";
    if (!acc[woId]) {
      acc[woId] = {
        workOrder: file.workOrder,
        files: [],
      };
    }
    acc[woId].files.push(file);
    return acc;
  }, {});

  return NextResponse.json({
    query,
    results: files,
    grouped: Object.values(grouped),
    total: files.length,
  });
}
