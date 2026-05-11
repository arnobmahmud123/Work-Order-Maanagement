"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useUnreadCounts } from "@/hooks/use-data";
import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  LifeBuoy,
  Users,
  Building2,
  BarChart3,
  Settings,
  Wrench,
  Shield,
  Bell,
  Sparkles,
  Search,
  FileText,
  Camera,
  Mail,
  GraduationCap,
  Truck,
  MapPin,
  Phone,
  CalendarClock,
  Hash,
  PanelLeftClose,
  PanelLeftOpen,
  FileSpreadsheet,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Rss,
  Briefcase,
  Star,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Work Orders", href: "/dashboard/work-orders", icon: ClipboardList },
  { label: "GPS Camera", href: "/dashboard/camera", icon: Camera },
  { label: "Assets", href: "/dashboard/assets", icon: Building2 },
  { label: "Chat", href: "/dashboard/chat", icon: Hash, badgeKey: "chat" as const },
  { label: "Email", href: "/dashboard/email", icon: Mail, badgeKey: "email" as const },
  { label: "Invoices", href: "/dashboard/invoices", icon: Receipt },
  { label: "Inspectors", href: "/dashboard/inspectors", icon: MapPin },
  { label: "Vendors", href: "/dashboard/vendors", icon: Wrench },
  { label: "Logistics", href: "/dashboard/logistics", icon: Truck },
  { label: "Training", href: "/dashboard/training", icon: GraduationCap },
  { label: "Performance", href: "/dashboard/performance", icon: BarChart3 },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Balance", href: "/dashboard/contractor/balance", icon: DollarSign },
  { label: "Disputes", href: "/dashboard/disputes", icon: AlertTriangle },
  { label: "Withdrawals", href: "/dashboard/withdrawals", icon: CreditCard },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badgeKey: "notifications" as const },
];

const networkItems = [
  { label: "Network Feed", href: "/dashboard/network", icon: Rss },
  { label: "Contractor Map", href: "/dashboard/network/map", icon: MapPin },
  { label: "Job Marketplace", href: "/dashboard/network/jobs", icon: Briefcase },
  { label: "Reputation", href: "/dashboard/network/reputation", icon: Star },
];

const aiItems = [
  { label: "AI Assistant", href: "/dashboard/ai/chat", icon: Sparkles },
  { label: "AI Calling", href: "/dashboard/ai/calling", icon: Phone },
  { label: "Contractor Finder", href: "/dashboard/ai/contractor-finder", icon: Search },
  { label: "Auto-Bid", href: "/dashboard/ai/auto-bid", icon: FileText },
  { label: "Image Search", href: "/dashboard/ai/image-search", icon: Camera },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { data: unreadCounts } = useUnreadCounts();
  const role = (session?.user as any)?.role;
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  const isAdmin = role === "ADMIN";
  const collapsed = sidebarCollapsed;

  const chatUnread = unreadCounts?.chat || 0;
  const emailUnread = unreadCounts?.email || 0;
  const notifUnread = unreadCounts?.notifications || 0;

  return (
    <aside
      className={cn(
        "flex flex-col bg-background border-r border-border-subtle h-screen sticky top-0 transition-all duration-300 z-50",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Logo Section */}
      <div className={cn(
        "h-16 flex items-center px-4 border-b border-border-subtle relative",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed ? (
          <>
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-bold text-text-primary tracking-tight">
                PropPreserve
              </span>
            </Link>
            <button 
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-cyan-400 transition-all group/toggle"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="h-4.5 w-4.5 group-hover/toggle:scale-110 transition-transform" />
            </button>
          </>
        ) : (
          <button 
            onClick={toggleSidebar}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 flex items-center justify-center text-cyan-400 hover:scale-110 transition-all shadow-lg shadow-cyan-500/5"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Content */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-none hover:scrollbar-thin scrollbar-thumb-white/[0.1] scrollbar-track-transparent">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const badgeCount = item.badgeKey === "chat" ? chatUnread : item.badgeKey === "email" ? emailUnread : item.badgeKey === "notifications" ? notifUnread : 0;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-xl transition-all duration-200 group relative",
                collapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3.5 py-2.5",
                isActive 
                  ? "bg-surface-hover text-text-primary shadow-sm border border-border-subtle" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-cyan-400" : "text-text-muted"
              )} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
              
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-500 rounded-r-full shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
              )}
              
              {badgeCount > 0 && (
                <div className={cn(
                  "flex items-center justify-center bg-rose-500 text-white font-bold rounded-full border-2 border-background",
                  collapsed ? "absolute -top-1 -right-1 h-4 w-4 text-[9px]" : "ml-auto h-5 min-w-[20px] px-1 text-[10px]"
                )}>
                  {badgeCount > 99 ? "99+" : badgeCount}
                </div>
              )}
            </Link>
          );
        })}

        {/* Network Section Heading */}
        <div className="pt-6 pb-2">
          {!collapsed && <p className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Contractor Network</p>}
          {collapsed && <div className="h-px bg-border-subtle mx-4" />}
        </div>

        {networkItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard/network" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-xl transition-all duration-200 group relative",
                collapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3.5 py-2.5",
                isActive
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive ? "text-emerald-500" : "text-text-muted group-hover:text-emerald-500"
              )} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}

        {/* AI Section Heading */}
        <div className="pt-6 pb-2">
          {!collapsed && <p className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">AI Intelligence</p>}
          {collapsed && <div className="h-px bg-border-subtle mx-4" />}
        </div>

        {aiItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-xl transition-all duration-200 group relative",
                collapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3.5 py-2.5",
                isActive 
                  ? "bg-purple-500/10 text-purple-500 border border-purple-500/20" 
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive ? "text-purple-500" : "text-text-muted group-hover:text-purple-500"
              )} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 mt-auto border-t border-border-subtle">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center rounded-xl transition-all duration-200 group",
            collapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3.5 py-2.5",
            pathname === "/dashboard/settings" ? "bg-surface-hover text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
          )}
        >
          <Settings className="h-5 w-5 transition-transform group-hover:rotate-45" />
          {!collapsed && <span className="font-medium">Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
