"use client";

import { useState } from "react";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-data";
import { Button, Card, Badge } from "@/components/ui";
import {
  Bell,
  BellOff,
  CheckCheck,
  MessageSquare,
  ClipboardList,
  Receipt,
  LifeBuoy,
  AlertTriangle,
  Clock,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { formatRelativeTime, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const filtered =
    filter === "unread"
      ? notifications.filter((n: any) => !n.isRead)
      : notifications;

  function getIcon(type: string) {
    switch (type) {
      case "MESSAGE":
        return <MessageSquare className="h-4 w-4" />;
      case "WORK_ORDER":
        return <ClipboardList className="h-4 w-4" />;
      case "INVOICE":
        return <Receipt className="h-4 w-4" />;
      case "TICKET":
        return <LifeBuoy className="h-4 w-4" />;
      case "OVERDUE":
      case "CANCELLED":
        return <AlertTriangle className="h-4 w-4" />;
      case "DUE":
        return <Clock className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  }

  function getColor(type: string) {
    switch (type) {
      case "MESSAGE":
        return "text-blue-600 bg-blue-50";
      case "WORK_ORDER":
        return "text-cyan-400 bg-cyan-500/[0.06]";
      case "INVOICE":
        return "text-amber-600 bg-amber-50";
      case "TICKET":
        return "text-red-600 bg-red-50";
      case "OVERDUE":
      case "CANCELLED":
        return "text-red-600 bg-red-50";
      case "DUE":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-text-muted bg-surface-hover";
    }
  }

  function getLink(n: any) {
    if (n.workOrder) return `/dashboard/work-orders/${n.workOrderId}`;
    if (n.ticket) return `/dashboard/support/${n.ticketId}`;
    return "#";
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead.mutateAsync();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="text-text-muted mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You're all caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-medium overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium",
                filter === "all"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "bg-surface-hover text-text-dim hover:bg-surface-hover"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium",
                filter === "unread"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "bg-surface-hover text-text-dim hover:bg-surface-hover"
              )}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              loading={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <BellOff className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm mt-1">
              {filter === "unread"
                ? "No unread notifications."
                : "You'll see notifications here when there's activity."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((n: any) => (
              <Link
                key={n.id}
                href={getLink(n)}
                onClick={async () => {
                  if (!n.isRead) {
                    await markRead.mutateAsync(n.id);
                  }
                }}
                className={cn(
                  "flex items-start gap-3 p-4 hover:bg-surface-hover transition-colors",
                  !n.isRead && "bg-cyan-500/[0.06]/30"
                )}
              >
                <div
                  className={cn(
                    "flex-shrink-0 p-2 rounded-lg",
                    getColor(n.type)
                  )}
                >
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p
                      className={cn(
                        "text-sm",
                        n.isRead
                          ? "text-text-dim"
                          : "font-semibold text-text-primary"
                      )}
                    >
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <div className="h-2 w-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{n.message}</p>
                  {n.workOrder && (
                    <p className="text-xs text-cyan-400 mt-1">
                      {n.workOrder.title} — {n.workOrder.address}
                    </p>
                  )}
                </div>
                <span className="text-xs text-text-muted flex-shrink-0">
                  {formatRelativeTime(n.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
