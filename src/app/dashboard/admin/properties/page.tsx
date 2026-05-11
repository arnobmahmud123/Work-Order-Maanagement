"use client";

import { useState } from "react";
import { useAssets } from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, Badge, Button, Input } from "@/components/ui";
import {
  Building2,
  Search,
  MapPin,
  ClipboardList,
  DollarSign,
  Camera,
  AlertTriangle,
  ChevronRight,
  Upload,
  Filter,
  Wand2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AdminPropertiesPage() {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [populating, setPopulating] = useState(false);

  const { data, isLoading } = useAssets({
    search: search || undefined,
    state: stateFilter || undefined,
    sortBy,
  });

  const properties = data?.properties || [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Properties</h1>
          <p className="text-text-muted mt-1">
            Manage property database and view asset inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4" />
            Import Properties
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Properties</p>
                <p className="text-xl font-bold text-text-primary">
                  {summary.totalProperties}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/[0.06]">
                <ClipboardList className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Work Orders</p>
                <p className="text-xl font-bold text-text-primary">
                  {summary.totalWorkOrders}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Total Revenue</p>
                <p className="text-xl font-bold text-text-primary">
                  {formatCurrency(summary.totalRevenue)}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Overdue</p>
                <p className="text-xl font-bold text-text-primary">
                  {summary.totalOverdue}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card padding={false}>
        <div className="p-4 border-b border-border-subtle">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by address, city, state, or zip..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-2 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
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
              className="px-3 py-2 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value="recent">Most Recent</option>
              <option value="address">Address A-Z</option>
              <option value="orders">Most Orders</option>
              <option value="revenue">Highest Revenue</option>
            </select>
          </div>
        </div>

        {/* Property list */}
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading...</div>
        ) : properties.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No properties found</p>
            <p className="text-sm mt-1">
              Properties are automatically created when work orders are added.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {properties.map((prop: any) => (
              <Link
                key={prop.id}
                href={`/dashboard/properties/${prop.id}`}
                className="flex items-center gap-4 p-4 hover:bg-surface-hover transition-colors"
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0 h-16 w-20 rounded-lg overflow-hidden bg-surface-hover">
                  {prop.frontPhoto ? (
                    <img
                      src={prop.frontPhoto.path}
                      alt={prop.address}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-text-dim" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary truncate">
                    {prop.address}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[prop.city, prop.state, prop.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {prop.serviceTypes?.slice(0, 3).map((st: string) => (
                      <Badge key={st} className="bg-surface-hover text-text-muted text-[10px]">
                        {st.replace(/_/g, " ")}
                      </Badge>
                    ))}
                    {prop.serviceTypes?.length > 3 && (
                      <span className="text-[10px] text-text-muted">
                        +{prop.serviceTypes.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 text-xs text-text-muted">
                  <div className="text-center">
                    <p className="font-semibold text-text-primary">
                      {prop.stats.totalOrders}
                    </p>
                    <p>Orders</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-text-primary">
                      {prop.stats.activeOrders}
                    </p>
                    <p>Active</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-green-700">
                      {formatCurrency(prop.stats.totalRevenue)}
                    </p>
                    <p>Revenue</p>
                  </div>
                  {prop.stats.overdueOrders > 0 && (
                    <div className="text-center">
                      <p className="font-semibold text-red-600">
                        {prop.stats.overdueOrders}
                      </p>
                      <p>Overdue</p>
                    </div>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
