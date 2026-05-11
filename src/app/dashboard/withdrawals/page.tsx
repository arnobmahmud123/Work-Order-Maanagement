"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardHeader, CardTitle, Button, Badge, Input } from "@/components/ui";
import {
  CreditCard,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  ChevronRight,
  X,
} from "lucide-react";
import { cn, formatRelativeTime, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_ICONS: Record<string, any> = {
  PENDING: Clock,
  PROCESSING: Loader2,
  COMPLETED: CheckCircle2,
  REJECTED: XCircle,
};

const PAYMENT_METHODS = [
  { id: "ACH", label: "ACH (US Bank)", fields: ["routingNumber", "accountNumber", "bankName"] },
  { id: "WIRE", label: "Wire Transfer", fields: ["swift", "iban", "bankName", "country"] },
  { id: "PAYPAL", label: "PayPal", fields: ["email"] },
  { id: "ZELLE", label: "Zelle", fields: ["emailOrPhone"] },
  { id: "CHECK", label: "Check", fields: ["mailingAddress"] },
];

const FIELD_LABELS: Record<string, string> = {
  routingNumber: "Routing Number",
  accountNumber: "Account Number",
  bankName: "Bank Name",
  swift: "SWIFT/BIC",
  iban: "IBAN",
  country: "Country",
  email: "Email Address",
  emailOrPhone: "Email or Phone",
  mailingAddress: "Mailing Address",
};

export default function WithdrawalsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";
  const qc = useQueryClient();

  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({
    amount: "",
    method: "ACH",
    paymentDetails: {} as Record<string, string>,
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch balance
  const { data: balanceData } = useQuery({
    queryKey: ["contractor-balance"],
    queryFn: async () => {
      const res = await fetch("/api/contractor/balance");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const balance = balanceData?.balance;

  // Fetch withdrawals
  const { data, isLoading } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/withdrawals");
      if (!res.ok) return { withdrawals: [] };
      return res.json();
    },
  });

  const withdrawals = data?.withdrawals || [];

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === requestForm.method);

  function handleFieldChange(field: string, value: string) {
    setRequestForm({
      ...requestForm,
      paymentDetails: { ...requestForm.paymentDetails, [field]: value },
    });
  }

  async function handleSubmitRequest() {
    const amount = parseFloat(requestForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    // Validate required fields
    const method = PAYMENT_METHODS.find((m) => m.id === requestForm.method);
    if (method) {
      for (const field of method.fields) {
        if (!requestForm.paymentDetails[field]?.trim()) {
          toast.error(`${FIELD_LABELS[field]} is required`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: requestForm.method,
          paymentDetails: requestForm.paymentDetails,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit withdrawal");
        return;
      }
      toast.success("Withdrawal request submitted");
      setShowRequest(false);
      setRequestForm({ amount: "", method: "ACH", paymentDetails: {} });
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      qc.invalidateQueries({ queryKey: ["contractor-balance"] });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdminUpdate(withdrawalId: string, status: string, rejectionReason?: string) {
    try {
      const body: any = { status };
      if (rejectionReason) body.rejectionReason = rejectionReason;

      const res = await fetch(`/api/withdrawals/${withdrawalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("Failed to update withdrawal");
        return;
      }
      toast.success("Withdrawal updated");
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Withdrawals</h1>
          <p className="text-text-secondary mt-1">
            {isAdmin ? "Manage withdrawal requests" : "Request and track withdrawals"}
          </p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setShowRequest(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Request Withdrawal
          </Button>
        )}
      </div>

      {/* Balance Summary (for contractors) */}
      {!isAdmin && balance && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <div className="p-4 text-center">
              <p className="text-xs text-text-muted">Available</p>
              <p className="text-lg font-bold text-emerald-400">
                {formatCurrency(balance.availableBalance)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-xs text-text-muted">Pending</p>
              <p className="text-lg font-bold text-amber-400">
                {formatCurrency(balance.pendingAmount)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-xs text-text-muted">Total Withdrawn</p>
              <p className="text-lg font-bold text-purple-400">
                {formatCurrency(balance.totalWithdrawn)}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Request Form */}
      {showRequest && (
        <Card className="border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-sm">Request Withdrawal</CardTitle>
              <button
                onClick={() => setShowRequest(false)}
                className="p-1 rounded-lg hover:bg-surface-hover text-text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <div className="space-y-4">
            <Input
              label="Amount"
              type="number"
              value={requestForm.amount}
              onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
              placeholder="0.00"
              helperText={
                balance
                  ? `Available: ${formatCurrency(balance.availableBalance)}`
                  : undefined
              }
            />

            <div>
              <label className="text-xs font-medium text-text-secondary mb-2 block">
                Payment Method
              </label>
              <div className="grid grid-cols-5 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() =>
                      setRequestForm({
                        ...requestForm,
                        method: method.id,
                        paymentDetails: {},
                      })
                    }
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                      requestForm.method === method.id
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        : "text-text-muted border-border-subtle hover:border-border-medium"
                    )}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Details Fields */}
            {selectedMethod && (
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <p className="text-xs font-medium text-text-secondary">
                  Payment Details — {selectedMethod.label}
                </p>
                {selectedMethod.fields.map((field) => (
                  <Input
                    key={field}
                    label={FIELD_LABELS[field]}
                    value={requestForm.paymentDetails[field] || ""}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    placeholder={`Enter ${FIELD_LABELS[field].toLowerCase()}`}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={() => setShowRequest(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitRequest} loading={submitting}>
                Submit Request
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Withdrawals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : withdrawals.length > 0 ? (
        <div className="space-y-2">
          {withdrawals.map((w: any) => {
            const StatusIcon = STATUS_ICONS[w.status] || Clock;
            return (
              <Card key={w.id} className="hover:border-border-medium transition-colors">
                <div className="flex items-center gap-4 p-4">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      STATUS_COLORS[w.status]
                    )}
                  >
                    <StatusIcon
                      className={cn(
                        "h-5 w-5",
                        w.status === "PROCESSING" && "animate-spin"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">
                        {formatCurrency(w.amount)}
                      </p>
                      <Badge className="text-[10px] bg-surface-hover text-text-secondary border-border-subtle">
                        {w.method}
                      </Badge>
                      <Badge className={cn("text-[10px]", STATUS_COLORS[w.status])}>
                        {STATUS_LABELS[w.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatRelativeTime(w.createdAt)}
                      {isAdmin && w.contractor?.name && (
                        <span className="ml-2">• {w.contractor.name}</span>
                      )}
                      {w.rejectionReason && (
                        <span className="ml-2 text-red-400">
                          • Rejected: {w.rejectionReason}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && w.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdminUpdate(w.id, "PROCESSING")}
                      >
                        Process
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAdminUpdate(w.id, "COMPLETED")}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const reason = prompt("Rejection reason:");
                          if (reason !== null) handleAdminUpdate(w.id, "REJECTED", reason);
                        }}
                      >
                        <XCircle className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  )}
                  {isAdmin && w.status === "PROCESSING" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAdminUpdate(w.id, "COMPLETED")}
                      >
                        Complete
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <CreditCard className="h-10 w-10 mb-3 text-text-dim" />
            <p className="text-sm">No withdrawals yet</p>
            {!isAdmin && (
              <p className="text-xs text-text-dim mt-1">
                Request a withdrawal to get started
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
