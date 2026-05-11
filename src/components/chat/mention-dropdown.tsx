"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Search, Check } from "lucide-react";

interface MentionDropdownProps {
  users: any[];
  query: string | null; // null = show all, string = filter
  position: { top: number; left: number };
  onSelect: (user: any) => void;
  onClose: () => void;
  channelMemberIds?: string[]; // filter to channel members
}

export function MentionDropdown({
  users,
  query,
  position,
  onSelect,
  onClose,
  channelMemberIds,
}: MentionDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter to channel members first, then by query
  const filtered = useMemo(() => {
    let list = users;
    // If channelMemberIds provided, only show channel members
    if (channelMemberIds && channelMemberIds.length > 0) {
      list = list.filter((u: any) => channelMemberIds.includes(u.id));
    }
    // Filter by query if provided
    if (query !== null && query.length > 0) {
      const q = query.toLowerCase();
      list = list.filter(
        (u: any) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 10);
  }, [users, query, channelMemberIds]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  const statusColor: Record<string, string> = {
    online: "bg-emerald-500",
    away: "bg-amber-500",
    busy: "bg-red-500",
    offline: "bg-gray-500",
  };

  return (
    <div
      className="absolute z-[100] w-80 bg-surface/90 backdrop-blur-xl border border-border-subtle rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={{
        bottom: "calc(100% + 12px)",
        left: Math.max(0, position.left),
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border-subtle flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-xs text-text-secondary font-medium">
          {query !== null && query.length > 0
            ? `People matching "${query}"`
            : "Channel members"}
        </span>
        <span className="ml-auto text-[10px] text-text-dim">
          ↑↓ navigate · ↵ select
        </span>
      </div>

      {/* User list */}
      <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
        {filtered.map((user: any, idx: number) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={user.id}
              ref={(el) => { itemRefs.current[idx] = el; }}
              onClick={() => onSelect(user)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-100",
                isSelected
                  ? "bg-cyan-500/10"
                  : "hover:bg-surface-hover"
              )}
            >
              {/* Clickable avatar */}
              <div
                className="relative flex-shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(user);
                }}
                title={`Mention ${user.name}`}
              >
                <Avatar
                  src={user.image}
                  name={user.name}
                  size="sm"
                />
                <div
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-border-subtle",
                    statusColor[user.isActive !== false ? "online" : "offline"]
                  )}
                />
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {user.name}
                  </span>
                  {user.role && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-surface-hover text-text-muted flex-shrink-0">
                      {user.role}
                    </span>
                  )}
                </div>
                {user.email && (
                  <p className="text-xs text-text-muted truncate mt-0.5">
                    {user.email}
                  </p>
                )}
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
