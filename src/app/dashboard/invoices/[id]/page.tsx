"use client";

import { use } from "react";
import { useInvoice, useUpdateWorkOrder } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Badge, Button, Card, CardHeader, CardTitle } from "@/components/ui";
import {
  ArrowLeft,
  Printer,
  Send,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  Package,
  Truck,
  FileText,
} from "lucide-react";
import Link from "next/link";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  INVOICE_STATUS_LABELS,
  cn,
} from "@/lib/utils";
import toast from "react-hot-toast";

const statusColors: Record<string, string> = {
  DRAFT: "bg-surface-hover text-text-dim",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-surface-hover text-text-muted",
};

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading...</div>;
  }

  if (!invoice) {
    return <div className="p-8 text-center text-text-muted">Invoice not found</div>;
  }

  // Categorize items
  const categorizedItems = (invoice.items || []).map((item: any) => {
    const desc = item.description.toLowerCase();
    let category = "other";
    let icon = FileText;
    if (desc.includes("labor") || desc.includes("hour") || desc.includes("work")) {
      category = "labor";
      icon = Wrench;
    } else if (
      desc.includes("material") ||
      desc.includes("plywood") ||
      desc.includes("supply") ||
      desc.includes("hardware")
    ) {
      category = "materials";
      icon = Package;
    } else if (desc.includes("trip") || desc.includes("mobilization")) {
      category = "trip";
      icon = Truck;
    }
    return { ...item, category, icon };
  });

  const laborTotal = categorizedItems
    .filter((i: any) => i.category === "labor")
    .reduce((sum: number, i: any) => sum + i.amount, 0);
  const materialTotal = categorizedItems
    .filter((i: any) => i.category === "materials")
    .reduce((sum: number, i: any) => sum + i.amount, 0);
  const otherTotal = categorizedItems
    .filter((i: any) => !["labor", "materials"].includes(i.category))
    .reduce((sum: number, i: any) => sum + i.amount, 0);

  async function handleStatusChange(status: string) {
    // In production, this would call the API
    toast.success(`Invoice marked as ${INVOICE_STATUS_LABELS[status]}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/invoices" className="p-1 hover:bg-surface-hover rounded-lg">
            <ArrowLeft className="h-5 w-5 text-text-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{invoice.invoiceNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn(statusColors[invoice.status])}>
                {INVOICE_STATUS_LABELS[invoice.status]}
              </Badge>
              {invoice.noCharge && (
                <Badge className="bg-yellow-100 text-yellow-700">No Charge</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          {invoice.status === "DRAFT" && ["ADMIN", "COORDINATOR"].includes(role) && (
            <Button size="sm" onClick={() => handleStatusChange("SENT")}>
              <Send className="h-4 w-4" />
              Send
            </Button>
          )}
          {invoice.status === "SENT" && ["ADMIN", "COORDINATOR"].includes(role) && (
            <Button size="sm" onClick={() => handleStatusChange("PAID")}>
              <CheckCircle2 className="h-4 w-4" />
              Mark Paid
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">{invoice.client?.name}</p>
            <p className="text-sm text-text-muted">{invoice.client?.email}</p>
            {invoice.client?.company && (
              <p className="text-sm text-text-muted">{invoice.client.company}</p>
            )}
            {invoice.client?.phone && (
              <p className="text-sm text-text-muted">{invoice.client.phone}</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {invoice.workOrder && (
              <div>
                <p className="text-xs text-text-muted">Work Order</p>
                <Link
                  href={`/dashboard/work-orders/${invoice.workOrder.id}`}
                  className="text-sm text-cyan-400 hover:underline"
                >
                  {invoice.workOrder.title}
                </Link>
                <p className="text-xs text-text-muted">{invoice.workOrder.address}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-text-muted">Created</p>
              <p className="text-sm">{formatDateTime(invoice.createdAt)}</p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className="text-xs text-text-muted">Due Date</p>
                <p className="text-sm">{formatDate(invoice.dueDate)}</p>
              </div>
            )}
            {invoice.paidAt && (
              <div>
                <p className="text-xs text-text-muted">Paid</p>
                <p className="text-sm text-green-600">{formatDateTime(invoice.paidAt)}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Cost Breakdown Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{formatCurrency(laborTotal)}</p>
              <p className="text-xs text-text-muted">Labor</p>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{formatCurrency(materialTotal)}</p>
              <p className="text-xs text-text-muted">Materials</p>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-surface-hover">
              <DollarSign className="h-5 w-5 text-text-muted" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{formatCurrency(otherTotal)}</p>
              <p className="text-xs text-text-muted">Other</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Line Items */}
      <Card padding={false}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-hover">
              <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Description
              </th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Category
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Qty
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Unit Price
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categorizedItems.map((item: any) => (
              <tr key={item.id}>
                <td className="px-6 py-4 text-sm text-text-primary">{item.description}</td>
                <td className="px-6 py-4 text-center">
                  <Badge
                    className={cn(
                      "text-[10px]",
                      item.category === "labor"
                        ? "bg-blue-50 text-blue-700"
                        : item.category === "materials"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-surface-hover text-text-muted"
                    )}
                  >
                    {item.category}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-text-dim text-right">{item.quantity}</td>
                <td className="px-6 py-4 text-sm text-text-dim text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-text-primary text-right">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-subtle">
              <td colSpan={4} className="px-6 py-3 text-sm text-text-muted text-right">
                Subtotal
              </td>
              <td className="px-6 py-3 text-sm font-medium text-text-primary text-right">
                {formatCurrency(invoice.subtotal)}
              </td>
            </tr>
            {invoice.tax > 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-3 text-sm text-text-muted text-right">
                  Tax
                </td>
                <td className="px-6 py-3 text-sm text-text-primary text-right">
                  {formatCurrency(invoice.tax)}
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-border-medium">
              <td colSpan={4} className="px-6 py-4 text-base font-semibold text-text-primary text-right">
                Total
              </td>
              <td className="px-6 py-4 text-base font-bold text-text-primary text-right">
                {invoice.noCharge ? "No Charge" : formatCurrency(invoice.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* Status actions for admin */}
      {["ADMIN", "COORDINATOR"].includes(role) && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {invoice.status === "DRAFT" && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("SENT")}>
                <Send className="h-4 w-4" />
                Mark as Sent
              </Button>
            )}
            {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("PAID")}>
                <CheckCircle2 className="h-4 w-4" />
                Mark as Paid
              </Button>
            )}
            {invoice.status !== "OVERDUE" && invoice.status !== "PAID" && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("OVERDUE")}>
                <AlertTriangle className="h-4 w-4" />
                Mark as Overdue
              </Button>
            )}
            {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
              <Button variant="danger" size="sm" onClick={() => handleStatusChange("CANCELLED")}>
                Cancel Invoice
              </Button>
            )}
          </div>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <p className="text-sm text-text-dim whitespace-pre-wrap">{invoice.notes}</p>
        </Card>
      )}
    </div>
  );
}
