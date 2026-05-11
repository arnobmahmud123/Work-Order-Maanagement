"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Mail,
  Phone,
  X,
  MessageSquare,
  Video,
  UserPlus,
  MoreHorizontal,
} from "lucide-react";

interface UserPopoverProps {
  user: {
    id: string;
    name: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
    phone?: string | null;
    status?: "online" | "away" | "busy" | "offline";
  };
  children: React.ReactNode;
  onMessage?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
}

export function UserPopover({
  user,
  children,
  onMessage,
  onCall,
  onVideoCall,
}: UserPopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("bottom");
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition(spaceBelow < 320 ? "top" : "bottom");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const statusColor = {
    online: "bg-emerald-500",
    away: "bg-amber-500",
    busy: "bg-red-500",
    offline: "bg-gray-500",
  };

  const statusLabel = {
    online: "Online",
    away: "Away",
    busy: "Do Not Disturb",
    offline: "Offline",
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="cursor-pointer"
      >
        {children}
      </div>

      {open && (
        <div
          ref={popoverRef}
          className={cn(
            "absolute z-50 w-72 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/50 overflow-hidden",
            position === "bottom" ? "top-full left-0 mt-2" : "bottom-full left-0 mb-2"
          )}
        >
          {/* Header with gradient */}
          <div className="h-16 bg-gradient-to-r from-cyan-600/30 to-purple-600/30 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 p-1 rounded-lg hover:bg-surface-hover text-white/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Avatar */}
          <div className="px-4 -mt-8">
            <Avatar
              src={user.image}
              name={user.name}
              size="lg"
              status={user.status}
              showStatus
            />
          </div>

          {/* Info */}
          <div className="px-4 pt-2 pb-3">
            <h3 className="text-base font-semibold text-text-primary">
              {user.name}
            </h3>
            {user.role && (
              <p className="text-xs text-text-secondary mt-0.5">{user.role}</p>
            )}

            {/* Status */}
            {user.status && (
              <div className="flex items-center gap-1.5 mt-2">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    statusColor[user.status]
                  )}
                />
                <span className="text-xs text-text-secondary">
                  {statusLabel[user.status]}
                </span>
              </div>
            )}

            {/* Contact Info */}
            <div className="mt-3 space-y-1.5">
              {user.email && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Mail className="h-3.5 w-3.5 text-text-muted" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Phone className="h-3.5 w-3.5 text-text-muted" />
                  <span>{user.phone}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-border-subtle">
              <button
                onClick={() => {
                  onMessage?.();
                  setOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-hover text-xs text-text-secondary transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </button>
              <button
                onClick={() => {
                  onCall?.();
                  setOpen(false);
                }}
                className="flex items-center justify-center p-1.5 rounded-lg bg-surface-hover hover:bg-surface-hover text-text-secondary transition-colors"
                title="Voice Call"
              >
                <Phone className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  onVideoCall?.();
                  setOpen(false);
                }}
                className="flex items-center justify-center p-1.5 rounded-lg bg-surface-hover hover:bg-surface-hover text-text-secondary transition-colors"
                title="Video Call"
              >
                <Video className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
