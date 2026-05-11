"use client";

import { useState, useRef, useEffect } from "react";
import { useAIChat } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Avatar, Badge } from "@/components/ui";
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  ClipboardList,
  Building2,
  Search,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIChatProps {
  context?: {
    type: "work_order" | "property" | "general" | "contractor_search";
    id?: string;
    title?: string;
  };
  embedded?: boolean;
  className?: string;
}

export function AIChat({ context, embedded = false, className }: AIChatProps) {
  const { data: session } = useSession();
  const chatMutation = useAIChat();
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; timestamp: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(embedded);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
    ]);

    try {
      const result = await chatMutation.mutateAsync({
        message: userMessage,
        context: context
          ? { type: context.type, id: context.id }
          : undefined,
        conversationHistory: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.response,
          timestamp: result.timestamp,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't process your request. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }

  function handleQuickAction(action: string) {
    const prompts: Record<string, string> = {
      status: "What's the current status of this work order?",
      summarize: "Summarize this work order for me.",
      overdue: "Are there any overdue items?",
      history: "Show me the recent activity history.",
      contractors: "Find available contractors for this job.",
      photos: "What photos have been uploaded?",
    };
    setInput(prompts[action] || action);
  }

  // Embedded mode (inline in pages)
  if (embedded) {
    return (
      <div className={cn("flex flex-col", className)}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
          {messages.length === 0 ? (
            <div className="text-center text-text-muted py-6">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-indigo-400" />
              <p className="text-sm font-medium">AI Assistant</p>
              <p className="text-xs mt-1">
                Ask me anything about{" "}
                {context?.type === "work_order"
                  ? "this work order"
                  : context?.type === "property"
                    ? "this property"
                    : "your data"}
              </p>
              {context?.type === "work_order" && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {["status", "summarize", "history", "photos", "contractors"].map(
                    (action) => (
                      <button
                        key={action}
                        onClick={() => handleQuickAction(action)}
                        className="px-2.5 py-1 bg-surface-hover hover:bg-surface-hover rounded-full text-xs text-text-dim capitalize"
                      >
                        {action}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-cyan-400" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-xl text-sm",
                    msg.role === "user"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-sm"
                      : "bg-surface-hover text-text-primary rounded-tl-sm"
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          {chatMutation.isPending && (
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="px-3 py-2 bg-surface-hover rounded-xl rounded-tl-sm">
                <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 p-3 border-t border-border-subtle"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI assistant..."
            className="flex-1 px-3 py-2 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
          />
          <Button
            type="submit"
            size="sm"
            loading={chatMutation.isPending}
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    );
  }

  // Drag handlers for the floating button
  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }

  useEffect(() => {
    if (!isDragging) return;
    function handleMove(e: MouseEvent) {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      });
    }
    function handleUp() {
      setIsDragging(false);
      dragStartRef.current = null;
    }
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging]);

  // If user removed the assistant, show a small restore button
  if (isRemoved && !isOpen) {
    return (
      <button
        onClick={() => setIsRemoved(false)}
        className="fixed bottom-6 right-6 z-50 h-8 w-8 bg-surface-hover border border-border-medium text-text-muted rounded-full shadow-lg hover:bg-surface-hover hover:text-text-secondary transition-all flex items-center justify-center"
        title="Restore AI Assistant"
        data-floating-chat
      >
        <Sparkles className="h-4 w-4" />
      </button>
    );
  }

  // If removed and not open, don't render anything
  if (isRemoved) return null;

  // Floating button mode
  return (
    <>
      {/* Floating button (draggable) */}
      {!isOpen && (
        <button
          onMouseDown={handleDragStart}
          onClick={() => {
            if (!isDragging) setIsOpen(true);
          }}
          className="fixed z-50 h-14 w-14 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
          style={{
            bottom: `calc(1.5rem - ${position.y}px)`,
            right: `calc(1.5rem - ${position.x}px)`,
          }}
          title="Drag to move · Click to open · Right-click to remove"
          onContextMenu={(e) => {
            e.preventDefault();
            setIsRemoved(true);
          }}
          data-floating-chat
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 bg-surface-hover rounded-2xl shadow-2xl border border-border-subtle flex flex-col transition-all",
            isMinimized ? "w-80 h-14" : "w-96 h-[32rem]"
          )}
          style={{
            bottom: `calc(1.5rem - ${position.y}px)`,
            right: `calc(1.5rem - ${position.x}px)`,
          }}
          data-floating-chat
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">AI Assistant</span>
              {context?.title && (
                <span className="text-xs text-indigo-200 truncate max-w-[150px]">
                  — {context.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-cyan-500/[0.06]0 rounded"
              >
                {isMinimized ? (
                  <Maximize2 className="h-3.5 w-3.5" />
                ) : (
                  <Minimize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsRemoved(true);
                }}
                className="p-1 hover:bg-cyan-500/[0.06]0 rounded"
                title="Close (right-click floating button to restore)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-text-muted py-8">
                    <Sparkles className="h-10 w-10 mx-auto mb-3 text-indigo-400" />
                    <p className="text-sm font-medium">PropPreserve AI</p>
                    <p className="text-xs mt-1">
                      Ask about work orders, properties, contractors, or anything
                      else.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {[
                        {
                          icon: ClipboardList,
                          label: "Work Order Status",
                          prompt: "Show me my work order status overview",
                        },
                        {
                          icon: Search,
                          label: "Find Contractors",
                          prompt: "Find available contractors in my area",
                        },
                        {
                          icon: Building2,
                          label: "Property Summary",
                          prompt: "Summarize my property portfolio",
                        },
                        {
                          icon: MessageSquare,
                          label: "Recent Updates",
                          prompt: "What are the latest updates?",
                        },
                      ].map((item) => (
                        <button
                          key={item.label}
                          onClick={() => setInput(item.prompt)}
                          className="p-2 border border-border-subtle rounded-lg hover:bg-surface-hover text-left"
                        >
                          <item.icon className="h-4 w-4 text-indigo-500 mb-1" />
                          <p className="text-xs font-medium text-text-dim">
                            {item.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2",
                        msg.role === "user" ? "flex-row-reverse" : ""
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-cyan-400" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] px-3 py-2 rounded-xl text-sm",
                          msg.role === "user"
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-sm"
                            : "bg-surface-hover text-text-primary rounded-tl-sm"
                        )}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))
                )}
                {chatMutation.isPending && (
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="px-3 py-2 bg-surface-hover rounded-xl rounded-tl-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick actions for work order context */}
              {context?.type === "work_order" && messages.length === 0 && (
                <div className="px-4 pb-2">
                  <div className="flex flex-wrap gap-1.5">
                    {["status", "summarize", "history", "photos", "contractors"].map(
                      (action) => (
                        <button
                          key={action}
                          onClick={() => handleQuickAction(action)}
                          className="px-2.5 py-1 bg-surface-hover hover:bg-surface-hover rounded-full text-xs text-text-dim capitalize"
                        >
                          {action}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 p-3 border-t border-border-subtle"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 px-3 py-2 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none"
                />
                <Button
                  type="submit"
                  size="sm"
                  loading={chatMutation.isPending}
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
