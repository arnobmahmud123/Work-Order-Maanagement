"use client";

import { use } from "react";
import { useVendor } from "@/hooks/use-data";
import { Button, Card, CardHeader, CardTitle, Badge, Avatar } from "@/components/ui";
import {
  Wrench,
  Star,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ClipboardList,
  ArrowLeft,
  Calendar,
  Users,
  Target,
} from "lucide-react";
import Link from "next/link";
import {
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  cn,
} from "@/lib/utils";

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useVendor(id);

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-text-muted">Vendor not found</div>;
  }

  const { contractor: c, stats, financial, serviceBreakdown, monthlyTrend, recentWorkOrders } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/vendors">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{c.name}</h1>
          <p className="text-text-muted">{c.company || "Independent Contractor"}</p>
        </div>
      </div>

      {/* Profile + Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex flex-col items-center text-center">
            <Avatar name={c.name} src={c.image} size="lg" />
            <h3 className="text-lg font-semibold text-text-primary mt-3">
              {c.name}
            </h3>
            {c.company && (
              <p className="text-sm text-text-muted flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {c.company}
              </p>
            )}
            {c.profile?.address && (
              <p className="text-sm text-text-muted flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {c.profile.address}
                {c.profile.city && `, ${c.profile.city}`}
                {c.profile.state && `, ${c.profile.state}`}
                {c.profile.zipCode && ` ${c.profile.zipCode}`}
              </p>
            )}
            <p className="text-xs text-text-muted mt-1">
              Member since {formatDate(c.memberSince)}
            </p>

            <div className="w-full mt-4 space-y-2">
              {c.phone && (
                <a
                  href={`tel:${c.phone}`}
                  className="flex items-center justify-center gap-2 w-full p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Call {c.name?.split(" ")[0]}
                </a>
              )}
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="flex items-center justify-center gap-2 w-full p-2.5 border border-border-medium text-text-dim rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Send Email
                </a>
              )}
            </div>

            {/* Contact details */}
            <div className="w-full mt-4 pt-4 border-t border-border-subtle space-y-2 text-left">
              {c.profile?.address && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <MapPin className="h-4 w-4 text-text-muted" />
                  {c.profile.address}{c.profile.city && `, ${c.profile.city}`}{c.profile.state && `, ${c.profile.state}`}{c.profile.zipCode && ` ${c.profile.zipCode}`}
                </div>
              )}
              {c.phone && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Phone className="h-4 w-4 text-text-muted" />
                  {c.phone}
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Mail className="h-4 w-4 text-text-muted" />
                  {c.email}
                </div>
              )}
              {c.profile?.hourlyRate && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <DollarSign className="h-4 w-4 text-text-muted" />
                  ${c.profile.hourlyRate}/hr
                </div>
              )}
              {c.profile?.serviceRadius && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Target className="h-4 w-4 text-text-muted" />
                  {c.profile.serviceRadius} mile radius
                </div>
              )}
              {c.profile?.avgRating != null && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {c.profile.avgRating.toFixed(1)} ({c.profile.totalRatings} ratings)
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Stats overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: "Total Jobs",
                value: stats.totalJobs,
                icon: ClipboardList,
                color: "text-blue-600 bg-blue-50",
              },
              {
                label: "Completed",
                value: stats.completedJobs,
                icon: CheckCircle2,
                color: "text-green-600 bg-green-50",
              },
              {
                label: "Active",
                value: stats.activeJobs,
                icon: Clock,
                color: "text-cyan-400 bg-cyan-500/[0.06]",
              },
              {
                label: "Overdue",
                value: stats.overdueJobs,
                icon: AlertTriangle,
                color: stats.overdueJobs > 0 ? "text-red-600 bg-red-50" : "text-text-muted bg-surface-hover",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="p-3 rounded-lg border border-border-subtle flex items-center gap-3"
              >
                <div className={cn("p-2 rounded-lg", m.color)}>
                  <m.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text-primary">{m.value}</p>
                  <p className="text-[10px] text-text-muted">{m.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-surface-hover rounded-lg text-center">
              <p className="text-xl font-bold text-text-primary">
                {stats.completionRate ?? "N/A"}%
              </p>
              <p className="text-xs text-text-muted">Completion Rate</p>
            </div>
            <div className="p-3 bg-surface-hover rounded-lg text-center">
              <p className="text-xl font-bold text-text-primary">
                {stats.onTimeRate ?? "N/A"}%
              </p>
              <p className="text-xs text-text-muted">On-Time Rate</p>
            </div>
            <div className="p-3 bg-surface-hover rounded-lg text-center">
              <p className="text-xl font-bold text-text-primary">
                {stats.avgCompletionDays ?? "N/A"}
              </p>
              <p className="text-xs text-text-muted">Avg Days</p>
            </div>
            <div className="p-3 bg-surface-hover rounded-lg text-center">
              <p className="text-xl font-bold text-text-primary">
                {stats.totalHours}h
              </p>
              <p className="text-xs text-text-muted">Total Hours</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Financial + Service Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Financial
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">
                ${financial.totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-green-600">Total Revenue</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-surface-hover rounded-lg">
                <p className="text-lg font-bold text-text-primary">
                  ${financial.paidRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-text-muted">Paid</p>
              </div>
              <div className="p-3 bg-surface-hover rounded-lg">
                <p className="text-lg font-bold text-text-primary">
                  {financial.invoiceCount}
                </p>
                <p className="text-xs text-text-muted">Invoices</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Breakdown</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {Object.entries(serviceBreakdown).map(
              ([type, data]: [string, any]) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-dim">
                      {SERVICE_TYPE_LABELS[type] || type}
                    </span>
                    <span className="text-xs text-text-muted">
                      {data.completed}/{data.total} completed
                    </span>
                  </div>
                  <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500/[0.06]0 rounded-full"
                      style={{
                        width: `${data.total > 0 ? (data.completed / data.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            Monthly Trend
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-6 gap-3">
          {monthlyTrend.map((m: any, i: number) => (
            <div key={i} className="p-3 bg-surface-hover rounded-lg text-center">
              <p className="text-xs text-text-muted mb-1">{m.month}</p>
              <p className="text-lg font-bold text-text-primary">{m.orders}</p>
              <p className="text-[10px] text-text-muted">orders</p>
              <p className="text-sm font-medium text-green-600">
                {m.completed} done
              </p>
              <p className="text-xs text-text-muted">
                ${m.revenue.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Work Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Work Orders</CardTitle>
        </CardHeader>
        <div className="divide-y divide-gray-100">
          {recentWorkOrders.map((wo: any) => (
            <Link
              key={wo.id}
              href={`/dashboard/work-orders/${wo.id}`}
              className="flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors"
            >
              <Badge className={cn("text-[10px] flex-shrink-0", STATUS_COLORS[wo.status])}>
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
                    {wo.city && `, ${wo.city}`}
                  </span>
                  <span>{SERVICE_TYPE_LABELS[wo.serviceType]}</span>
                  {wo.coordinator && (
                    <span>Coord: {wo.coordinator.name}</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {wo.dueDate && (
                  <p className="text-xs text-text-muted">
                    Due {formatDate(wo.dueDate)}
                  </p>
                )}
                {wo.invoiceTotal > 0 && (
                  <p className="text-xs font-medium text-green-600">
                    ${wo.invoiceTotal.toLocaleString()}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
