"use client";

import { useInvoices } from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, Badge } from "@/components/ui";
import { DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { formatCurrency, INVOICE_STATUS_LABELS } from "@/lib/utils";

export default function AdminBillingPage() {
  const { data: invoices, isLoading } = useInvoices();

  const stats = {
    total: invoices?.reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0,
    paid: invoices?.filter((i: any) => i.status === "PAID").reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0,
    pending: invoices?.filter((i: any) => ["DRAFT", "SENT"].includes(i.status)).reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0,
    overdue: invoices?.filter((i: any) => i.status === "OVERDUE").reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Billing</h1>
        <p className="text-text-muted mt-1">Financial overview and invoice management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/[0.06]">
              <DollarSign className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Total Billed</p>
              <p className="text-xl font-bold text-text-primary">{formatCurrency(stats.total)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Paid</p>
              <p className="text-xl font-bold text-text-primary">{formatCurrency(stats.paid)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-50">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Pending</p>
              <p className="text-xl font-bold text-text-primary">{formatCurrency(stats.pending)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50">
              <TrendingUp className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Overdue</p>
              <p className="text-xl font-bold text-text-primary">{formatCurrency(stats.overdue)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        {isLoading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : invoices?.length === 0 ? (
          <p className="text-sm text-text-muted">No invoices yet.</p>
        ) : (
          <div className="space-y-3">
            {invoices?.slice(0, 10).map((invoice: any) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover">
                <div>
                  <p className="text-sm font-medium text-text-primary">{invoice.invoiceNumber}</p>
                  <p className="text-xs text-text-muted">{invoice.client?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={
                    invoice.status === "PAID" ? "bg-green-100 text-green-700" :
                    invoice.status === "OVERDUE" ? "bg-red-100 text-red-700" :
                    "bg-surface-hover text-text-dim"
                  }>
                    {INVOICE_STATUS_LABELS[invoice.status]}
                  </Badge>
                  <span className="text-sm font-medium">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
