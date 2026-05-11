"use client";

import { useState } from "react";
import { useThreads } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Button, Card, Avatar, Badge, Modal } from "@/components/ui";
import {
  Plus,
  Search,
  MessageSquare,
  Hash,
  Layers,
  Bell,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";

export default function MessagesPage() {
  const { data: session } = useSession();
  const { data: threads, isLoading } = useThreads();
  const [search, setSearch] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);

  const filtered = threads?.filter((t: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.title?.toLowerCase().includes(s) ||
      t.messages?.[0]?.content?.toLowerCase().includes(s)
    );
  });

  // Separate general channels from work-order threads
  const generalChannels = filtered?.filter((t: any) => t.isGeneral) || [];
  const workOrderThreads = filtered?.filter((t: any) => !t.isGeneral) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Messages
          </h1>
          <p className="text-text-muted mt-1.5 text-sm flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {(filtered?.length || 0)} active conversations and work order threads
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/messages/all">
            <Button variant="ghost" size="sm" className="bg-surface-hover hover:bg-surface-hover text-text-secondary border border-border-subtle rounded-xl">
              <Layers className="h-4 w-4 mr-2 text-cyan-400" />
              Archive
            </Button>
          </Link>
          <Button onClick={() => setShowNewThread(true)} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 rounded-xl px-5">
            <Plus className="h-4 w-4 mr-2" />
            New Thread
          </Button>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 blur-2xl rounded-3xl" />
        <Card className="relative bg-surface/60 border-border-subtle backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl" padding={false}>
          <div className="p-5 border-b border-border-subtle bg-surface-hover">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-cyan-400 transition-colors" />
              <input
                type="text"
                placeholder="Search conversations, messages, or work orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-20 text-center">
              <div className="relative inline-flex mb-4">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/20 animate-pulse" />
                <div className="absolute inset-0 h-12 w-12 rounded-xl border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
              </div>
              <p className="text-text-muted text-sm font-medium">Synchronizing messages...</p>
            </div>
          ) : filtered?.length === 0 ? (
            <div className="p-24 text-center">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-border-subtle flex items-center justify-center mx-auto mb-6 shadow-inner">
                <MessageSquare className="h-10 w-10 text-text-dim" />
              </div>
              <h3 className="text-xl font-bold text-text-primary">No conversations found</h3>
              <p className="text-sm text-text-muted mt-2 max-w-xs mx-auto leading-relaxed">
                {search 
                  ? "We couldn't find any threads matching your search criteria. Try a different term." 
                  : "Start a new conversation with your team or about a work order to see them here."}
              </p>
              {!search && (
                <Button variant="outline" onClick={() => setShowNewThread(true)} className="mt-8 rounded-xl border-border-subtle hover:bg-white/5">
                  Start First Thread
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {/* General Channels */}
              {generalChannels.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-surface-hover border-b border-border-subtle">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                      <Hash className="h-3 w-3 text-cyan-500" />
                      General Channels
                    </p>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {generalChannels.map((thread: any) => (
                      <ThreadRow
                        key={thread.id}
                        thread={thread}
                        userId={(session?.user as any)?.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Work Order Threads */}
              {workOrderThreads.length > 0 && (
                <div className={cn(generalChannels.length > 0 && "mt-4")}>
                  <div className="px-6 py-3 bg-surface-hover border-b border-border-subtle">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                      <Layers className="h-3 w-3 text-blue-500" />
                      Work Order Discussions
                    </p>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {workOrderThreads.map((thread: any) => (
                      <ThreadRow
                        key={thread.id}
                        thread={thread}
                        userId={(session?.user as any)?.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <NewThreadModal onClose={() => setShowNewThread(false)} />
      )}
    </div>
  );
}

function ThreadRow({ thread, userId }: { thread: any; userId: string }) {
  const lastMessage = thread.messages?.[0];
  const otherParticipants = thread.participants?.filter(
    (p: any) => p.userId !== userId
  );
  const unreadCount = thread.unreadCount || 0;

  return (
    <Link
      key={thread.id}
      href={`/dashboard/messages/${thread.id}`}
      className="flex items-center gap-5 p-5 hover:bg-surface-hover transition-all group relative overflow-hidden"
    >
      {/* Selection Glow */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />
      
      <div className="flex-shrink-0 relative">
        {thread.isGeneral ? (
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Hash className="h-6 w-6 text-cyan-400" />
          </div>
        ) : (
          <div className="relative group-hover:scale-105 transition-transform">
            <Avatar
              name={otherParticipants?.[0]?.user?.name}
              src={otherParticipants?.[0]?.user?.image}
              className="h-12 w-12 rounded-2xl ring-2 ring-white/10 group-hover:ring-cyan-500/30 transition-all"
            />
            {otherParticipants?.[0]?.user?.isActive !== false && (
              <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-border-subtle" />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className={cn(
              "text-sm font-bold truncate transition-colors",
              unreadCount > 0 ? "text-white" : "text-text-primary group-hover:text-white"
            )}>
              {thread.title || "Untitled Thread"}
            </h3>
            {thread.workOrder && (
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-bold px-2 py-0">
                {truncate(thread.workOrder.title, 25)}
              </Badge>
            )}
          </div>
          {lastMessage && (
            <span className="text-[10px] font-medium text-text-muted group-hover:text-text-secondary flex-shrink-0">
              {formatRelativeTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-4">
          {lastMessage ? (
            <p className={cn(
              "text-xs truncate transition-colors",
              unreadCount > 0 ? "text-text-primary font-medium" : "text-text-muted group-hover:text-text-secondary"
            )}>
              <span className="font-bold text-cyan-500/80 mr-1">{lastMessage.author?.name}:</span>
              {truncate(lastMessage.content, 90)}
            </p>
          ) : (
            <p className="text-xs text-text-dim italic">No messages in this thread yet</p>
          )}
          
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black shadow-lg shadow-cyan-500/30">
                {unreadCount}
              </span>
            )}
            <div className="flex -space-x-2 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
               {thread.participants?.slice(0, 3).map((p: any, i: number) => (
                 <Avatar 
                    key={p.id} 
                    name={p.user?.name} 
                    src={p.user?.image} 
                    className="h-5 w-5 rounded-full border border-border-subtle ring-1 ring-white/10" 
                  />
               ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function NewThreadModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [isGeneral, setIsGeneral] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), isGeneral }),
      });
      if (!res.ok) throw new Error("Failed to create thread");
      toast.success("Thread created");
      onClose();
      window.location.reload();
    } catch {
      toast.error("Failed to create thread");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="New Conversation" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">
            Thread Name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., General Discussion"
            className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isGeneral"
            checked={isGeneral}
            onChange={(e) => setIsGeneral(e.target.checked)}
            className="h-4 w-4 rounded border-border-medium text-cyan-400"
          />
          <label htmlFor="isGeneral" className="text-sm text-text-dim">
            General channel (visible to all team members)
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim()} loading={creating}>
            Create Thread
          </Button>
        </div>
      </div>
    </Modal>
  );
}
