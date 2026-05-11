"use client";

import { useDashboardStats, useInvoices, useUsers } from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui";
import {
  BarChart3,
  TrendingUp,
  Users,
  ClipboardList,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, STATUS_LABELS, cn } from "@/lib/utils";

export default function AdminReportsPage() {
  const { data: stats } = useDashboardStats();
  const { data: invoices } = useInvoices();
  const { data: users } = useUsers();

  const contractors = users?.filter((u: any) => u.role === "CONTRACTOR") || [];
  const coordinators = users?.filter((u: any) => u.role === "COORDINATOR") || [];

  const invoiceStats = {
    total: invoices?.reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0,
    paid: invoices?.filter((i: any) => i.status === "PAID").reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0,
    pending: invoices?.filter((i: any) => ["DRAFT", "SENT"].includes(i.status)).reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0,
    overdue: invoices?.filter((i: any) => i.status === "OVERDUE").reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0,
  };

  const reports = [
    {
      icon: ClipboardList,
      title: "Work Order Report",
      desc: "Completion rates, turnaround times, and status breakdowns.",
      href: "/dashboard/work-orders",
      color: "bg-blue-50 text-blue-600",
      stat: stats ? `${stats.totalWorkOrders} total` : "—",
      detail: stats ? `${stats.activeWorkOrders} active, ${stats.completedThisMonth} completed this month` : "",
    },
    {
      icon: DollarSign,
      title: "Revenue Report",
      desc: "Invoice totals, payment status, and revenue trends.",
      href: "/dashboard/invoices",
      color: "bg-green-50 text-green-600",
      stat: formatCurrency(invoiceStats.total),
      detail: `${formatCurrency(invoiceStats.paid)} paid, ${formatCurrency(invoiceStats.overdue)} overdue`,
    },
    {
      icon: Users,
      title: "Contractor Report",
      desc: "Contractor performance, assignments, and completion rates.",
      href: "/dashboard/admin/contractors",
      color: "bg-purple-50 text-purple-600",
      stat: `${contractors.length} contractors`,
      detail: `${coordinators.length} coordinators`,
    },
    {
      icon: TrendingUp,
      title: "Service Analysis",
      desc: "Breakdown by service type, geographic distribution, and trends.",
      href: "/dashboard/work-orders/finder",
      color: "bg-amber-50 text-amber-600",
      stat: stats?.serviceBreakdown
        ? `${Object.keys(stats.serviceBreakdown).length} types`
        : "—",
      detail: "Filter by service type in the finder",
    },
    {
      icon: BarChart3,
      title: "SLA Compliance",
      desc: "On-time completion rates and SLA adherence metrics.",
      href: "/dashboard/performance",
      color: "bg-red-50 text-red-600",
      stat: stats?.overdueCount !== undefined
        ? `${stats.overdueCount} overdue`
        : "—",
      detail: "View detailed performance metrics",
    },
    {
      icon: Clock,
      title: "Email Scorecard",
      desc: "AI-powered analysis of email activity and business performance.",
      href: "/dashboard/email/scorecard",
      color: "bg-cyan-50 text-cyan-600",
      stat: "AI Analysis",
      detail: "Business insights from email patterns",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <p className="text-text-muted mt-1">Analytics and business intelligence</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/[0.06]">
              <ClipboardList className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Work Orders</p>
              <p className="text-xl font-bold text-text-primary">
                {stats?.totalWorkOrders ?? "—"}
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
              <p className="text-xs text-text-muted">Revenue</p>
              <p className="text-xl font-bold text-text-primary">
                {formatCurrency(invoiceStats.total)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-text-muted">Users</p>
              <p className="text-xl font-bold text-text-primary">
                {users?.length ?? "—"}
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
                {stats?.overdueCount ?? "—"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Link key={report.title} href={report.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-2 rounded-lg", report.color)}>
                  <report.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary">{report.title}</h3>
                  <p className="text-xs text-text-muted">{report.stat}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted" />
              </div>
              <p className="text-sm text-text-muted mb-2">{report.desc}</p>
              {report.detail && (
                <p className="text-xs text-text-muted">{report.detail}</p>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {/* Status breakdown */}
      {stats?.statusBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Work Order Status Breakdown</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <Link
                key={status}
                href={`/dashboard/work-orders?status=${status}`}
                className="p-3 rounded-lg border border-border-subtle hover:border-indigo-300 hover:bg-cyan-500/[0.06]/30 transition-colors text-center"
              >
                <p className="text-2xl font-bold text-text-primary">{count as number}</p>
                <p className="text-[10px] text-text-muted mt-1">
                  {STATUS_LABELS[status] || status}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
