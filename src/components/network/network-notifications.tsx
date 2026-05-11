"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Bell, MessageCircle, Briefcase, AtSign, AlertTriangle,
  CheckCircle, Star, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, { icon: any; color: string }> = {
  MENTION: { icon: AtSign, color: "text-cyan-400 bg-cyan-500/10" },
  COMMENT: { icon: MessageCircle, color: "text-blue-400 bg-blue-500/10" },
  JOB_ASSIGNMENT: { icon: Briefcase, color: "text-emerald-400 bg-emerald-500/10" },
  JOB_OFFER: { icon: Briefcase, color: "text-purple-400 bg-purple-500/10" },
  JOB_OFFER_ACCEPTED: { icon: CheckCircle, color: "text-green-400 bg-green-500/10" },
  POST_REACTION: { icon: Star, color: "text-amber-400 bg-amber-500/10" },
  NEARBY_JOB: { icon: Briefcase, color: "text-teal-400 bg-teal-500/10" },
  WORK_ORDER_UPDATE: { icon: AlertTriangle, color: "text-orange-400 bg-orange-500/10" },
};

interface NetworkNotificationsProps {
  compact?: boolean;
  maxItems?: number;
}

export function NetworkNotifications({ compact, maxItems = 10 }: NetworkNotificationsProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["network-notifications"],
    queryFn: async () => {
      const res = await fetch(`/api/network/notifications?limit=${maxItems}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30000, // Poll every 30s
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-notifications"] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  if (compact) {
    return (
      <div className="space-y-1">
        {notifications.slice(0, 5).map((n: any) => (
          <NotificationItem key={n.id} notification={n} onRead={markRead.mutate} compact />
        ))}
        {notifications.length === 0 && (
          <p className="text-xs text-text-muted text-center py-3">No notifications</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-hover border border-border-subtle rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-bold text-text-primary">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <Check className="h-3 w-3" /> Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-surface-hover" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-surface-hover rounded" />
                  <div className="h-3 w-48 bg-surface-hover rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-8 w-8 text-text-dim mx-auto mb-2" />
            <p className="text-sm text-text-muted">All caught up!</p>
          </div>
        ) : (
          notifications.map((n: any) => (
            <NotificationItem key={n.id} notification={n} onRead={markRead.mutate} />
          ))
        )}
      </div>
    </div>
  );
}

function NotificationItem({ notification: n, onRead, compact }: {
  notification: any;
  onRead: (id: string) => void;
  compact?: boolean;
}) {
  const typeConfig = TYPE_ICONS[n.type] || TYPE_ICONS.COMMENT;
  const Icon = typeConfig.icon;

  return (
    <div
      onClick={() => !n.isRead && onRead(n.id)}
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border-subtle last:border-0",
        !n.isRead ? "bg-cyan-500/[0.03] hover:bg-cyan-500/[0.06]" : "hover:bg-surface-hover",
      )}
    >
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", typeConfig.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium truncate", !n.isRead ? "text-text-primary" : "text-text-secondary")}>
            {n.title}
          </p>
          {!n.isRead && <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />}
        </div>
        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-[11px] text-text-muted mt-1">
          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
