"use client";

import { useState } from "react";
import { useWorkOrders, useUsers } from "@/hooks/use-data";
import { Button, Badge, Card } from "@/components/ui";
import {
  Search,
  MapPin,
  Calendar,
  User,
  ChevronRight,
  ClipboardList,
  Building2,
  Eye,
} from "lucide-react";
import Link from "next/link";
import {
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  formatRelativeTime,
  cn,
} from "@/lib/utils";

export default function PropertyWorkOrdersPage() {
  const [search, setSearch] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const { data, isLoading } = useWorkOrders({
    search: search || undefined,
  });

  const workOrders = data?.workOrders || [];

  // Group work orders by property address
  const propertyMap = new Map<string, any[]>();
  workOrders.forEach((wo: any) => {
    const key = wo.address;
    if (!propertyMap.has(key)) {
      propertyMap.set(key, []);
    }
    propertyMap.get(key)!.push(wo);
  });

  const properties = Array.from(propertyMap.entries()).map(([address, orders]) => ({
    address,
    city: orders[0]?.city,
    state: orders[0]?.state,
    orders,
    totalOrders: orders.length,
    activeOrders: orders.filter(
      (wo) => !["CLOSED", "CANCELLED"].includes(wo.status)
    ).length,
    latestOrder: orders[0],
  }));

  const filteredProperties = selectedProperty
    ? properties.filter((p) => p.address === selectedProperty)
    : properties;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          <Building2 className="inline h-6 w-6 mr-2 text-cyan-400" />
          Property Work Orders
        </h1>
        <p className="text-text-muted mt-1">
          View all work orders grouped by property. Click a property to see its
          full history.
        </p>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>
      </Card>

      {/* Properties grid */}
      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : filteredProperties.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-text-muted">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No properties found</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((prop) => (
            <Card
              key={prop.address}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() =>
                setSelectedProperty(
                  selectedProperty === prop.address ? null : prop.address
                )
              }
            >
              {/* Property photo placeholder */}
              <div className="h-32 bg-gradient-to-br from-indigo-100 to-cyan-100 rounded-lg mb-3 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-indigo-400" />
              </div>

              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {prop.address}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {[prop.city, prop.state].filter(Boolean).join(", ")}
                  </p>
                </div>
                <Badge className="bg-indigo-100 text-cyan-400 text-xs">
                  {prop.totalOrders} WO
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
                <span className="flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  {prop.activeOrders} active
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatRelativeTime(prop.latestOrder.createdAt)}
                </span>
              </div>

              {/* Status breakdown */}
              <div className="flex flex-wrap gap-1">
                {Object.entries(
                  prop.orders.reduce((acc: Record<string, number>, wo: any) => {
                    acc[wo.status] = (acc[wo.status] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([status, count]) => (
                  <Badge
                    key={status}
                    className={cn("text-[10px]", STATUS_COLORS[status])}
                  >
                    {STATUS_LABELS[status]}: {count}
                  </Badge>
                ))}
              </div>

              {/* Work orders list (expanded) */}
              {selectedProperty === prop.address && (
                <div className="mt-4 pt-3 border-t border-border-subtle space-y-2">
                  {prop.orders.map((wo) => (
                    <Link
                      key={wo.id}
                      href={`/dashboard/work-orders/${wo.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-hover"
                    >
                      <Badge
                        className={cn("text-[10px]", STATUS_COLORS[wo.status])}
                      >
                        {STATUS_LABELS[wo.status]}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary truncate">
                          {wo.title}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {SERVICE_TYPE_LABELS[wo.serviceType]} •{" "}
                          {wo.dueDate ? formatDate(wo.dueDate) : "No due date"}
                        </p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-text-muted" />
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
