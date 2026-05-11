"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin, Search, Filter, Star, Clock, CheckCircle,
  Phone, Mail, ChevronDown, ChevronUp, Navigation,
  Shield, Zap, Briefcase, X, Locate, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICE_TYPES = [
  { value: "", label: "All Services" },
  { value: "GRASS_CUT", label: "Grass Cut" },
  { value: "DEBRIS_REMOVAL", label: "Debris Removal" },
  { value: "WINTERIZATION", label: "Winterization" },
  { value: "BOARD_UP", label: "Board Up" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "MOLD_REMEDIATION", label: "Mold Remediation" },
  { value: "OTHER", label: "Other" },
];

const RADIUS_OPTIONS = [
  { value: 10, label: "10 mi" },
  { value: 25, label: "25 mi" },
  { value: 50, label: "50 mi" },
  { value: 100, label: "100 mi" },
  { value: 200, label: "200 mi" },
];

export default function ContractorMapPage() {
  const { data: session } = useSession();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(50);
  const [serviceType, setServiceType] = useState("");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [selectedContractor, setSelectedContractor] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [geocodedCoords, setGeocodedCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const userLocationMarkerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);

  // Haversine distance in miles (client-side for geocoded contractors)
  function haversineDistanceLocal(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    return Math.round((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) * 10) / 10;
  }

  const searchParams = useSearchParams();

  // Read lat/lng from URL params on mount
  useEffect(() => {
    const urlLat = searchParams.get("lat");
    const urlLng = searchParams.get("lng");
    if (urlLat && urlLng) {
      setCenter({ lat: parseFloat(urlLat), lng: parseFloat(urlLng) });
    }
  }, [searchParams]);

  // Fetch contractors
  const { data, isLoading } = useQuery({
    queryKey: ["contractor-map", center?.lat, center?.lng, radius, serviceType, availableOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (center) {
        params.set("lat", center.lat.toString());
        params.set("lng", center.lng.toString());
      }
      params.set("radius", radius.toString());
      if (serviceType) params.set("serviceType", serviceType);
      params.set("available", availableOnly.toString());
      const res = await fetch(`/api/network/contractors/map?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!center,
  });

  const contractors = data?.contractors || [];
  const addressOnlyContractors = data?.addressOnlyContractors || [];
  const debugInfo = data?.debug;

  // Geocode contractors that have an address but no lat/lng
  useEffect(() => {
    if (addressOnlyContractors.length === 0) return;

    const geocode = async () => {
      const updates: Record<string, { lat: number; lng: number }> = {};
      for (const c of addressOnlyContractors) {
        if (geocodedCoords[c.id]) continue; // already geocoded
        const query = [c.address, c.city, c.state, c.zipCode].filter(Boolean).join(", ");
        if (!query) continue;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
          );
          const results = await res.json();
          if (results.length > 0) {
            updates[c.id] = {
              lat: parseFloat(results[0].lat),
              lng: parseFloat(results[0].lon),
            };
          }
          // Rate limit: 1 req/sec for Nominatim
          await new Promise((r) => setTimeout(r, 1100));
        } catch {}
      }
      if (Object.keys(updates).length > 0) {
        setGeocodedCoords((prev) => ({ ...prev, ...updates }));
      }
    };
    geocode();
  }, [addressOnlyContractors]);

  // Build final list: geocoded address-only contractors filtered by distance
  const geocodedAddressOnly = addressOnlyContractors
    .filter((c: any) => geocodedCoords[c.id])
    .map((c: any) => {
      const coords = geocodedCoords[c.id]!;
      let distance: number | null = null;
      if (center) {
        distance = haversineDistanceLocal(center.lat, center.lng, coords.lat, coords.lng);
      }
      return { ...c, latitude: coords.lat, longitude: coords.lng, distance };
    })
    .filter((c: any) => c.distance === null || c.distance <= radius);

  const allContractors = [...contractors, ...geocodedAddressOnly];

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const init = async () => {
      // Dynamically load Leaflet CSS + JS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      const L = (window as any).L;

      const map = L.map(mapRef.current!, {
        zoomControl: false,
        attributionControl: false,
      }).setView([39.8283, -98.5795], 4); // US center

      // Dynamic tile layer based on theme
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const tileUrl = isDark 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        maxZoom: 19,
      }).addTo(map);

      // Zoom control position
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Attribution
      L.control.attribution({ position: "bottomleft", prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>')
        .addTo(map);

      leafletMapRef.current = map;
      setMapReady(true);
    };

    init();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current = null;
      }
      if (radiusCircleRef.current) {
        radiusCircleRef.current = null;
      }
    };
  }, []);

  // Update markers when contractors change
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const L = (window as any).L;
    const map = leafletMapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add contractor markers
    allContractors.forEach((c: any) => {
      const lat = c.latitude || geocodedCoords[c.id]?.lat;
      const lng = c.longitude || geocodedCoords[c.id]?.lng;
      if (!lat || !lng) return;

      const color = c.isAvailable ? "#10b981" : c.isOverloaded ? "#f59e0b" : "#6b7280";
      const initial = c.name?.[0]?.toUpperCase() || "?";
      const pulseClass = c.isAvailable ? "contractor-marker-available" : "";

      // Google Maps-style SVG pin marker
      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48" class="${pulseClass}">
          <defs>
            <linearGradient id="grad-${c.id}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${color}cc;stop-opacity:1" />
            </linearGradient>
            <filter id="shadow-${c.id}" x="-20%" y="-10%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
            </filter>
          </defs>
          <!-- Pin shape -->
          <path d="M18 46 C18 46 3 28 3 17 C3 8.716 9.716 2 18 2 C26.284 2 33 8.716 33 17 C33 28 18 46 18 46Z"
                fill="url(#grad-${c.id})" stroke="white" stroke-width="1.5" filter="url(#shadow-${c.id})"/>
          <!-- Inner circle -->
          <circle cx="18" cy="17" r="11" fill="rgba(255,255,255,0.2)"/>
          <!-- Initial letter -->
          <text x="18" y="21.5" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif"
                font-size="13" font-weight="700" fill="white">${initial}</text>
        </svg>
      `;

      const icon = L.divIcon({
        className: "contractor-marker-container",
        html: pinSvg,
        iconSize: [36, 48],
        iconAnchor: [18, 48],   // tip of the pin
        popupAnchor: [0, -48],  // popup above the pin
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(map);

      // Popup
      const stars = "★".repeat(Math.round(c.stats?.avgRating || 0)) + "☆".repeat(5 - Math.round(c.stats?.avgRating || 0));
      const statusColor = c.isAvailable ? "#10b981" : "#ef4444";
      const statusText = c.isAvailable ? "Available" : c.isOverloaded ? "Busy" : "Unavailable";

      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #06b6d4, #3b82f6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 13px;">
              ${c.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 13px; color: #1e293b;">${c.name || "Unknown"}</div>
              <div style="font-size: 11px; color: #64748b;">${c.company || ""}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="color: #f59e0b; font-size: 12px;">${stars}</span>
            <span style="font-size: 11px; color: #64748b;">${c.stats?.avgRating?.toFixed(1) || "0.0"} (${c.stats?.totalRatings || 0})</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></span>
            <span style="font-size: 11px; color: #475569;">${statusText}</span>
            ${c.distance !== null ? `<span style="font-size: 11px; color: #94a3b8; margin-left: 8px;">📍 ${c.distance} mi</span>` : ""}
          </div>
          ${c.specialties?.length ? `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">${c.specialties.slice(0, 3).join(" · ")}</div>` : ""}
          ${(c.address || c.city) ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">📍 ${c.address ? c.address + ", " : ""}${c.city || ""}${c.state ? ", " + c.state : ""}${c.zipCode ? " " + c.zipCode : ""}</div>` : ""}
          ${c.hourlyRate ? `<div style="font-size: 12px; color: #0ea5e9; font-weight: 600; margin-top: 4px;">$${c.hourlyRate}/hr</div>` : ""}
        </div>
      `, { closeButton: false, maxWidth: 280 });

      marker.on("click", () => {
        setSelectedContractor(c);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have contractors
    if (allContractors.length > 0) {
      const bounds = L.latLngBounds(
        allContractors
          .filter((c: any) => {
            const lat = c.latitude || geocodedCoords[c.id]?.lat;
            const lng = c.longitude || geocodedCoords[c.id]?.lng;
            return lat && lng;
          })
          .map((c: any) => {
            const lat = c.latitude || geocodedCoords[c.id]!.lat;
            const lng = c.longitude || geocodedCoords[c.id]!.lng;
            return [lat, lng];
          })
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [allContractors, mapReady, geocodedCoords]);

  // Center map when location changes + add user location marker
  useEffect(() => {
    if (center && leafletMapRef.current) {
      const L = (window as any).L;
      const map = leafletMapRef.current;

      map.setView([center.lat, center.lng], 10);

      // Remove old user location marker
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }

      // Add Google Maps-style blue dot for user location
      const userDotSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
          <defs>
            <filter id="user-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(37,99,235,0.5)"/>
            </filter>
          </defs>
          <circle cx="14" cy="14" r="12" fill="rgba(37,99,235,0.15)" stroke="none"/>
          <circle cx="14" cy="14" r="8" fill="rgba(37,99,235,0.25)" stroke="none"/>
          <circle cx="14" cy="14" r="6" fill="#2563eb" stroke="white" stroke-width="2.5" filter="url(#user-shadow)"/>
        </svg>
      `;

      const userIcon = L.divIcon({
        className: "user-location-marker",
        html: userDotSvg,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      userLocationMarkerRef.current = L.marker([center.lat, center.lng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map);

      // Remove old radius circle
      if (radiusCircleRef.current) {
        radiusCircleRef.current.remove();
        radiusCircleRef.current = null;
      }

      // Add radius circle (search area)
      radiusCircleRef.current = L.circle([center.lat, center.lng], {
        radius: radius * 1609.34, // miles to meters
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 0.06,
        weight: 1.5,
        opacity: 0.3,
        dashArray: "6 4",
      }).addTo(map);
    }
  }, [center, radius]);

  // Geolocate user
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Geocode address search
  const handleSearch = useCallback(async () => {
    if (!searchAddress.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`
      );
      const results = await res.json();
      if (results.length > 0) {
        setCenter({
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
        });
      }
    } catch (e) {
      console.error("Geocode error:", e);
    }
  }, [searchAddress]);

  return (
    <>
      {/* Leaflet marker styles */}
      <style jsx global>{`
        .contractor-marker-container {
          background: none !important;
          border: none !important;
        }
        .contractor-marker-available {
          animation: contractor-pulse 2s ease-in-out infinite;
          filter: drop-shadow(0 2px 4px rgba(16, 185, 129, 0.4));
        }
        @keyframes contractor-pulse {
          0%, 100% { filter: drop-shadow(0 2px 4px rgba(16, 185, 129, 0.4)); transform: scale(1); }
          50% { filter: drop-shadow(0 4px 12px rgba(16, 185, 129, 0.7)); transform: scale(1.05); }
        }
        .contractor-marker-container svg:hover {
          transform: scale(1.15);
          transition: transform 0.15s ease;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        }
        .leaflet-popup-tip {
          border-top-color: white !important;
        }
        /* Hide default Leaflet marker cursor styles */
        .contractor-marker-container {
          cursor: pointer !important;
        }
        .user-location-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>

      <div className="h-[calc(100vh-64px)] flex bg-surface">
        {/* Left Panel */}
        <div className="w-80 shrink-0 border-r border-border-subtle flex flex-col bg-surface-hover">
          {/* Header */}
          <div className="p-4 border-b border-border-subtle">
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              Contractor Map
            </h1>
            <p className="text-xs text-text-muted mt-1">Find nearby available contractors</p>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-border-subtle">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search location..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-cyan-500/30"
                />
              </div>
              <button
                onClick={handleSearch}
                className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                onClick={handleLocate}
                disabled={locating}
                className="p-2 rounded-xl bg-surface-hover text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-50"
                title="Use my location"
              >
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4" />}
              </button>
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-secondary transition-colors"
            >
              <Filter className="h-3 w-3" />
              Filters
              {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showFilters && (
              <div className="mt-3 space-y-3 p-3 rounded-xl bg-surface-hover border border-border-subtle">
                {/* Radius */}
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Radius</label>
                  <div className="flex gap-1.5">
                    {RADIUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setRadius(opt.value)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs transition-colors",
                          radius === opt.value
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : "bg-surface-hover text-text-secondary border border-border-subtle hover:bg-surface-hover"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Service Type */}
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Service Type</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-hover border border-border-subtle text-text-primary text-sm focus:outline-none focus:border-cyan-500/30"
                  >
                    {SERVICE_TYPES.map((st) => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                  </select>
                </div>

                {/* Available only */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="rounded border-border-medium bg-surface-hover"
                  />
                  <span className="text-xs text-text-secondary">Available only</span>
                </label>
              </div>
            )}
          </div>

          {/* Contractor List */}
          <div className="flex-1 overflow-y-auto">
            {!center ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MapPin className="h-10 w-10 text-text-dim mb-3" />
                <h3 className="text-sm font-medium text-text-secondary">Set your location</h3>
                <p className="text-xs text-text-muted mt-1">Search an address or use your current location to find nearby contractors</p>
                <button
                  onClick={handleLocate}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30"
                >
                  <Navigation className="h-4 w-4" /> Use My Location
                </button>
              </div>
            ) : isLoading ? (
              <div className="space-y-3 p-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface-hover border border-border-subtle animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-surface-hover" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-24 bg-surface-hover rounded" />
                        <div className="h-3 w-32 bg-surface-hover rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : allContractors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MapPin className="h-10 w-10 text-text-dim mb-3" />
                <h3 className="text-sm font-medium text-text-secondary">No contractors found</h3>
                <p className="text-xs text-text-muted mt-1">Try expanding your radius or changing filters</p>
                {debugInfo && (
                  <p className="text-[11px] text-amber-400/80 mt-3 max-w-xs">{debugInfo.message}</p>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {allContractors.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContractor(c)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl transition-all",
                      selectedContractor?.id === c.id
                        ? "bg-cyan-500/10 border border-cyan-500/20"
                        : "bg-surface-hover border border-transparent hover:bg-surface-hover hover:border-border-subtle"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {c.image ? (
                          <img src={c.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          (c.name?.[0] || "?").toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text-primary truncate">{c.name}</span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            c.isAvailable ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-500/20 text-text-secondary"
                          )}>
                            {c.isAvailable ? "Available" : "Busy"}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted truncate">{c.company}</p>

                        {/* Address */}
                        {(c.address || c.city) && (
                          <p className="text-[11px] text-text-muted truncate mt-0.5">
                            📍 {c.address ? `${c.address}, ` : ""}{c.city}{c.state ? `, ${c.state}` : ""}{c.zipCode ? ` ${c.zipCode}` : ""}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1.5">
                          {/* Rating */}
                          <div className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            <span className="text-[11px] text-text-secondary font-medium">
                              {c.stats?.avgRating?.toFixed(1) || "—"}
                            </span>
                          </div>
                          {/* Distance */}
                          {c.distance !== null && (
                            <span className="text-[11px] text-text-muted">
                              📍 {c.distance} mi
                            </span>
                          )}
                          {/* Active jobs */}
                          <span className="text-[11px] text-text-muted">
                            {c.activeJobs} active
                          </span>
                        </div>

                        {/* Specialties */}
                        {c.specialties?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {c.specialties.slice(0, 3).map((s: string) => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary">
                                {s.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results count */}
          {center && (
            <div className="p-3 border-t border-border-subtle text-xs text-text-muted text-center">
              {allContractors.length} contractor{allContractors.length !== 1 ? "s" : ""} within {radius} miles
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0" />

          {/* Selected Contractor Detail Overlay */}
          {selectedContractor && (
            <div className="absolute bottom-4 left-4 right-4 max-w-md z-[1000]">
              <div className="bg-surface-hover/95 backdrop-blur-xl border border-border-medium rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {selectedContractor.image ? (
                      <img src={selectedContractor.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      (selectedContractor.name?.[0] || "?").toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-text-primary">{selectedContractor.name}</h3>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        selectedContractor.isAvailable
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                          : "bg-slate-500/20 text-text-secondary border border-slate-500/20"
                      )}>
                        {selectedContractor.isAvailable ? "● Available" : "○ Unavailable"}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">{selectedContractor.company}</p>
                    {(selectedContractor.address || selectedContractor.city) && (
                      <p className="text-xs text-text-muted mt-0.5">
                        📍 {selectedContractor.address ? `${selectedContractor.address}, ` : ""}{selectedContractor.city || ""}{selectedContractor.state ? `, ${selectedContractor.state}` : ""}{selectedContractor.zipCode ? ` ${selectedContractor.zipCode}` : ""}
                        {selectedContractor.distance !== null && ` · ${selectedContractor.distance} mi away`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedContractor(null)}
                    className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Stats Row */}
                <div className="px-4 pb-3 grid grid-cols-4 gap-2">
                  <div className="text-center p-2 rounded-xl bg-surface-hover">
                    <div className="flex items-center justify-center gap-0.5">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-text-primary">{selectedContractor.stats?.avgRating?.toFixed(1) || "—"}</span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">Rating</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-surface-hover">
                    <p className="text-sm font-bold text-text-primary">{selectedContractor.stats?.completedJobs || 0}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Completed</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-surface-hover">
                    <p className="text-sm font-bold text-text-primary">{selectedContractor.stats?.reliabilityScore || 100}%</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Reliability</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-surface-hover">
                    <p className="text-sm font-bold text-text-primary">{selectedContractor.activeJobs}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Active</p>
                  </div>
                </div>

                {/* Bio */}
                {selectedContractor.bio && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-text-secondary line-clamp-2">{selectedContractor.bio}</p>
                  </div>
                )}

                {/* Specialties & Skills */}
                {(selectedContractor.specialties?.length > 0 || selectedContractor.skills?.length > 0) && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    {selectedContractor.specialties?.map((s: string) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {s.replace(/_/g, " ")}
                      </span>
                    ))}
                    {selectedContractor.skills?.slice(0, 5).map((s: string) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Badges */}
                {selectedContractor.badges?.length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    {selectedContractor.badges.map((b: any) => (
                      <span key={b.type} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {b.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Active Work Orders */}
                {selectedContractor.activeWorkOrders?.length > 0 && (
                  <div className="px-4 pb-3">
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Current Jobs</h4>
                    <div className="space-y-1">
                      {selectedContractor.activeWorkOrders.slice(0, 3).map((wo: any) => (
                        <div key={wo.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-hover">
                          <Briefcase className="h-3 w-3 text-text-muted shrink-0" />
                          <span className="text-[11px] text-text-secondary truncate flex-1">{wo.title}</span>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-full",
                            wo.status === "IN_PROGRESS" ? "bg-amber-500/20 text-amber-300" :
                            wo.status === "ASSIGNED" ? "bg-blue-500/20 text-blue-300" :
                            "bg-slate-500/20 text-text-secondary"
                          )}>
                            {wo.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="px-4 pb-4 flex gap-2">
                  {selectedContractor.phone && (
                    <a
                      href={`tel:${selectedContractor.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 transition-colors border border-emerald-500/20"
                    >
                      <Phone className="h-4 w-4" /> Call
                    </a>
                  )}
                  {selectedContractor.email && (
                    <a
                      href={`mailto:${selectedContractor.email}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 transition-colors border border-cyan-500/20"
                    >
                      <Mail className="h-4 w-4" /> Email
                    </a>
                  )}
                  <a
                    href={`/dashboard/network/reputation`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-hover text-text-secondary text-sm hover:bg-surface-hover transition-colors border border-border-subtle"
                  >
                    <Star className="h-4 w-4" /> Profile
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute top-4 right-4 z-[1000] bg-surface-hover/90 backdrop-blur-xl border border-border-medium rounded-xl p-3 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-text-secondary">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-text-secondary">Busy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-500" />
                <span className="text-text-secondary">Unavailable</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
