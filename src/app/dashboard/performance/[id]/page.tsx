"use client";

import { use } from "react";
import { useDashboardMetrics } from "@/hooks/use-data";
import { Button, Card, CardHeader, CardTitle, Badge, Avatar } from "@/components/ui";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ClipboardList,
  Award,
  Target,
  Calendar,
  ArrowLeft,
  Phone,
  Mail,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";

export default function UserPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: metrics, isLoading } = useDashboardMetrics(id, "30");

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading...</div>;
  }

  if (!metrics) {
    return <div className="p-8 text-center text-text-muted">User not found</div>;
  }

  const u = metrics.user;
  const scoreColor =
    metrics.overallScore >= 80
      ? "text-green-600 bg-green-50 border-green-200"
      : metrics.overallScore >= 60
        ? "text-yellow-600 bg-yellow-50 border-yellow-200"
        : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/performance">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{u.name}</h1>
          <p className="text-text-muted">{u.role} Performance Profile</p>
        </div>
      </div>

      {/* Profile + Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex flex-col items-center text-center">
            <Avatar name={u.name} src={u.image} size="lg" />
            <h3 className="text-lg font-semibold text-text-primary mt-3">
              {u.name}
            </h3>
            <p className="text-sm text-text-muted">{u.email}</p>
            <Badge className="mt-2 bg-indigo-100 text-cyan-400">
              {u.role}
            </Badge>
            {u.company && (
              <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {u.company}
              </p>
            )}
            <p className="text-xs text-text-muted mt-1">
              Member since {formatDate(u.memberSince)}
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center gap-6">
            <div
              className={cn(
                "h-24 w-24 rounded-2xl border-2 flex items-center justify-center flex-shrink-0",
                scoreColor
              )}
            >
              <div className="text-center">
                <p className="text-3xl font-bold">{metrics.overallScore}</p>
                <p className="text-[10px] font-medium">SCORE</p>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                Performance Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Completion", value: metrics.scores.completion },
                  { label: "On-Time", value: metrics.scores.onTime },
                  { label: "Overdue", value: metrics.scores.overdue },
                  { label: "Efficiency", value: metrics.scores.efficiency },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-muted">{s.label}</span>
                      <span className="text-xs font-medium">{s.value}%</span>
                    </div>
                    <div className="h-2.5 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          s.value >= 80
                            ? "bg-green-500"
                            : s.value >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        )}
                        style={{ width: `${s.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Work Order Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-cyan-400" />
            Work Order Metrics
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total",
              value: metrics.workOrders.total,
              icon: ClipboardList,
              color: "text-blue-600 bg-blue-50",
            },
            {
              label: "Completed",
              value: metrics.workOrders.completed,
              icon: CheckCircle2,
              color: "text-green-600 bg-green-50",
            },
            {
              label: "Active",
              value: metrics.workOrders.active,
              icon: Clock,
              color: "text-cyan-400 bg-cyan-500/[0.06]",
            },
            {
              label: "Overdue",
              value: metrics.workOrders.overdue,
              icon: AlertTriangle,
              color: "text-red-600 bg-red-50",
            },
            {
              label: "Completion Rate",
              value: `${metrics.workOrders.completionRate}%`,
              icon: Target,
              color: "text-emerald-600 bg-emerald-50",
            },
            {
              label: "On-Time Rate",
              value: `${metrics.workOrders.onTimeRate}%`,
              icon: Clock,
              color: "text-cyan-600 bg-cyan-50",
            },
            {
              label: "Avg Days",
              value: metrics.workOrders.avgCompletionDays,
              icon: Calendar,
              color: "text-amber-600 bg-amber-50",
            },
            {
              label: "Hours Worked",
              value: `${metrics.hours.total}h`,
              icon: Clock,
              color: "text-purple-600 bg-purple-50",
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
                <p className="text-lg font-bold text-text-primary">{m.value}</p>
                <p className="text-[10px] text-text-muted">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Financial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Financial
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-surface-hover rounded-lg">
            <p className="text-2xl font-bold text-text-primary">
              ${metrics.financial.totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-text-muted">Total Revenue</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">
              ${metrics.financial.paidRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-green-600">Paid</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-700">
              ${metrics.financial.overdueRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-red-600">Overdue</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">
              {metrics.financial.paymentCount}
            </p>
            <p className="text-xs text-blue-600">Payments</p>
          </div>
        </div>
      </Card>

      {/* Service Breakdown + Weekly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Breakdown</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {Object.entries(metrics.serviceBreakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([type, count]) => {
                const total = metrics.workOrders.total || 1;
                const pct = ((count as number) / total) * 100;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm text-text-dim w-32 truncate">
                      {type
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500/[0.06]0 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-text-primary w-8 text-right">
                      {count as number}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              Weekly Trend
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3">
            {metrics.weeklyTrend.map((week: any, i: number) => (
              <div key={i} className="p-3 bg-surface-hover rounded-lg text-center">
                <p className="text-xs text-text-muted">{week.week}</p>
                <p className="text-lg font-bold text-text-primary">
                  {week.orders} / {week.completed}
                </p>
                <p className="text-[10px] text-text-muted">new / done</p>
                <p className="text-sm font-medium text-green-600">
                  ${week.revenue.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
