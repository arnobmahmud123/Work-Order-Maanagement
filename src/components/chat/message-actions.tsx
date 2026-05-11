"use client";

import { cn } from "@/lib/utils";
import {
  Edit3,
  Trash2,
  Pin,
  Reply,
  Copy,
  Bookmark,
  Link2,
  MoreHorizontal,
} from "lucide-react";

interface MessageActionsProps {
  isOwn: boolean;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin: () => void;
  onCopyLink: () => void;
  onBookmark: () => void;
  onClose: () => void;
}

export function MessageActions({
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onCopyLink,
  onBookmark,
  onClose,
}: MessageActionsProps) {
  const items = [
    { label: "Reply in thread", icon: Reply, action: onReply },
    { label: "Pin message", icon: Pin, action: onPin },
    { label: "Copy link", icon: Link2, action: onCopyLink },
    { label: "Bookmark", icon: Bookmark, action: onBookmark },
    ...(isOwn
      ? [
          { label: "Edit", icon: Edit3, action: onEdit || (() => {}) },
          { label: "Delete", icon: Trash2, action: onDelete || (() => {}) },
        ]
      : []),
  ];

  return (
    <div className="bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/50 py-1 min-w-[180px]">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.action();
            onClose();
          }}
          className={cn(
            "flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover transition-colors text-left",
            item.label === "Delete" && "text-red-400 hover:text-red-300"
          )}
        >
          <item.icon className="h-4 w-4 text-text-muted" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

// Typing indicator component
export function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null;

  const text =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
      ? `${users[0]} and ${users[1]} are typing`
      : `${users[0]} and ${users.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-text-muted">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <span>{text}</span>
    </div>
  );
}
