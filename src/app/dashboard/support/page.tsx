"use client";

import { useState } from "react";
import { useTickets } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Card, Badge, Input, Textarea, Select, Modal } from "@/components/ui";
import { Plus, LifeBuoy, MessageSquare } from "lucide-react";
import Link from "next/link";
import {
  cn,
  TICKET_PRIORITY_COLORS,
  TICKET_STATUS_COLORS,
  formatDate,
} from "@/lib/utils";
import toast from "react-hot-toast";

export default function SupportPage() {
  const { data: session } = useSession();
  const { data: tickets, isLoading } = useTickets();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "MEDIUM",
    category: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Ticket created");
      setShowNew(false);
      setForm({ subject: "", description: "", priority: "MEDIUM", category: "" });
    } catch {
      toast.error("Failed to create ticket");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Support</h1>
          <p className="text-text-muted mt-1">Get help with any issues</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : tickets?.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <LifeBuoy className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium text-text-muted">No support tickets</p>
            <p className="text-sm text-text-muted mt-1">
              Create a ticket if you need help with anything.
            </p>
          </div>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {tickets?.map((ticket: any) => (
              <Link
                key={ticket.id}
                href={`/dashboard/support/${ticket.id}`}
                className="flex items-center gap-4 p-4 hover:bg-surface-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {ticket.subject}
                    </h3>
                    <Badge className={cn(TICKET_STATUS_COLORS[ticket.status])}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                    <Badge className={cn(TICKET_PRIORITY_COLORS[ticket.priority])}>
                      {ticket.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted">
                    Created by {ticket.creator?.name} • {formatDate(ticket.createdAt)}
                    {ticket.assignee && ` • Assigned to ${ticket.assignee.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <MessageSquare className="h-3 w-3" />
                  {ticket._count?.comments || 0}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* New Ticket Modal */}
      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="New Support Ticket">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Brief description of the issue"
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Please describe the issue in detail..."
            required
          />
          <Select
            label="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            options={[
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
              { value: "URGENT", label: "Urgent" },
            ]}
          />
          <Input
            label="Category (optional)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g., Billing, Technical, Account"
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Ticket</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
