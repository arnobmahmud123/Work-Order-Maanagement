"use client";

import { use, useState, useRef, useEffect, useCallback } from "react";
import { useThread, useSendMessage, useUploadMessageAttachment, useMessageTemplates } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Card, Avatar, Badge, Modal } from "@/components/ui";
import {
  Send,
  ArrowLeft,
  Users,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  ChevronDown,
  Volume2,
  VolumeX,
  Reply,
  Pin,
  AlertTriangle,
  FileDown,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { formatDateTime, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);
  const { data: session } = useSession();
  const { data: thread, isLoading } = useThread(threadId);
  const sendMessage = useSendMessage(threadId);
  const uploadAttachment = useUploadMessageAttachment();
  const { data: templates } = useMessageTemplates();
  const [message, setMessage] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevMessageCount = useRef(0);
  const userId = (session?.user as any)?.id;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  // Play sound on new messages
  useEffect(() => {
    if (
      soundEnabled &&
      thread?.messages?.length &&
      prevMessageCount.current > 0 &&
      thread.messages.length > prevMessageCount.current
    ) {
      const newest = thread.messages[thread.messages.length - 1];
      if (newest.authorId !== userId) {
        playNotificationSound();
      }
    }
    prevMessageCount.current = thread?.messages?.length || 0;
  }, [thread?.messages?.length, soundEnabled, userId]);

  function playNotificationSound() {
    if (!audioRef.current) {
      audioRef.current = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoKIeGBGPnuqp6JlMi9LXW5+gnxoVkiBl5uZdE4+VnWHiYJ3a1hLhZibmXVOP1Z1h4mCd2tYS4WYm5l1Tj5WdYeJgndrWEuFmJuZdU4+VnWHiYJ3a1hLhZibmXVOP1Z1h4mCd2tYS4WYm5l1Tj5WdYeJgndrWEuFmJuZdU4+VnWHiYJ3a1hL"
      );
    }
    audioRef.current.volume = 0.3;
    audioRef.current.play().catch(() => {});
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => f.size <= 10 * 1024 * 1024);
    if (validFiles.length !== files.length) {
      toast.error("Some files exceed 10MB limit");
    }
    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Generate previews for images
    validFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrls((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrls((prev) => [...prev, ""]);
      }
    });
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() && selectedFiles.length === 0) return;

    try {
      // Upload attachments first
      const attachmentIds: string[] = [];
      for (const file of selectedFiles) {
        const result = await uploadAttachment.mutateAsync({ file });
        attachmentIds.push(result.id);
      }

      // Send message with content
      const finalContent = message.trim() || (selectedFiles.length > 0 ? "📎 Sent attachments" : "");

      await sendMessage.mutateAsync({
        content: finalContent,
        type: "COMMENT",
        parentId: replyTo?.id,
      });

      setMessage("");
      setSelectedFiles([]);
      setPreviewUrls([]);
      setReplyTo(null);
    } catch {
      toast.error("Failed to send message");
    }
  }

  function applyTemplate(template: any) {
    let content = template.content;
    // Replace common placeholders
    if (thread?.workOrder) {
      content = content
        .replace(/\{address\}/g, thread.workOrder.address || "")
        .replace(/\{title\}/g, thread.workOrder.title || "")
        .replace(/\{status\}/g, thread.workOrder.status || "");
    }
    setMessage(content);
    setShowTemplates(false);
  }

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading...</div>;
  }

  if (!thread) {
    return <div className="p-8 text-center text-text-muted">Thread not found</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 mb-2 border-b border-border-subtle backdrop-blur-sm sticky top-0 z-20">
        <Link href="/dashboard/messages" className="p-2 hover:bg-surface-hover rounded-xl transition-all border border-transparent hover:border-border-subtle group">
          <ArrowLeft className="h-5 w-5 text-text-muted group-hover:text-cyan-400" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary truncate tracking-tight">
              {thread.title || "Untitled Thread"}
            </h1>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          {thread.workOrder && (
            <Link
              href={`/dashboard/work-orders/${thread.workOrder.id}`}
              className="flex items-center gap-1 text-xs text-cyan-400/80 hover:text-cyan-400 transition-colors mt-0.5"
            >
              <div className="h-1 w-1 rounded-full bg-cyan-400/40" />
              {thread.workOrder.title} — {thread.workOrder.address}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface-hover border border-border-subtle rounded-xl p-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "p-2 rounded-lg transition-all",
                soundEnabled ? "text-cyan-400 hover:bg-cyan-500/10" : "text-text-muted hover:bg-surface-hover"
              )}
              title={soundEnabled ? "Mute notifications" : "Unmute notifications"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <div className="w-[1px] h-4 bg-surface-hover mx-1" />
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-medium",
                showParticipants ? "bg-cyan-500/10 text-cyan-400" : "text-text-muted hover:bg-surface-hover"
              )}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{thread.participants?.length}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {thread.messages?.length === 0 ? (
            <div className="text-center text-text-muted py-8">
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Send the first message to start the conversation.</p>
            </div>
          ) : (
            thread.messages?.map((msg: any, idx: number) => {
              const isOwn = msg.authorId === userId;
              const isSystem = msg.type === "SYSTEM";
              const isPinned = msg.isPinned;

              // Grouping logic: check if next/prev message is from same user
              const prevMsg = thread.messages[idx - 1];
              const nextMsg = thread.messages[idx + 1];
              const isFirstInGroup = !prevMsg || prevMsg.authorId !== msg.authorId || prevMsg.type === "SYSTEM";
              const isLastInGroup = !nextMsg || nextMsg.authorId !== msg.authorId || nextMsg.type === "SYSTEM";

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="px-4 py-1 bg-surface-hover border border-border-subtle rounded-full text-[10px] font-medium text-text-muted uppercase tracking-wider">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 group px-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                    isOwn && "flex-row-reverse",
                    isPinned && "bg-yellow-500/[0.03] -mx-4 py-2 border-y border-yellow-500/10",
                    isFirstInGroup ? "mt-6" : "mt-1"
                  )}
                >
                  {/* Profile Image - only show for first in group */}
                  <div className="w-8 flex-shrink-0">
                    {isFirstInGroup && !isOwn && (
                      <Avatar
                        name={msg.author?.name}
                        src={msg.author?.image}
                        size="sm"
                        className="ring-2 ring-white/[0.08]"
                      />
                    )}
                  </div>

                  <div
                    className={cn(
                      "max-w-[75%] flex flex-col",
                      isOwn ? "items-end" : "items-start"
                    )}
                  >
                    {/* Author Name and Time - only show for first in group */}
                    {isFirstInGroup && (
                      <div
                        className={cn(
                          "flex items-center gap-2 mb-1.5 px-1",
                          isOwn && "flex-row-reverse"
                        )}
                      >
                        <span className="text-[11px] font-semibold text-text-secondary">
                          {isOwn ? "You" : msg.author?.name}
                        </span>
                        <span className="text-[10px] text-text-muted font-medium">
                          {formatDateTime(msg.createdAt)}
                        </span>
                        {msg.isUrgent && (
                          <Badge className="bg-red-500/10 border-red-500/20 text-red-400 text-[9px] h-4 py-0 gap-1 uppercase tracking-tighter font-bold">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Urgent
                          </Badge>
                        )}
                        {isPinned && (
                          <Badge className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500 text-[9px] h-4 py-0 gap-1 uppercase tracking-tighter font-bold">
                            <Pin className="h-2.5 w-2.5" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Reply indicator */}
                    {msg.parent && isFirstInGroup && (
                      <div className={cn(
                        "text-[11px] text-text-secondary mb-1 px-3 py-1.5 rounded-lg bg-surface-hover border-l-2 border-cyan-500/50 max-w-full truncate",
                        isOwn ? "mr-1" : "ml-1"
                      )}>
                        <span className="text-text-muted font-medium">Replying to {msg.parent.author?.name}:</span> {msg.parent.content}
                      </div>
                    )}

                    <div className="relative group/bubble">
                      <div
                        className={cn(
                          "px-4 py-2.5 text-sm transition-all duration-200 shadow-sm",
                          isOwn
                            ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white border border-border-subtle"
                            : "bg-surface-hover text-text-primary border border-border-subtle hover:bg-surface-hover",
                          // Grouped corners
                          isOwn 
                            ? cn(
                                "rounded-2xl rounded-tr-md",
                                !isFirstInGroup && "rounded-tr-2xl",
                                !isLastInGroup && "rounded-br-md"
                              )
                            : cn(
                                "rounded-2xl rounded-tl-md",
                                !isFirstInGroup && "rounded-tl-2xl",
                                !isLastInGroup && "rounded-bl-md"
                              )
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>

                      {/* Message actions (show on hover) */}
                      <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 hidden group-hover/bubble:flex items-center gap-1 p-1 bg-surface border border-border-subtle rounded-lg shadow-xl z-10",
                        isOwn ? "right-full mr-2" : "left-full ml-2"
                      )}>
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-cyan-400 transition-colors"
                          title="Reply"
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Attachments */}
                    {msg.attachments?.length > 0 && (
                      <div className={cn("mt-2 space-y-1", isOwn ? "items-end" : "items-start")}>
                        {msg.attachments.map((att: any) => (
                          <div key={att.id} className="group/att relative">
                            {att.mimeType?.startsWith("image/") ? (
                              <a href={att.path} target="_blank" rel="noopener noreferrer" className="block relative overflow-hidden rounded-xl border border-border-subtle shadow-lg group-hover/att:border-cyan-500/30 transition-all">
                                <img
                                  src={att.path}
                                  alt={att.originalName}
                                  className="max-w-sm max-h-[300px] object-cover hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center">
                                  <FileDown className="h-6 w-6 text-white" />
                                </div>
                              </a>
                            ) : (
                              <a
                                href={att.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 bg-surface-hover border border-border-subtle rounded-xl text-[11px] text-text-secondary hover:bg-surface-hover hover:border-cyan-500/30 transition-all group/file"
                              >
                                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover/file:bg-cyan-500/20">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{att.originalName}</p>
                                  <p className="text-[10px] text-text-muted">{(att.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <FileDown className="h-3.5 w-3.5 text-text-muted ml-auto" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.replies?.length > 0 && isLastInGroup && (
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="text-[10px] font-bold text-cyan-400 mt-2 hover:text-cyan-300 uppercase tracking-widest flex items-center gap-1 px-1"
                      >
                        <Reply className="h-2.5 w-2.5 -scale-x-100" />
                        {msg.replies.length} {msg.replies.length === 1 ? "REPLY" : "REPLIES"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Participants sidebar */}
        {showParticipants && (
          <div className="w-64 border-l border-border-subtle p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Participants</h3>
            <div className="space-y-2">
              {thread.participants?.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar name={p.user?.name} src={p.user?.image} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{p.user?.name}</p>
                    <p className="text-xs text-text-muted">{p.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-hover border-t border-border-subtle text-sm">
          <Reply className="h-4 w-4 text-text-muted" />
          <span className="text-text-muted">Replying to</span>
          <span className="font-medium text-text-dim">{replyTo.author?.name}</span>
          <span className="text-text-muted truncate flex-1">
            {replyTo.content?.slice(0, 60)}
          </span>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-surface-hover rounded">
            <X className="h-3 w-3 text-text-muted" />
          </button>
        </div>
      )}

      {/* File previews */}
      {selectedFiles.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-t border-border-subtle overflow-x-auto">
          {selectedFiles.map((file, i) => (
            <div key={i} className="relative flex-shrink-0">
              {previewUrls[i] ? (
                <img
                  src={previewUrls[i]}
                  alt={file.name}
                  className="h-16 w-16 object-cover rounded-lg border border-border-subtle"
                />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center bg-surface-hover rounded-lg border border-border-subtle">
                  <FileText className="h-6 w-6 text-text-muted" />
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="text-xs text-text-muted truncate w-16 mt-0.5">{file.name}</p>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 mt-2 border-t border-border-subtle">
        <div className="bg-surface-hover border border-border-subtle rounded-2xl p-2 focus-within:border-cyan-500/30 transition-all shadow-lg">
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <div className="flex items-center gap-1 mb-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl hover:bg-surface-hover text-text-muted hover:text-cyan-400 transition-all"
                title="Attach file"
              >
                <Paperclip className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className={cn(
                  "p-2.5 rounded-xl transition-all",
                  showTemplates ? "bg-cyan-500/10 text-cyan-400" : "hover:bg-surface-hover text-text-muted hover:text-cyan-400"
                )}
                title="Message templates"
              >
                <ChevronDown className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex-1 relative pb-1">
              {/* Templates dropdown */}
              {showTemplates && templates && (
                <div className="absolute bottom-full left-0 mb-4 w-80 bg-surface-hover/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border-medium z-50 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="p-3 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-surface-hover/90 backdrop-blur-md z-10">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Available Templates</p>
                    <BookOpen className="h-3 w-3 text-text-muted" />
                  </div>
                  <div className="p-1">
                    {templates.map((t: any) => (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className="w-full text-left p-3 rounded-xl hover:bg-cyan-500/10 group transition-all"
                      >
                        <p className="font-semibold text-text-primary text-sm group-hover:text-cyan-400">{t.name}</p>
                        <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">{t.content}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a message..."
                rows={1}
                className="w-full px-2 py-2 bg-transparent text-sm text-text-primary placeholder:text-text-dim focus:outline-none resize-none max-h-32"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
            </div>
            <button
              type="submit"
              disabled={(!message.trim() && selectedFiles.length === 0) || sendMessage.isPending}
              className={cn(
                "p-3 rounded-xl transition-all shadow-lg mb-1 flex items-center justify-center",
                (!message.trim() && selectedFiles.length === 0)
                  ? "bg-surface-hover text-text-dim cursor-not-allowed"
                  : "bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:shadow-cyan-500/20 hover:scale-105 active:scale-95"
              )}
            >
              {sendMessage.isPending ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
        <p className="text-[10px] text-text-dim text-center mt-2">
          Press <kbd className="px-1 py-0.5 rounded bg-surface-hover border border-border-subtle">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-surface-hover border border-border-subtle">Shift + Enter</kbd> for new line.
        </p>
      </div>
    </div>
  );
}
