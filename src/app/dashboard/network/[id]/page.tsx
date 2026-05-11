"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MessageCircle, Share2, Flag, Trash2,
  Briefcase, MapPin, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PostCard } from "@/components/network/post-card";
import { CommentThread } from "@/components/network/comment-thread";
import { NetworkChat } from "@/components/network/network-chat";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showChat, setShowChat] = useState(false);

  const postId = params.id as string;
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";

  // Fetch post
  const { data: postData, isLoading } = useQuery({
    queryKey: ["network-post", postId],
    queryFn: async () => {
      const res = await fetch(`/api/network/posts/${postId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // React mutation
  const reactToPost = useMutation({
    mutationFn: async ({ type }: { type: string }) => {
      const res = await fetch(`/api/network/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-post"] });
    },
  });

  // Comment mutation
  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const res = await fetch(`/api/network/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-post"] });
    },
  });

  // Take job mutation
  const takeJob = useMutation({
    mutationFn: async (jobRequestId: string) => {
      const res = await fetch(`/api/network/jobs/${jobRequestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "take_it" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-post"] });
    },
  });

  // Delete mutation
  const deletePost = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/network/posts/${postId}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => router.push("/dashboard/network"),
  });

  // Report mutation
  const reportPost = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/network/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reason: "OTHER" }),
      });
      return res.json();
    },
  });

  const post = postData?.post;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">Post not found</p>
        <button onClick={() => router.push("/dashboard/network")} className="text-cyan-400 text-sm">
          ← Back to feed
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard/network")}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Feed
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Post */}
            <PostCard
              post={post}
              currentUserId={userId}
              isAdmin={isAdmin}
              onReact={(id, type) => reactToPost.mutate({ type })}
              onTakeJob={(jobId) => takeJob.mutate(jobId)}
              onDelete={() => deletePost.mutate()}
              onReport={() => reportPost.mutate()}
            />

            {/* Comments section */}
            <div className="bg-surface-hover border border-border-subtle rounded-2xl p-5">
              <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-text-secondary" />
                Comments ({post._count?.comments || 0})
              </h3>
              <CommentThread
                comments={post.comments || []}
                currentUserId={userId}
                onAddComment={(content, parentId) =>
                  addComment.mutate({ content, parentId })
                }
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Work Order Info */}
            {post.workOrder && (
              <div className="bg-surface-hover border border-border-subtle rounded-2xl p-5">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                  Linked Work Order
                </h3>
                <a
                  href={`/dashboard/work-orders/${post.workOrder.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors group"
                >
                  <ExternalLink className="h-5 w-5 text-blue-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-blue-300 truncate">{post.workOrder.title}</p>
                    <p className="text-xs text-text-muted truncate">{post.workOrder.address}</p>
                    {post.workOrder.dueDate && (
                      <p className="text-xs text-text-muted">
                        Due: {new Date(post.workOrder.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </a>
              </div>
            )}

            {/* Job Request Info */}
            {post.jobRequest && (
              <div className="bg-surface-hover border border-border-subtle rounded-2xl p-5">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                  Coverage Request
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Status</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs",
                      post.jobRequest.status === "OPEN" ? "bg-emerald-500/20 text-emerald-300" :
                      post.jobRequest.status === "ASSIGNED" ? "bg-blue-500/20 text-blue-300" :
                      "bg-slate-500/20 text-text-secondary"
                    )}>
                      {post.jobRequest.status}
                    </span>
                  </div>
                  {post.jobRequest.budget && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Budget</span>
                      <span className="text-text-primary">${post.jobRequest.budget}</span>
                    </div>
                  )}
                  {post.jobRequest.deadline && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Deadline</span>
                      <span className="text-text-primary">{new Date(post.jobRequest.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Urgency</span>
                    <span className={cn(
                      "text-xs font-medium",
                      post.jobRequest.urgency === "CRITICAL" ? "text-rose-400" :
                      post.jobRequest.urgency === "HIGH" ? "text-amber-400" :
                      "text-text-secondary"
                    )}>
                      {post.jobRequest.urgency}
                    </span>
                  </div>
                </div>
                {post.jobRequest.status === "OPEN" && post.authorId !== userId && (
                  <button
                    onClick={() => takeJob.mutate(post.jobRequest.id)}
                    className="mt-3 w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-medium text-sm hover:bg-emerald-500/30 border border-emerald-500/20"
                  >
                    I'll Take It
                  </button>
                )}
              </div>
            )}

            {/* Quick Chat */}
            <div className="bg-surface-hover border border-border-subtle rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowChat(!showChat)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-text-primary">Quick Chat</span>
                </div>
                <span className="text-xs text-text-muted">{showChat ? "Hide" : "Show"}</span>
              </button>
              {showChat && (
                <NetworkChat
                  workOrderId={post.workOrderId || undefined}
                  postId={postId}
                  className="border-0 rounded-none"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
