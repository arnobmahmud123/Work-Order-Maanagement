"use client";

import { useState } from "react";
import { useVendors } from "@/hooks/use-data";
import { Button, Card, Badge, Avatar } from "@/components/ui";
import {
  Wrench,
  Search,
  Star,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Target,
  Filter,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  ArrowUpDown,
  Eye,
  Users,
} from "lucide-react";
import Link from "next/link";
import { SERVICE_TYPE_LABELS, cn } from "@/lib/utils";

export default function VendorsPage() {
  const [search, setSearch] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [area, setArea] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("score");
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");

  const { data, isLoading } = useVendors({
    search: search || undefined,
    serviceType: serviceType || undefined,
    area: area || undefined,
    minRating: minRating || undefined,
    sortBy,
  });

  const vendors = data?.vendors || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <Wrench className="inline h-6 w-6 mr-2 text-cyan-400" />
            Vendor Matrix
          </h1>
          <p className="text-text-muted mt-1">
            Contractor directory with performance ratings, efficiency, accuracy,
            and core capacities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-medium overflow-hidden">
            <button
              onClick={() => setViewMode("matrix")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium",
                viewMode === "matrix"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "bg-surface-hover text-text-dim hover:bg-surface-hover"
              )}
            >
              Matrix
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium",
                viewMode === "list"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "bg-surface-hover text-text-dim hover:bg-surface-hover"
              )}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border-medium rounded-lg text-sm"
            />
          </div>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="px-3 py-2 border border-border-medium rounded-lg text-sm"
          >
            <option value="">All Services</option>
            {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter by area..."
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="px-3 py-2 border border-border-medium rounded-lg text-sm"
          />
          <select
            value={minRating.toString()}
            onChange={(e) => setMinRating(parseFloat(e.target.value))}
            className="px-3 py-2 border border-border-medium rounded-lg text-sm"
          >
            <option value="0">Any Rating</option>
            <option value="3">3+ Stars</option>
            <option value="3.5">3.5+ Stars</option>
            <option value="4">4+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-border-medium rounded-lg text-sm"
          >
            <option value="score">Best Score</option>
            <option value="rating">Highest Rating</option>
            <option value="active">Most Active</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </Card>

      {/* Results count */}
      <p className="text-sm text-text-muted">
        {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} found
      </p>

      {/* Matrix view */}
      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : vendors.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-text-muted">
            <Users className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No vendors found</p>
            <p className="text-sm mt-1">Try adjusting your filters.</p>
          </div>
        </Card>
      ) : viewMode === "matrix" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v: any) => (
            <VendorMatrixCard key={v.id} vendor={v} />
          ))}
        </div>
      ) : (
        <Card padding={false}>
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-surface-hover border-b border-border-subtle text-xs font-semibold text-text-muted uppercase">
            <div className="col-span-3">Vendor</div>
            <div className="col-span-1 text-center">Rating</div>
            <div className="col-span-1 text-center">Score</div>
            <div className="col-span-1 text-center">Jobs</div>
            <div className="col-span-1 text-center">Active</div>
            <div className="col-span-1 text-center">On-Time</div>
            <div className="col-span-1 text-center">Efficiency</div>
            <div className="col-span-1 text-center">Accuracy</div>
            <div className="col-span-2">Services</div>
          </div>
          <div className="divide-y divide-gray-100">
            {vendors.map((v: any) => (
              <Link
                key={v.id}
                href={`/dashboard/vendors/${v.id}`}
                className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-surface-hover transition-colors items-center"
              >
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar name={v.name} src={v.image} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-text-primary truncate">
                      {v.name}
                    </p>
                    <p className="text-xs text-text-muted">{v.company || "Independent"}</p>
                    {v.profile?.address && (
                      <p className="text-[10px] text-text-muted flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        {v.profile.city || v.profile.state ? `${v.profile.city || ""}${v.profile.city && v.profile.state ? ", " : ""}${v.profile.state || ""}` : v.profile.address}
                      </p>
                    )}
                  </div>
                </div>
                <div className="col-span-1 text-center">
                  <StarRating rating={v.rating} />
                </div>
                <div className="col-span-1 text-center">
                  <ScoreBadge score={v.scores.overall} />
                </div>
                <div className="col-span-1 text-center text-sm text-text-primary">
                  {v.stats.totalJobs}
                </div>
                <div className="col-span-1 text-center text-sm text-cyan-400 font-medium">
                  {v.stats.activeJobs}
                </div>
                <div className="col-span-1 text-center text-sm text-text-primary">
                  {v.stats.onTimeRate ?? "N/A"}%
                </div>
                <div className="col-span-1 text-center">
                  <ScoreBadge score={v.scores.efficiency} />
                </div>
                <div className="col-span-1 text-center">
                  <ScoreBadge score={v.scores.accuracy} />
                </div>
                <div className="col-span-2 flex flex-wrap gap-1">
                  {v.capacities.slice(0, 2).map((c: string) => (
                    <Badge key={c} className="text-[10px] bg-surface-hover text-text-muted">
                      {SERVICE_TYPE_LABELS[c]?.split(" ")[0] || c}
                    </Badge>
                  ))}
                  {v.capacities.length > 2 && (
                    <Badge className="text-[10px] bg-surface-hover text-text-muted">
                      +{v.capacities.length - 2}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function VendorMatrixCard({ vendor: v }: { vendor: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <Avatar name={v.name} src={v.image} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {v.name}
            </h3>
            <ScoreBadge score={v.scores.overall} />
          </div>
          <p className="text-xs text-text-muted">{v.company || "Independent"}</p>
          {v.profile?.address && (
            <p className="text-xs text-text-muted flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {v.profile.address}{v.profile.city && `, ${v.profile.city}`}{v.profile.state && `, ${v.profile.state}`}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <StarRating rating={v.rating} />
            <span className="text-xs text-text-muted ml-1">{v.rating}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-surface-hover rounded-lg">
          <p className="text-lg font-bold text-text-primary">{v.stats.totalJobs}</p>
          <p className="text-[10px] text-text-muted">Total Jobs</p>
        </div>
        <div className="text-center p-2 bg-cyan-500/[0.06] rounded-lg">
          <p className="text-lg font-bold text-cyan-400">{v.stats.activeJobs}</p>
          <p className="text-[10px] text-indigo-500">Active</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">{v.stats.completedJobs}</p>
          <p className="text-[10px] text-green-500">Done</p>
        </div>
      </div>

      {/* Performance bars */}
      <div className="space-y-2 mb-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted">Efficiency</span>
            <span className="font-medium">{v.scores.efficiency}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                v.scores.efficiency >= 80
                  ? "bg-green-500"
                  : v.scores.efficiency >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
              )}
              style={{ width: `${v.scores.efficiency}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted">Accuracy</span>
            <span className="font-medium">{v.scores.accuracy}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                v.scores.accuracy >= 80
                  ? "bg-green-500"
                  : v.scores.accuracy >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
              )}
              style={{ width: `${v.scores.accuracy}%` }}
            />
          </div>
        </div>
      </div>

      {/* Core capacities */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-text-muted uppercase mb-1.5">
          Core Capacities
        </p>
        <div className="flex flex-wrap gap-1">
          {v.capacities.map((c: string) => (
            <Badge key={c} className="text-[10px] bg-cyan-500/[0.06] text-cyan-400">
              {SERVICE_TYPE_LABELS[c] || c}
            </Badge>
          ))}
        </div>
      </div>

      {/* Service areas */}
      {v.areas.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-text-muted uppercase mb-1.5">
            Service Areas
          </p>
          <div className="flex flex-wrap gap-1">
            {([...new Set(v.areas)] as string[]).slice(0, 3).map((a: string, i: number) => (
              <span
                key={`${a}-${i}`}
                className="flex items-center gap-1 text-[10px] text-text-muted"
              >
                <MapPin className="h-3 w-3" />
                {a}
              </span>
            ))}
            {v.areas.length > 3 && (
              <span className="text-[10px] text-text-muted">
                +{v.areas.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
        <Link href={`/dashboard/vendors/${v.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="h-3.5 w-3.5" />
            View Profile
          </Button>
        </Link>
        {v.phone && (
          <a href={`tel:${v.phone}`}>
            <Button variant="outline" size="sm">
              <Phone className="h-3.5 w-3.5" />
            </Button>
          </a>
        )}
        {v.email && (
          <a href={`mailto:${v.email}`}>
            <Button variant="outline" size="sm">
              <Mail className="h-3.5 w-3.5" />
            </Button>
          </a>
        )}
      </div>
    </Card>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= rating
              ? "text-amber-400 fill-amber-400"
              : star - 0.5 <= rating
                ? "text-amber-400 fill-amber-200"
                : "text-text-dim"
          )}
        />
      ))}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-100 text-green-700"
      : score >= 60
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";

  return (
    <Badge className={cn("text-xs", color)}>
      {score}
    </Badge>
  );
}
