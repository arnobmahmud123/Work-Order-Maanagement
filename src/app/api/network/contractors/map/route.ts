import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Haversine distance in miles
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode an address using Nominatim (server-side)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "User-Agent": "PreservationPro/1.0" } }
    );
    const results = await res.json();
    if (results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
  } catch {}
  return null;
}

// Geocode contractors that have address but no lat/lng, and persist to DB
async function geocodeAndPersist(profileId: string, address: string, city: string | null, state: string | null, zipCode: string | null): Promise<{ lat: number; lng: number } | null> {
  const query = [address, city, state, zipCode].filter(Boolean).join(", ");
  if (!query) return null;

  const coords = await geocodeAddress(query);
  if (coords) {
    // Persist to DB so we don't need to geocode again
    try {
      await prisma.contractorProfile.update({
        where: { id: profileId },
        data: { latitude: coords.lat, longitude: coords.lng },
      });
    } catch {}
  }
  return coords;
}

// GET /api/network/contractors/map - Find nearby contractors
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radius = parseFloat(searchParams.get("radius") || "50"); // miles
    const serviceType = searchParams.get("serviceType") || "";
    const availableOnly = searchParams.get("available") !== "false";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build filter - only show actual contractors (not admins, coordinators, etc.)
    const where: any = {
      user: { role: "CONTRACTOR", isActive: true },
    };
    if (availableOnly) {
      where.isAvailable = true;
    }
    if (serviceType) {
      where.specialties = { has: serviceType };
    }

    // If coordinates provided, do bounding box pre-filter but also include
    // contractors without lat/lng (address-only) so they aren't silently dropped.
    if (lat && lng) {
      const latDelta = radius / 69;
      const lngDelta = radius / (69 * Math.cos((lat * Math.PI) / 180));
      const baseFilter = { ...where };
      where.AND = [
        baseFilter,
        {
          OR: [
            // Within bounding box
            {
              latitude: { gte: lat - latDelta, lte: lat + latDelta },
              longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
            },
            // Address-only (no coordinates yet)
            { latitude: null, longitude: null },
          ],
        },
      ];
      // Remove top-level keys that are now inside AND
      if (availableOnly) delete where.isAvailable;
      if (serviceType) delete where.specialties;
    }

    const profiles = await prisma.contractorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            company: true,
            role: true,
            phone: true,
            email: true,
            isActive: true,
            assignedWorkOrders: {
              where: { status: { in: ["NEW", "ASSIGNED", "IN_PROGRESS"] } },
              select: {
                id: true,
                title: true,
                status: true,
                dueDate: true,
                address: true,
                city: true,
                state: true,
                latitude: true,
                longitude: true,
                serviceType: true,
              },
              orderBy: { dueDate: "asc" },
            },
          },
        },
        badges: true,
      },
      take: limit * 2, // fetch extra for distance filtering
    });

    // Identify contractors that need geocoding (address but no lat/lng)
    const needsGeocoding = profiles.filter(
      (p: any) => p.user?.isActive && !p.latitude && !p.longitude && (p.address || p.city)
    );

    // Geocode missing coordinates in parallel (batch)
    const geocodeResults: Record<string, { lat: number; lng: number }> = {};
    if (needsGeocoding.length > 0) {
      const geocodePromises = needsGeocoding.map(async (p: any) => {
        const coords = await geocodeAndPersist(p.id, p.address, p.city, p.state, p.zipCode);
        if (coords) {
          geocodeResults[p.id] = coords;
        }
      });
      await Promise.all(geocodePromises);
    }

    // Calculate distance and enrich data
    const contractors = profiles
      .map((p: any) => {
        const user = p.user;
        if (!user || !user.isActive) return null;

        // Get coordinates: prefer DB, fall back to geocoded
        const plat = p.latitude || geocodeResults[p.id]?.lat || null;
        const plng = p.longitude || geocodeResults[p.id]?.lng || null;

        // Calculate distance if both have coordinates
        let distance: number | null = null;
        if (lat && lng && plat && plng) {
          distance = haversineDistance(lat, lng, plat, plng);
        }

        // Count active work orders
        const activeJobs = user.assignedWorkOrders?.length || 0;

        // Check if contractor is overloaded (3+ active jobs)
        const isOverloaded = activeJobs >= 3;

        // Earliest available date (next free slot after current jobs)
        const dueDates = (user.assignedWorkOrders || [])
          .map((wo: any) => wo.dueDate ? new Date(wo.dueDate) : null)
          .filter(Boolean) as Date[];
        const nextFreeDate = dueDates.length > 0
          ? new Date(Math.max(...dueDates.map(d => d.getTime())))
          : new Date();

        return {
          id: p.id,
          userId: p.userId,
          role: user.role,
          name: user.name,
          image: user.image,
          company: user.company,
          phone: user.phone,
          email: user.email,
          bio: p.bio,
          skills: p.skills,
          specialties: p.specialties,
          hourlyRate: p.hourlyRate,
          serviceRadius: p.serviceRadius,
          isAvailable: p.isAvailable,
          address: p.address,
          city: p.city,
          state: p.state,
          zipCode: p.zipCode,
          latitude: plat,
          longitude: plng,
          distance: distance !== null ? Math.round(distance * 10) / 10 : null,
          stats: {
            avgRating: p.avgRating,
            totalRatings: p.totalRatings,
            completedJobs: p.completedJobs,
            reliabilityScore: p.reliabilityScore,
            responseTime: p.responseTime,
          },
          badges: p.badges?.map((b: any) => ({
            type: b.type,
            label: b.label,
          })) || [],
          activeJobs,
          isOverloaded,
          nextFreeDate: nextFreeDate.toISOString(),
          activeWorkOrders: (user.assignedWorkOrders || []).map((wo: any) => ({
            id: wo.id,
            title: wo.title,
            status: wo.status,
            dueDate: wo.dueDate,
            address: wo.address,
            serviceType: wo.serviceType,
          })),
        };
      })
      .filter(Boolean);

    // Apply precise distance filter and sort
    let filtered = contractors;
    if (lat && lng) {
      // Only show contractors whose calculated distance is within radius
      // Include those with no coordinates (address-only, couldn't geocode) at the end
      const withDistance = contractors
        .filter((c: any) => c.distance !== null && c.distance <= radius)
        .sort((a: any, b: any) => a.distance - b.distance);
      const noDistance = contractors.filter((c: any) => c.distance === null);
      filtered = [...withDistance, ...noDistance];
    } else {
      // Without coordinates, sort by rating
      filtered.sort((a: any, b: any) => b.stats.avgRating - a.stats.avgRating);
    }

    return NextResponse.json({
      contractors: filtered.slice(0, limit),
      addressOnlyContractors: [], // No longer needed - all geocoded server-side
      total: filtered.length,
      center: lat && lng ? { lat, lng } : null,
      radius,
      // Diagnostic info when no results
      debug: filtered.length === 0 ? {
        totalProfiles: profiles.length,
        message: profiles.length === 0
          ? "No ContractorProfile rows found in database. Run: npx tsx prisma/seed-network.ts"
          : "ContractorProfile rows exist but none linked to users with role CONTRACTOR",
      } : undefined,
    });
  } catch (error) {
    console.error("Contractor map error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
