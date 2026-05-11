import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const specialty = searchParams.get("specialty");
  const availability = searchParams.get("availability");
  const search = searchParams.get("search");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = parseFloat(searchParams.get("radius") || "50"); // miles

  const where: any = { isActive: true };

  if (specialty) {
    where.specialties = { some: { specialty } };
  }
  if (availability) {
    where.availability = availability;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  let inspectors = await prisma.inspector.findMany({
    where,
    include: {
      specialties: true,
      _count: { select: { callLogs: true } },
    },
    orderBy: { rating: "desc" },
  });

  // Filter by distance if coordinates provided
  if (lat && lng) {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    inspectors = inspectors
      .map((inspector) => {
        if (!inspector.latitude || !inspector.longitude) return null;
        const dist = getDistanceMiles(userLat, userLng, inspector.latitude, inspector.longitude);
        return { ...inspector, distance: Math.round(dist * 10) / 10 };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null && i.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  return NextResponse.json({ inspectors });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, company, bio, address, city, state, zipCode, latitude, longitude, hourlyRate, specialties } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const inspector = await prisma.inspector.create({
    data: {
      name,
      email,
      phone,
      company,
      bio,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      hourlyRate,
      specialties: specialties?.length
        ? { create: specialties.map((s: any) => ({ specialty: s.specialty, yearsExp: s.yearsExp, certified: s.certified })) }
        : undefined,
    },
    include: { specialties: true },
  });

  return NextResponse.json(inspector, { status: 201 });
}

function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
