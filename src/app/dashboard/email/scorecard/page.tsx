"use client";

import { useState } from "react";
import { useEmailScorecard } from "@/hooks/use-data";
import { Button, Card, CardHeader, CardTitle, Badge } from "@/components/ui";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ClipboardList,
  MessageSquare,
  LifeBuoy,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function EmailScorecardPage() {
  const [period, setPeriod] = useState("30");
  const { data, isLoading } = useEmailScorecard(period);

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading scorecard...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-text-muted">No data available</div>;
  }

  const scoreColor =
    data.overallScore >= 80
      ? "text-green-600 bg-green-50 border-green-200"
      : data.overallScore >= 60
        ? "text-yellow-600 bg-yellow-50 border-yellow-200"
        : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/email">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              <BarChart3 className="inline h-6 w-6 mr-2 text-cyan-400" />
              Business Scorecard
            </h1>
            <p className="text-text-muted mt-1">
              Performance analysis for the last {data.period}
            </p>
          </div>
        </div>
        <div className="flex rounded-lg border border-border-medium overflow-hidden">
          {["7", "30", "90"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium",
                period === p
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "bg-surface-hover text-text-dim hover:bg-surface-hover"
              )}
            >
              {p} Days
            </button>
          ))}
        </div>
      </div>

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
              <p className="text-3xl font-bold">{data.overallScore}</p>
              <p className="text-[10px] font-medium">SCORE</p>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {data.overallScore >= 80
                ? "Excellent Performance"
                : data.overallScore >= 60
                  ? "Good Performance"
                  : "Needs Improvement"}
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                {
                  label: "Completion",
                  value: data.scores.completion,
                  color: data.scores.completion >= 80 ? "bg-green-500" : data.scores.completion >= 60 ? "bg-yellow-500" : "bg-red-500",
                },
                {
                  label: "On-Time",
                  value: data.scores.onTime,
                  color: data.scores.onTime >= 80 ? "bg-green-500" : data.scores.onTime >= 60 ? "bg-yellow-500" : "bg-red-500",
                },
                {
                  label: "Overdue",
                  value: data.scores.overdue,
                  color: data.scores.overdue >= 80 ? "bg-green-500" : data.scores.overdue >= 60 ? "bg-yellow-500" : "bg-red-500",
                },
                {
                  label: "Revenue",
                  value: data.scores.revenue,
                  color: data.scores.revenue >= 80 ? "bg-green-500" : data.scores.revenue >= 60 ? "bg-yellow-500" : "bg-red-500",
                },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">{s.label}</span>
                    <span className="text-xs font-medium text-text-dim">
                      {s.value}%
                    </span>
                  </div>
                  <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", s.color)}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Work Orders",
            value: data.metrics.totalWorkOrders,
            icon: ClipboardList,
            color: "text-blue-600 bg-blue-50",
          },
          {
            label: "Completed",
            value: data.metrics.completedWorkOrders,
            icon: CheckCircle2,
            color: "text-green-600 bg-green-50",
          },
          {
            label: "Overdue",
            value: data.metrics.overdueWorkOrders,
            icon: AlertTriangle,
            color: "text-red-600 bg-red-50",
          },
          {
            label: "Avg Days",
            value: data.metrics.avgCompletionDays,
            icon: Clock,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: "Messages",
            value: data.metrics.totalMessages,
            icon: MessageSquare,
            color: "text-cyan-400 bg-cyan-500/[0.06]",
          },
          {
            label: "Tickets",
            value: data.metrics.totalTickets,
            icon: LifeBuoy,
            color: "text-purple-600 bg-purple-50",
          },
          {
            label: "Completion Rate",
            value: `${data.metrics.completionRate}%`,
            icon: TrendingUp,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "On-Time Rate",
            value: `${data.metrics.onTimeRate}%`,
            icon: Clock,
            color: "text-cyan-600 bg-cyan-50",
          },
        ].map((m) => (
          <Card key={m.label} padding={false}>
            <div className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", m.color)}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{m.value}</p>
                <p className="text-xs text-text-muted">{m.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-surface-hover rounded-lg">
            <p className="text-2xl font-bold text-text-primary">
              ${data.revenue.total.toLocaleString()}
            </p>
            <p className="text-xs text-text-muted">Total Revenue</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">
              ${data.revenue.paid.toLocaleString()}
            </p>
            <p className="text-xs text-green-600">Paid ({data.revenue.paidCount})</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-700">
              ${data.revenue.overdue.toLocaleString()}
            </p>
            <p className="text-xs text-red-600">Overdue ({data.revenue.overdueCount})</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">
              {data.revenue.invoiceCount}
            </p>
            <p className="text-xs text-blue-600">Total Invoices</p>
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
          {data.weeklyTrend.map((week: any, i: number) => (
            <div key={i} className="p-3 bg-surface-hover rounded-lg text-center">
              <p className="text-xs text-text-muted mb-1">{week.week}</p>
              <p className="text-lg font-bold text-text-primary">{week.orders}</p>
              <p className="text-xs text-text-muted">orders</p>
              <p className="text-sm font-medium text-green-600 mt-1">
                ${week.revenue.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Service & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Breakdown</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {Object.entries(data.serviceBreakdown).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-text-dim">
                  {type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500/[0.06]0 rounded-full"
                      style={{
                        width: `${((count as number) / data.metrics.totalWorkOrders) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary w-8 text-right">
                    {count as number}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {Object.entries(data.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-text-dim">
                  {status.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${((count as number) / data.metrics.totalWorkOrders) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary w-8 text-right">
                    {count as number}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {data.insights.map((insight: string, i: number) => (
            <div
              key={i}
              className="p-3 bg-surface-hover rounded-lg text-sm text-text-dim"
            >
              {insight}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
