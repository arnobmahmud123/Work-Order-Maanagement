"use client";

import { useSession, signOut } from "next-auth/react";
import { useNotifications } from "@/hooks/use-data";
import { Avatar } from "@/components/ui/avatar";
import { Bell, Menu, LogOut, ChevronDown, MessageSquare, ClipboardList, Settings, User, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { formatRelativeTime, cn } from "@/lib/utils";
import { useTheme } from "next-themes";


export function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();
  const { data: notifData } = useNotifications();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifData?.unreadCount || 0;
  const recentNotifs = notifData?.notifications?.slice(0, 5) || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function getNotifIcon(type: string) {
    switch (type) {
      case "MESSAGE": return <MessageSquare className="h-3.5 w-3.5" />;
      case "WORK_ORDER":
      case "DUE":
      case "OVERDUE":
      case "CANCELLED": return <ClipboardList className="h-3.5 w-3.5" />;
      case "MENTION":
      case "COMMENT": return <MessageSquare className="h-3.5 w-3.5" />;
      case "JOB_ASSIGNMENT":
      case "JOB_OFFER":
      case "JOB_OFFER_ACCEPTED": return <ClipboardList className="h-3.5 w-3.5" />;
      default: return <Bell className="h-3.5 w-3.5" />;
    }
  }

  function getNotifColor(type: string) {
    switch (type) {
      case "MESSAGE": return "text-cyan-400 bg-cyan-500/10";
      case "WORK_ORDER": return "text-purple-400 bg-purple-500/10";
      case "MENTION": return "text-cyan-400 bg-cyan-500/10";
      case "COMMENT": return "text-blue-400 bg-blue-500/10";
      case "JOB_ASSIGNMENT": return "text-emerald-400 bg-emerald-500/10";
      case "JOB_OFFER": return "text-purple-400 bg-purple-500/10";
      case "JOB_OFFER_ACCEPTED": return "text-green-400 bg-green-500/10";
      case "OVERDUE":
      case "CANCELLED": return "text-red-400 bg-red-500/10";
      case "DUE": return "text-amber-400 bg-amber-500/10";
      default: return "text-text-secondary bg-surface-hover";
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border-subtle">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-surface-hover transition-colors"
        >
          <Menu className="h-5 w-5 text-text-muted" />
        </button>

        <div className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-text-muted uppercase tracking-[0.15em]">
          <span>Dashboard</span>
          <span className="mx-2 opacity-20">/</span>
          <span className="text-text-secondary">Overview</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 rounded-xl hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors relative group"
              title="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 transition-transform group-hover:rotate-45" />
              ) : (
                <Moon className="h-5 w-5 transition-transform group-hover:-rotate-12" />
              )}
            </button>
          )}

          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className={cn(
                "p-2.5 rounded-xl transition-all relative",
                notifOpen ? "bg-surface-hover text-text-primary shadow-inner" : "hover:bg-surface-hover text-text-secondary"
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex items-center justify-center h-4 min-w-[16px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full border-2 border-background">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-surface rounded-2xl shadow-2xl border border-border-medium z-50 overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-background/50">
                  <h3 className="text-sm font-bold text-text-primary tracking-tight">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-500 text-[10px] font-bold rounded-lg border border-cyan-500/20">
                      {unreadCount} NEW
                    </span>
                  )}
                </div>

                <div className="divide-y divide-border-subtle max-h-[400px] overflow-y-auto">
                  {recentNotifs.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="h-12 w-12 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="h-6 w-6 text-text-muted" />
                      </div>
                      <p className="text-sm text-text-muted">You're all caught up!</p>
                    </div>
                  ) : (
                    recentNotifs.map((n: any) => (
                      <Link
                        key={n.id}
                        href={n.workOrderId ? `/dashboard/work-orders/${n.workOrderId}` : "/dashboard/notifications"}
                        onClick={() => setNotifOpen(false)}
                        className={cn(
                          "flex items-start gap-4 p-4 transition-all hover:bg-surface-hover",
                          !n.isRead && "bg-cyan-500/5"
                        )}
                      >
                        <div className={cn("flex-shrink-0 p-2 rounded-xl border border-border-subtle", getNotifColor(n.type))}>
                          {getNotifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-text-primary truncate">{n.title}</p>
                            {!n.isRead && <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />}
                          </div>
                          <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-text-muted mt-1.5 font-medium">{formatRelativeTime(n.createdAt)}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>

                <div className="p-3 bg-background/50 border-t border-border-subtle">
                  <Link
                    href="/dashboard/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="flex items-center justify-center w-full px-4 py-2.5 text-[11px] font-bold text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover rounded-xl transition-all border border-border-subtle"
                  >
                    VIEW ALL ACTIVITY
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={cn(
                "flex items-center gap-3 p-1.5 pr-3 rounded-xl transition-all",
                dropdownOpen ? "bg-surface-hover shadow-inner" : "hover:bg-surface-hover"
              )}
            >
              <div className="relative">
                <Avatar src={session?.user?.image} name={session?.user?.name} size="sm" />
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-text-primary tracking-tight leading-none mb-1">
                  {session?.user?.name}
                </p>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-none">
                  {(session?.user as any)?.role}
                </p>
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 text-text-muted transition-transform duration-200", dropdownOpen && "rotate-180")} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-surface rounded-2xl shadow-2xl border border-border-medium py-2 z-50 animate-scale-in">
                <div className="px-5 py-4 border-b border-border-subtle bg-background/50">
                  <p className="text-sm font-bold text-text-primary">{session?.user?.name}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{session?.user?.email}</p>
                </div>
                
                <div className="p-1.5">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl transition-all"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-xl transition-all"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Preferences
                  </Link>
                </div>

                <div className="p-1.5 border-t border-border-subtle">
                  <button
                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
