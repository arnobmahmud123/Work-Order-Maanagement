"use client";

import { useState } from "react";
import { useAssets } from "@/hooks/use-data";
import { Button, Card, Badge } from "@/components/ui";
import {
  Building2,
  Search,
  MapPin,
  Calendar,
  ClipboardList,
  DollarSign,
  Camera,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
  Eye,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  SERVICE_TYPE_LABELS,
  formatDate,
  formatCurrency,
  formatRelativeTime,
  cn,
} from "@/lib/utils";

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const { data, isLoading } = useAssets({
    search: search || undefined,
    city: city || undefined,
    state: state || undefined,
    sortBy,
  });

  const properties = data?.properties || [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <Building2 className="inline h-6 w-6 mr-2 text-cyan-400" />
            Asset Inventory
          </h1>
          <p className="text-text-muted mt-1">
            {summary?.totalProperties || 0} properties •{" "}
            {summary?.totalWorkOrders || 0} work orders •{" "}
            {summary?.totalActive || 0} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-medium overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2",
                viewMode === "grid"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "bg-surface-hover text-text-dim hover:bg-surface-hover"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2",
                viewMode === "list"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "bg-surface-hover text-text-dim hover:bg-surface-hover"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card padding={false}>
            <div className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/[0.06]">
                <Building2 className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">
                  {summary.totalProperties}
                </p>
                <p className="text-xs text-text-muted">Properties</p>
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">
                  {summary.totalWorkOrders}
                </p>
                <p className="text-xs text-text-muted">Work Orders</p>
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">
                  {summary.totalActive}
                </p>
                <p className="text-xs text-text-muted">Active</p>
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">
                  {formatCurrency(summary.totalRevenue)}
                </p>
                <p className="text-xs text-text-muted">Total Revenue</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by address, city, state, or zip..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border-medium rounded-lg text-sm"
            />
          </div>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3 py-2 border border-border-medium rounded-lg text-sm"
          >
            <option value="">All Cities</option>
            {summary?.cities?.map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="px-3 py-2 border border-border-medium rounded-lg text-sm"
          >
            <option value="">All States</option>
            {summary?.states?.map((s: string) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-border-medium rounded-lg text-sm"
          >
            <option value="recent">Most Recent</option>
            <option value="address">Address A-Z</option>
            <option value="orders">Most Orders</option>
            <option value="revenue">Highest Revenue</option>
          </select>
        </div>
      </Card>

      {/* Properties */}
      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : properties.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-text-muted">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No properties found</p>
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((prop: any) => (
            <PropertyCard
              key={prop.id}
              property={prop}
              expanded={selectedProperty === prop.id}
              onToggle={() =>
                setSelectedProperty(
                  selectedProperty === prop.id ? null : prop.id
                )
              }
            />
          ))}
        </div>
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {properties.map((prop: any) => (
              <PropertyRow key={prop.id} property={prop} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function PropertyCard({
  property: prop,
  expanded,
  onToggle,
}: {
  property: any;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Front photo */}
      <Link href={`/dashboard/properties/${prop.id}`}>
        <div
          className="h-40 bg-gradient-to-br from-indigo-100 to-cyan-100 relative cursor-pointer"
        >
        {prop.frontPhoto ? (
          <img
            src={prop.frontPhoto.path}
            alt={prop.address}
            className="w-full h-full object-cover"
          />
        ) : prop.imageUrl ? (
          <img
            src={prop.imageUrl}
            alt={prop.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-12 w-12 text-indigo-300" />
          </div>
        )}

        {/* Photo count badge */}
        {prop.stats.photoCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
            <Camera className="h-3 w-3" />
            {prop.stats.photoCount}
          </div>
        )}

        {/* Overdue badge */}
        {prop.stats.overdueOrders > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs rounded-full">
            <AlertTriangle className="h-3 w-3" />
            {prop.stats.overdueOrders} overdue
          </div>
        )}
      </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <Link href={`/dashboard/properties/${prop.id}`}>
              <h3 className="text-sm font-semibold text-text-primary hover:text-cyan-300 transition-colors cursor-pointer">
                {prop.address}
              </h3>
            </Link>
            <p className="text-xs text-text-muted">
              {[prop.city, prop.state, prop.zipCode]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-1.5 bg-surface-hover rounded-lg">
            <p className="text-sm font-bold text-text-primary">
              {prop.stats.totalOrders}
            </p>
            <p className="text-[10px] text-text-muted">Orders</p>
          </div>
          <div className="text-center p-1.5 bg-cyan-500/[0.06] rounded-lg">
            <p className="text-sm font-bold text-cyan-400">
              {prop.stats.activeOrders}
            </p>
            <p className="text-[10px] text-indigo-500">Active</p>
          </div>
          <div className="text-center p-1.5 bg-green-50 rounded-lg">
            <p className="text-sm font-bold text-green-600">
              {formatCurrency(prop.stats.totalRevenue)}
            </p>
            <p className="text-[10px] text-green-500">Revenue</p>
          </div>
        </div>

        {/* Service types */}
        <div className="flex flex-wrap gap-1 mb-3">
          {prop.serviceTypes.slice(0, 3).map((st: string) => (
            <Badge key={st} className="text-[10px] bg-surface-hover text-text-muted">
              {SERVICE_TYPE_LABELS[st]?.split(" ")[0] || st}
            </Badge>
          ))}
          {prop.serviceTypes.length > 3 && (
            <Badge className="text-[10px] bg-surface-hover text-text-muted">
              +{prop.serviceTypes.length - 3}
            </Badge>
          )}
        </div>

        {/* Latest activity */}
        {prop.latestOrder && (
          <div className="text-xs text-text-muted mb-3">
            Latest: {prop.latestOrder.title} •{" "}
            {formatRelativeTime(prop.latestOrder.createdAt)}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/dashboard/properties/${prop.id}`}
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="h-3.5 w-3.5" />
              View Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Expanded: recent photos */}
      {expanded && prop.recentPhotos.length > 0 && (
        <div className="px-4 pb-4 pt-2 border-t border-border-subtle">
          <p className="text-xs font-semibold text-text-muted uppercase mb-2">
            Recent Photos
          </p>
          <div className="grid grid-cols-3 gap-2">
            {prop.recentPhotos.slice(0, 6).map((photo: any) => (
              <a
                key={photo.id}
                href={photo.path}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-border-subtle hover:border-indigo-300"
              >
                <img
                  src={photo.path}
                  alt={photo.originalName}
                  className="w-full h-20 object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Expanded: work orders */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border-subtle">
          <p className="text-xs font-semibold text-text-muted uppercase mb-2">
            Work Orders ({prop.stats.totalOrders})
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {prop.statusBreakdown &&
              Object.entries(prop.statusBreakdown).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between text-xs"
                >
                  <Badge
                    className={cn("text-[10px]", STATUS_COLORS[status])}
                  >
                    {STATUS_LABELS[status]}
                  </Badge>
                  <span className="font-medium text-text-primary">
                    {count as number}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function PropertyRow({ property: prop }: { property: any }) {
  return (
    <Link
      href={`/dashboard/properties/${prop.id}`}
      className="flex items-center gap-4 p-4 hover:bg-surface-hover transition-colors"
    >
      {/* Photo thumbnail */}
      <div className="h-16 w-16 rounded-lg overflow-hidden bg-surface-hover flex-shrink-0">
        {prop.frontPhoto ? (
          <img
            src={prop.frontPhoto.path}
            alt={prop.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-6 w-6 text-text-dim" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-text-primary">{prop.address}</h3>
        <p className="text-xs text-text-muted">
          {[prop.city, prop.state, prop.zipCode].filter(Boolean).join(", ")}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <ClipboardList className="h-3 w-3" />
            {prop.stats.totalOrders} orders
          </span>
          <span className="flex items-center gap-1 text-cyan-400">
            <Clock className="h-3 w-3" />
            {prop.stats.activeOrders} active
          </span>
          {prop.stats.overdueOrders > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              {prop.stats.overdueOrders} overdue
            </span>
          )}
          <span className="flex items-center gap-1">
            <Camera className="h-3 w-3" />
            {prop.stats.photoCount} photos
          </span>
        </div>
      </div>

      {/* Revenue */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-green-600">
          {formatCurrency(prop.stats.totalRevenue)}
        </p>
        <p className="text-xs text-text-muted">
          Paid: {formatCurrency(prop.stats.paidRevenue)}
        </p>
      </div>

      {/* Service types */}
      <div className="flex flex-wrap gap-1 w-32 flex-shrink-0">
        {prop.serviceTypes.slice(0, 2).map((st: string) => (
          <Badge key={st} className="text-[10px] bg-surface-hover text-text-muted">
            {SERVICE_TYPE_LABELS[st]?.split(" ")[0] || st}
          </Badge>
        ))}
      </div>

      {/* Link */}
      <ChevronRight className="h-4 w-4 text-text-muted" />
    </Link>
  );
}
