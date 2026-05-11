"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useInspectors, useCreateWorkOrder } from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, Button, Badge, Avatar, Input, Modal } from "@/components/ui";
import {
  MapPin,
  Search,
  Filter,
  Phone,
  Mail,
  MessageSquare,
  Star,
  Clock,
  ChevronDown,
  Wrench,
  Zap,
  Thermometer,
  Home,
  Bug,
  Building2,
  Loader2,
  Navigation,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const SPECIALTIES = [
  { value: "PLUMBER", label: "Plumber", icon: Wrench, color: "bg-blue-100 text-blue-700" },
  { value: "ELECTRICIAN", label: "Electrician", icon: Zap, color: "bg-yellow-100 text-yellow-700" },
  { value: "HVAC", label: "HVAC", icon: Thermometer, color: "bg-green-100 text-green-700" },
  { value: "ROOFER", label: "Roofer", icon: Home, color: "bg-orange-100 text-orange-700" },
  { value: "GENERAL", label: "General", icon: Wrench, color: "bg-surface-hover text-text-dim" },
  { value: "PEST_CONTROL", label: "Pest Control", icon: Bug, color: "bg-red-100 text-red-700" },
  { value: "STRUCTURAL", label: "Structural", icon: Building2, color: "bg-purple-100 text-purple-700" },
  { value: "ENVIRONMENTAL", label: "Environmental", icon: Building2, color: "bg-teal-100 text-teal-700" },
];

const AVAILABILITY_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  BUSY: "bg-yellow-100 text-yellow-800",
  UNAVAILABLE: "bg-red-100 text-red-800",
};

export default function InspectorsPage() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [availability, setAvailability] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(50);
  const [selectedInspector, setSelectedInspector] = useState<any>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const filters: any = {};
  if (search) filters.search = search;
  if (specialty) filters.specialty = specialty;
  if (availability) filters.availability = availability;
  if (coords) {
    filters.lat = coords.lat;
    filters.lng = coords.lng;
    filters.radius = radius;
  }

  const { data, isLoading } = useInspectors(filters);
  const inspectors = data?.inspectors || [];

  // Load Leaflet
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const init = async () => {
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
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      
      const map = L.map(mapRef.current!, {
        zoomControl: false,
        attributionControl: false,
      }).setView(coords ? [coords.lat, coords.lng] : [39.8283, -98.5795], coords ? 10 : 4);

      const tileUrl = isDark 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      leafletMapRef.current = map;
      setMapReady(true);
    };

    init();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const L = (window as any).L;
    const map = leafletMapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    inspectors.forEach((inspector: any) => {
      if (!inspector.latitude || !inspector.longitude) return;

      const color = inspector.availability === "AVAILABLE" ? "#10b981" : inspector.availability === "BUSY" ? "#f59e0b" : "#ef4444";
      
      const icon = L.divIcon({
        className: "inspector-marker",
        html: `
          <div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([inspector.latitude, inspector.longitude], { icon })
        .addTo(map);

      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 180px; padding: 4px;">
          <h3 style="font-weight: 600; margin: 0 0 4px 0; color: #1e293b;">${inspector.name}</h3>
          ${inspector.company ? `<p style="color: #64748b; font-size: 11px; margin: 0 0 4px 0;">${inspector.company}</p>` : ""}
          <p style="color: #64748b; font-size: 11px; margin: 0;">${inspector.specialties?.map((s: any) => s.specialty).join(", ") || ""}</p>
          ${inspector.distance !== undefined ? `<p style="font-size: 11px; margin: 4px 0 0 0; color: #06b6d4; font-weight: 600;">📍 ${inspector.distance} miles away</p>` : ""}
        </div>
      `, { closeButton: false });

      marker.on("click", () => {
        setSelectedInspector(inspector);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (inspectors.length > 0) {
      const bounds = L.latLngBounds(inspectors.filter((i: any) => i.latitude && i.longitude).map((i: any) => [i.latitude, i.longitude]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [inspectors, mapReady]);

  const handleLocationSearch = useCallback(async () => {
    if (!locationSearch) return;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=1`);
      const results = await res.json();
      if (results && results[0]) {
        const newCoords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
        setCoords(newCoords);
        if (leafletMapRef.current) {
          leafletMapRef.current.setView([newCoords.lat, newCoords.lng], 10);
        }
      } else {
        toast.error("Could not find that location");
      }
    } catch (e) {
      toast.error("Search failed");
    }
  }, [locationSearch]);

  function handleRequestInspection(inspector: any) {
    setSelectedInspector(inspector);
    setShowRequestModal(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Inspector Directory</h1>
        <p className="text-text-muted mt-1">
          Find and contact inspection professionals near you
        </p>
      </div>

      {/* Search & Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, company, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-lg border border-border-medium pl-10 pr-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value="">All Specialties</option>
              {SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value="">Any Availability</option>
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </div>
        </div>

        {/* Location Search */}
        <div className="mt-4 flex gap-3">
          <div className="flex-1 relative">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Enter address or zip code for proximity search..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
              className="block w-full rounded-lg border border-border-medium pl-10 pr-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <Button onClick={handleLocationSearch} variant="outline">
            <MapPin className="h-4 w-4" />
            Search Area
          </Button>
          {coords && (
            <div className="flex items-center gap-2">
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
              >
                <option value={10}>10 mi</option>
                <option value={25}>25 mi</option>
                <option value={50}>50 mi</option>
                <option value={100}>100 mi</option>
              </select>
              <button
                onClick={() => {
                  setCoords(null);
                  setLocationSearch("");
                }}
                className="p-2 text-text-muted hover:text-text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map */}
        <Card className="lg:col-span-3" padding={false}>
          <div
            ref={mapRef}
            className="w-full h-[500px] rounded-xl overflow-hidden"
          >
            {!mapReady && (
              <div className="w-full h-full flex items-center justify-center bg-surface-hover">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-text-muted animate-spin mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Loading map...</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Inspector List */}
        <div className="lg:col-span-2 space-y-3 max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <Card>
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-surface-hover rounded-lg" />
                ))}
              </div>
            </Card>
          ) : inspectors.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-text-dim mx-auto mb-3" />
                <p className="font-medium text-text-primary">No inspectors found</p>
                <p className="text-sm text-text-muted mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            </Card>
          ) : (
            inspectors.map((inspector: any) => (
              <Card
                key={inspector.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedInspector?.id === inspector.id && "ring-2 ring-indigo-500"
                )}
                padding={false}
              >
                <div
                  className="p-4"
                  onClick={() => setSelectedInspector(inspector)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={inspector.name} src={inspector.imageUrl} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-text-primary truncate">
                          {inspector.name}
                        </h3>
                        <Badge className={AVAILABILITY_COLORS[inspector.availability]}>
                          {inspector.availability}
                        </Badge>
                      </div>
                      {inspector.company && (
                        <p className="text-xs text-text-muted mt-0.5">{inspector.company}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {inspector.specialties?.map((s: any) => {
                          const spec = SPECIALTIES.find((sp) => sp.value === s.specialty);
                          return (
                            <Badge key={s.id} className={spec?.color || "bg-surface-hover text-text-dim"}>
                              {spec?.label || s.specialty}
                            </Badge>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        {inspector.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            {inspector.rating.toFixed(1)} ({inspector.reviewCount})
                          </span>
                        )}
                        {inspector.hourlyRate && (
                          <span>{formatCurrency(inspector.hourlyRate)}/hr</span>
                        )}
                        {inspector.distance !== undefined && (
                          <span className="text-cyan-400 font-medium">
                            📍 {inspector.distance} mi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
                    {inspector.phone && (
                      <a
                        href={`tel:${inspector.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        Call
                      </a>
                    )}
                    {inspector.email && (
                      <a
                        href={`mailto:${inspector.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestInspection(inspector);
                      }}
                      className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/[0.06] rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Request Inspection
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Request Inspection Modal */}
      <RequestInspectionModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        inspector={selectedInspector}
      />
    </div>
  );
}

function RequestInspectionModal({
  isOpen,
  onClose,
  inspector,
}: {
  isOpen: boolean;
  onClose: () => void;
  inspector: any;
}) {
  const createWorkOrder = useCreateWorkOrder();
  const [form, setForm] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
    dueDate: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createWorkOrder.mutateAsync({
        title: `Inspection - ${inspector?.name || "Inspector"}`,
        description: `Inspection requested from ${inspector?.name}. ${form.notes}`,
        address: form.address,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        serviceType: "INSPECTION",
        dueDate: form.dueDate || undefined,
      });
      toast.success("Inspection work order created");
      onClose();
      setForm({ address: "", city: "", state: "", zipCode: "", notes: "", dueDate: "" });
    } catch {
      toast.error("Failed to create work order");
    }
  }

  if (!inspector) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Inspection" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-cyan-500/[0.06] rounded-lg">
          <p className="text-sm font-medium text-indigo-900">{inspector.name}</p>
          {inspector.company && (
            <p className="text-xs text-cyan-400">{inspector.company}</p>
          )}
          {inspector.phone && (
            <p className="text-xs text-cyan-400">{inspector.phone}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-dim mb-1">Property Address</label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main St"
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dim mb-1">Zip</label>
              <input
                type="text"
                value={form.zipCode}
                onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Preferred Date</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any special instructions or details about the inspection..."
            rows={3}
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createWorkOrder.isPending}>
            Create Work Order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
