"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Send, Paperclip, Smile, MoreHorizontal,
  Pin, Reply, Hash, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkChatProps {
  channelId?: string;
  workOrderId?: string;
  postId?: string;
  recipientId?: string;
  className?: string;
}

export function NetworkChat({ channelId, workOrderId, postId, recipientId, className }: NetworkChatProps) {
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch or create channel
  const { data: channelData } = useQuery({
    queryKey: ["network-chat-channel", workOrderId, recipientId],
    queryFn: async () => {
      if (channelId) return { channel: { id: channelId } };
      // Get or create a channel
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: workOrderId ? "WORK_ORDERS" : "DIRECT_MESSAGE",
          workOrderId,
          recipientId,
          name: workOrderId ? `WO Discussion` : undefined,
        }),
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!channelId || !!workOrderId || !!recipientId,
  });

  const activeChannelId = channelId || channelData?.channel?.id;

  // Fetch messages
  const { data: messagesData } = useQuery({
    queryKey: ["network-chat-messages", activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return { messages: [] };
      const res = await fetch(`/api/chat/channels/${activeChannelId}/messages`);
      if (!res.ok) return { messages: [] };
      return res.json();
    },
    enabled: !!activeChannelId,
    refetchInterval: 5000, // Poll every 5s
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!activeChannelId) return;
      const res = await fetch(`/api/chat/channels/${activeChannelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          parentId: replyTo?.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-chat-messages", activeChannelId] });
      setMessage("");
      setReplyTo(null);
    },
  });

  const messages = messagesData?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate(message.trim());
  };

  return (
    <div className={cn("flex flex-col bg-surface-hover border border-border-subtle rounded-2xl overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-semibold text-text-primary">
            {workOrderId ? "Work Order Chat" : recipientId ? "Direct Message" : "Chat"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted">
            <Users className="h-4 w-4" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted">
            <Pin className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Hash className="h-8 w-8 text-text-dim mx-auto mb-2" />
            <p className="text-sm text-text-muted">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg: any) => (
            <div key={msg.id} className="group flex items-start gap-2.5 hover:bg-surface-hover rounded-lg px-2 py-1 -mx-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {msg.author?.image ? (
                  <img src={msg.author.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  (msg.author?.name?.[0] || "?").toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">{msg.author?.name}</span>
                  <span className="text-[10px] text-text-muted">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                  {msg.isEdited && <span className="text-[10px] text-text-dim">(edited)</span>}
                </div>
                {msg.parent && (
                  <div className="flex items-center gap-1 text-[11px] text-text-muted mb-0.5">
                    <Reply className="h-3 w-3" />
                    Replying to {msg.parent.author?.name}
                  </div>
                )}
                <p className="text-sm text-text-secondary break-words whitespace-pre-wrap">{msg.content}</p>
                {msg.fileUrl && (
                  <a
                    href={msg.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    <Paperclip className="h-3 w-3" /> {msg.fileName || "Attachment"}
                  </a>
                )}
              </div>
              <button
                onClick={() => setReplyTo(msg)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-hover text-text-muted transition-opacity"
              >
                <Reply className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 border-t border-border-subtle flex items-center justify-between bg-surface-hover">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Reply className="h-3 w-3" />
            Replying to <span className="text-text-primary">{replyTo.author?.name}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-text-muted hover:text-text-secondary">
            <span className="text-xs">✕</span>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-surface-hover text-text-muted">
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/30 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
