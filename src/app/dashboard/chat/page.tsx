"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  useChatChannels,
  useChatChannel,
  useCreateChatChannel,
  useChatMessages,
  useSendChatMessage,
  useEditChatMessage,
  useDeleteChatMessage,
  useToggleReaction,
  useMarkChannelRead,
  useUsers,
} from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Badge, Avatar, Modal } from "@/components/ui";
import { UserPopover } from "@/components/chat/user-popover";
import { CallOverlay } from "@/components/chat/call-overlay";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { ChannelInfoPanel } from "@/components/chat/channel-info";
import { MessageActions, TypingIndicator } from "@/components/chat/message-actions";
import { MentionDropdown } from "@/components/chat/mention-dropdown";
import {
  Hash,
  Plus,
  Search,
  Send,
  Smile,
  Paperclip,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronRight,
  X,
  FileText,
  FileDown,
  Pin,
  Loader2,
  Lock,
  Reply,
  MoreHorizontal,
  FolderOpen,
  Phone,
  Video,
  Bold,
  Italic,
  Code,
  Link2,
  AtSign,
  Info,
  Bookmark,
  PanelLeftOpen,
  PanelLeftClose,
  Home,
  Volume2,
  VolumeX,
  Mic,
  StopCircle,
} from "lucide-react";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  playSendSound,
  playReceiveSound,
  playNotificationSound,
  isSoundEnabled,
  toggleSoundEnabled,
} from "@/lib/sounds";

const CHANNEL_ICONS: Record<string, any> = {
  GENERAL: Hash,
  WORK_ORDERS: Home,
  CUSTOM: Hash,
  DIRECT_MESSAGE: Lock,
};

// Helper: extract work order link from a channel
function getWorkOrderLink(channel: any): string {
  if (!channel) return "/dashboard/work-orders";
  
  // Best: check metadata for workOrderId
  if (channel.metadata?.workOrderId) {
    return `/dashboard/work-orders/${channel.metadata.workOrderId}`;
  }
  if (channel.workOrderId) {
    return `/dashboard/work-orders/${channel.workOrderId}`;
  }

  // Try to extract work order ID from name, description or metadata
  const name = channel.name || "";
  const desc = channel.description || "";
  
  // Look for CUID (typically starts with 'cl' or 'cm' and is long)
  const cuidPattern = /[a-z0-9]{24,}/i;
  // Look for WO- prefix followed by 6+ alphanumeric chars
  const woPattern = /WO[-_]?([A-Z0-9]{6,})/i;
  
  const cuidMatch = name.match(cuidPattern) || desc.match(cuidPattern);
  if (cuidMatch) {
    return `/dashboard/work-orders/${cuidMatch[0]}`;
  }
  
  const woMatch = name.match(woPattern) || desc.match(woPattern);
  if (woMatch) {
    return `/dashboard/work-orders/${woMatch[1]}`;
  }

  // Last resort: search
  return `/dashboard/work-orders?search=${encodeURIComponent(name.replace(/^#/, ""))}`;
}

// ─── Gradient palette for message bubbles ────────────────────────────────────
const OWN_GRADIENTS = [
  "from-cyan-600/20 to-blue-600/20 border-cyan-500/20",
  "from-violet-600/20 to-purple-600/20 border-violet-500/20",
  "from-emerald-600/20 to-teal-600/20 border-emerald-500/20",
  "from-rose-600/20 to-pink-600/20 border-rose-500/20",
];

function getGradientForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return OWN_GRADIENTS[Math.abs(hash) % OWN_GRADIENTS.length];
}

export default function ChatPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const { data: channelsData, isLoading: channelsLoading } = useChatChannels();
  const { data: usersData } = useUsers();
  const createChannel = useCreateChatChannel();

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showThread, setShowThread] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [channelSearch, setChannelSearch] = useState("");
  const [showDMs, setShowDMs] = useState(true);
  const [showChannels, setShowChannels] = useState(true);
  const [showWorkOrders, setShowWorkOrders] = useState(true);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(isSoundEnabled());

  const channels = channelsData?.channels || [];
  const users = Array.isArray(usersData) ? usersData : usersData?.users || [];

  useEffect(() => {
    if (!activeChannelId && channels.length > 0) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  const generalChannels = channels.filter(
    (c: any) =>
      c.type === "GENERAL" || c.type === "CUSTOM"
  );
  const workOrderChannels = channels.filter(
    (c: any) => c.type === "WORK_ORDERS"
  );
  const dmChannels = channels.filter(
    (c: any) => c.type === "DIRECT_MESSAGE"
  );

  const filteredGeneral = generalChannels.filter(
    (c: any) =>
      !channelSearch ||
      c.name.toLowerCase().includes(channelSearch.toLowerCase())
  );
  const filteredWorkOrders = workOrderChannels.filter(
    (c: any) =>
      !channelSearch ||
      c.name.toLowerCase().includes(channelSearch.toLowerCase())
  );
  // Deduplicate DMs by the other member's ID to ensure each user only appears once
  const deduplicatedDMs = useMemo(() => {
    const userToChannel = new Map<string, any>();
    
    dmChannels.forEach((ch: any) => {
      const otherMember = ch.members?.find((m: any) => (m.userId || m.user?.id) !== userId);
      const otherUserId = otherMember?.userId || otherMember?.user?.id;
      
      if (otherUserId) {
        const existing = userToChannel.get(otherUserId);
        if (!existing || new Date(ch.updatedAt) > new Date(existing.updatedAt)) {
          userToChannel.set(otherUserId, ch);
        }
      } else if (!userToChannel.has(ch.id)) {
        // Fallback for group DMs or channels with no other members
        userToChannel.set(ch.id, ch);
      }
    });
    
    return Array.from(userToChannel.values());
  }, [dmChannels, userId]);

  const filteredDMs = deduplicatedDMs.filter(
    (c: any) =>
      !channelSearch ||
      c.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
      c.members?.some((m: any) =>
        m.user?.name?.toLowerCase().includes(channelSearch.toLowerCase())
      )
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-6 bg-background overflow-hidden">
      {/* Sidebar Toggle (when hidden) */}
      {!showSidebar && (
        <div className="flex-shrink-0 flex items-start pt-4 pl-3">
          <button
            onClick={() => setShowSidebar(true)}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface-hover border border-border-subtle text-text-muted hover:text-cyan-400 hover:bg-surface-hover transition-all shadow-lg hover:scale-105 active:scale-95"
            title="Show sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Channel Sidebar */}
      {showSidebar && (
      <div className="w-80 border-r border-border-subtle flex flex-col bg-surface flex-shrink-0 relative">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)] group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-text-primary tracking-tight">Messages</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Network Pulse</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowGlobalSearch(true)}
                className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-cyan-400 transition-all"
                title="Search all messages"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowNewChannel(true)}
                className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-cyan-400 transition-all"
                title="New channel"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-rose-400 transition-all"
                title="Hide sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim group-focus-within:text-cyan-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Jump to conversation..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-white/[0.06]">
          {/* Channels Section */}
          <div className="px-2">
            <button
              onClick={() => setShowChannels(!showChannels)}
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider w-full hover:text-text-secondary transition-colors"
            >
              {showChannels ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Channels
              <span className="ml-auto text-text-dim font-normal">
                {generalChannels.length}
              </span>
            </button>
            {showChannels && (
              <div className="mt-0.5 space-y-px">
                {filteredGeneral.map((channel: any) => (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    isActive={activeChannelId === channel.id}
                    onClick={() => {
                      setActiveChannelId(channel.id);
                      setShowThread(null);
                      setShowChannelInfo(false);
                    }}
                  />
                ))}
                {filteredGeneral.length === 0 && (
                  <p className="px-3 py-3 text-xs text-text-dim text-center">
                    No channels found
                  </p>
                )}
              </div>
            )}
          </div>

          {/* DMs Section */}
          <div className="px-2 mt-3">
            <button
              onClick={() => setShowDMs(!showDMs)}
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider w-full hover:text-text-secondary transition-colors"
            >
              {showDMs ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Direct Messages
              <span className="ml-auto text-text-dim font-normal">
                {dmChannels.length}
              </span>
            </button>
            {showDMs && (
              <div className="mt-0.5 space-y-px">
                {filteredDMs.map((channel: any) => (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    isActive={activeChannelId === channel.id}
                    onClick={() => {
                      setActiveChannelId(channel.id);
                      setShowThread(null);
                      setShowChannelInfo(false);
                    }}
                    isDM
                    userId={userId}
                  />
                ))}
                {filteredDMs.length === 0 && (
                  <p className="px-3 py-3 text-xs text-text-dim text-center">
                    No conversations yet
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Work Order Messages Section */}
          <div className="px-2 mt-3">
            <button
              onClick={() => setShowWorkOrders(!showWorkOrders)}
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider w-full hover:text-text-secondary transition-colors"
            >
              {showWorkOrders ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Work Order Messages
              <span className="ml-auto text-text-dim font-normal">
                {workOrderChannels.length}
              </span>
            </button>
            {showWorkOrders && (
              <div className="mt-0.5 space-y-px">
                {filteredWorkOrders.map((channel: any) => (
                  <ChannelRow
                    key={channel.id}
                    channel={channel}
                    isActive={activeChannelId === channel.id}
                    onClick={() => {
                      setActiveChannelId(channel.id);
                      setShowThread(null);
                      setShowChannelInfo(false);
                    }}
                  />
                ))}
                {filteredWorkOrders.length === 0 && (
                  <p className="px-3 py-3 text-xs text-text-dim text-center">
                    No work order channels
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
        {activeChannelId ? (
          <ChatArea
            channelId={activeChannelId}
            userId={userId}
            search={search}
            setSearch={setSearch}
            showThread={showThread}
            setShowThread={setShowThread}
            showChannelInfo={showChannelInfo}
            setShowChannelInfo={setShowChannelInfo}
            users={users}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(toggleSoundEnabled())}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-border-subtle flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 text-cyan-400/60" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">
                Welcome to Messages
              </h3>
              <p className="text-sm text-text-muted mt-1 max-w-xs mx-auto">
                Select a channel or start a new conversation to begin
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Thread Panel */}
      {showThread && activeChannelId && (
        <ThreadPanel
          channelId={activeChannelId}
          messageId={showThread}
          userId={userId}
          onClose={() => setShowThread(null)}
        />
      )}

      {/* Channel Info Panel */}
      {showChannelInfo && activeChannelId && (
        <ChannelInfoPanelWrapper
          channelId={activeChannelId}
          userId={userId}
          onClose={() => setShowChannelInfo(false)}
        />
      )}

      {/* New Channel Modal */}
      {showNewChannel && (
        <NewChannelModal
          onClose={() => setShowNewChannel(false)}
          users={users}
          userId={userId}
        />
      )}

      {/* Global Search Modal */}
      {showGlobalSearch && (
        <GlobalSearchModal
          onClose={() => {
            setShowGlobalSearch(false);
            setGlobalSearchQuery("");
          }}
          query={globalSearchQuery}
          setQuery={setGlobalSearchQuery}
          channels={channels}
          onSelectChannel={(id: string) => {
            setActiveChannelId(id);
            setShowGlobalSearch(false);
            setGlobalSearchQuery("");
          }}
        />
      )}
    </div>
  );
}

// ─── Channel Info Panel Wrapper ─────────────────────────────────────────────

function ChannelInfoPanelWrapper({
  channelId,
  userId,
  onClose,
}: {
  channelId: string;
  userId: string;
  onClose: () => void;
}) {
  const { data: channel, refetch: refetchChannel } = useChatChannel(channelId);
  const { data: messagesData } = useChatMessages(channelId);
  const messages = messagesData?.messages || [];
  const pinnedMessages = messages.filter((m: any) => m.isPinned);

  return (
    <ChannelInfoPanel
      channel={channel}
      userId={userId}
      onClose={onClose}
      pinnedMessages={pinnedMessages}
      onChannelUpdate={refetchChannel}
    />
  );
}

// ─── Global Search Modal ────────────────────────────────────────────────────

function GlobalSearchModal({
  onClose,
  query,
  setQuery,
  channels,
  onSelectChannel,
}: {
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  channels: any[];
  onSelectChannel: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl mx-4">
        <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/5 dark:shadow-black/60 overflow-hidden">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
              <input
                type="text"
                placeholder="Search messages across all channels..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full pl-12 pr-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>
          {query.length < 2 && (
            <div className="px-4 pb-4">
              <p className="text-xs text-text-dim mb-3">
                Type at least 2 characters to search...
              </p>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-text-muted mb-2 px-2">
                  Quick access
                </p>
                {channels.slice(0, 5).map((ch: any) => (
                  <button
                    key={ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-surface-hover text-sm text-text-secondary transition-colors"
                  >
                    <div className="h-6 w-6 rounded-md bg-surface-hover flex items-center justify-center">
                      <Hash className="h-3.5 w-3.5 text-text-muted" />
                    </div>
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {query.length >= 2 && (
            <div className="px-4 pb-4">
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-text-dim mx-auto mb-2" />
                <p className="text-sm text-text-muted">
                  Results will appear here
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Channel Row ──────────────────────────────────────────────────────────────

function ChannelRow({
  channel,
  isActive,
  onClick,
  isDM,
  userId,
}: {
  channel: any;
  isActive: boolean;
  onClick: () => void;
  isDM?: boolean;
  userId?: string;
}) {
  const Icon = CHANNEL_ICONS[channel.type] || Hash;
  const lastMsg = channel.lastMessage;
  const unread = channel.unreadCount || 0;

  const otherUser = isDM
    ? channel.members?.find((m: any) => m.userId !== userId)?.user
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left group",
        isActive
          ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-200 shadow-sm shadow-cyan-500/5"
          : unread > 0
          ? "bg-surface-hover text-text-primary font-medium hover:bg-surface-hover"
          : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
      )}
    >
      {isDM && otherUser ? (
        <div className="relative flex-shrink-0">
          <Avatar
            src={otherUser.image}
            name={otherUser.name}
            size="sm"
          />
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface",
              otherUser.isActive !== false ? "bg-emerald-500" : "bg-gray-600"
            )}
          />
        </div>
      ) : (
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all border shadow-sm overflow-hidden",
            isActive
              ? channel.type === "WORK_ORDERS"
                ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                : "bg-cyan-500/20 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10"
              : channel.type === "WORK_ORDERS"
              ? "bg-amber-500/[0.08] border-amber-500/10 text-amber-500/60 group-hover:bg-amber-500/15 group-hover:text-amber-400 group-hover:border-amber-500/20"
              : "bg-surface-hover border-border-subtle text-text-dim group-hover:bg-surface-hover group-hover:text-text-muted group-hover:border-border-subtle"
          )}
        >
          {channel.imageUrl || channel.image || channel.metadata?.image ? (
            <img src={channel.imageUrl || channel.image || channel.metadata?.image} alt={channel.name} className="h-full w-full object-cover" />
          ) : channel.type === "WORK_ORDERS" ? (
            <Home className="h-4 w-4" />
          ) : (
            <Avatar name={channel.name} size="xs" />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("truncate text-[13px]", isActive && "font-semibold")}>
              {isDM && otherUser ? otherUser.name : channel.name}
            </span>
            {channel.type === "WORK_ORDERS" && (
              <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                WO
              </span>
            )}
          </div>
          {unread > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full min-w-[18px] text-center shadow-lg shadow-cyan-500/30">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
        {lastMsg && (
          <p className="text-[11px] text-text-dim truncate mt-0.5">
            {lastMsg.author?.name}: {truncate(lastMsg.content, 35)}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Chat Area ────────────────────────────────────────────────────────────────

function ChatArea({
  channelId,
  userId,
  search,
  setSearch,
  showThread,
  setShowThread,
  showChannelInfo,
  setShowChannelInfo,
  users,
  soundEnabled,
  onToggleSound,
}: {
  channelId: string;
  userId: string;
  search: string;
  setSearch: (s: string) => void;
  showThread: string | null;
  setShowThread: (id: string | null) => void;
  showChannelInfo: boolean;
  setShowChannelInfo: (show: boolean) => void;
  users: any[];
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  const { data: session } = useSession();
  const { data: channel } = useChatChannel(channelId);
  const { data: messagesData, isLoading } = useChatMessages(
    channelId,
    search || undefined
  );
  const sendMessage = useSendChatMessage(channelId);
  const editMessage = useEditChatMessage(channelId);
  const deleteMessage = useDeleteChatMessage(channelId);
  const toggleReaction = useToggleReaction(channelId);
  const markRead = useMarkChannelRead(channelId);

  const messages = messagesData?.messages || [];
  const [message, setMessage] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showMessageActions, setShowMessageActions] = useState<string | null>(
    null
  );
  const [pinnedMessages, setPinnedMessages] = useState<string[]>([]);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<string[]>([]);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showCall, setShowCall] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMsgCount = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Play receive sound for new messages from others
  useEffect(() => {
    if (messages.length > prevMsgCount.current && prevMsgCount.current > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.authorId !== userId && soundEnabled) {
        playReceiveSound();
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages, userId, soundEnabled]);

  useEffect(() => {
    if (channelId) {
      markRead.mutate();
    }
  }, [channelId, messages.length]);

  // Simulate typing indicator
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.authorId !== userId) {
        setTypingUsers([]);
      }
    }
  }, [messages, userId]);

  // Close message actions on click outside
  useEffect(() => {
    if (!showMessageActions) return;
    function handleClick() {
      setShowMessageActions(null);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showMessageActions]);

  // Handle @mention detection
  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setMessage(val);

    const cursor = e.target.selectionStart;
    setCursorPosition(cursor);

    // Find @mention being typed
    const textBeforeCursor = val.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1] || ""); // empty string = show all
      // Calculate position for dropdown
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({
          top: 0,
          left: 0,
        });
      }
    } else {
      setMentionQuery(null);
    }
  }

  function handleMentionSelect(user: any) {
    const textBeforeCursor = message.slice(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(
        0,
        mentionMatch.index
      );
      const afterCursor = message.slice(cursorPosition);
      const newMessage = `${beforeMention}@${user.name} ${afterCursor}`;
      setMessage(newMessage);
      setMentionQuery(null);

      // Focus back on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = beforeMention.length + user.name!.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    if (editingMessage) {
      try {
        await editMessage.mutateAsync({ messageId: editingMessage, content: message.trim() });
        setEditingMessage(null);
        setEditContent("");
        setMessage("");
        toast.success("Message edited");
      } catch {
        toast.error("Failed to edit message");
      }
      return;
    }

    const trimmed = message.trim();
    if (trimmed.startsWith("/")) {
      const command = trimmed.split(" ")[0].toLowerCase();
      if (command === "/clear") {
        setMessage("");
        toast.success("Chat local view cleared (mocked)");
        return;
      }
      if (command === "/zoom" || command === "/meet") {
        const url = command === "/zoom" ? "https://zoom.us/j/fake" : "https://meet.google.com/fake";
        try {
          await sendMessage.mutateAsync({ content: `Join my video meeting: ${url}` });
          setMessage("");
          if (soundEnabled) playSendSound();
        } catch {
          toast.error("Failed to send meeting link");
        }
        return;
      }
      if (command === "/shrug") {
        try {
          await sendMessage.mutateAsync({ content: `¯\\_(ツ)_/¯` });
          setMessage("");
          if (soundEnabled) playSendSound();
        } catch {
          toast.error("Failed to send shrug");
        }
        return;
      }
      toast.error(`Unknown command: ${command}`);
      return;
    }

    try {
      await sendMessage.mutateAsync({
        content: trimmed,
        parentId: replyTo?.id || undefined,
      });
      setMessage("");
      setReplyTo(null);
      setMentionQuery(null);
      if (soundEnabled) playSendSound();
    } catch {
      toast.error("Failed to send message");
    }
  }

  async function handleDeleteMessage(msgId: string) {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteMessage.mutateAsync(msgId);
      toast.success("Message deleted");
    } catch {
      toast.error("Failed to delete message");
    }
  }

  async function handleStartRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        
        try {
          const formData = new FormData();
          formData.append("file", file);
          
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!uploadRes.ok) throw new Error("Upload failed");
          
          const { url } = await uploadRes.json();
          await sendMessage.mutateAsync({
            content: "🎤 Voice Message",
            type: "AUDIO",
            fileUrl: url,
            fileName: file.name,
            fileSize: file.size,
            fileMime: file.type,
          });
        } catch {
          toast.error("Failed to send voice message");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }

  function handleStopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }

  async function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }
      try {
        await sendMessage.mutateAsync({
          content: `📎 Shared ${file.name}`,
          type: file.type.startsWith("image/") ? "IMAGE" : "FILE",
          fileUrl: URL.createObjectURL(file),
          fileName: file.name,
          fileSize: file.size,
          fileMime: file.type,
        });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }

  function highlightMentions(text: string) {
    return text.replace(
      /@(\w+)/g,
      '<span class="bg-cyan-500/15 text-cyan-300 px-1.5 py-0.5 rounded-md font-medium cursor-pointer hover:bg-cyan-500/25 transition-colors">@$1</span>'
    );
  }

  function handleFormatText(format: "bold" | "italic" | "code" | "link") {
    const formats: Record<string, { prefix: string; suffix: string }> = {
      bold: { prefix: "**", suffix: "**" },
      italic: { prefix: "_", suffix: "_" },
      code: { prefix: "`", suffix: "`" },
      link: { prefix: "[", suffix: "](url)" },
    };
    const { prefix, suffix } = formats[format];
    setMessage((prev) => prev + prefix + suffix);
  }

  function handlePin(messageId: string) {
    setPinnedMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
    toast.success(
      pinnedMessages.includes(messageId) ? "Message unpinned" : "Message pinned"
    );
  }

  function handleBookmark(messageId: string) {
    setBookmarkedMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
    toast.success(
      bookmarkedMessages.includes(messageId)
        ? "Bookmark removed"
        : "Message bookmarked"
    );
  }

  function handleCopyLink(messageId: string) {
    navigator.clipboard.writeText(
      `${window.location.origin}/dashboard/chat?msg=${messageId}`
    );
    toast.success("Link copied to clipboard");
  }

  const ChannelIcon = CHANNEL_ICONS[channel?.type] || Hash;
  const isDM = channel?.type === "DIRECT_MESSAGE";
  const otherUser = isDM
    ? channel?.members?.find((m: any) => m.userId !== userId)?.user
    : null;

  // Find unread marker position
  const unreadMarkerIdx = useMemo(() => {
    if (!messages.length) return -1;
    for (let i = 0; i < messages.length; i++) {
      if (
        messages[i].authorId !== userId &&
        new Date(messages[i].createdAt).getTime() > Date.now() - 3600000
      ) {
        if (i > 0) return i;
      }
    }
    return -1;
  }, [messages, userId]);

  return (
    <div
      className="flex flex-col flex-1 min-h-0 relative"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleFileDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-cyan-500/[0.06] border-2 border-dashed border-cyan-400/50 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <div className="bg-surface rounded-2xl p-8 shadow-2xl shadow-black/5 dark:shadow-black/60 text-center border border-border-subtle">
            <FolderOpen className="h-12 w-12 text-cyan-400 mx-auto mb-3" />
            <p className="font-semibold text-text-primary text-lg">Drop files to share</p>
            <p className="text-sm text-text-muted mt-1">Max 10MB per file</p>
          </div>
        </div>
      )}

      {/* Channel Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          {isDM ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar
                  src={otherUser?.image}
                  name={otherUser?.name}
                  size="md"
                />
                <div
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface",
                    otherUser?.isActive !== false
                      ? "bg-emerald-500"
                      : "bg-gray-600"
                  )}
                />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary text-sm">
                  {otherUser?.name}
                </h3>
                <p className="text-[11px] text-text-muted">
                  {otherUser?.isActive !== false ? "Active now" : "Offline"}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border shadow-lg overflow-hidden",
                channel?.type === "WORK_ORDERS" 
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                  : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
              )}>
                {channel?.imageUrl || channel?.image || channel?.metadata?.image ? (
                  <img src={channel.imageUrl || channel.image || channel.metadata?.image} alt={channel?.name} className="h-full w-full object-cover" />
                ) : channel?.type === "WORK_ORDERS" ? (
                  <Home className="h-5 w-5" />
                ) : (
                  <ChannelIcon className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-text-primary text-sm truncate">
                  {channel?.name}
                </h3>
                {channel?.description && (
                  <p className="text-[11px] text-text-muted truncate">
                    {channel.description}
                  </p>
                )}
              </div>
            </>
          )}
          {channel?.members && (
            <Badge className="bg-surface-hover text-text-muted ml-1 text-[11px] px-2 py-0.5">
              <Users className="h-3 w-3 mr-1" />
              {channel.members.length}
            </Badge>
          )}
          {/* Open Work Order button for work order channels */}
          {channel?.type === "WORK_ORDERS" && getWorkOrderLink(channel) !== "/dashboard/work-orders" && (
            <Link
              href={getWorkOrderLink(channel)}
              className="inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all text-[11px] font-bold border border-amber-500/20 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/5"
            >
              <FileText className="h-3.5 w-3.5" />
              Open Work Order
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => {
              setCallType("audio");
              setShowCall(true);
            }}
            className="p-2 rounded-lg text-text-muted hover:bg-surface-hover hover:text-emerald-400 transition-colors"
            title="Voice call"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setCallType("video");
              setShowCall(true);
            }}
            className="p-2 rounded-lg text-text-muted hover:bg-surface-hover hover:text-cyan-400 transition-colors"
            title="Video call"
          >
            <Video className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-surface-hover mx-1" />

          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors",
              showSearch && "bg-cyan-500/10 text-cyan-400"
            )}
            title="Search messages"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowChannelInfo(!showChannelInfo)}
            className={cn(
              "p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors",
              showChannelInfo && "bg-cyan-500/10 text-cyan-400"
            )}
            title="Channel info"
          >
            <Info className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleSound}
            className={cn(
              "p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors",
              soundEnabled && "text-cyan-400"
            )}
            title={soundEnabled ? "Mute sounds" : "Enable sounds"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-5 py-2.5 border-b border-border-subtle bg-surface/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
            <input
              type="text"
              placeholder="Search in this channel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-8 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-hover rounded"
              >
                <X className="h-3 w-3 text-text-muted" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/[0.06]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
              <p className="text-xs text-text-muted">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-border-subtle flex items-center justify-center mx-auto mb-4">
                <Hash className="h-8 w-8 text-text-dim" />
              </div>
              <p className="font-medium text-text-primary">
                {search ? "No messages found" : "No messages yet"}
              </p>
              <p className="text-sm text-text-muted mt-1">
                {search
                  ? "Try a different search term"
                  : "Be the first to send a message!"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg: any, idx: number) => {
              const isOwn = msg.authorId === userId;
              const isSystem = msg.type === "SYSTEM";
              
              // Grouping logic: check if next/prev message is from same user within 5 mins
              const prevMsg = messages[idx - 1];
              const nextMsg = messages[idx + 1];
              const isFirstInGroup = !prevMsg || prevMsg.authorId !== msg.authorId || prevMsg.type === "SYSTEM" || (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 300000);
              const isLastInGroup = !nextMsg || nextMsg.authorId !== msg.authorId || nextMsg.type === "SYSTEM" || (new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() > 300000);

              const showUnreadMarker = idx === unreadMarkerIdx && !isOwn;

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center py-4">
                    <div className="px-4 py-1.5 bg-surface-hover border border-border-subtle rounded-full text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      {msg.content}
                    </div>
                  </div>
                )
              }

              const isPinned = pinnedMessages.includes(msg.id);
              const isBookmarked = bookmarkedMessages.includes(msg.id);
              const gradient = getGradientForUser(msg.authorId);

              return (
                <div key={msg.id}>
                  {/* Unread marker */}
                  {showUnreadMarker && (
                    <div className="flex items-center gap-3 py-3 my-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                      <span className="text-[10px] font-bold text-cyan-400 px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20 uppercase tracking-wider">
                        New Messages
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "group relative animate-in fade-in slide-in-from-bottom-2 duration-300",
                      isFirstInGroup ? "mt-6" : "mt-1",
                      "hover:bg-surface-hover -mx-5 px-5 py-1 transition-all duration-200",
                      isPinned && "bg-amber-500/[0.03] border-l-2 border-amber-500/30"
                    )}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setShowMessageActions(msg.id);
                    }}
                  >
                    <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
                      {/* Avatar - only show for first in group */}
                      <div className="w-9 flex-shrink-0">
                        {isFirstInGroup && (
                          <UserPopover
                            user={isOwn ? {
                              id: userId,
                              name: session?.user?.name,
                              email: session?.user?.email,
                              image: session?.user?.image,
                              role: (session?.user as any)?.role,
                              status: "online",
                            } : {
                              id: msg.author?.id || msg.authorId,
                              name: msg.author?.name,
                              email: msg.author?.email,
                              image: msg.author?.image,
                              role: msg.author?.role,
                              status: "online",
                            }}
                          >
                            <Avatar
                              src={isOwn ? session?.user?.image : msg.author?.image}
                              name={isOwn ? session?.user?.name : msg.author?.name}
                              size="sm"
                              className={cn(
                                "ring-2 transition-all duration-300",
                                isOwn ? "ring-cyan-500/20" : "ring-white/[0.08]"
                              )}
                            />
                          </UserPopover>
                        )}
                      </div>

                      <div className={cn(
                        "flex-1 flex flex-col min-w-0",
                        isOwn ? "items-end" : "items-start"
                      )}>
                        {/* Author + timestamp - only show for first in group */}
                        {isFirstInGroup && (
                          <div className={cn(
                            "flex items-center gap-2 mb-1.5 px-1",
                            isOwn && "flex-row-reverse"
                          )}>
                            <span className="text-[11px] font-bold text-text-primary">
                              {isOwn ? "You" : msg.author?.name}
                            </span>
                            <span className="text-[10px] text-text-muted font-medium">
                              {formatRelativeTime(msg.createdAt)}
                              {msg.isEdited && !msg.isDeleted && <span className="ml-1 opacity-70">(edited)</span>}
                            </span>
                            {isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                            {isBookmarked && <Bookmark className="h-3 w-3 text-cyan-400" />}
                          </div>
                        )}

                        {/* Message content with stylish bubble */}
                        <div className="relative group/bubble flex flex-col items-start max-w-[85%]">
                          <div
                            className={cn(
                              "px-4 py-3 text-sm transition-all duration-300 shadow-xl relative group",
                              isOwn
                                ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white border border-border-medium shadow-cyan-500/10"
                                : "bg-surface-hover text-text-primary border border-border-subtle backdrop-blur-xl hover:bg-surface-hover shadow-black/5 dark:shadow-black/20",
                              // Grouped corners
                              isOwn 
                                ? cn(
                                    "rounded-3xl rounded-tr-lg",
                                    !isFirstInGroup && "rounded-tr-3xl",
                                    !isLastInGroup && "rounded-br-lg"
                                  )
                                : cn(
                                    "rounded-3xl rounded-tl-lg",
                                    !isFirstInGroup && "rounded-tl-3xl",
                                    !isLastInGroup && "rounded-bl-lg"
                                  )
                            )}
                          >
                            {msg.type === "AUDIO" && msg.fileUrl && !msg.isDeleted && (
                              <div className="mb-2 w-full max-w-[240px]">
                                <audio controls src={msg.fileUrl} className="w-full h-8" />
                              </div>
                            )}

                            {msg.type === "FILE" && msg.fileUrl && !msg.isDeleted && (
                              <a
                                href={msg.fileUrl}
                                download={msg.fileName || "download"}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 p-2 mb-2 rounded-lg bg-surface-hover hover:bg-surface-hover transition-colors cursor-pointer w-max"
                              >
                                <FileText className="h-4 w-4" />
                                <span className="text-sm font-medium underline-offset-2 hover:underline">
                                  {msg.fileName || "Download Attachment"}
                                </span>
                              </a>
                            )}

                            {msg.type === "IMAGE" && msg.fileUrl && !msg.isDeleted && (
                              <div className="mb-2">
                                <img
                                  src={msg.fileUrl}
                                  alt={msg.fileName || "Image"}
                                  className="max-w-[240px] rounded-lg border border-border-subtle shadow-lg object-cover"
                                />
                              </div>
                            )}

                            <p className={cn(
                              "whitespace-pre-wrap leading-relaxed",
                              msg.isDeleted && "italic opacity-70 text-[13px]"
                            )}>
                              {msg.content}
                            </p>

                            {/* Floating actions menu */}
                            <div
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 hidden group-hover/bubble:flex items-center gap-0.5 p-1 bg-surface-hover/95 backdrop-blur-md border border-border-subtle rounded-xl shadow-2xl z-10",
                                isOwn 
                                  ? "right-full mr-3 before:absolute before:-right-3 before:inset-y-0 before:w-3" 
                                  : "left-full ml-3 before:absolute before:-left-3 before:inset-y-0 before:w-3"
                              )}
                            >
                              <button
                                onClick={() =>
                                  setShowEmojiPicker(
                                    showEmojiPicker === msg.id ? null : msg.id
                                  )
                                }
                                className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-cyan-400 transition-colors"
                                title="React"
                              >
                                <Smile className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setReplyTo(msg)}
                                className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-cyan-400 transition-colors"
                                title="Reply"
                              >
                                <Reply className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMessageActions(
                                    showMessageActions === msg.id ? null : msg.id
                                  );
                                }}
                                className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-cyan-400 transition-colors"
                                title="More"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Message Actions Dropdown */}
                          {showMessageActions === msg.id && (
                            <div className={cn(
                              "absolute top-10 z-20",
                              isOwn ? "right-0" : "left-0"
                            )}>
                              <MessageActions
                                isOwn={isOwn}
                                onReply={() => setReplyTo(msg)}
                                onEdit={() => {
                                  setEditingMessage(msg.id);
                                  setEditContent(msg.content);
                                  setMessage(msg.content);
                                  textareaRef.current?.focus();
                                }}
                                onDelete={() => handleDeleteMessage(msg.id)}
                                onPin={() => handlePin(msg.id)}
                                onCopyLink={() => handleCopyLink(msg.id)}
                                onBookmark={() => handleBookmark(msg.id)}
                                onClose={() => setShowMessageActions(null)}
                              />
                            </div>
                          )}

                          {/* Reactions */}
                          {msg.reactions?.length > 0 && isLastInGroup && (
                            <div className="flex flex-wrap gap-1 mt-2 px-1">
                              {Object.entries(
                                msg.reactions.reduce((acc: any, r: any) => {
                                  if (!acc[r.emoji]) acc[r.emoji] = [];
                                  acc[r.emoji].push(r);
                                  return acc;
                                }, {})
                              ).map(([emoji, reactions]: [string, any]) => {
                                const hasOwn = reactions.some(
                                  (r: any) => r.userId === userId
                                );
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() =>
                                      toggleReaction.mutate({
                                        messageId: msg.id,
                                        emoji,
                                      })
                                    }
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border transition-all",
                                      hasOwn
                                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                        : "bg-surface-hover border-border-subtle text-text-muted hover:bg-surface-hover"
                                    )}
                                  >
                                    <span>{emoji}</span>
                                    <span className="font-bold">{reactions.length}</span>
                                  </button>
                                )
                              })}`
                            </div>
                          )}

                          {/* Thread preview */}
                          {msg._count?.replies > 0 && isLastInGroup && (
                            <button
                              onClick={() => setShowThread(msg.id)}
                              className="flex items-center gap-2 mt-2 px-2 py-1 rounded-lg bg-cyan-500/5 border border-cyan-500/10 text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/10 transition-all uppercase tracking-widest"
                            >
                              <Reply className="h-2.5 w-2.5 -scale-x-100" />
                              {msg._count.replies} {msg._count.replies === 1 ? "REPLY" : "REPLIES"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
          })}
          <div ref={messagesEndRef} />
        </>
        )}
      </div>

      {/* Typing indicator */}
      <TypingIndicator users={typingUsers} />

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-cyan-500/[0.04] border-t border-cyan-500/10 text-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Reply className="h-4 w-4 text-cyan-400 flex-shrink-0" />
            <span className="text-text-muted flex-shrink-0">Replying to</span>
            <span className="font-medium text-cyan-300 flex-shrink-0">
              {replyTo.author?.name}
            </span>
            <span className="text-text-muted truncate">
              {truncate(replyTo.content, 50)}
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="p-1 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="h-3.5 w-3.5 text-text-muted" />
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="px-5 py-4 border-t border-border-subtle bg-surface/50">
        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 mb-2.5">
          {[
            { icon: Bold, format: "bold" as const, label: "Bold" },
            { icon: Italic, format: "italic" as const, label: "Italic" },
            { icon: Code, format: "code" as const, label: "Code" },
            { icon: Link2, format: "link" as const, label: "Link" },
          ].map(({ icon: Icon, format, label }) => (
            <button
              key={format}
              onClick={() => handleFormatText(format)}
              className="p-1.5 rounded-md hover:bg-surface-hover text-text-dim hover:text-text-secondary transition-colors"
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
          <div className="w-px h-4 bg-surface-hover mx-1" />
          <button
            onClick={() => {
              setMessage((prev) => prev + "@");
              setMentionQuery("");
              if (textareaRef.current) {
                const rect = textareaRef.current.getBoundingClientRect();
                setMentionPosition({
                  top: 0,
                  left: 0,
                });
                textareaRef.current.focus();
              }
            }}
            className="p-1.5 rounded-md hover:bg-surface-hover text-text-dim hover:text-text-secondary transition-colors"
            title="Mention someone"
          >
            <AtSign className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="flex items-end gap-2.5 relative">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              for (const file of files) {
                if (file.size > 10 * 1024 * 1024) {
                  toast.error(`${file.name} exceeds 10MB limit`);
                  continue;
                }
                try {
                  await sendMessage.mutateAsync({
                    content: `📎 Shared ${file.name}`,
                    type: file.type.startsWith("image/") ? "IMAGE" : "FILE",
                    fileUrl: URL.createObjectURL(file),
                    fileName: file.name,
                    fileSize: file.size,
                    fileMime: file.type,
                  });
                } catch {
                  toast.error(`Failed to upload ${file.name}`);
                }
              }
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl hover:bg-surface-hover text-text-muted transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          {isRecording ? (
            <button
              type="button"
              onClick={handleStopRecording}
              className="p-2.5 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors animate-pulse"
              title="Stop Recording"
            >
              <StopCircle className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              className="p-2.5 rounded-xl hover:bg-surface-hover text-text-muted transition-colors"
              title="Record Voice Message"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 relative">
            {/* Mention dropdown */}
            {mentionQuery !== null && (
              <MentionDropdown
                users={users}
                query={mentionQuery || null}
                position={mentionPosition}
                onSelect={handleMentionSelect}
                onClose={() => setMentionQuery(null)}
                channelMemberIds={channel?.members?.map((m: any) => m.userId || m.user?.id) || []}
              />
            )}

            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              placeholder={`Message ${
                isDM
                  ? otherUser?.name || "user"
                  : "#" + (channel?.name || "channel")
              }...`}
              rows={1}
              className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none resize-none transition-all shadow-inner leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!message.trim()}
            isLoading={sendMessage.isPending}
            className="h-[52px] w-[52px] rounded-2xl p-0 flex items-center justify-center shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>

      {/* Call overlay */}
      {showCall && (
        <CallOverlay
          isOpen={showCall}
          onClose={() => setShowCall(false)}
          callType={callType}
          participants={
            isDM && otherUser
              ? [
                  {
                    id: otherUser.id || "",
                    name: otherUser.name || "User",
                    image: otherUser.image,
                  },
                ]
              : (channel?.members || []).map((m: any) => ({
                  id: m.userId,
                  name: m.user?.name || "User",
                  image: m.user?.image,
                }))
          }
          channelName={channel?.name}
        />
      )}
    </div>
  );
}

// ─── Thread Panel ─────────────────────────────────────────────────────────────

function ThreadPanel({
  channelId,
  messageId,
  userId,
  onClose,
}: {
  channelId: string;
  messageId: string;
  userId: string;
  onClose: () => void;
}) {
  const { data: messagesData } = useChatMessages(channelId);
  const sendMessage = useSendChatMessage(channelId);
  const toggleReaction = useToggleReaction(channelId);
  const [reply, setReply] = useState("");

  const allMessages = messagesData?.messages || [];
  const parentMsg = allMessages.find((m: any) => m.id === messageId);
  const replies = parentMsg?.replies || [];

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    try {
      await sendMessage.mutateAsync({
        content: reply.trim(),
        parentId: messageId,
      });
      setReply("");
    } catch {
      toast.error("Failed to send reply");
    }
  }

  return (
    <div className="w-80 border-l border-border-subtle flex flex-col bg-surface flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
          <Reply className="h-4 w-4 text-cyan-400" />
          Thread
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/[0.06]">
        {parentMsg && (
          <div className="pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2 mb-2">
              <Avatar
                src={parentMsg.author?.image}
                name={parentMsg.author?.name}
                size="sm"
              />
              <div>
                <span className="text-sm font-semibold text-text-primary">
                  {parentMsg.author?.name}
                </span>
                <span className="text-[11px] text-text-dim ml-2">
                  {formatRelativeTime(parentMsg.createdAt)}
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-surface-hover border border-border-subtle px-3 py-2.5">
              <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                {parentMsg.content}
              </p>
            </div>
          </div>
        )}

        {replies.length === 0 ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-xl bg-surface-hover border border-border-subtle flex items-center justify-center mx-auto mb-3">
              <Reply className="h-6 w-6 text-text-dim" />
            </div>
            <p className="text-sm text-text-muted">No replies yet</p>
            <p className="text-xs text-text-dim mt-1">
              Start the conversation
            </p>
          </div>
        ) : (
          replies.map((msg: any) => (
            <div key={msg.id} className="flex gap-2.5">
              <Avatar
                src={msg.author?.image}
                name={msg.author?.name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-text-primary">
                    {msg.author?.name}
                  </span>
                  <span className="text-[10px] text-text-dim">
                    {formatRelativeTime(msg.createdAt)}
                  </span>
                </div>
                <div className="rounded-xl bg-surface-hover border border-border-subtle px-3 py-2">
                  <p className="text-[13px] text-text-primary whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
                {msg.reactions?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(
                      msg.reactions.reduce((acc: any, r: any) => {
                        if (!acc[r.emoji]) acc[r.emoji] = [];
                        acc[r.emoji].push(r);
                        return acc;
                      }, {})
                    ).map(([emoji, reactions]: [string, any]) => (
                      <button
                        key={emoji}
                        onClick={() =>
                          toggleReaction.mutate({ messageId: msg.id, emoji })
                        }
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border",
                          reactions.some((r: any) => r.userId === userId)
                            ? "bg-cyan-500/15 border-cyan-500/30"
                            : "bg-surface-hover border-border-subtle"
                        )}
                      >
                        <span>{emoji}</span>
                        <span>{reactions.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply input */}
      <div className="px-4 py-3 border-t border-border-subtle">
        <form onSubmit={handleSendReply} className="flex items-end gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply in thread..."
            rows={1}
            className="flex-1 px-3 py-2.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none resize-none transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendReply(e);
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!reply.trim()}
            loading={sendMessage.isPending}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20"
          >
            <Send className="h-3 w-3" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── New Channel Modal ────────────────────────────────────────────────────────

function NewChannelModal({
  onClose,
  users,
  userId,
}: {
  onClose: () => void;
  users: any[];
  userId: string;
}) {
  const createChannel = useCreateChatChannel();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("CUSTOM");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Channel name is required");
      return;
    }
    try {
      await createChannel.mutateAsync({
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: description || undefined,
        type,
        memberIds: selectedMembers,
      });
      toast.success("Channel created");
      onClose();
    } catch {
      toast.error("Failed to create channel");
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Create Channel" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Channel Name *
          </label>
          <div className="relative group">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. project-updates"
              className="w-full rounded-2xl border border-border-subtle px-5 py-3.5 text-sm bg-surface-hover text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this channel about?"
            className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm bg-surface-hover text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all"
          >
            <option value="CUSTOM">Custom Channel</option>
            <option value="WORK_ORDERS">Work Order Channel</option>
            <option value="DIRECT_MESSAGE">Direct Message</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Add Members
          </label>
          <div className="max-h-40 overflow-y-auto border border-border-subtle rounded-xl divide-y divide-border-subtle">
            {users
              .filter((u: any) => u.id !== userId)
              .map((user: any) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hover cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(user.id)}
                    onChange={() => toggleMember(user.id)}
                    className="h-4 w-4 rounded border-border-medium text-cyan-400"
                  />
                  <Avatar src={user.image} name={user.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-text-muted">{user.role}</p>
                  </div>
                </label>
              ))}
          </div>
          {selectedMembers.length > 0 && (
            <p className="text-xs text-text-muted mt-1.5">
              {selectedMembers.length} member
              {selectedMembers.length !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createChannel.isPending}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            <Hash className="h-4 w-4" />
            Create Channel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
