import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Haversine distance in miles
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode a location string to coordinates
async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      { headers: { "User-Agent": "PreservationPro/1.0" } }
    );
    const results = await res.json();
    if (results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
  } catch {}
  return null;
}

// ─── AI Contractor Finder ────────────────────────────────────────────────────
// Find contractors for a specific job based on location, service type,
// availability, and performance metrics.

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const serviceType = searchParams.get("serviceType") || "";
  const location = searchParams.get("location") || "";
  const minRating = parseFloat(searchParams.get("minRating") || "0");
  const availableOnly = searchParams.get("available") === "true";
  const radiusMiles = parseFloat(searchParams.get("radius") || "100"); // default 100 miles

  // Determine if the search looks like a zip code (5 digits)
  const isZipSearch = /^\d{5}$/.test(location.trim());

  // Geocode the search location for distance-based sorting
  // For zip codes, we also geocode to enable radius-based search
  let searchCoords: { lat: number; lng: number } | null = null;
  if (location) {
    if (isZipSearch) {
      // Geocode the zip code to get coordinates for radius search
      searchCoords = await geocodeLocation(location.trim() + ", USA");
    } else {
      searchCoords = await geocodeLocation(location);
    }
  }

  // Build where clause - STRICTLY role = CONTRACTOR
  const where: any = {
    role: "CONTRACTOR",
    isActive: true,
  };

  // Get all contractors with their work order history
  let contractors = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      image: true,
      role: true,
      createdAt: true,
      contractorProfile: {
        select: {
          address: true,
          city: true,
          state: true,
          zipCode: true,
          isAvailable: true,
          avgRating: true,
          serviceRadius: true,
          hourlyRate: true,
          latitude: true,
          longitude: true,
        },
      },
      assignedWorkOrders: {
        select: {
          id: true,
          title: true,
          status: true,
          serviceType: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          files: { select: { id: true, category: true } },
          invoices: { select: { total: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // Double-check: only keep users who are actually contractors
  // (guards against any DB inconsistencies)
  contractors = contractors.filter((c: any) => c.role === "CONTRACTOR");

  // Calculate detailed stats for each contractor
  const contractorProfiles = contractors.map((c: any) => {
    const orders = c.assignedWorkOrders;
    const completed = orders.filter(
      (wo: any) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
    );
    const active = orders.filter(
      (wo: any) => !["CLOSED", "CANCELLED"].includes(wo.status)
    );
    const overdue = orders.filter(
      (wo: any) =>
        wo.dueDate &&
        new Date(wo.dueDate) < new Date() &&
        !["CLOSED", "CANCELLED"].includes(wo.status)
    );

    // Service type breakdown
    const serviceBreakdown = orders.reduce((acc: Record<string, number>, wo: any) => {
      acc[wo.serviceType] = (acc[wo.serviceType] || 0) + 1;
      return acc;
    }, {});

    // Location coverage - include profile address + work order locations
    const profileLocation = c.contractorProfile?.address
      ? [c.contractorProfile.address, c.contractorProfile.city, c.contractorProfile.state]
          .filter(Boolean)
          .join(", ")
      : null;
    const woLocations: string[] = [
      ...new Set(
        orders.map((wo: any) => [wo.city, wo.state].filter(Boolean).join(", "))
      ),
    ].filter(Boolean) as string[];
    const locations: string[] = [
      ...(profileLocation ? [profileLocation] : []),
      ...woLocations,
    ].filter(Boolean) as string[];

    // Collect all zip codes associated with this contractor (profile + work orders)
    const allZips: string[] = [
      c.contractorProfile?.zipCode,
      ...orders.map((wo: any) => wo.zipCode),
    ].filter(Boolean) as string[];
    const uniqueZips = [...new Set(allZips)];

    // Photo compliance rate
    const ordersWithPhotos = completed.filter(
      (wo: any) => wo.files?.some((f: any) => f.category === "AFTER")
    );
    const photoCompliance =
      completed.length > 0
        ? ((ordersWithPhotos.length / completed.length) * 100).toFixed(1)
        : "N/A";

    // Average completion time
    const completionTimes = completed
      .filter((wo: any) => wo.completedAt && wo.createdAt)
      .map(
        (wo: any) =>
          new Date(wo.completedAt).getTime() - new Date(wo.createdAt).getTime()
      );
    const avgCompletionDays =
      completionTimes.length > 0
        ? (
            completionTimes.reduce((a: number, b: number) => a + b, 0) /
            completionTimes.length /
            (1000 * 60 * 60 * 24)
          ).toFixed(1)
        : "N/A";

    // Total revenue
    const totalRevenue = orders.reduce(
      (sum: number, wo: any) =>
        sum + wo.invoices.reduce((s: number, inv: any) => s + inv.total, 0),
      0
    );

    // On-time rate
    const onTimeCompleted = completed.filter(
      (wo: any) => !wo.dueDate || new Date(wo.completedAt) <= new Date(wo.dueDate)
    );
    const onTimeRate =
      completed.length > 0
        ? ((onTimeCompleted.length / completed.length) * 100).toFixed(1)
        : "N/A";

    // Filter by service type if specified
    const matchesService =
      !serviceType || serviceBreakdown[serviceType] > 0;

    // ── Location matching ──
    let distanceMiles: number | null = null;
    const profileLat = c.contractorProfile?.latitude;
    const profileLng = c.contractorProfile?.longitude;
    let isExactZipMatch = false;

    if (location) {
      if (isZipSearch) {
        // ZIP CODE SEARCH: exact zip match gets priority, but also support radius
        const searchZip = location.trim();
        const profileZip = (c.contractorProfile?.zipCode || "").trim();
        isExactZipMatch =
          profileZip === searchZip ||
          uniqueZips.some((z: string) => z.trim() === searchZip);

        // Calculate distance using coordinates for radius-based search
        if (searchCoords && profileLat && profileLng) {
          distanceMiles = haversineDistance(searchCoords.lat, searchCoords.lng, profileLat, profileLng);
        }
      } else {
        // CITY/STATE/ADDRESS SEARCH: use distance-based matching
        if (searchCoords && profileLat && profileLng) {
          distanceMiles = haversineDistance(searchCoords.lat, searchCoords.lng, profileLat, profileLng);
        }
      }
    }

    // Location match logic
    let matchesLocation = true;
    if (location) {
      if (isZipSearch) {
        // For zip code search: exact zip match OR within radius
        matchesLocation = isExactZipMatch || (distanceMiles !== null && distanceMiles <= radiusMiles);
      } else {
        // For city/state/address search: distance-based or text-based
        matchesLocation =
          (distanceMiles !== null && distanceMiles <= radiusMiles) ||
          (distanceMiles === null && (
            locations.some((loc: string) =>
              loc.toLowerCase().includes(location.toLowerCase())
            ) ||
            (c.contractorProfile?.city && c.contractorProfile.city.toLowerCase().includes(location.toLowerCase())) ||
            (c.contractorProfile?.state && c.contractorProfile.state.toLowerCase().includes(location.toLowerCase()))
          ));
      }
    }

    // Calculate overall score (0-100)
    const completionRate = orders.length > 0 ? completed.length / orders.length : 0;
    const onTime = onTimeRate !== "N/A" ? parseFloat(onTimeRate) / 100 : 0.5;
    const photoRate =
      photoCompliance !== "N/A" ? parseFloat(photoCompliance) / 100 : 0.5;
    const score = Math.round(
      (completionRate * 30 + onTime * 30 + photoRate * 20 + (1 - overdue.length / Math.max(orders.length, 1)) * 20) * 100
    );

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      image: c.image,
      memberSince: c.createdAt,
      profile: c.contractorProfile
        ? {
            address: c.contractorProfile.address,
            city: c.contractorProfile.city,
            state: c.contractorProfile.state,
            zipCode: c.contractorProfile.zipCode,
            isAvailable: c.contractorProfile.isAvailable,
            avgRating: c.contractorProfile.avgRating,
            hourlyRate: c.contractorProfile.hourlyRate,
            serviceRadius: c.contractorProfile.serviceRadius,
            latitude: profileLat,
            longitude: profileLng,
          }
        : null,
      distanceMiles: distanceMiles !== null ? Math.round(distanceMiles * 10) / 10 : null,
      isExactZipMatch,
      stats: {
        totalJobs: orders.length,
        completedJobs: completed.length,
        activeJobs: active.length,
        overdueJobs: overdue.length,
        completionRate:
          orders.length > 0
            ? ((completed.length / orders.length) * 100).toFixed(1)
            : "N/A",
        onTimeRate,
        photoCompliance,
        avgCompletionDays,
        totalRevenue: totalRevenue.toFixed(2),
        overallScore: score,
      },
      serviceBreakdown,
      locations: locations.slice(0, 5),
      matchesService,
      matchesLocation,
    };
  });

  // Filter out non-matching contractors and those without a profile
  const filtered = contractorProfiles.filter(
    (c: any) => c.matchesService && c.matchesLocation && c.profile !== null
  );

  // Sort: if zip code search, exact zip matches first (sorted by score).
  // If city/state search with coordinates, sort by distance.
  // Otherwise sort by score.
  if (isZipSearch) {
    filtered.sort((a: any, b: any) => {
      // Exact zip matches first
      if (a.isExactZipMatch && !b.isExactZipMatch) return -1;
      if (!a.isExactZipMatch && b.isExactZipMatch) return 1;
      // Then by score
      return b.stats.overallScore - a.stats.overallScore;
    });
  } else if (searchCoords) {
    filtered.sort((a: any, b: any) => {
      if (a.distanceMiles !== null && b.distanceMiles === null) return -1;
      if (a.distanceMiles === null && b.distanceMiles !== null) return 1;
      if (a.distanceMiles !== null && b.distanceMiles !== null) {
        if (Math.abs(a.distanceMiles - b.distanceMiles) > 5) {
          return a.distanceMiles - b.distanceMiles;
        }
        return b.stats.overallScore - a.stats.overallScore;
      }
      return b.stats.overallScore - a.stats.overallScore;
    });
  } else {
    filtered.sort(
      (a: any, b: any) => b.stats.overallScore - a.stats.overallScore
    );
  }

  return NextResponse.json({
    contractors: filtered,
    total: filtered.length,
    filters: { serviceType, location, minRating, availableOnly, radius: radiusMiles },
  });
}
