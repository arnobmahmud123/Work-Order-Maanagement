"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, ThumbsUp, AlertTriangle, Pin, Reply, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommentThreadProps {
  comments: any[];
  onAddComment: (content: string, parentId?: string) => void;
  onReact?: (commentId: string, type: string) => void;
  currentUserId?: string;
}

export function CommentThread({ comments, onAddComment, onReact, currentUserId }: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    onAddComment(replyContent.trim(), parentId);
    setReplyContent("");
    setReplyTo(null);
  };

  return (
    <div className="space-y-3">
      {/* Comment input */}
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          ?
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Write a comment... Use @name to mention"
            className="flex-1 px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/30"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim()}
            className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Comments list */}
      {comments.map((comment) => (
        <div key={comment.id} className="space-y-2">
          <CommentItem
            comment={comment}
            onReply={() => setReplyTo(comment.id)}
            onReact={onReact}
            currentUserId={currentUserId}
          />

          {/* Replies */}
          {comment.replies?.map((reply: any) => (
            <div key={reply.id} className="ml-10">
              <CommentItem
                comment={reply}
                isReply
                onReact={onReact}
                currentUserId={currentUserId}
              />
            </div>
          ))}

          {/* Reply input */}
          {replyTo === comment.id && (
            <div className="ml-10 flex items-center gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReply(comment.id)}
                placeholder="Write a reply..."
                autoFocus
                className="flex-1 px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/30"
              />
              <button
                onClick={() => handleReply(comment.id)}
                disabled={!replyContent.trim()}
                className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
              <button
                onClick={() => setReplyTo(null)}
                className="p-2 rounded-xl text-text-muted hover:text-text-secondary"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}

      {comments.length === 0 && (
        <p className="text-center text-sm text-text-muted py-4">No comments yet. Be the first to comment!</p>
      )}
    </div>
  );
}

function CommentItem({ comment, isReply, onReply, onReact, currentUserId }: {
  comment: any;
  isReply?: boolean;
  onReply?: () => void;
  onReact?: (id: string, type: string) => void;
  currentUserId?: string;
}) {
  const userReactions = comment.reactions?.filter((r: any) => r.userId === currentUserId) || [];
  const hasLiked = userReactions.some((r: any) => r.type === "LIKE");

  return (
    <div className={cn(
      "flex items-start gap-2.5 group",
      comment.isPinned && "bg-amber-500/5 rounded-xl px-3 py-2 -mx-3",
    )}>
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
        {comment.author?.image ? (
          <img src={comment.author.image} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          (comment.author?.name?.[0] || "?").toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary">{comment.author?.name}</span>
          {comment.isPinned && <Pin className="h-3 w-3 text-amber-400" />}
          {comment.isUrgent && <AlertTriangle className="h-3 w-3 text-rose-400" />}
          <span className="text-[11px] text-text-muted">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Render content with @mentions highlighted */}
        <p className="text-sm text-text-secondary mt-0.5 break-words">
          {comment.content.split(/(@\w+)/g).map((part: string, i: number) =>
            part.startsWith("@") ? (
              <span key={i} className="text-cyan-400 font-medium">{part}</span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => onReact?.(comment.id, "LIKE")}
            className={cn(
              "flex items-center gap-1 text-[11px] transition-colors",
              hasLiked ? "text-cyan-400" : "text-text-muted hover:text-text-secondary"
            )}
          >
            <ThumbsUp className={cn("h-3 w-3", hasLiked && "fill-current")} />
            {comment.reactions?.filter((r: any) => r.type === "LIKE").length || ""}
          </button>
          {!isReply && onReply && (
            <button
              onClick={onReply}
              className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary transition-colors"
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
