"use client";

import { useState } from "react";
import { useInvoices, useAccounting } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Card, CardHeader, CardTitle, Badge } from "@/components/ui";
import {
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Building2,
  Wrench,
  ArrowLeft,
  Filter,
  Download,
  Plus,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  INVOICE_STATUS_LABELS,
  formatDate,
  formatCurrency,
  cn,
} from "@/lib/utils";

export default function InvoicesPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [view, setView] = useState<"list" | "accounting">("list");
  const [statusFilter, setStatusFilter] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <Receipt className="inline h-6 w-6 mr-2 text-cyan-400" />
            Invoices
          </h1>
          <p className="text-text-muted mt-1">
            Manage invoices, track payments, and analyze profitability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["ADMIN", "COORDINATOR"].includes(role) && (
            <>
              <div className="flex rounded-lg border border-border-medium overflow-hidden">
                <button
                  onClick={() => setView("list")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium",
                    view === "list"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                      : "bg-surface-hover text-text-dim hover:bg-surface-hover"
                  )}
                >
                  Invoices
                </button>
                <button
                  onClick={() => setView("accounting")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium",
                    view === "accounting"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                      : "bg-surface-hover text-text-dim hover:bg-surface-hover"
                  )}
                >
                  Accounting
                </button>
              </div>
              <Link href="/dashboard/invoices/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  New Invoice
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {view === "accounting" ? <AccountingView /> : <InvoiceList />}
    </div>
  );
}

function InvoiceList() {
  const { data: invoices, isLoading } = useInvoices();
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = statusFilter
    ? invoices?.filter((inv: any) => inv.status === statusFilter)
    : invoices;

  return (
    <>
      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter("")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-lg border",
            !statusFilter
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-indigo-600"
              : "bg-surface-hover text-text-dim border-border-medium hover:bg-surface-hover"
          )}
        >
          All
        </button>
        {Object.entries(INVOICE_STATUS_LABELS).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border",
              statusFilter === val
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-indigo-600"
                : "bg-surface-hover text-text-dim border-border-medium hover:bg-surface-hover"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading...</div>
        ) : filtered?.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No invoices found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered?.map((inv: any) => (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="flex items-center gap-4 p-4 hover:bg-surface-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-text-primary">
                      #{inv.invoiceNumber}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                    {inv.noCharge && (
                      <Badge className="bg-surface-hover text-text-muted text-xs">
                        No Charge
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{inv.client?.name}</span>
                    {inv.workOrder && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {inv.workOrder.title}
                      </span>
                    )}
                    <span>{formatDate(inv.createdAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-text-primary">
                    {formatCurrency(inv.total)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {inv.items?.length || 0} items
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function AccountingView() {
  const [period, setPeriod] = useState("30");
  const { data, isLoading } = useAccounting(period);

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading accounting data...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-text-muted">No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex justify-end">
        <div className="flex rounded-lg border border-border-medium overflow-hidden">
          {["7", "30", "90", "365"].map((p) => (
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
              {p === "365" ? "1 Year" : `${p} Days`}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          {
            label: "Total Revenue",
            value: formatCurrency(data.overview.totalRevenue),
            icon: DollarSign,
            color: "text-text-muted bg-surface-hover",
          },
          {
            label: "Paid",
            value: formatCurrency(data.overview.paidRevenue),
            icon: CheckCircle2,
            color: "text-green-600 bg-green-50",
          },
          {
            label: "Pending",
            value: formatCurrency(data.overview.pendingRevenue),
            icon: Clock,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: "Overdue",
            value: formatCurrency(data.overview.overdueRevenue),
            icon: AlertTriangle,
            color: "text-red-600 bg-red-50",
          },
          {
            label: "Cancelled",
            value: formatCurrency(data.overview.cancelledRevenue),
            icon: TrendingDown,
            color: "text-text-muted bg-surface-hover",
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

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Object.entries(data.costBreakdown)
            .filter(([, val]) => (val as number) > 0)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([category, amount]) => (
              <div
                key={category}
                className="p-3 bg-surface-hover rounded-lg flex items-center justify-between"
              >
                <span className="text-sm text-text-dim capitalize">
                  {category}
                </span>
                <span className="text-sm font-semibold text-text-primary">
                  {formatCurrency(amount as number)}
                </span>
              </div>
            ))}
        </div>
      </Card>

      {/* Profit Per Work Order */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Profit by Work Order (Top 20)
          </CardTitle>
        </CardHeader>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {data.workOrderProfits.slice(0, 20).map((wo: any) => (
            <Link
              key={wo.id}
              href={`/dashboard/work-orders/${wo.id}`}
              className="flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {wo.title}
                </p>
                <p className="text-xs text-text-muted">
                  {wo.address} • {wo.contractor?.name || "No contractor"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(wo.invoiceTotal)}
                </p>
                <p className="text-xs text-text-muted">
                  Paid: {formatCurrency(wo.paidTotal)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Profit Per Property */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan-400" />
            Profit by Property (Top 15)
          </CardTitle>
        </CardHeader>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {data.propertyProfits.slice(0, 15).map((prop: any) => (
            <div
              key={prop.id}
              className="flex items-center gap-3 p-3 hover:bg-surface-hover"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {prop.address}
                </p>
                <p className="text-xs text-text-muted">
                  {[prop.city, prop.state].filter(Boolean).join(", ")} •{" "}
                  {prop.workOrders} work orders
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(prop.totalRevenue)}
                </p>
                <p className="text-xs text-text-muted">
                  Paid: {formatCurrency(prop.paidRevenue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Contractor Financials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            Contractor Financials
          </CardTitle>
        </CardHeader>
        <div className="divide-y divide-gray-100">
          {data.contractorFinancials.map((c: any) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 hover:bg-surface-hover"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{c.name}</p>
                <p className="text-xs text-text-muted">
                  {c.workOrders} work orders
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-text-primary">
                  {formatCurrency(c.totalBilled)}
                </p>
                <p className="text-xs text-green-600">
                  Paid: {formatCurrency(c.paidAmount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Service Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Service Type</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {Object.entries(data.serviceRevenue)
            .sort(([, a], [, b]) => (b as any).revenue - (a as any).revenue)
            .map(([type, data]: [string, any]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm text-text-dim w-36 truncate">
                  {type
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500/[0.06]0 rounded-full"
                    style={{
                      width: `${
                        data.revenue > 0
                          ? (data.revenue /
                              (Object.values(data.serviceRevenue) as any[]).reduce(
                                (s: number, v: any) => Math.max(s, v.revenue),
                                0
                              )) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-text-primary w-24 text-right">
                  {formatCurrency(data.revenue)}
                </span>
                <span className="text-xs text-text-muted w-8 text-right">
                  ({data.count})
                </span>
              </div>
            ))}
        </div>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            Monthly Trend
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-6 gap-3">
          {data.monthlyTrend.map((m: any, i: number) => (
            <div key={i} className="p-3 bg-surface-hover rounded-lg text-center">
              <p className="text-xs text-text-muted mb-1">{m.month}</p>
              <p className="text-lg font-bold text-text-primary">
                {formatCurrency(m.revenue)}
              </p>
              <p className="text-xs text-green-600">
                Paid: {formatCurrency(m.paid)}
              </p>
              <p className="text-xs text-text-muted">{m.invoices} invoices</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Chargebacks */}
      {data.chargebacks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Chargebacks ({data.chargebacks.length})
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {data.chargebacks.map((cb: any) => (
              <div
                key={cb.id}
                className="flex items-center gap-3 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    #{cb.invoiceNumber}
                  </p>
                  <p className="text-xs text-text-muted">
                    {cb.client?.name} • {cb.workOrder?.title}
                  </p>
                </div>
                <span className="text-sm font-bold text-red-600">
                  -{formatCurrency(cb.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-surface-hover text-text-dim",
    SENT: "bg-blue-100 text-blue-700",
    PAID: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-surface-hover text-text-muted",
  };

  return (
    <Badge className={cn("text-xs", colors[status] || "bg-surface-hover text-text-dim")}>
      {INVOICE_STATUS_LABELS[status] || status}
    </Badge>
  );
}
