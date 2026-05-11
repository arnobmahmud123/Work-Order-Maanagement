"use client";

import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui";
import {
  Printer,
  Send,
  DollarSign,
  CheckCircle2,
  Wrench,
  Package,
  Truck,
  FileText,
  ChevronLeft,
  X,
  Mail,
  Building2,
  Phone,
  Calendar,
  Clock,
  Briefcase,
  Receipt,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  INVOICE_STATUS_LABELS,
  cn,
} from "@/lib/utils";
import toast from "react-hot-toast";

interface InvoiceItem {
  id: string;
  description: string;
  taskName?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  createdAt: string;
  dueDate?: string;
  paidAt?: string;
  notes?: string;
  noCharge?: boolean;
  items: InvoiceItem[];
  client?: {
    name: string;
    email?: string;
    company?: string;
    phone?: string;
  };
  workOrder?: {
    id: string;
    title: string;
    address: string;
  };
}

interface InvoiceFullViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  workOrderTitle?: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-surface-hover text-text-dim border-border-subtle",
  SENT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  OVERDUE: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  CANCELLED: "bg-surface-hover text-text-muted border-border-subtle",
};

export function InvoiceFullViewModal({
  isOpen,
  onClose,
  invoice,
  workOrderTitle,
}: InvoiceFullViewModalProps) {
  if (!invoice) return null;

  // Categorize items for the summary
  const categorizedItems = (invoice.items || []).map((item: any) => {
    const desc = (item.description || item.taskName || "").toLowerCase();
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
    .reduce((sum: number, i: any) => sum + (i.amount || i.quantity * i.unitPrice), 0);
  const materialTotal = categorizedItems
    .filter((i: any) => i.category === "materials")
    .reduce((sum: number, i: any) => sum + (i.amount || i.quantity * i.unitPrice), 0);
  const otherTotal = categorizedItems
    .filter((i: any) => !["labor", "materials"].includes(i.category))
    .reduce((sum: number, i: any) => sum + (i.amount || i.quantity * i.unitPrice), 0);

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-surface/95 backdrop-blur-2xl border border-border-medium rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-border-subtle relative z-10">
          <div className="flex items-center gap-6">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(16,185,129,0.2)]">
              <Receipt className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-text-primary tracking-tight">
                  {invoice.invoiceNumber}
                </h2>
                <Badge className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-widest border shadow-sm", statusColors[invoice.status])}>
                  {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
                </Badge>
                {invoice.noCharge && (
                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                    No Charge
                  </Badge>
                )}
              </div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                Created on {formatDateTime(invoice.createdAt)}
                <span className="h-1 w-1 rounded-full bg-text-dim" />
                ID: {invoice.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-surface-hover text-text-primary border border-border-subtle hover:bg-surface-hover hover:text-white transition-all text-[10px] font-black uppercase tracking-widest active:scale-95"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-3 rounded-2xl hover:bg-surface-hover text-text-muted hover:text-white transition-all group active:scale-95 border border-transparent hover:border-border-subtle"
            >
              <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-10 space-y-10 custom-scrollbar relative z-10">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface/40 backdrop-blur-md rounded-[2rem] border border-border-subtle p-6 flex items-center gap-5 group hover:bg-surface-hover/60 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wrench className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-black text-text-primary">{formatCurrency(laborTotal)}</p>
                <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.15em] mt-0.5">Labor Assets</p>
              </div>
            </div>

            <div className="bg-surface/40 backdrop-blur-md rounded-[2rem] border border-border-subtle p-6 flex items-center gap-5 group hover:bg-surface-hover/60 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xl font-black text-text-primary">{formatCurrency(materialTotal)}</p>
                <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.15em] mt-0.5">Material Supply</p>
              </div>
            </div>

            <div className="bg-surface/40 backdrop-blur-md rounded-[2rem] border border-border-subtle p-6 flex items-center gap-5 group hover:bg-surface-hover/60 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xl font-black text-text-primary">{formatCurrency(otherTotal)}</p>
                <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.15em] mt-0.5">Logistics & Other</p>
              </div>
            </div>
          </div>

          {/* Recipient & Context Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Bill To */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Billing Recipient</h3>
              </div>
              
              <div className="bg-surface/40 backdrop-blur-md rounded-[2rem] border border-border-subtle p-8 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-base font-black text-text-primary">{invoice.client?.name || "Unspecified Recipient"}</p>
                    {invoice.client?.company && <p className="text-xs font-bold text-text-muted mt-0.5">{invoice.client.company}</p>}
                  </div>
                </div>

                <div className="h-px bg-border-subtle w-full" />

                <div className="grid grid-cols-1 gap-4">
                  {invoice.client?.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-text-dim" />
                      <span className="text-sm text-text-secondary">{invoice.client.email}</span>
                    </div>
                  )}
                  {invoice.client?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-text-dim" />
                      <span className="text-sm text-text-secondary">{invoice.client.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Operational Context */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Logistical Context</h3>
              </div>

              <div className="bg-surface/40 backdrop-blur-md rounded-[2rem] border border-border-subtle p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">Work Order</p>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-cyan-400" />
                      <p className="text-sm font-black text-text-primary truncate">{workOrderTitle || invoice.workOrder?.title || "N/A"}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">Operational Status</p>
                    <p className="text-sm font-black text-text-primary">{INVOICE_STATUS_LABELS[invoice.status] || invoice.status}</p>
                  </div>
                </div>

                <div className="h-px bg-border-subtle w-full" />

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">Scheduled Due Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-violet-400" />
                      <p className="text-sm font-black text-text-primary">{invoice.dueDate ? formatDate(invoice.dueDate) : "None"}</p>
                    </div>
                  </div>
                  {invoice.paidAt && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">Settlement Date</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-emerald-400" />
                        <p className="text-sm font-black text-emerald-400">{formatDateTime(invoice.paidAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Service Itemization</h3>
            </div>

            <div className="bg-surface/40 backdrop-blur-md rounded-[2.5rem] border border-border-subtle overflow-hidden shadow-2xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-hover/50">
                    <th className="text-left px-8 py-6 text-[10px] font-black text-text-dim uppercase tracking-widest">Asset Description</th>
                    <th className="text-center px-8 py-6 text-[10px] font-black text-text-dim uppercase tracking-widest">Category</th>
                    <th className="text-right px-8 py-6 text-[10px] font-black text-text-dim uppercase tracking-widest">Units</th>
                    <th className="text-right px-8 py-6 text-[10px] font-black text-text-dim uppercase tracking-widest">Unit Value</th>
                    <th className="text-right px-8 py-6 text-[10px] font-black text-text-dim uppercase tracking-widest">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {categorizedItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <tr key={item.id} className="group hover:bg-surface-hover/30 transition-all">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-surface-hover flex items-center justify-center group-hover:bg-background transition-colors">
                              <ItemIcon className="h-4 w-4 text-text-muted group-hover:text-cyan-400 transition-colors" />
                            </div>
                            <span className="text-sm font-bold text-text-primary">{item.description || item.taskName}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <Badge
                            className={cn(
                              "text-[8px] px-2 py-0.5 font-black uppercase tracking-tighter border",
                              item.category === "labor"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : item.category === "materials"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-surface-hover text-text-muted border-border-subtle"
                            )}
                          >
                            {item.category}
                          </Badge>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-text-muted text-right">{item.quantity}</td>
                        <td className="px-8 py-5 text-sm font-medium text-text-muted text-right font-mono">{formatCurrency(item.unitPrice || 0)}</td>
                        <td className="px-8 py-5 text-sm font-black text-text-primary text-right font-mono">{formatCurrency(item.amount || item.quantity * item.unitPrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-surface-hover/20">
                  <tr className="border-t border-border-subtle">
                    <td colSpan={4} className="px-8 py-5 text-[10px] font-black text-text-muted text-right uppercase tracking-widest">Operational Subtotal</td>
                    <td className="px-8 py-5 text-base font-black text-text-primary text-right font-mono">{formatCurrency(invoice.subtotal || 0)}</td>
                  </tr>
                  {invoice.tax > 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-5 text-[10px] font-black text-text-muted text-right uppercase tracking-widest">Tax Provision</td>
                      <td className="px-8 py-5 text-base font-black text-text-primary text-right font-mono">{formatCurrency(invoice.tax)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-border-medium bg-gradient-to-r from-emerald-500/5 to-cyan-500/5">
                    <td colSpan={4} className="px-8 py-8 text-lg font-black text-text-primary text-right uppercase tracking-[0.2em]">Settlement Total</td>
                    <td className="px-8 py-8 text-3xl font-black text-emerald-400 text-right drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] font-mono">
                      {invoice.noCharge ? "NO CHARGE" : formatCurrency(invoice.total || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Directive Documentation</h3>
              </div>
              <div className="bg-surface/40 backdrop-blur-md rounded-[2rem] border border-border-subtle p-8">
                <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed font-medium">
                  {invoice.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-10 py-8 border-t border-border-subtle bg-surface-hover/30 flex justify-end gap-4 relative z-10">
          {invoice.status === "DRAFT" && (
            <button
              onClick={() => {
                toast.success("Invoice marked as Sent");
                onClose();
              }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_8px_25px_-5px_rgba(6,182,212,0.4)] hover:shadow-[0_12px_30px_-5px_rgba(6,182,212,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
            >
              <Send className="h-4 w-4" />
              Transmit Invoice
            </button>
          )}
          {invoice.status === "SENT" && (
            <button
              onClick={() => {
                toast.success("Invoice marked as Paid");
                onClose();
              }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_8px_25px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_30px_-5px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
            >
              <CheckCircle2 className="h-4 w-4" />
              Record Settlement
            </button>
          )}
          <button
            onClick={onClose}
            className="px-8 py-4 rounded-2xl bg-surface-hover text-text-secondary text-[10px] font-black uppercase tracking-widest border border-border-subtle hover:bg-surface-hover hover:text-white transition-all active:scale-95"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
