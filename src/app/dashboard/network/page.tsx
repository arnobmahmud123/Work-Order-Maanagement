"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Filter, MapPin, SlidersHorizontal,
  Rss, Briefcase, Star, TrendingUp, Bell, X,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PostCard } from "@/components/network/post-card";
import { CreatePostModal } from "@/components/network/create-post-modal";
import { CommentThread } from "@/components/network/comment-thread";
import { playNetworkPostSound, playNetworkJobSound, isSoundEnabled } from "@/lib/sounds";

const CATEGORIES = [
  { value: "ALL", label: "All Posts", icon: Rss },
  { value: "GENERAL", label: "General", icon: Tag },
  { value: "WORK_RELATED", label: "Work", icon: Briefcase },
  { value: "HELP_NEEDED", label: "Help Needed", icon: Star },
  { value: "URGENT", label: "Urgent", icon: Bell },
  { value: "ANNOUNCEMENT", label: "Announcements", icon: TrendingUp },
  { value: "JOB_COVERAGE", label: "Job Coverage", icon: Briefcase },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Viewed" },
  { value: "urgent", label: "Urgent First" },
];

export default function NetworkFeedPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const lastSeenPostAtRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";

  // Fetch feed (with polling for new posts)
  const { data: feedData, isLoading } = useQuery({
    queryKey: ["network-feed", activeCategory, search, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        category: activeCategory,
        sort,
        page: page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/network/feed?${params}`);
      if (!res.ok) throw new Error("Failed to fetch feed");
      return res.json();
    },
    refetchInterval: 30000, // poll every 30s for new posts
  });

  // Play sound when new posts arrive from other users
  useEffect(() => {
    if (!feedData?.posts?.length || !isSoundEnabled()) return;

    const latestPostAt = feedData.posts[0]?.createdAt;

    // Skip sound on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      lastSeenPostAtRef.current = latestPostAt || null;
      return;
    }

    // Detect new posts by comparing latest createdAt
    if (latestPostAt && lastSeenPostAtRef.current && latestPostAt > lastSeenPostAtRef.current) {
      // Only play sound if the newest post isn't from the current user
      const newestPost = feedData.posts[0];
      if (newestPost.authorId !== userId) {
        if (newestPost.category === "JOB_COVERAGE") {
          playNetworkJobSound();
        } else {
          playNetworkPostSound();
        }
      }
    }

    lastSeenPostAtRef.current = latestPostAt || null;
  }, [feedData, userId]);

  // Fetch work orders for post creation
  const { data: workOrdersData } = useQuery({
    queryKey: ["work-orders-list"],
    queryFn: async () => {
      const res = await fetch("/api/work-orders?limit=100");
      if (!res.ok) return { workOrders: [] };
      return res.json();
    },
  });

  // Fetch selected post details
  const { data: postData } = useQuery({
    queryKey: ["network-post", selectedPostId],
    queryFn: async () => {
      if (!selectedPostId) return null;
      const res = await fetch(`/api/network/posts/${selectedPostId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedPostId,
  });

  // Create post mutation
  const createPost = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = data.category === "JOB_COVERAGE" ? "/api/network/jobs" : "/api/network/posts";
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to create post (${res.status})`);
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["network-feed"] });
      if (isSoundEnabled()) {
        if (variables.category === "JOB_COVERAGE") {
          playNetworkJobSound();
        } else {
          playNetworkPostSound();
        }
      }
    },
  });

  // Edit post mutation
  const editPost = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/network/posts/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to update post (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-feed"] });
      setEditingPost(null);
    },
  });

  // React mutation (with optimistic update)
  const reactToPost = useMutation({
    mutationFn: async ({ postId, type }: { postId: string; type: string }) => {
      const res = await fetch(`/api/network/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      return res.json();
    },
    onMutate: async ({ postId, type }) => {
      await queryClient.cancelQueries({ queryKey: ["network-feed"] });
      const prev = queryClient.getQueryData(["network-feed", activeCategory, search, sort, page]);
      queryClient.setQueryData(["network-feed", activeCategory, search, sort, page], (old: any) => {
        if (!old?.posts) return old;
        return {
          ...old,
          posts: old.posts.map((p: any) => {
            if (p.id !== postId) return p;
            const hasReaction = p.reactions?.some((r: any) => r.type === type);
            return {
              ...p,
              _count: { ...p._count, reactions: p._count.reactions + (hasReaction ? -1 : 1) },
              reactions: hasReaction
                ? p.reactions.filter((r: any) => r.type !== type)
                : [...(p.reactions || []), { type, userId }],
            };
          }),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["network-feed", activeCategory, search, sort, page], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["network-feed"] });
      if (selectedPostId) queryClient.invalidateQueries({ queryKey: ["network-post", selectedPostId] });
    },
  });

  // Comment reaction mutation
  const reactToComment = useMutation({
    mutationFn: async ({ commentId, type }: { commentId: string; type: string }) => {
      const res = await fetch(`/api/network/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      return res.json();
    },
    onSuccess: () => {
      if (selectedPostId) queryClient.invalidateQueries({ queryKey: ["network-post", selectedPostId] });
    },
  });

  // Comment mutation
  const addComment = useMutation({
    mutationFn: async ({ postId, content, parentId }: { postId: string; content: string; parentId?: string }) => {
      const res = await fetch(`/api/network/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      });
      return res.json();
    },
    onSuccess: () => {
      if (selectedPostId) queryClient.invalidateQueries({ queryKey: ["network-post", selectedPostId] });
      queryClient.invalidateQueries({ queryKey: ["network-feed"] });
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
      queryClient.invalidateQueries({ queryKey: ["network-feed"] });
      if (isSoundEnabled()) playNetworkJobSound();
    },
  });

  // Delete post mutation
  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/network/posts/${postId}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-feed"] });
      setSelectedPostId(null);
    },
  });

  // Report mutation
  const reportPost = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch("/api/network/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reason: "OTHER", description: "Reported from feed" }),
      });
      return res.json();
    },
  });

  const posts = feedData?.posts || [];
  const pagination = feedData?.pagination;
  const selectedPost = postData?.post;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Rss className="h-5 w-5 text-white" />
              </div>
              Contractor Network
            </h1>
            <p className="text-sm text-text-muted mt-1">Connect, collaborate, and find coverage</p>
          </div>
          <button
            onClick={() => { setEditingPost(null); setShowCreatePost(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
          >
            <Plus className="h-4 w-4" /> New Post
          </button>
        </div>

        <div className="flex gap-6">
          {/* Left Sidebar - Categories & Filters (collapsible) */}
          <div className={cn(
            "shrink-0 hidden lg:block transition-all duration-300 ease-in-out relative",
            sidebarCollapsed ? "w-14" : "w-56"
          )}>
            {/* Collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full bg-surface border border-border-medium flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors shadow-lg"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>

            <div className="sticky top-6 space-y-4">
              {/* Categories */}
              <div className={cn(
                "bg-surface-hover border border-border-subtle rounded-2xl transition-all duration-300",
                sidebarCollapsed ? "p-2" : "p-3"
              )}>
                {!sidebarCollapsed && (
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-2 mb-2">Categories</h3>
                )}
                {CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon || Rss;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => { setActiveCategory(cat.value); setPage(1); }}
                      title={sidebarCollapsed ? cat.label : undefined}
                      className={cn(
                        "w-full flex items-center rounded-xl text-sm transition-all duration-200",
                        sidebarCollapsed
                          ? "justify-center p-2 mb-0.5"
                          : "gap-2 px-3 py-2",
                        activeCategory === cat.value
                          ? "bg-surface-hover text-text-primary"
                          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      )}
                    >
                      {sidebarCollapsed ? (
                        <CatIcon className={cn("h-4 w-4", activeCategory === cat.value && "text-cyan-400")} />
                      ) : (
                        <>
                          <span>{cat.label}</span>
                          {activeCategory === cat.value && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sort (hidden when collapsed) */}
              {!sidebarCollapsed && (
                <div className="bg-surface-hover border border-border-subtle rounded-2xl p-3">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-2 mb-2">Sort By</h3>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSort(opt.value)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors",
                        sort === opt.value
                          ? "bg-surface-hover text-text-primary"
                          : "text-text-secondary hover:bg-surface-hover"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Stats (hidden when collapsed) */}
              {!sidebarCollapsed && (
                <div className="bg-surface-hover border border-border-subtle rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Network</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Total Posts</span>
                      <span className="text-text-primary font-medium">{pagination?.total || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Feed */}
          <div className="flex-1 min-w-0">
            {/* Search Bar */}
            <div className="mb-4 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search posts, tags, or contractors..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/30 text-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile category pills */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 lg:hidden scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => { setActiveCategory(cat.value); setPage(1); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors",
                    activeCategory === cat.value
                      ? "bg-surface-hover border-border-active text-white"
                      : "border-border-subtle text-text-secondary"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Posts */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-surface-hover border border-border-subtle rounded-2xl p-5 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-surface-hover" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-surface-hover rounded" />
                        <div className="h-3 w-48 bg-surface-hover rounded" />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-4 w-full bg-surface-hover rounded" />
                      <div className="h-4 w-3/4 bg-surface-hover rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <Rss className="h-12 w-12 text-text-dim mx-auto mb-3" />
                <h3 className="text-lg font-medium text-text-secondary">No posts yet</h3>
                <p className="text-sm text-text-muted mt-1">Be the first to share something with the network</p>
                <button
                  onClick={() => { setEditingPost(null); setShowCreatePost(true); }}
                  className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30"
                >
                  Create First Post
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post: any) => (
                  <div key={post.id} className="cursor-pointer" onClick={() => setSelectedPostId(post.id)}>
                    <PostCard
                      post={post}
                      currentUserId={userId}
                      isAdmin={isAdmin}
                      compact
                      onReact={(postId, type) => reactToPost.mutate({ postId, type })}
                      onComment={(postId) => setSelectedPostId(postId)}
                      onTakeJob={(jobId) => takeJob.mutate(jobId)}
                      onDelete={(postId) => deletePost.mutate(postId)}
                      onEdit={(p) => { setEditingPost(p); setShowCreatePost(true); }}
                      onReport={(postId) => reportPost.mutate(postId)}
                    />
                  </div>
                ))}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-text-muted">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Post Detail / Job Requests */}
          <div className="w-80 shrink-0 hidden xl:block">
            <div className="sticky top-6">
              {selectedPost ? (
                <div className="bg-surface-hover border border-border-subtle rounded-2xl overflow-hidden">
                  {/* Post detail */}
                  <div className="p-4 border-b border-border-subtle">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-text-primary">Post Details</h3>
                      <button
                        onClick={() => setSelectedPostId(null)}
                        className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <h4 className="font-semibold text-text-primary">{selectedPost.title}</h4>
                    <p className="text-sm text-text-secondary mt-2 whitespace-pre-wrap">{selectedPost.content}</p>

                    {selectedPost.workOrder && (
                      <a
                        href={`/dashboard/work-orders/${selectedPost.workOrder.id}`}
                        className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-blue-300 hover:bg-blue-500/10"
                      >
                        📋 {selectedPost.workOrder.title} — {selectedPost.workOrder.address}
                      </a>
                    )}
                  </div>

                  {/* Comments */}
                  <div className="p-4 max-h-[50vh] overflow-y-auto">
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                      Comments ({selectedPost._count?.comments || 0})
                    </h4>
                    <CommentThread
                      comments={selectedPost.comments || []}
                      currentUserId={userId}
                      onAddComment={(content, parentId) =>
                        addComment.mutate({ postId: selectedPost.id, content, parentId })
                      }
                      onReact={(commentId, type) =>
                        reactToComment.mutate({ commentId, type })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-surface-hover border border-border-subtle rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-emerald-400" /> Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <a
                      href="/dashboard/network/map"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-sm text-text-secondary transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-teal-400" />
                      Contractor Map
                    </a>
                    <a
                      href="/dashboard/network/jobs"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-sm text-text-secondary transition-colors"
                    >
                      <Briefcase className="h-4 w-4 text-emerald-400" />
                      Browse Job Marketplace
                    </a>
                    <a
                      href="/dashboard/network/reputation"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-sm text-text-secondary transition-colors"
                    >
                      <Star className="h-4 w-4 text-amber-400" />
                      View Reputation Board
                    </a>
                    <button
                      onClick={() => { setEditingPost(null); setShowCreatePost(true); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover text-sm text-text-secondary transition-colors w-full"
                    >
                      <Plus className="h-4 w-4 text-cyan-400" />
                      Create New Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Post Modal */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => { setShowCreatePost(false); setEditingPost(null); }}
        onSubmit={(data) => editingPost ? editPost.mutateAsync(data) : createPost.mutateAsync(data)}
        isAdmin={isAdmin}
        workOrders={workOrdersData?.workOrders?.map((wo: any) => ({
          id: wo.id,
          title: wo.title,
          address: wo.address,
        }))}
        editingPost={editingPost}
      />
    </div>
  );
}
