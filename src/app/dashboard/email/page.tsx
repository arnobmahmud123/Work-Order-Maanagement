"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useEmails, useUpdateEmail, useSendEmail, useUsers } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui";
import {
  Mail, Send, Inbox, Star, StarOff, Search, Reply, Forward, Paperclip,
  Trash2, Archive, X, ChevronDown, ChevronRight, Clock, MoreHorizontal,
  RefreshCw, ArrowLeft, Edit3, MailOpen, Filter, Eye, EyeOff, AlertCircle,
  Zap, CheckSquare, Square, Printer, Move, Tag, Inbox as InboxIcon,
  MousePointerClick, Undo2, Image, FileText, Film, Music, Bold, Italic,
  Underline, List, ListOrdered, Link2, AlignLeft, AlignCenter, AlignRight,
  Minimize2, Maximize2, Save, UserPlus, ChevronLeft, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { formatDateTime, formatRelativeTime, cn, truncate } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Constants ──────────────────────────────────────────────────────────────

const FOLDERS = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "starred", label: "Starred", icon: Star },
  { id: "sent", label: "Sent", icon: Send },
  { id: "unread", label: "Unread", icon: Mail },
  { id: "drafts", label: "Drafts", icon: Edit3 },
  { id: "trash", label: "Trash", icon: Trash2 },
];

const LABELS = [
  { id: "work-order", label: "Work Orders", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", dot: "bg-blue-500" },
  { id: "urgent", label: "Urgent", color: "bg-rose-500/10 text-rose-600 border-rose-500/20", dot: "bg-rose-500" },
  { id: "accounting", label: "Accounting", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", dot: "bg-amber-500" },
  { id: "quote", label: "Quotes", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dot: "bg-emerald-500" },
  { id: "report", label: "Reports", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", dot: "bg-purple-500" },
  { id: "assignment", label: "Assignments", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20", dot: "bg-cyan-500" },
];

const PRIORITY_OPTIONS = [
  { id: "high", label: "High", icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
  { id: "normal", label: "Normal", icon: Zap, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { id: "low", label: "Low", icon: Clock, color: "text-text-muted", bg: "bg-surface-hover" },
];

// Avatar color palette based on name hash
const AVATAR_COLORS = [
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-indigo-600",
  "from-lime-500 to-green-600",
  "from-fuchsia-500 to-purple-600",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name: string): string {
  return (name || "?")[0].toUpperCase();
}

function formatEmailDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (isYesterday) return "Yesterday";
  if (now.getTime() - d.getTime() < 7 * 86400000) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isInternalEmail(email: string): boolean {
  return email.endsWith("@proppreserve.com");
}

// ─── Main Email Page ────────────────────────────────────────────────────────

export default function EmailPage() {
  const { data: session } = useSession();
  const [folder, setFolder] = useState("inbox");
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [forwardEmail, setForwardEmail] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [showLabelPicker, setShowLabelPicker] = useState<string | null>(null);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [inlineReply, setInlineReply] = useState(false);

  const { data, isLoading, refetch } = useEmails(folder, search || undefined);
  const updateEmail = useUpdateEmail(selectedEmail?.id || "");

  const emails = useMemo(() => {
    let list = data?.emails || [];
    if (labelFilter) {
      list = list.filter((e: any) => e.labels?.includes(labelFilter));
    }
    return list;
  }, [data?.emails, labelFilter]);
  const unreadCount = data?.unreadCount || 0;

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "c" && !showCompose) { setShowCompose(true); setReplyTo(null); }
      if (e.key === "Escape") { setSelectedEmail(null); setShowCompose(false); }
      if (e.key === "/" ) { e.preventDefault(); document.querySelector<HTMLInputElement>("[data-email-search]")?.focus(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showCompose]);

  function handleSelectEmail(email: any) {
    setSelectedEmail(email);
    setInlineReply(false);
    if (!email.read) {
      updateEmail.mutate({ read: true });
    }
  }

  function handleReply(email: any) {
    setReplyTo(email);
    setForwardEmail(null);
    setShowCompose(true);
    setComposeMinimized(false);
  }

  function handleForward(email: any) {
    setForwardEmail(email);
    setReplyTo(null);
    setShowCompose(true);
    setComposeMinimized(false);
  }

  function handleStar(email: any, e: React.MouseEvent) {
    e.stopPropagation();
    updateEmail.mutate({ starred: !email.starred });
  }

  function toggleSelect(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e: any) => e.id)));
    }
  }

  function handleBulkAction(action: string) {
    const count = selectedIds.size;
    if (action === "read") {
      selectedIds.forEach((id) => updateEmail.mutate({ read: true }));
      toast.success(`${count} marked as read`);
    } else if (action === "unread") {
      selectedIds.forEach((id) => updateEmail.mutate({ read: false }));
      toast.success(`${count} marked as unread`);
    } else if (action === "trash") {
      selectedIds.forEach((id) => updateEmail.mutate({ trashed: true }));
      toast.success(`${count} moved to trash`);
    } else if (action === "archive") {
      selectedIds.forEach((id) => updateEmail.mutate({ archived: true }));
      toast.success(`${count} archived`);
    }
    setSelectedIds(new Set());
  }

  const folderLabel = FOLDERS.find((f) => f.id === folder)?.label || "Inbox";

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border border-border-subtle bg-surface/80">
      {/* ── Left Sidebar ──────────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col border-r border-border-subtle bg-surface/60 transition-all duration-200 flex-shrink-0",
        sidebarCollapsed ? "w-16" : "w-56"
      )}>
        {/* Compose */}
        <div className="p-3">
          <button
            onClick={() => { setReplyTo(null); setForwardEmail(null); setShowCompose(true); setComposeMinimized(false); }}
            className={cn(
              "flex items-center gap-2 rounded-xl font-medium transition-all active:scale-95",
              "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:brightness-110",
              sidebarCollapsed ? "justify-center p-3" : "w-full px-4 py-3 text-sm"
            )}
          >
            <Edit3 className="h-4 w-4" />
            {!sidebarCollapsed && "Compose"}
          </button>
        </div>

        {/* Folders */}
        <nav className="flex-1 px-2 space-y-0.5">
          {FOLDERS.map((f) => {
            const isActive = folder === f.id;
            const folderUnread = f.id === "inbox" ? unreadCount : 0;
            return (
              <button
                key={f.id}
                onClick={() => { setFolder(f.id); setSelectedEmail(null); setLabelFilter(null); }}
                title={sidebarCollapsed ? f.label : undefined}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all",
                  sidebarCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-500 shadow-sm shadow-cyan-500/5"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )}
              >
                <f.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-cyan-500" : "text-text-muted")} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{f.label}</span>
                    {folderUnread > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 text-[10px] font-bold rounded-full min-w-[20px] text-center",
                        isActive
                          ? "bg-cyan-500/20 text-cyan-600"
                          : "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-sm"
                      )}>
                        {folderUnread > 99 ? "99+" : folderUnread}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Labels */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-3">
            <div className="h-px bg-surface-hover mb-3" />
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">Labels</p>
            <div className="space-y-0.5">
              {LABELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setLabelFilter(labelFilter === l.id ? null : l.id); setSelectedEmail(null); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors",
                    labelFilter === l.id
                      ? "bg-surface-hover text-text-primary"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", l.dot)} />
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Storage / Toggle */}
        <div className="p-2 border-t border-border-subtle">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors flex items-center justify-center"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
            onReply={() => handleReply(selectedEmail)}
            onForward={() => handleForward(selectedEmail)}
            onStar={(e) => handleStar(selectedEmail, e)}
            onUpdate={(data) => updateEmail.mutate(data)}
            inlineReply={inlineReply}
            setInlineReply={setInlineReply}
            allEmails={data?.emails || []}
            onSelectEmail={handleSelectEmail}
          />
        ) : (
          <>
            {/* ── Toolbar ────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle bg-surface/90 backdrop-blur-md sticky top-0 z-10">
              {/* Select all checkbox */}
              <button
                onClick={selectAll}
                className="p-1.5 rounded hover:bg-surface-hover text-text-muted transition-colors"
              >
                {selectedIds.size === emails.length && emails.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-cyan-400" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>

              {/* Bulk actions (visible when items selected) */}
              {selectedIds.size > 0 ? (
                <div className="flex items-center gap-1 animate-fade-in">
                  <button onClick={() => handleBulkAction("read")} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary transition-colors" title="Mark read">
                    <MailOpen className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleBulkAction("unread")} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary transition-colors" title="Mark unread">
                    <Mail className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleBulkAction("archive")} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary transition-colors" title="Archive">
                    <Archive className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleBulkAction("trash")} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="h-4 w-px bg-border-subtle mx-1" />
                  <span className="text-xs text-cyan-500 font-bold">{selectedIds.size} selected</span>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="flex-1 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      data-email-search
                      type="text"
                      placeholder="Search mail..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-surface border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 focus:outline-none transition-all shadow-sm"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-hover text-text-muted">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Folder label + count */}
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-text-muted">
                      {folderLabel}
                      {data?.total !== undefined && (
                        <span className="ml-1 text-text-dim">({data.total})</span>
                      )}
                    </span>
                  </div>

                  {/* Refresh */}
                  <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors" title="Refresh">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {/* ── Email List ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="h-6 w-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Loading emails...</p>
                </div>
              ) : emails.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="h-20 w-20 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-10 w-10 text-text-dim" />
                  </div>
                  <p className="text-lg font-medium text-text-secondary">
                    {search ? "No results found" : `Nothing in ${folderLabel.toLowerCase()}`}
                  </p>
                  <p className="text-sm text-text-dim mt-1.5 max-w-xs mx-auto">
                    {search
                      ? `Try different keywords or check your spelling`
                      : folder === "inbox"
                        ? "When you receive emails, they'll appear here"
                        : folder === "sent"
                          ? "Emails you send will show up here"
                          : "This folder is empty"}
                  </p>
                  {folder === "inbox" && !search && (
                    <button
                      onClick={() => { setReplyTo(null); setShowCompose(true); }}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/15 transition-colors text-sm font-medium"
                    >
                      <Edit3 className="h-4 w-4" /> Write a new email
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {emails.map((email: any) => {
                    const isUnread = !email.read;
                    const isSelected = selectedIds.has(email.id);
                    const isHovered = hoveredId === email.id;
                    const senderName = email.direction === "outbound"
                      ? `To: ${email.to?.map((t: any) => t.name || t.email).join(", ")}`
                      : email.from?.name || email.from?.email;
                    const senderEmailAddr = email.from?.email || "";
                    const isInternal = isInternalEmail(senderEmailAddr);
                    const priority = PRIORITY_OPTIONS.find((p) => p.id === email.priority);

                    return (
                      <div
                        key={email.id}
                        onClick={() => handleSelectEmail(email)}
                        onMouseEnter={() => setHoveredId(email.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle cursor-pointer transition-all duration-100 group relative",
                          isSelected && "bg-cyan-500/10",
                          isUnread && !isSelected && "bg-cyan-500/[0.04]",
                          !isSelected && !isUnread && "hover:bg-surface-hover",
                        )}
                      >
                        {/* Left: Checkbox + Star */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => toggleSelect(email.id, e)}
                            className={cn(
                              "p-0.5 rounded transition-all",
                              isSelected || isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-cyan-400" />
                            ) : (
                              <Square className="h-4 w-4 text-text-dim" />
                            )}
                          </button>
                          <button
                            onClick={(e) => handleStar(email, e)}
                            className="p-0.5 rounded hover:bg-surface-hover transition-colors"
                          >
                            {email.starred ? (
                              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            ) : (
                              <StarOff className="h-3.5 w-3.5 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </div>

                        {/* Avatar */}
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all",
                          isUnread
                            ? `bg-gradient-to-br ${getAvatarColor(senderName)} text-white shadow-sm`
                            : "bg-surface-hover text-text-muted"
                        )}>
                          {getInitial(senderName)}
                        </div>

                        {/* Sender + Subject row */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {/* Sender name */}
                          <span className={cn(
                            "text-sm truncate flex-shrink-0 max-w-[160px]",
                            isUnread ? "font-bold text-text-primary" : "text-text-secondary"
                          )}>
                            {senderName}
                          </span>

                          {/* Internal badge */}
                          {isInternal && isUnread && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 flex-shrink-0 font-bold uppercase tracking-tighter">
                              INT
                            </span>
                          )}

                          {/* Priority indicator */}
                          {priority && priority.id !== "normal" && (
                            <priority.icon className={cn("h-3 w-3 flex-shrink-0", priority.color)} />
                          )}

                          {/* Labels inline */}
                          {email.labels?.slice(0, 1).map((l: string) => {
                            const def = LABELS.find((ld) => ld.id === l);
                            return def ? (
                              <span key={l} className={cn("text-[8px] px-1 py-0.5 rounded border flex-shrink-0", def.color)}>
                                {def.label}
                              </span>
                            ) : null;
                          })}

                          {/* Subject + snippet */}
                          <div className="flex-1 min-w-0 flex items-center gap-1">
                            <span className={cn(
                              "truncate",
                              isUnread ? "font-semibold text-text-primary text-sm" : "text-text-secondary text-sm"
                            )}>
                              {email.subject}
                            </span>
                            <span className="text-xs text-text-dim truncate hidden sm:inline">
                              — {truncate(email.body, 80)}
                            </span>
                          </div>
                        </div>

                        {/* Right side: meta */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Attachment icon */}
                          {email.attachments?.length > 0 && (
                            <Paperclip className="h-3 w-3 text-text-dim" />
                          )}

                          {/* Date */}
                          <span className={cn(
                            "text-[11px] tabular-nums",
                            isUnread ? "text-cyan-500 font-bold" : "text-text-dim"
                          )}>
                            {formatEmailDate(email.date)}
                          </span>

                          {/* Hover actions */}
                          {isHovered && (
                            <div className="flex items-center gap-0.5 animate-fade-in">
                              <button
                                onClick={(e) => { e.stopPropagation(); updateEmail.mutate({ archived: true }); }}
                                className="p-1 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
                                title="Archive"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateEmail.mutate({ trashed: true }); }}
                                className="p-1 rounded hover:bg-surface-hover text-text-secondary hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateEmail.mutate({ read: !email.read }); }}
                                className="p-1 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
                                title={email.read ? "Mark unread" : "Mark read"}
                              >
                                {email.read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          )}

                          {/* Unread dot */}
                          {isUnread && !isHovered && (
                            <div className="h-2 w-2 rounded-full bg-cyan-500 flex-shrink-0 shadow-sm shadow-cyan-500/50" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border-subtle bg-surface/90 backdrop-blur-md">
              <span className="text-[11px] text-text-dim">
                {data?.total || 0} email{(data?.total || 0) !== 1 ? "s" : ""}
                {labelFilter && ` in ${LABELS.find((l) => l.id === labelFilter)?.label}`}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-text-dim">
                  <kbd className="px-1 py-0.5 bg-surface-hover rounded text-[9px] border border-border-subtle">C</kbd> compose
                  <span className="mx-1">·</span>
                  <kbd className="px-1 py-0.5 bg-surface-hover rounded text-[9px] border border-border-subtle">/</kbd> search
                  <span className="mx-1">·</span>
                  <kbd className="px-1 py-0.5 bg-surface-hover rounded text-[9px] border border-border-subtle">Esc</kbd> back
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Compose Modal ────────────────────────────────────────────── */}
      {showCompose && (
        <ComposeModal
          onClose={() => { setShowCompose(false); setReplyTo(null); setForwardEmail(null); setComposeMinimized(false); }}
          replyTo={replyTo}
          forwardEmail={forwardEmail}
          currentUser={session?.user}
          minimized={composeMinimized}
          onMinimize={() => setComposeMinimized(!composeMinimized)}
        />
      )}
    </div>
  );
}

// ─── Email Detail View ──────────────────────────────────────────────────────

function EmailDetail({
  email,
  onBack,
  onReply,
  onForward,
  onStar,
  onUpdate,
  inlineReply,
  setInlineReply,
  allEmails,
  onSelectEmail,
}: {
  email: any;
  onBack: () => void;
  onReply: () => void;
  onForward: () => void;
  onStar: (e: React.MouseEvent) => void;
  onUpdate: (data: any) => void;
  inlineReply: boolean;
  setInlineReply: (v: boolean) => void;
  allEmails: any[];
  onSelectEmail: (e: any) => void;
}) {
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [quickReplyText, setQuickReplyText] = useState("");
  const sendEmail = useSendEmail();
  const moreRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const quickReplyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMoreActions(false);
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) setShowLabelMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Find thread: other emails with same subject (strip Re:/Fwd:)
  const threadEmails = useMemo(() => {
    const baseSubject = email.subject?.replace(/^(Re|Fwd|Fw):\s*/i, "").trim().toLowerCase();
    return allEmails
      .filter((e) => {
        const eBase = e.subject?.replace(/^(Re|Fwd|Fw):\s*/i, "").trim().toLowerCase();
        return eBase === baseSubject;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allEmails, email.subject]);

  const isThread = threadEmails.length > 1;

  async function handleQuickReply() {
    if (!quickReplyText.trim()) return;
    try {
      await sendEmail.mutateAsync({
        to: [email.from?.email],
        subject: email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
        body: quickReplyText.trim(),
      });
      setQuickReplyText("");
      setInlineReply(false);
      toast.success("Reply sent!");
    } catch {
      toast.error("Failed to send reply");
    }
  }

  const senderInitial = getInitial(email.from?.name || "?");
  const senderEmailAddr = email.from?.email || "";
  const isInternal = isInternalEmail(senderEmailAddr);
  const avatarColor = getAvatarColor(email.from?.name || "");

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle bg-surface/90 backdrop-blur-md flex-shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-text-primary truncate">{email.subject}</h2>
            {isInternal && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
                Internal
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={onReply} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors" title="Reply (R)">
            <Reply className="h-4 w-4" />
          </button>
          <button onClick={onForward} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors" title="Forward (F)">
            <Forward className="h-4 w-4" />
          </button>
          <button onClick={onStar} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors" title="Star (S)">
            {email.starred ? (
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            ) : (
              <StarOff className="h-4 w-4 text-text-secondary" />
            )}
          </button>

          {/* Label picker */}
          <div ref={labelRef} className="relative">
            <button
              onClick={() => setShowLabelMenu(!showLabelMenu)}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
              title="Labels"
            >
              <Tag className="h-4 w-4" />
            </button>
            {showLabelMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-50 py-1">
                {LABELS.map((l) => {
                  const has = email.labels?.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => {
                        const newLabels = has
                          ? email.labels.filter((x: string) => x !== l.id)
                          : [...(email.labels || []), l.id];
                        onUpdate({ labels: newLabels });
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface-hover transition-colors"
                    >
                      <span className={cn("h-2.5 w-2.5 rounded-full border", has ? "bg-current" : "border-gray-600", l.dot)} />
                      <span className={cn(has ? "text-text-primary" : "text-text-secondary")}>{l.label}</span>
                      {has && <Check className="h-3 w-3 text-cyan-400 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* More actions */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMoreActions && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-50 py-1">
                <button onClick={() => { onUpdate({ read: !email.read }); setShowMoreActions(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover">
                  {email.read ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  Mark as {email.read ? "unread" : "read"}
                </button>
                <button onClick={() => { onUpdate({ archived: true }); onBack(); setShowMoreActions(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover">
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
                <button onClick={() => { navigator.clipboard.writeText(email.id); toast.success("Email ID copied"); setShowMoreActions(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover">
                  <MousePointerClick className="h-3.5 w-3.5" /> Copy email ID
                </button>
                <button onClick={() => { window.print(); setShowMoreActions(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <div className="h-px bg-surface-hover my-1" />
                <button onClick={() => { onUpdate({ trashed: true }); onBack(); setShowMoreActions(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/[0.06]">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Thread messages (if thread) */}
          {isThread ? (
            <div className="space-y-0">
              {threadEmails.map((threadEmail: any, idx: number) => {
                const isLast = idx === threadEmails.length - 1;
                const tSender = threadEmail.from?.name || "?";
                const tInitial = getInitial(tSender);
                const tColor = getAvatarColor(tSender);
                const tInternal = isInternalEmail(threadEmail.from?.email || "");

                return (
                  <div
                    key={threadEmail.id}
                    className={cn(
                      "border border-border-subtle rounded-xl overflow-hidden mb-3",
                      isLast ? "ring-1 ring-cyan-500/20" : "",
                      !threadEmail.read && "bg-cyan-500/[0.02]"
                    )}
                  >
                    {/* Message header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                        `bg-gradient-to-br ${tColor} text-white`
                      )}>
                        {tInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text-primary">{tSender}</span>
                          {tInternal && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">INT</span>
                          )}
                          <span className="text-[11px] text-text-dim ml-auto">{formatEmailDate(threadEmail.date)}</span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          to {threadEmail.to?.map((t: any) => t.name || t.email).join(", ")}
                        </p>
                      </div>
                    </div>

                    {/* Message body */}
                    <div className="px-4 pb-4">
                      <div className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed">
                        {threadEmail.body}
                      </div>

                      {/* Attachments */}
                      {threadEmail.attachments?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border-subtle">
                          <div className="flex flex-wrap gap-2">
                            {threadEmail.attachments.map((att: any, i: number) => (
                              <a key={i} href={att.path} className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-secondary hover:bg-surface-hover transition-colors">
                                <FileText className="h-3.5 w-3.5 text-text-muted" />
                                <span className="truncate max-w-[140px]">{att.filename}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Single email view */
            <div>
              {/* Sender info */}
              <div className="flex items-start gap-4 mb-6">
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0",
                  `bg-gradient-to-br ${avatarColor}`
                )}>
                  {senderInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-text-primary">{email.from?.name}</span>
                    {isInternal && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        Internal
                      </span>
                    )}
                    <span className="text-xs text-text-dim">&lt;{email.from?.email}&gt;</span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    <span className="text-text-dim">To:</span> {email.to?.map((t: any) => t.name || t.email).join(", ")}
                    {email.cc?.length > 0 && (
                      <span className="ml-2"><span className="text-text-dim">Cc:</span> {email.cc.map((c: any) => c.name || c.email).join(", ")}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-dim mt-1">{formatDateTime(email.date)}</p>
                </div>
              </div>

              {/* Subject */}
              <h1 className="text-xl font-bold text-text-primary mb-6 pb-4 border-b border-border-subtle">
                {email.subject}
              </h1>

              {/* Body */}
              <div className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed">
                {email.body}
              </div>

              {/* Attachments */}
              {email.attachments?.length > 0 && (
                <div className="mt-8 pt-4 border-t border-border-subtle">
                  <p className="text-xs font-semibold text-text-muted mb-3 flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5" />
                    Attachments ({email.attachments.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {email.attachments.map((att: any, i: number) => (
                      <a key={i} href={att.path} className="flex items-center gap-3 px-3 py-2.5 bg-surface-hover border border-border-subtle rounded-xl hover:bg-surface-hover hover:border-border-subtle transition-all group">
                        <div className="h-9 w-9 rounded-lg bg-surface-hover flex items-center justify-center flex-shrink-0">
                          {att.mimeType?.startsWith("image/") ? <Image className="h-4 w-4 text-emerald-400" /> :
                           att.mimeType?.startsWith("video/") ? <Film className="h-4 w-4 text-purple-400" /> :
                           <FileText className="h-4 w-4 text-text-muted" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-text-primary truncate">{att.filename}</p>
                          <p className="text-[10px] text-text-dim">{att.mimeType}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Inline Reply ───────────────────────────────────────────── */}
          {inlineReply ? (
            <div className="mt-6 border border-border-subtle rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-surface-hover border-b border-border-subtle flex items-center gap-2">
                <Reply className="h-3.5 w-3.5 text-text-muted" />
                <span className="text-xs text-text-secondary">Reply to {email.from?.name}</span>
                <button onClick={() => setInlineReply(false)} className="ml-auto p-0.5 rounded hover:bg-surface-hover text-text-muted">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                ref={quickReplyRef}
                value={quickReplyText}
                onChange={(e) => setQuickReplyText(e.target.value)}
                placeholder="Write your reply..."
                rows={5}
                className="w-full px-4 py-3 bg-transparent text-sm text-text-secondary placeholder:text-text-dim focus:outline-none resize-none"
                autoFocus
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleQuickReply();
                  }
                }}
              />
              <div className="px-4 py-2 border-t border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded hover:bg-surface-hover text-text-muted" title="Attach">
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-dim">
                    <kbd className="px-1 py-0.5 bg-surface-hover rounded text-[9px] border border-border-subtle">⌘</kbd>
                    +<kbd className="px-1 py-0.5 bg-surface-hover rounded text-[9px] border border-border-subtle">↵</kbd> send
                  </span>
                  <Button
                    size="sm"
                    onClick={handleQuickReply}
                    disabled={!quickReplyText.trim()}
                    loading={sendEmail.isPending}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20"
                  >
                    <Send className="h-3 w-3" /> Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Action bar */
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={onReply}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-subtle hover:border-border-subtle hover:bg-surface-hover transition-all text-sm text-text-secondary"
              >
                <Reply className="h-4 w-4" /> Reply
              </button>
              <button
                onClick={onForward}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-subtle hover:border-border-subtle hover:bg-surface-hover transition-all text-sm text-text-secondary"
              >
                <Forward className="h-4 w-4" /> Forward
              </button>
              <button
                onClick={() => setInlineReply(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-sm text-cyan-400"
              >
                <Edit3 className="h-4 w-4" /> Quick Reply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compose Modal ──────────────────────────────────────────────────────────

function ComposeModal({
  onClose,
  replyTo,
  forwardEmail,
  currentUser,
  minimized,
  onMinimize,
}: {
  onClose: () => void;
  replyTo?: any;
  forwardEmail?: any;
  currentUser?: any;
  minimized: boolean;
  onMinimize: () => void;
}) {
  const sendEmail = useSendEmail();
  const { data: usersData } = useUsers();
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [toSearch, setToSearch] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const toRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const sourceEmail = replyTo || forwardEmail;
  const isReply = !!replyTo;
  const isForward = !!forwardEmail;

  const [form, setForm] = useState({
    to: isReply
      ? replyTo.direction === "outbound"
        ? replyTo.to?.map((t: any) => t.email).join(", ")
        : replyTo.from?.email || ""
      : "",
    cc: isReply ? (replyTo.cc?.map((c: any) => c.email).join(", ") || "") : "",
    bcc: "",
    subject: sourceEmail
      ? isReply
        ? (sourceEmail.subject?.startsWith("Re:") ? sourceEmail.subject : `Re: ${sourceEmail.subject}`)
        : `Fwd: ${sourceEmail.subject}`
      : "",
    body: sourceEmail
      ? isReply
        ? `\n\n--- Original Message ---\nFrom: ${sourceEmail.from?.name} <${sourceEmail.from?.email}>\nDate: ${formatDateTime(sourceEmail.date)}\n\n${sourceEmail.body}`
        : `\n\n--- Forwarded Message ---\nFrom: ${sourceEmail.from?.name} <${sourceEmail.from?.email}>\nDate: ${formatDateTime(sourceEmail.date)}\nSubject: ${sourceEmail.subject}\n\n${sourceEmail.body}`
      : "",
    priority: "normal",
    labels: [] as string[],
    requestReadReceipt: false,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toRef.current && !toRef.current.contains(e.target as Node)) setShowToDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus body on open
  useEffect(() => {
    if (!minimized) {
      setTimeout(() => bodyRef.current?.focus(), 100);
    }
  }, [minimized]);

  const users = (usersData || []).filter((u: any) => {
    if (!toSearch) return true;
    const s = toSearch.toLowerCase();
    return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.role?.toLowerCase().includes(s);
  }).slice(0, 15);

  // Check if user already added
  function isUserAdded(user: any): boolean {
    const email = user.email || `${user.name?.toLowerCase().replace(/\s+/g, ".")}@proppreserve.com`;
    const current = form.to ? form.to.split(",").map((s: string) => s.trim().toLowerCase()) : [];
    return current.includes(email.toLowerCase());
  }

  function addUserToField(user: any) {
    const email = user.email || `${user.name?.toLowerCase().replace(/\s+/g, ".")}@proppreserve.com`;
    const current = form.to ? form.to.split(",").map((s: string) => s.trim()) : [];
    if (!current.includes(email)) {
      current.push(email);
      setForm({ ...form, to: current.join(", ") });
    }
    setToSearch("");
    // Keep dropdown open for adding more users
  }

  function insertFormatting(prefix: string, suffix: string) {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = form.body.substring(start, end);
    const newText = form.body.substring(0, start) + prefix + selected + suffix + form.body.substring(end);
    setForm({ ...form, body: newText });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!form.to || !form.subject || !form.body) {
      toast.error("Please fill in To, Subject, and Body");
      return;
    }

    try {
      await sendEmail.mutateAsync({
        to: form.to.split(",").map((s: string) => s.trim()).filter(Boolean),
        cc: form.cc ? form.cc.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined,
        subject: form.subject,
        body: form.body,
        priority: form.priority,
        labels: form.labels,
      });
      toast.success(
        <div className="flex items-center gap-2">
          <span>Email sent</span>
          <button onClick={() => { /* undo logic */ }} className="text-cyan-400 underline text-xs">Undo</button>
        </div>,
        { duration: 4000 }
      );
      onClose();
    } catch {
      toast.error("Failed to send email");
    }
  }

  // Minimized state
  if (minimized) {
    return (
      <div className="fixed bottom-0 right-4 z-[200]">
        <button
          onClick={onMinimize}
          className="flex items-center gap-3 px-5 py-3 bg-surface border border-border-medium rounded-t-xl shadow-2xl shadow-black/60 hover:bg-surface-hover transition-colors min-w-[300px]"
        >
          <Edit3 className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-text-primary truncate">{form.subject || "New Message"}</span>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="ml-auto p-0.5 rounded hover:bg-surface-hover text-text-muted">
            <X className="h-3.5 w-3.5" />
          </button>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:justify-end sm:pr-4">
      <div className="fixed inset-0 bg-black/40 sm:bg-transparent" onClick={onClose} />
      <div className="relative w-full max-w-2xl sm:mr-0 mx-4 bg-surface border border-border-medium rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] animate-slide-up">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-gradient-to-r from-white/[0.02] to-white/[0.04]">
          <h3 className="text-sm font-bold text-text-primary">
            {isReply ? "Reply" : isForward ? "Forward" : "New Message"}
          </h3>
          <div className="flex items-center gap-0.5">
            <button onClick={onMinimize} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors" title="Minimize">
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors" title="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ── Form ────────────────────────────────────────────────────── */}
        <form onSubmit={handleSend} className="flex-1 flex flex-col overflow-hidden">
          {/* To */}
          <div className="border-b border-border-subtle" ref={toRef}>
            <div className="flex items-center gap-2 px-4 py-2">
              <label className="text-[11px] text-text-muted w-10 flex-shrink-0">To</label>
              <div className="flex-1 relative">
                {/* Show selected recipients as chips */}
                {form.to && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {form.to.split(",").filter(Boolean).map((email: string, i: number) => {
                      const trimmed = email.trim();
                      const user = (usersData || []).find((u: any) => u.email === trimmed || `${u.name?.toLowerCase().replace(/\s+/g, ".")}@proppreserve.com` === trimmed);
                      return (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px]">
                          <span className={cn("h-4 w-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold", `bg-gradient-to-br ${getAvatarColor(user?.name || trimmed)}`)}>
                            {getInitial(user?.name || trimmed)}
                          </span>
                          {user?.name || trimmed}
                          <button
                            type="button"
                            onClick={() => {
                              const emails = form.to.split(",").filter((_: string, j: number) => j !== i);
                              setForm({ ...form, to: emails.join(",") });
                            }}
                            className="ml-0.5 hover:text-white transition-colors"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <input
                  type="text"
                  value={toSearch}
                  onChange={(e) => {
                    setToSearch(e.target.value);
                    setShowToDropdown(true);
                  }}
                  onFocus={() => setShowToDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowToDropdown(false);
                    if (e.key === "Enter" && toSearch.trim() && !users.some((u: any) => u.email === toSearch.trim())) {
                      e.preventDefault();
                      // Add as custom email
                      const current = form.to ? form.to.split(",").map((s: string) => s.trim()) : [];
                      current.push(toSearch.trim());
                      setForm({ ...form, to: current.join(", ") });
                      setToSearch("");
                    }
                  }}
                  placeholder={form.to ? "Add more..." : "Search users or type email..."}
                  className="w-full py-1 bg-transparent text-sm text-text-primary placeholder:text-text-dim focus:outline-none"
                />
                {showToDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
                    {/* Search header */}
                    <div className="px-3 py-2 border-b border-border-subtle bg-surface-hover">
                      <p className="text-[10px] text-text-muted">
                        {toSearch ? `Results for "${toSearch}"` : "All users — click to add"}
                      </p>
                    </div>
                    {/* User list */}
                    <div className="max-h-64 overflow-y-auto py-1">
                      {users.length === 0 ? (
                        <div className="px-3 py-4 text-center">
                          <p className="text-xs text-text-muted">No users found</p>
                          {toSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                const current = form.to ? form.to.split(",").map((s: string) => s.trim()) : [];
                                current.push(toSearch.trim());
                                setForm({ ...form, to: current.join(", ") });
                                setToSearch("");
                              }}
                              className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300"
                            >
                              Add "{toSearch}" as recipient
                            </button>
                          )}
                        </div>
                      ) : (
                        users.map((user: any) => {
                          const added = isUserAdded(user);
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => { if (!added) addUserToField(user); }}
                              disabled={added}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 transition-colors text-left",
                                added ? "opacity-40 cursor-default" : "hover:bg-surface-hover cursor-pointer"
                              )}
                            >
                              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0", `bg-gradient-to-br ${getAvatarColor(user.name || "")}`)}>
                                {getInitial(user.name || "?")}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-text-primary truncate">{user.name}</p>
                                <p className="text-[10px] text-text-muted truncate">{user.email || `${user.name?.toLowerCase().replace(/\s+/g, ".")}@proppreserve.com`}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-hover text-text-muted">{user.role}</span>
                                {added && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Added</span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {/* Footer hint */}
                    <div className="px-3 py-1.5 border-t border-border-subtle bg-surface-hover">
                      <p className="text-[9px] text-text-dim">
                        Type email + Enter to add custom · Esc to close
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!showCc && <button type="button" onClick={() => setShowCc(true)} className="text-[10px] text-text-muted hover:text-text-secondary">Cc</button>}
                {!showBcc && <button type="button" onClick={() => setShowBcc(true)} className="text-[10px] text-text-muted hover:text-text-secondary">Bcc</button>}
              </div>
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="border-b border-border-subtle">
              <div className="flex items-center gap-2 px-4 py-2">
                <label className="text-[11px] text-text-muted w-10 flex-shrink-0">Cc</label>
                <input type="text" value={form.cc} onChange={(e) => setForm({ ...form, cc: e.target.value })} className="flex-1 py-1 bg-transparent text-sm text-text-primary placeholder:text-text-dim focus:outline-none" />
                <button type="button" onClick={() => { setShowCc(false); setForm({ ...form, cc: "" }); }} className="p-0.5 rounded hover:bg-surface-hover text-text-muted">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="border-b border-border-subtle">
              <div className="flex items-center gap-2 px-4 py-2">
                <label className="text-[11px] text-text-muted w-10 flex-shrink-0">Bcc</label>
                <input type="text" value={form.bcc} onChange={(e) => setForm({ ...form, bcc: e.target.value })} className="flex-1 py-1 bg-transparent text-sm text-text-primary placeholder:text-text-dim focus:outline-none" />
                <button type="button" onClick={() => { setShowBcc(false); setForm({ ...form, bcc: "" }); }} className="p-0.5 rounded hover:bg-surface-hover text-text-muted">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="border-b border-border-subtle">
            <div className="flex items-center gap-2 px-4 py-2">
              <label className="text-[11px] text-text-muted w-10 flex-shrink-0">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Email subject"
                className="flex-1 py-1 bg-transparent text-sm text-text-primary placeholder:text-text-dim focus:outline-none"
              />
            </div>
          </div>

          {/* Priority + Labels row */}
          <div className="border-b border-border-subtle">
            <div className="flex items-center gap-3 px-4 py-1.5">
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="px-2 py-1 bg-surface-hover border border-border-subtle rounded-lg text-[11px] text-text-secondary focus:outline-none"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label} Priority</option>
                ))}
              </select>
              <div className="flex items-center gap-1 flex-wrap flex-1">
                {LABELS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setForm({ ...form, labels: form.labels.includes(l.id) ? form.labels.filter((x) => x !== l.id) : [...form.labels, l.id] })}
                    className={cn(
                      "text-[9px] font-medium px-1.5 py-0.5 rounded-full border transition-all",
                      form.labels.includes(l.id) ? l.color : "bg-surface-hover text-text-dim border-border-subtle hover:bg-surface-hover"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Formatting toolbar */}
          {showFormatting && (
            <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-border-subtle bg-surface-hover">
              <button type="button" onClick={() => insertFormatting("**", "**")} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary" title="Bold">
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => insertFormatting("*", "*")} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary" title="Italic">
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => insertFormatting("_", "_")} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary" title="Underline">
                <Underline className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-px bg-surface-hover mx-1" />
              <button type="button" onClick={() => insertFormatting("- ", "")} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary" title="List">
                <List className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => insertFormatting("1. ", "")} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary" title="Numbered List">
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-px bg-surface-hover mx-1" />
              <button type="button" onClick={() => {}} className="p-1.5 rounded hover:bg-surface-hover text-text-secondary" title="Insert Link">
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <textarea
              ref={bodyRef}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write your email..."
              rows={14}
              className="w-full px-4 py-3 bg-transparent text-sm text-text-secondary placeholder:text-text-dim focus:outline-none resize-none leading-relaxed"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleSend(e as any);
                }
              }}
            />
          </div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle bg-surface-hover">
            <div className="flex items-center gap-1">
              <Button
                type="submit"
                size="sm"
                loading={sendEmail.isPending}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20"
              >
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
              <span className="text-[10px] text-text-dim ml-2">
                <kbd className="px-1 py-0.5 bg-surface-hover rounded text-[9px] border border-border-subtle">⌘</kbd>
                +<kbd className="px-1 py-0.5 bg-surface-hover rounded text-[9px] border border-border-subtle">↵</kbd>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setShowFormatting(!showFormatting)} className={cn("p-1.5 rounded hover:bg-surface-hover transition-colors", showFormatting ? "text-cyan-400 bg-cyan-500/10" : "text-text-muted")} title="Formatting">
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="p-1.5 rounded hover:bg-surface-hover text-text-muted transition-colors" title="Attach file">
                <Paperclip className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="p-1.5 rounded hover:bg-surface-hover text-text-muted transition-colors" title="Insert image">
                <Image className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-px bg-surface-hover mx-1" />
              <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-red-400 transition-colors" title="Discard">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Check icon for label picker ────────────────────────────────────────────

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
