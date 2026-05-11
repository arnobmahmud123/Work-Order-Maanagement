"use client";

import { useState } from "react";
import { useDashboardMetrics, useTeamPerformance } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Card, CardHeader, CardTitle, Badge, Avatar } from "@/components/ui";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ClipboardList,
  Users,
  Award,
  Target,
  Briefcase,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";

export default function PerformancePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [period, setPeriod] = useState("30");
  const [view, setView] = useState<"personal" | "team">(
    role === "ADMIN" ? "team" : "personal"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <BarChart3 className="inline h-6 w-6 mr-2 text-cyan-400" />
            Performance
          </h1>
          <p className="text-text-muted mt-1">
            User metrics, working hours, and performance analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {role === "ADMIN" && (
            <div className="flex rounded-lg border border-border-subtle overflow-hidden">
              <button
                onClick={() => setView("team")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-all",
                  view === "team"
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/10"
                    : "bg-surface text-text-secondary hover:bg-surface-hover"
                )}
              >
                Team
              </button>
              <button
                onClick={() => setView("personal")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-all",
                  view === "personal"
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/10"
                    : "bg-surface text-text-secondary hover:bg-surface-hover"
                )}
              >
                My Stats
              </button>
            </div>
          )}
          <div className="flex rounded-lg border border-border-subtle overflow-hidden">
            {["7", "30", "90"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-all",
                  period === p
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/10"
                    : "bg-surface text-text-secondary hover:bg-surface-hover"
                )}
              >
                {p} Days
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "team" && role === "ADMIN" ? (
        <TeamView />
      ) : (
        <PersonalView period={period} />
      )}
    </div>
  );
}

function PersonalView({ period }: { period: string }) {
  const { data: metrics, isLoading } = useDashboardMetrics(undefined, period);

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading metrics...</div>;
  }

  if (!metrics) {
    return <div className="p-8 text-center text-text-muted">No data available</div>;
  }

  const scoreColor =
    metrics.overallScore >= 80
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : metrics.overallScore >= 60
        ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
        : "text-rose-500 bg-rose-500/10 border-rose-500/20";

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <div className="flex items-center gap-6">
          <div
            className={cn(
              "h-24 w-24 rounded-2xl border-2 flex items-center justify-center",
              scoreColor
            )}
          >
            <div className="text-center">
              <p className="text-3xl font-bold">{metrics.overallScore}</p>
              <p className="text-[10px] font-medium">SCORE</p>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              {metrics.user.name}
            </h3>
            <p className="text-sm text-text-muted">
              {metrics.user.role} • Member since{" "}
              {formatDate(metrics.user.memberSince)}
            </p>
            <div className="grid grid-cols-4 gap-4 mt-3">
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
                  <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        s.value >= 80
                          ? "bg-emerald-500"
                          : s.value >= 60
                            ? "bg-amber-500"
                            : "bg-rose-500"
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Work Orders",
            value: metrics.workOrders.total,
            icon: ClipboardList,
            color: "text-blue-500 bg-blue-500/10",
          },
          {
            label: "Completed",
            value: metrics.workOrders.completed,
            icon: CheckCircle2,
            color: "text-emerald-500 bg-emerald-500/10",
          },
          {
            label: "Active",
            value: metrics.workOrders.active,
            icon: Clock,
            color: "text-cyan-400 bg-cyan-400/10",
          },
          {
            label: "Overdue",
            value: metrics.workOrders.overdue,
            icon: AlertTriangle,
            color: "text-rose-500 bg-rose-500/10",
          },
          {
            label: "Completion Rate",
            value: `${metrics.workOrders.completionRate}%`,
            icon: Target,
            color: "text-emerald-500 bg-emerald-500/10",
          },
          {
            label: "On-Time Rate",
            value: `${metrics.workOrders.onTimeRate}%`,
            icon: Clock,
            color: "text-cyan-500 bg-cyan-500/10",
          },
          {
            label: "Avg Days to Complete",
            value: metrics.workOrders.avgCompletionDays,
            icon: Calendar,
            color: "text-amber-500 bg-amber-500/10",
          },
          {
            label: "Working Hours",
            value: metrics.hours.total,
            icon: Clock,
            color: "text-purple-500 bg-purple-500/10",
          },
        ].map((m) => (
          <Card key={m.label} padding={false}>
            <div className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", m.color)}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-text-primary">{m.value}</p>
                <p className="text-xs text-text-muted">{m.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Financial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-surface-hover rounded-lg border border-border-subtle">
            <p className="text-2xl font-bold text-text-primary">
              ${metrics.financial.totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-text-muted">Total Revenue</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <p className="text-2xl font-bold text-emerald-600">
              ${metrics.financial.paidRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600">Paid</p>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
            <p className="text-2xl font-bold text-rose-600">
              ${metrics.financial.overdueRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-rose-600">Overdue</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-2xl font-bold text-blue-600">
              {metrics.financial.paymentCount}
            </p>
            <p className="text-xs text-blue-600">Payments Received</p>
          </div>
        </div>
      </Card>

      {/* Period comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Period: Last {metrics.period}</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-surface-hover rounded-lg text-center border border-border-subtle">
            <p className="text-xl font-bold text-text-primary">
              {metrics.workOrders.periodTotal}
            </p>
            <p className="text-xs text-text-muted">New Work Orders</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-center border border-emerald-500/20">
            <p className="text-xl font-bold text-emerald-600">
              {metrics.workOrders.periodCompleted}
            </p>
            <p className="text-xs text-emerald-600">Completed</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-center border border-amber-500/20">
            <p className="text-xl font-bold text-amber-600">
              {metrics.hours.period}h
            </p>
            <p className="text-xs text-amber-600">Hours Worked</p>
          </div>
          <div className="p-3 bg-cyan-400/10 rounded-lg text-center border border-cyan-400/20">
            <p className="text-xl font-bold text-cyan-400">
              ${metrics.financial.periodRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-cyan-400">Revenue</p>
          </div>
        </div>
      </Card>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            Weekly Trend
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-4 gap-3">
          {metrics.weeklyTrend.map((week: any, i: number) => (
            <div key={i} className="p-3 bg-surface-hover rounded-lg text-center">
              <p className="text-xs text-text-muted mb-1">{week.week}</p>
              <p className="text-lg font-bold text-text-primary">{week.orders}</p>
              <p className="text-[10px] text-text-muted">new orders</p>
              <p className="text-sm font-medium text-green-600 mt-1">
                {week.completed} completed
              </p>
              <p className="text-xs text-text-muted">
                ${week.revenue.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TeamView() {
  const [roleFilter, setRoleFilter] = useState("");
  const { data, isLoading } = useTeamPerformance(roleFilter || undefined);

  const users = data?.users || [];

  return (
    <div className="space-y-6">
      {/* Role filter */}
      <div className="flex gap-2">
        {["", "CONTRACTOR", "COORDINATOR", "PROCESSOR", "CLIENT"].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
              roleFilter === r
                ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/10 border-transparent"
                : "bg-surface text-text-secondary border-border-subtle hover:bg-surface-hover"
            )}
          >
            {r || "All Roles"}
          </button>
        ))}
      </div>

      {/* Team cards */}
      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u: any) => (
            <UserCard key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserCard({ user }: { user: any }) {
  const m = user.metrics;
  const scoreColor =
    user.score >= 80
      ? "text-emerald-500 bg-emerald-500/10"
      : user.score >= 60
        ? "text-amber-500 bg-amber-500/10"
        : "text-rose-500 bg-rose-500/10";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-4">
        <Avatar name={user.name} src={user.image} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {user.name}
            </h3>
            <Badge className={cn("text-xs", scoreColor)}>
              {user.score}
            </Badge>
          </div>
          <p className="text-xs text-text-muted">{user.role}</p>
          {user.company && (
            <p className="text-xs text-text-muted">{user.company}</p>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-surface-hover rounded-lg">
          <p className="text-lg font-bold text-text-primary">{m.totalJobs}</p>
          <p className="text-[10px] text-text-muted">Jobs</p>
        </div>
        <div className="text-center p-2 bg-surface-hover rounded-lg">
          <p className="text-lg font-bold text-text-primary">{m.completedJobs}</p>
          <p className="text-[10px] text-text-muted">Done</p>
        </div>
        <div className="text-center p-2 bg-surface-hover rounded-lg">
          <p className="text-lg font-bold text-text-primary">{m.activeJobs}</p>
          <p className="text-[10px] text-text-muted">Active</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">Completion Rate</span>
          <span className="font-medium text-text-primary">{m.completionRate}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">On-Time Rate</span>
          <span className="font-medium text-text-primary">{m.onTimeRate}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Avg Days</span>
          <span className="font-medium text-text-primary">{m.avgCompletionDays}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Hours</span>
          <span className="font-medium text-text-primary">{m.totalHours}h</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Revenue</span>
          <span className="font-medium text-green-600">
            ${m.totalRevenue.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Payments</span>
          <span className="font-medium text-text-primary">{m.paymentCount}</span>
        </div>
        {m.overdueJobs > 0 && (
          <div className="flex justify-between">
            <span className="text-red-500">Overdue</span>
            <span className="font-medium text-red-600">{m.overdueJobs}</span>
          </div>
        )}
      </div>

      {/* View details link */}
      <Link
        href={`/dashboard/performance/${user.id}`}
        className="block mt-4 pt-3 border-t border-border-subtle text-center text-xs font-medium text-cyan-400 hover:text-cyan-400"
      >
        View Full Profile →
      </Link>
    </Card>
  );
}
