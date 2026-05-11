"use client";

import { useState, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  X,
  Hash,
  Lock,
  Globe,
  Users,
  Pin,
  FileText,
  Bell,
  BellOff,
  Settings,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  FileDown,
  Phone,
  UserPlus,
  UserMinus,
  Ban,
  LogOut,
  Check,
  XCircle,
  Camera,
  MoreHorizontal,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";

interface ChannelInfoPanelProps {
  channel: any;
  userId: string;
  onClose: () => void;
  pinnedMessages?: any[];
  onUnpin?: (messageId: string) => void;
  onChannelUpdate?: () => void;
}

export function ChannelInfoPanel({
  channel,
  userId,
  onClose,
  pinnedMessages = [],
  onUnpin,
  onChannelUpdate,
}: ChannelInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "members" | "pins" | "files"
  >("members");
  const [muted, setMuted] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [memberMenuOpen, setMemberMenuOpen] = useState<string | null>(null);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const Icon =
    channel?.type === "DIRECT_MESSAGE"
      ? Lock
      : channel?.type === "WORK_ORDERS"
      ? FileText
      : Hash;

  const members = channel?.members || [];
  const isOwner = channel?.createdById === userId;
  const myMember = members.find((m: any) => m.userId === userId);
  const isAdmin = (channel as any)?.admins?.some((a: any) => a.userId === userId);

  // ─── Search users to invite ──────────────────────────────────────────
  async function handleInviteSearch(q: string) {
    setInviteQuery(q);
    if (q.length < 2) {
      setInviteResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      const memberIds = members.map((m: any) => m.userId);
      setInviteResults(
        (data.users || []).filter((u: any) => !memberIds.includes(u.id))
      );
    } catch {
      setInviteResults([]);
    }
  }

  // ─── Invite user ─────────────────────────────────────────────────────
  async function handleInvite(user: any) {
    try {
      const res = await fetch(`/api/chat/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", userId: user.id }),
      });
      if (!res.ok) throw new Error("Failed to invite");
      toast.success(`Invited ${user.name}`);
      setShowInvite(false);
      setInviteQuery("");
      setInviteResults([]);
      onChannelUpdate?.();
    } catch {
      toast.error("Failed to invite user");
    }
  }

  // ─── Remove user from channel ────────────────────────────────────────
  async function handleRemoveUser(memberUserId: string) {
    try {
      const res = await fetch(`/api/chat/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", userId: memberUserId }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      toast.success("User removed from channel");
      setMemberMenuOpen(null);
      onChannelUpdate?.();
    } catch {
      toast.error("Failed to remove user");
    }
  }

  // ─── Block user ──────────────────────────────────────────────────────
  async function handleBlockUser(memberUserId: string) {
    try {
      const res = await fetch(`/api/chat/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "block", userId: memberUserId }),
      });
      if (!res.ok) throw new Error("Failed to block");
      toast.success("User blocked");
      setMemberMenuOpen(null);
      onChannelUpdate?.();
    } catch {
      toast.error("Failed to block user");
    }
  }

  // ─── Leave channel ───────────────────────────────────────────────────
  async function handleLeave() {
    if (!confirm("Are you sure you want to leave this channel?")) return;
    try {
      const res = await fetch(`/api/chat/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      if (!res.ok) throw new Error("Failed to leave");
      toast.success("Left channel");
      onClose();
    } catch {
      toast.error("Failed to leave channel");
    }
  }

  // ─── Accept invitation ───────────────────────────────────────────────
  async function handleAcceptInvite() {
    try {
      const res = await fetch(`/api/chat/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (!res.ok) throw new Error("Failed to accept");
      toast.success("Joined channel");
      onChannelUpdate?.();
    } catch {
      toast.error("Failed to join channel");
    }
  }

  // ─── Upload channel photo ────────────────────────────────────────────
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo must be under 2MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      const res = await fetch(`/api/chat/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updatePhoto", imageUrl: url }),
      });
      if (!res.ok) throw new Error("Failed to update photo");
      toast.success("Channel photo updated");
      onChannelUpdate?.();
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast.error(`Failed to upload photo: ${err.message || "Unknown error"}`);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  return (
    <div className="w-80 border-l border-border-subtle flex flex-col bg-surface-hover flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <Icon className="h-4 w-4 text-text-muted" />
          Channel Details
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Channel info with profile pic */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <div className="flex items-start gap-3">
          {/* Channel photo */}
          <div className="relative flex-shrink-0">
            <div className="h-14 w-14 rounded-xl overflow-hidden bg-surface-hover border border-border-subtle">
              {(channel as any)?.imageUrl || (channel as any)?.image || (channel as any)?.metadata?.image ? (
                <img
                  src={(channel as any).imageUrl || (channel as any).image || (channel as any).metadata?.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Icon className="h-6 w-6 text-text-dim" />
                </div>
              )}
            </div>
            <button
              onClick={() => photoInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1 rounded-full bg-cyan-500 text-white hover:bg-cyan-400 transition-colors shadow-lg"
              title="Change photo"
            >
              <Camera className="h-3 w-3" />
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-text-primary">
              {channel?.name}
            </h4>
            {channel?.description && (
              <p className="text-xs text-text-secondary mt-1">
                {channel.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setMuted(!muted)}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
              >
                {muted ? (
                  <BellOff className="h-3.5 w-3.5" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                {muted ? "Unmute" : "Mute"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2 border-b border-border-subtle flex gap-2">
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite
        </button>
        <button
          onClick={handleLeave}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Leave
        </button>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <div className="px-4 py-3 border-b border-border-subtle bg-surface-hover">
          <div className="relative">
            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={inviteQuery}
              onChange={(e) => handleInviteSearch(e.target.value)}
              placeholder="Search users to invite..."
              autoFocus
              className="w-full pl-9 pr-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
          {inviteResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {inviteResults.map((user: any) => (
                <button
                  key={user.id}
                  onClick={() => handleInvite(user)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg hover:bg-surface-hover text-left transition-colors"
                >
                  <Avatar src={user.image} name={user.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-text-muted">{user.role}</p>
                  </div>
                  <UserPlus className="h-3.5 w-3.5 text-text-muted" />
                </button>
              ))}
            </div>
          )}
          {inviteQuery.length >= 2 && inviteResults.length === 0 && (
            <p className="text-xs text-text-muted mt-2 text-center py-2">
              No users found
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        {(["members", "pins", "files"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors",
              activeTab === tab
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-text-muted hover:text-text-secondary"
            )}
          >
            {tab === "members" && `Members (${members.length})`}
            {tab === "pins" && `Pins (${pinnedMessages.length})`}
            {tab === "files" && "Files"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "members" && (
          <div className="py-2">
            {members.map((member: any) => {
              const isMe = member.userId === userId;
              const isMemberAdmin = (channel as any)?.admins?.some(
                (a: any) => a.userId === member.userId
              );

              return (
                <div
                  key={member.id || member.userId}
                  className="relative group"
                >
                  <div className="flex items-center gap-3 px-4 py-2 hover:bg-surface-hover">
                    <Avatar
                      src={member.user?.image}
                      name={member.user?.name}
                      size="sm"
                      status={
                        member.user?.isActive !== false
                          ? "online"
                          : "offline"
                      }
                      showStatus
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {member.user?.name}
                        </p>
                        {isMe && (
                          <span className="text-[10px] text-text-muted">
                            (you)
                          </span>
                        )}
                        {isMemberAdmin && (
                          <Shield className="h-3 w-3 text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {member.user?.role || "Member"}
                      </p>
                    </div>

                    {/* Actions menu (for non-self members) */}
                    {!isMe && (
                      <button
                        onClick={() =>
                          setMemberMenuOpen(
                            memberMenuOpen === member.userId
                              ? null
                              : member.userId
                          )
                        }
                        className="p-1 rounded-lg hover:bg-surface-hover text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Member action dropdown */}
                  {memberMenuOpen === member.userId && (
                    <div className="px-4 pb-2">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleRemoveUser(member.userId)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] font-medium hover:bg-amber-500/20 transition-colors"
                        >
                          <UserMinus className="h-3 w-3" />
                          Remove
                        </button>
                        <button
                          onClick={() => handleBlockUser(member.userId)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-medium hover:bg-red-500/20 transition-colors"
                        >
                          <Ban className="h-3 w-3" />
                          Block
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {members.length === 0 && (
              <p className="text-center text-sm text-text-muted py-6">
                No members
              </p>
            )}
          </div>
        )}

        {activeTab === "pins" && (
          <div className="py-2">
            {pinnedMessages.length > 0 ? (
              pinnedMessages.map((msg: any) => (
                <div
                  key={msg.id}
                  className="px-4 py-2 hover:bg-surface-hover border-b border-border-subtle last:border-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar
                      src={msg.author?.image}
                      name={msg.author?.name}
                      size="xs"
                    />
                    <span className="text-xs font-medium text-text-primary">
                      {msg.author?.name}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {msg.content}
                  </p>
                  {onUnpin && (
                    <button
                      onClick={() => onUnpin(msg.id)}
                      className="text-xs text-red-400 hover:text-red-300 mt-1"
                    >
                      Unpin
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Pin className="h-8 w-8 text-text-dim mx-auto mb-2" />
                <p className="text-sm text-text-muted">No pinned messages</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "files" && (
          <div className="py-2">
            <div className="text-center py-6">
              <FileText className="h-8 w-8 text-text-dim mx-auto mb-2" />
              <p className="text-sm text-text-muted">No shared files</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
