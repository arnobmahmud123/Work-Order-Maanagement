"use client";

import { useState } from "react";
import { useCoordinators } from "@/hooks/use-data";
import { Button, Card, Badge, Avatar } from "@/components/ui";
import {
  Users,
  Search,
  Phone,
  Mail,
  Building2,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
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

export default function CoordinatorsPage() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useCoordinators(search || undefined);

  const coordinators = data?.coordinators || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          <Users className="inline h-6 w-6 mr-2 text-cyan-400" />
          Coordinator Directory
        </h1>
        <p className="text-text-muted mt-1">
          View all coordinators with contact info, active work loads, and quick
          call/email actions.
        </p>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search coordinators by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>
      </Card>

      {/* Coordinator cards */}
      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : coordinators.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-text-muted">
            <Users className="h-12 w-12 mx-auto mb-3 text-text-muted" />
            <p className="font-medium">No coordinators found</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {coordinators.map((c: any) => (
            <CoordinatorCard
              key={c.id}
              coordinator={c}
              expanded={expandedId === c.id}
              onToggle={() =>
                setExpandedId(expandedId === c.id ? null : c.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CoordinatorCard({
  coordinator: c,
  expanded,
  onToggle,
}: {
  coordinator: any;
  expanded: boolean;
  onToggle: () => void;
}) {
  const s = c.stats;

  return (
    <Card className="overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-4">
        {/* Photo + basic info */}
        <Avatar name={c.name} src={c.image} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-text-primary">{c.name}</h3>
            {c.company && (
              <Badge className="text-xs bg-surface-hover/[0.06] text-text-muted">
                {c.company}
              </Badge>
            )}
          </div>

          {/* Contact info */}
          <div className="flex items-center gap-4 text-sm text-text-muted">
            {c.phone && (
              <a
                href={`tel:${c.phone}`}
                className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                {c.phone}
              </a>
            )}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {c.email}
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              {s.totalWorkOrders} total
            </span>
            <span className="flex items-center gap-1 text-cyan-400 font-medium">
              <Clock className="h-3 w-3" />
              {s.activeWorkOrders} active
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {s.completedWorkOrders} completed
            </span>
            {s.overdueWorkOrders > 0 && (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <AlertTriangle className="h-3 w-3" />
                {s.overdueWorkOrders} overdue
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {c.phone && (
            <a href={`tel:${c.phone}`}>
              <Button variant="primary" size="sm">
                <Phone className="h-4 w-4" />
                Call
              </Button>
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`}>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </a>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-surface-hover/[0.06] text-text-muted"
          >
            {expanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded: recent work orders */}
      {expanded && c.recentWorkOrders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <h4 className="text-xs font-semibold text-text-muted uppercase mb-3">
            Recent Work Orders
          </h4>
          <div className="space-y-2">
            {c.recentWorkOrders.map((wo: any) => (
              <Link
                key={wo.id}
                href={`/dashboard/work-orders/${wo.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-hover/[0.03] transition-colors"
              >
                <Badge
                  className={cn("text-[10px] flex-shrink-0", STATUS_COLORS[wo.status])}
                >
                  {STATUS_LABELS[wo.status]}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {wo.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {wo.address}
                    </span>
                    <span>{SERVICE_TYPE_LABELS[wo.serviceType]}</span>
                    {wo.contractor && (
                      <span>Contractor: {wo.contractor.name}</span>
                    )}
                  </div>
                </div>
                {wo.dueDate && (
                  <span className="text-xs text-text-muted flex-shrink-0">
                    Due {formatDate(wo.dueDate)}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0" />
              </Link>
            ))}
          </div>
          {s.totalWorkOrders > 5 && (
            <Link
              href={`/dashboard/work-orders/finder`}
              className="block mt-3 text-center text-xs font-medium text-cyan-400 hover:text-cyan-400"
            >
              View all {s.totalWorkOrders} work orders →
            </Link>
          )}
        </div>
      )}

      {/* Expanded: no work orders */}
      {expanded && c.recentWorkOrders.length === 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle text-center text-sm text-text-muted py-4">
          No work orders assigned yet.
        </div>
      )}
    </Card>
  );
}
