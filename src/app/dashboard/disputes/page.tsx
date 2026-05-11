"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardHeader, CardTitle, Button, Badge, Input } from "@/components/ui";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
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

export default function DisputesPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    workOrderId: "",
    priority: "MEDIUM",
  });
  const [creating, setCreating] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["disputes", filterStatus],
    queryFn: async () => {
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const res = await fetch(`/api/disputes${params}`);
      if (!res.ok) return { disputes: [] };
      return res.json();
    },
  });

  const disputes = data?.disputes || [];

  async function handleCreate() {
    if (!createForm.title || !createForm.description) {
      toast.error("Title and description are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create dispute");
        return;
      }
      toast.success("Dispute created successfully");
      setShowCreate(false);
      setCreateForm({ title: "", description: "", workOrderId: "", priority: "MEDIUM" });
      refetch();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Disputes</h1>
          <p className="text-text-secondary mt-1">Manage and track disputes</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Dispute
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {["", "OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filterStatus === s
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-text-muted hover:text-text-secondary border border-transparent"
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Create Form Modal */}
      {showCreate && (
        <Card className="border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-sm">File a New Dispute</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              label="Title"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="Brief description of the dispute"
            />
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Detailed explanation of the issue..."
                rows={4}
                className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary placeholder-gray-600 focus:outline-none focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/20 resize-none"
              />
            </div>
            <Input
              label="Work Order ID (optional)"
              value={createForm.workOrderId}
              onChange={(e) => setCreateForm({ ...createForm, workOrderId: e.target.value })}
              placeholder="Related work order ID"
            />
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">Priority</label>
              <div className="flex gap-2">
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setCreateForm({ ...createForm, priority: p })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      createForm.priority === p
                        ? PRIORITY_COLORS[p] + " border border-current/20"
                        : "text-text-muted border border-transparent"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={creating}>
                Submit Dispute
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Disputes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : disputes.length > 0 ? (
        <div className="space-y-2">
          {disputes.map((dispute: any) => (
            <Link
              key={dispute.id}
              href={`/dashboard/disputes/${dispute.id}`}
              className="block"
            >
              <Card className="hover:border-cyan-500/20 transition-colors">
                <div className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {dispute.title}
                      </p>
                      <Badge className={cn("text-[10px]", PRIORITY_COLORS[dispute.priority])}>
                        {dispute.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      {dispute.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-text-dim">
                        by {dispute.raisedBy?.name || "Unknown"}
                      </span>
                      {dispute.workOrder && (
                        <span className="text-[10px] text-text-dim">
                          • {dispute.workOrder.title}
                        </span>
                      )}
                      <span className="text-[10px] text-text-dim">
                        • {formatRelativeTime(dispute.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_COLORS[dispute.status]}>
                      {STATUS_LABELS[dispute.status] || dispute.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-text-dim" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <AlertTriangle className="h-10 w-10 mb-3 text-text-dim" />
            <p className="text-sm">No disputes found</p>
            <p className="text-xs text-text-dim mt-1">
              {filterStatus
                ? `No disputes with status "${filterStatus}"`
                : "File a dispute to get started"}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
