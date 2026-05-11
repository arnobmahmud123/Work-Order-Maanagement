"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, Button, Badge, Input } from "@/components/ui";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  DollarSign,
  Eye,
} from "lucide-react";
import { cn, formatRelativeTime, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  UNDER_REVIEW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CLOSED: "bg-gray-500/10 text-text-secondary border-gray-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-500/10 text-text-secondary",
  MEDIUM: "bg-amber-500/10 text-amber-400",
  HIGH: "bg-orange-500/10 text-orange-400",
  URGENT: "bg-red-500/10 text-red-400",
};

export default function DisputeDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";
  const qc = useQueryClient();

  const [resolving, setResolving] = useState(false);
  const [resolveForm, setResolveForm] = useState({
    status: "RESOLVED",
    resolution: "",
    adjustmentAmount: "",
    adjustmentType: "CREDIT",
  });

  const { data: dispute, isLoading } = useQuery({
    queryKey: ["dispute", id],
    queryFn: async () => {
      const res = await fetch(`/api/disputes/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
  });

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        toast.error("Failed to update status");
        return;
      }
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["dispute", id] });
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function handleResolve() {
    if (!resolveForm.resolution) {
      toast.error("Resolution is required");
      return;
    }
    setResolving(true);
    try {
      const body: any = {
        status: resolveForm.status,
        resolution: resolveForm.resolution,
      };
      if (resolveForm.adjustmentAmount) {
        body.adjustmentAmount = parseFloat(resolveForm.adjustmentAmount);
        body.adjustmentType = resolveForm.adjustmentType;
      }

      const res = await fetch(`/api/disputes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("Failed to resolve dispute");
        return;
      }
      toast.success("Dispute resolved");
      qc.invalidateQueries({ queryKey: ["dispute", id] });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setResolving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <AlertTriangle className="h-10 w-10 mb-3 text-text-dim" />
        <p>Dispute not found</p>
        <Link href="/dashboard/disputes" className="text-cyan-400 text-sm mt-2">
          Back to disputes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/disputes"
          className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary">{dispute.title}</h1>
            <Badge className={STATUS_COLORS[dispute.status]}>
              {STATUS_LABELS[dispute.status]}
            </Badge>
            <Badge className={PRIORITY_COLORS[dispute.priority]}>
              {dispute.priority}
            </Badge>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Filed {formatRelativeTime(dispute.createdAt)} by {dispute.raisedBy?.name}
          </p>
        </div>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-text-secondary" />
            Details
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-text-muted mb-1">Description</p>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{dispute.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted mb-1">Raised By</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-text-secondary" />
                <span className="text-sm text-text-primary">
                  {dispute.raisedBy?.name} ({dispute.raisedBy?.email})
                </span>
              </div>
            </div>
            {dispute.assignedTo && (
              <div>
                <p className="text-xs text-text-muted mb-1">Assigned To</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-text-secondary" />
                  <span className="text-sm text-text-primary">
                    {dispute.assignedTo.name} ({dispute.assignedTo.email})
                  </span>
                </div>
              </div>
            )}
          </div>

          {dispute.workOrder && (
            <div>
              <p className="text-xs text-text-muted mb-1">Related Work Order</p>
              <Link
                href={`/dashboard/work-orders/${dispute.workOrder.id}`}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                {dispute.workOrder.title} — {dispute.workOrder.address}
              </Link>
            </div>
          )}

          {dispute.resolution && (
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-xs text-emerald-400 font-medium mb-1">Resolution</p>
              <p className="text-sm text-text-primary">{dispute.resolution}</p>
              {dispute.adjustmentAmount && (
                <p className="text-xs text-text-secondary mt-1">
                  Adjustment:{" "}
                  <span
                    className={
                      dispute.adjustmentType === "CREDIT"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {dispute.adjustmentType === "CREDIT" ? "+" : "-"}
                    {formatCurrency(dispute.adjustmentAmount)}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Admin Actions */}
      {isAdmin && dispute.status !== "RESOLVED" && dispute.status !== "CLOSED" && (
        <Card className="border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-sm">Admin Actions</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {/* Quick status buttons */}
            <div className="flex gap-2">
              {dispute.status === "OPEN" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("UNDER_REVIEW")}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Mark Under Review
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange("CLOSED")}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>

            {/* Resolution form */}
            <div className="pt-3 border-t border-border-subtle">
              <p className="text-xs font-medium text-text-secondary mb-3">Resolve Dispute</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Resolution</label>
                  <textarea
                    value={resolveForm.resolution}
                    onChange={(e) =>
                      setResolveForm({ ...resolveForm, resolution: e.target.value })
                    }
                    placeholder="Describe the resolution..."
                    rows={3}
                    className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary placeholder-gray-600 focus:outline-none focus:border-cyan-500/30 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Adjustment Amount (optional)"
                    type="number"
                    value={resolveForm.adjustmentAmount}
                    onChange={(e) =>
                      setResolveForm({ ...resolveForm, adjustmentAmount: e.target.value })
                    }
                    placeholder="0.00"
                  />
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Adjustment Type</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setResolveForm({ ...resolveForm, adjustmentType: "CREDIT" })
                        }
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                          resolveForm.adjustmentType === "CREDIT"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-text-muted border-border-subtle"
                        )}
                      >
                        Credit
                      </button>
                      <button
                        onClick={() =>
                          setResolveForm({ ...resolveForm, adjustmentType: "DEBIT" })
                        }
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                          resolveForm.adjustmentType === "DEBIT"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "text-text-muted border-border-subtle"
                        )}
                      >
                        Debit
                      </button>
                    </div>
                  </div>
                </div>
                <Button onClick={handleResolve} loading={resolving}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Resolve Dispute
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
