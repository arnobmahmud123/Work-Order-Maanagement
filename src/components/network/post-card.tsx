"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageCircle, ThumbsUp, Share2, MapPin, ExternalLink,
  AlertTriangle, Megaphone, HelpCircle, Briefcase, Tag,
  MoreHorizontal, Flag, Trash2, Edit3, Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  GENERAL: { color: "text-text-secondary", bg: "bg-slate-500/10 border-slate-500/20", icon: Tag, label: "General" },
  WORK_RELATED: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: Briefcase, label: "Work" },
  HELP_NEEDED: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: HelpCircle, label: "Help Needed" },
  URGENT: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", icon: AlertTriangle, label: "Urgent" },
  ANNOUNCEMENT: { color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", icon: Megaphone, label: "Announcement" },
  JOB_COVERAGE: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Briefcase, label: "Job Coverage" },
};

const ROLE_BADGES: Record<string, { color: string; label: string }> = {
  ADMIN: { color: "bg-rose-500/20 text-rose-300 border-rose-500/30", label: "Admin" },
  CONTRACTOR: { color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", label: "Contractor" },
  COORDINATOR: { color: "bg-purple-500/20 text-purple-300 border-purple-500/30", label: "Coordinator" },
  CLIENT: { color: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Client" },
};

interface PostCardProps {
  post: any;
  onReact?: (postId: string, type: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onTakeJob?: (jobRequestId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (post: any) => void;
  onReport?: (postId: string) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  compact?: boolean;
}

export function PostCard({
  post, onReact, onComment, onShare, onTakeJob, onDelete, onEdit, onReport, currentUserId, isAdmin, compact,
}: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  const cat = CATEGORY_CONFIG[post.category] || CATEGORY_CONFIG.GENERAL;
  const CatIcon = cat.icon;
  const roleBadge = ROLE_BADGES[post.author?.role];
  const isAuthor = post.authorId === currentUserId;
  const userReactions = post.reactions?.filter((r: any) => r.userId === currentUserId) || [];
  const hasLiked = userReactions.some((r: any) => r.type === "LIKE");

  const contentPreview = compact && post.content.length > 200
    ? post.content.slice(0, 200) + "..."
    : post.content;

  return (
    <div className={cn(
      "bg-surface-hover border border-border-subtle rounded-2xl overflow-hidden transition-all hover:border-border-medium",
      post.isPinned && "ring-1 ring-amber-500/20 border-amber-500/10",
      post.isUrgent && "ring-1 ring-rose-500/20 border-rose-500/10",
    )}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {post.author?.image ? (
                <img src={post.author.image} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                (post.author?.name?.[0] || "?").toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-text-primary truncate">
                  {post.author?.name || "Unknown"}
                </span>
                {roleBadge && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", roleBadge.color)}>
                    {roleBadge.label}
                  </span>
                )}
                {post.isPinned && <Pin className="h-3 w-3 text-amber-400" />}
                {post.isUrgent && <AlertTriangle className="h-3 w-3 text-rose-400" />}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                {post.author?.company && (
                  <>
                    <span>·</span>
                    <span>{post.author.company}</span>
                  </>
                )}
                {post.location && (
                  <>
                    <span>·</span>
                    <MapPin className="h-3 w-3" />
                    <span>{post.city ? `${post.city}, ${post.state}` : post.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Category badge + menu */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-[10px] px-2 py-1 rounded-full border font-medium flex items-center gap-1", cat.bg, cat.color)}>
              <CatIcon className="h-3 w-3" />
              {cat.label}
            </span>

            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 z-20 bg-surface border border-border-medium rounded-xl shadow-xl py-1 min-w-[160px]">
                  {!isAuthor && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onReport?.(post.id); setShowMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover w-full"
                    >
                      <Flag className="h-4 w-4" /> Report
                    </button>
                  )}
                  {(isAuthor || isAdmin) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit?.(post); setShowMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover w-full"
                    >
                      <Edit3 className="h-4 w-4" /> Edit
                    </button>
                  )}
                  {(isAuthor || isAdmin) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete?.(post.id); setShowMenu(false); }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 w-full"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-3 text-base font-semibold text-text-primary leading-snug">
          {post.title}
        </h3>

        {/* Content */}
        <div className="mt-2 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
          {showFullContent ? post.content : contentPreview}
          {compact && post.content.length > 200 && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-cyan-400 hover:text-cyan-300 ml-1 text-sm"
            >
              {showFullContent ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Work Order Badge */}
        {post.workOrder && (
          <a
            href={`/dashboard/work-orders/${post.workOrder.id}`}
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors group"
          >
            <ExternalLink className="h-4 w-4 text-blue-400" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-blue-300 truncate">
                {post.workOrder.title}
              </div>
              <div className="text-[11px] text-text-muted truncate">
                {post.workOrder.address}
                {post.workOrder.dueDate && ` · Due ${new Date(post.workOrder.dueDate).toLocaleDateString()}`}
              </div>
            </div>
            <span className={cn(
              "ml-auto text-[10px] px-2 py-0.5 rounded-full",
              post.workOrder.status === "NEW" ? "bg-blue-500/20 text-blue-300" :
              post.workOrder.status === "IN_PROGRESS" ? "bg-amber-500/20 text-amber-300" :
              post.workOrder.status === "CLOSED" ? "bg-green-500/20 text-green-300" :
              "bg-slate-500/20 text-text-secondary"
            )}>
              {post.workOrder.status?.replace(/_/g, " ")}
            </span>
          </a>
        )}

        {/* Job Request Badge */}
        {post.jobRequest && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">Coverage Request</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                post.jobRequest.status === "OPEN" ? "bg-emerald-500/20 text-emerald-300" :
                post.jobRequest.status === "ASSIGNED" ? "bg-blue-500/20 text-blue-300" :
                "bg-slate-500/20 text-text-secondary"
              )}>
                {post.jobRequest.status}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-text-secondary">
              {post.jobRequest.budget && <span>Budget: ${post.jobRequest.budget}</span>}
              {post.jobRequest.deadline && <span>Deadline: {new Date(post.jobRequest.deadline).toLocaleDateString()}</span>}
              {post.jobRequest.urgency && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded",
                  post.jobRequest.urgency === "CRITICAL" ? "bg-rose-500/20 text-rose-300" :
                  post.jobRequest.urgency === "HIGH" ? "bg-amber-500/20 text-amber-300" :
                  "bg-slate-500/20 text-text-secondary"
                )}>
                  {post.jobRequest.urgency}
                </span>
              )}
            </div>
            {post.jobRequest.status === "OPEN" && !isAuthor && (
              <button
                onClick={(e) => { e.stopPropagation(); onTakeJob?.(post.jobRequest.id); }}
                className="mt-3 w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-medium text-sm hover:bg-emerald-500/30 transition-colors border border-emerald-500/20"
              >
                I'll Take It
              </button>
            )}
          </div>
        )}

        {/* Media Preview */}
        {post.attachments?.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {post.attachments.slice(0, 4).map((att: any) => (
              <div key={att.id} className="rounded-xl overflow-hidden bg-surface-hover border border-border-subtle aspect-video flex items-center justify-center">
                {att.mimeType?.startsWith("image/") ? (
                  <img src={att.url} alt={att.originalName} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <FileText className="h-8 w-8 text-text-muted mx-auto" />
                    <span className="text-xs text-text-muted mt-1 block truncate">{att.originalName}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="px-4 py-3 border-t border-border-subtle flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onReact?.(post.id, "LIKE"); }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
            hasLiked
              ? "bg-cyan-500/10 text-cyan-400"
              : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          )}
        >
          <ThumbsUp className={cn("h-4 w-4", hasLiked && "fill-current")} />
          <span>{post._count?.reactions || 0}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onComment?.(post.id); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post._count?.comments || 0}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onShare?.(post.id); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>

        <div className="ml-auto text-xs text-text-muted">
          {post.viewCount || 0} views
        </div>
      </div>
    </div>
  );
}

function FileText(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}
