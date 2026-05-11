"use client";

import { use, useState } from "react";
import { useTicket } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Badge, Button, Card, CardHeader, CardTitle, Textarea, Avatar } from "@/components/ui";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import {
  cn,
  TICKET_PRIORITY_COLORS,
  TICKET_STATUS_COLORS,
  formatDateTime,
} from "@/lib/utils";
import toast from "react-hot-toast";

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { data: ticket, isLoading } = useTicket(id);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);

    try {
      const res = await fetch(`/api/support/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setComment("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSending(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading...</div>;
  }

  if (!ticket) {
    return <div className="p-8 text-center text-text-muted">Ticket not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/support" className="p-1 hover:bg-surface-hover rounded-lg">
          <ArrowLeft className="h-5 w-5 text-text-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{ticket.subject}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn(TICKET_STATUS_COLORS[ticket.status])}>
              {ticket.status.replace("_", " ")}
            </Badge>
            <Badge className={cn(TICKET_PRIORITY_COLORS[ticket.priority])}>
              {ticket.priority}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={ticket.creator?.name} src={ticket.creator?.image} size="sm" />
          <div>
            <p className="text-sm font-medium">{ticket.creator?.name}</p>
            <p className="text-xs text-text-muted">{formatDateTime(ticket.createdAt)}</p>
          </div>
        </div>
        <p className="text-sm text-text-dim whitespace-pre-wrap">{ticket.description}</p>
      </Card>

      {/* Comments */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Comments ({ticket.comments?.length || 0})
        </h2>

        {ticket.comments?.map((c: any) => (
          <Card key={c.id}>
            <div className="flex items-center gap-3 mb-2">
              <Avatar name={c.author?.name} src={c.author?.image} size="sm" />
              <div>
                <p className="text-sm font-medium">{c.author?.name}</p>
                <p className="text-xs text-text-muted">{formatDateTime(c.createdAt)}</p>
              </div>
              {c.isInternal && (
                <Badge className="bg-yellow-100 text-yellow-700 text-xs">Internal</Badge>
              )}
            </div>
            <p className="text-sm text-text-dim whitespace-pre-wrap">{c.content}</p>
          </Card>
        ))}

        {/* Add comment */}
        <form onSubmit={handleComment} className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="w-full px-4 py-2.5 border border-border-medium rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none resize-none"
            />
          </div>
          <Button type="submit" size="sm" loading={sending} disabled={!comment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
