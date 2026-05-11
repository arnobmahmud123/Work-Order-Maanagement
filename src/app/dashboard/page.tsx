"use client";

import { useSession } from "next-auth/react";
import {
  useDashboardStats,
  useDashboardMetrics,
  useInvoices,
  useNotifications,
  useChatChannels,
  useWorkOrders,
  useLiveStats,
} from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, CardDescription, Badge, Avatar, Button } from "@/components/ui";
import {
  DonutChart,
  BarChart,
  Sparkline,
  ProgressRing,
  HorizontalBar,
  StatCard,
} from "@/components/ui/charts";
import {
  ClipboardList,
  CheckCircle2,
  Receipt,
  LifeBuoy,
  Clock,
  AlertTriangle,
  Users,
  DollarSign,
  Camera,
  MapPin,
  MessageSquare,
  Activity,
  Zap,
  ArrowUpRight,
  TrendingUp,
  Bell,
} from "lucide-react";
import Link from "next/link";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  cn,
  formatRelativeTime,
  formatCurrency,
  SERVICE_TYPE_LABELS,
} from "@/lib/utils";

const sparkOrders = [12, 18, 14, 22, 19, 25, 28, 24, 30, 27, 32, 35];
const sparkRevenue = [4200, 5100, 4800, 6200, 5900, 7100, 6800, 7500, 8200, 7800, 8500, 9200];
const sparkCompletion = [85, 88, 82, 90, 87, 92, 89, 94, 91, 95, 93, 96];
const sparkTickets = [3, 5, 2, 4, 6, 3, 2, 4, 1, 3, 2, 1];

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: invoicesData } = useInvoices();
  const { data: notifData } = useNotifications();
  const { data: channelsData } = useChatChannels();
  const { data: recentOrdersData } = useWorkOrders({});
  const { data: liveStats } = useLiveStats();

  const userName = session?.user?.name?.split(" ")[0] || "there";

  const statusData = stats?.statusBreakdown
    ? Object.entries(stats.statusBreakdown)
        .filter(([, v]) => (v as number) > 0)
        .map(([status, count]) => ({
          label: STATUS_LABELS[status] || status,
          value: count as number,
          color: getStatusColor(status),
        }))
    : [];

  const serviceData = stats?.serviceBreakdown
    ? Object.entries(stats.serviceBreakdown)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 6)
        .map(([type, count]) => ({
          label: SERVICE_TYPE_LABELS[type] || type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
          value: count as number,
        }))
    : [];

  const invoices = invoicesData?.invoices || [];
  const totalRevenue = invoices.filter((i: any) => i.status === "PAID").reduce((s: number, i: any) => s + (i.total || 0), 0);
  const pendingRevenue = invoices.filter((i: any) => i.status === "SENT" || i.status === "OVERDUE").reduce((s: number, i: any) => s + (i.total || 0), 0);

  const completionRate = stats?.totalWorkOrders > 0 ? Math.round(((stats.completedThisMonth || 0) / stats.totalWorkOrders) * 100) : 0;
  const recentNotifs = notifData?.notifications?.slice(0, 4) || [];
  const channels = channelsData?.channels || [];
  const recentChannels = channels.filter((c: any) => c.lastMessage).sort((a: any, b: any) => new Date(b.lastMessage?.createdAt).getTime() - new Date(a.lastMessage?.createdAt).getTime()).slice(0, 4);
  const recentOrders = recentOrdersData?.workOrders?.slice(0, 4) || [];
  const activityItems = recentNotifs.length > 0 ? recentNotifs : recentOrders.map((wo: any) => ({
    id: wo.id,
    type: "WORK_ORDER",
    title: wo.title,
    message: `${wo.address} — ${STATUS_LABELS[wo.status] || wo.status}`,
    createdAt: wo.updatedAt || wo.createdAt,
    isRead: true,
    workOrderId: wo.id,
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Welcome Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            {greeting}, <span className="text-cyan-400">{userName}</span>
          </h1>
          <p className="text-text-secondary mt-1 text-sm font-medium">
            PropPreserve is monitoring your property portfolio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">System Status</span>
            <span className="text-xs font-bold text-emerald-400">All systems operational</span>
          </div>
          <Button variant="primary" size="sm" className="shadow-cyan-500/10">
            <TrendingUp className="h-4 w-4 mr-2" />
            Performance Report
          </Button>
        </div>
      </div>

      {/* ── Key Metrics Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Work Orders"
          value={isLoading ? "..." : String(stats?.totalWorkOrders || 0)}
          change={12}
          icon={ClipboardList}
          color="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          sparkData={sparkOrders}
        />
        <StatCard
          label="Active Jobs"
          value={isLoading ? "..." : String(stats?.activeWorkOrders || 0)}
          change={5}
          icon={Zap}
          color="bg-purple-500/10 text-purple-400 border-purple-500/20"
          sparkData={sparkCompletion}
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(totalRevenue)}
          change={18}
          icon={DollarSign}
          color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          sparkData={sparkRevenue}
        />
        <StatCard
          label="Open Tickets"
          value={isLoading ? "..." : String(stats?.openTickets || 0)}
          change={-15}
          icon={LifeBuoy}
          color="bg-rose-500/10 text-rose-400 border-rose-500/20"
          sparkData={sparkTickets}
        />
      </div>

      {/* ── Analytics & Performance Row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <Card variant="glass" className="flex flex-col h-full">
          <CardHeader>
            <div>
              <CardTitle>Pipeline Status</CardTitle>
              <CardDescription>Live breakdown of all active jobs</CardDescription>
            </div>
          </CardHeader>
          <div className="flex-1 flex flex-col justify-center py-4">
            {statusData.length > 0 ? (
              <DonutChart data={statusData} size={160} thickness={20} />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-30">
                <Activity className="h-10 w-10 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No Active Data</p>
              </div>
            )}
          </div>
        </Card>

        {/* Service Popularity */}
        <Card variant="glass" className="lg:col-span-1">
          <CardHeader>
            <div>
              <CardTitle>Service Demand</CardTitle>
              <CardDescription>Most requested task categories</CardDescription>
            </div>
          </CardHeader>
          <div className="py-2">
            {serviceData.length > 0 ? (
              <BarChart data={serviceData} height={200} />
            ) : (
              <div className="h-40 flex items-center justify-center opacity-30 italic text-xs">Awaiting data...</div>
            )}
          </div>
        </Card>

        {/* Operational Efficiency */}
        <Card variant="glass">
          <CardHeader>
            <div>
              <CardTitle>Efficiency Index</CardTitle>
              <CardDescription>Key performance benchmarks</CardDescription>
            </div>
            <Badge variant="emerald" size="sm">{completionRate}%</Badge>
          </CardHeader>
          <div className="space-y-6 pt-2">
            <div className="flex justify-center py-2">
               <ProgressRing value={completionRate} size={110} thickness={10} color="#06b6d4">
                <div className="text-center">
                  <span className="text-2xl font-bold text-text-primary">{completionRate}%</span>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Completion</p>
                </div>
              </ProgressRing>
            </div>
            <div className="space-y-4">
              <HorizontalBar label="On-time Delivery" value={stats?.onTimeCount || 0} maxValue={stats?.totalWorkOrders || 1} color="from-cyan-500 to-blue-600" />
              <HorizontalBar label="Client Satisfaction" value={94} maxValue={100} color="from-purple-500 to-pink-500" suffix="%" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Order Pipeline Grid ───────────────────────────────────────────── */}
      {stats?.statusBreakdown && (
        <Card variant="glass" className="overflow-hidden">
          <CardHeader>
            <div>
              <CardTitle>Order Pipeline</CardTitle>
              <CardDescription>Numeric breakdown of current inventory status</CardDescription>
            </div>
            <Link href="/dashboard/work-orders">
              <Button variant="ghost" size="xs" className="text-cyan-400 font-bold">MANAGE INVENTORY →</Button>
            </Link>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-3">
            {Object.entries(stats.statusBreakdown)
              .filter(([, v]) => (v as number) > 0)
              .map(([status, count]) => (
                <Link
                  key={status}
                  href={`/dashboard/work-orders?status=${status}`}
                  className="p-4 rounded-2xl bg-surface-hover border border-border-subtle hover:border-cyan-500/30 hover:bg-cyan-500/[0.05] transition-all text-center group flex flex-col items-center justify-center relative overflow-hidden"
                >
                  <div className={cn("absolute top-0 inset-x-0 h-0.5 opacity-20", STATUS_COLORS[status] || "bg-cyan-500")} />
                  <p className="text-2xl font-black text-text-primary group-hover:text-cyan-400 transition-colors tabular-nums">
                    {count as number}
                  </p>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mt-1 group-hover:text-text-secondary leading-tight">
                    {STATUS_LABELS[status] || status}
                  </p>
                </Link>
              ))}
          </div>
        </Card>
      )}

      {/* ── Communications & Activity Row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Recent Activity Feed */}
        <Card variant="glass" className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Real-time Activity</CardTitle>
              <CardDescription>Latest updates across your portfolio</CardDescription>
            </div>
            <Button variant="ghost" size="xs" className="text-cyan-400">View All</Button>
          </CardHeader>
          <div className="space-y-1 mt-2">
            {activityItems.map((n: any) => (
              <Link
                key={n.id}
                href={n.workOrderId ? `/dashboard/work-orders/${n.workOrderId}` : "/dashboard/notifications"}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-hover transition-all group"
              >
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border border-border-subtle shadow-sm", getNotifColor(n.type))}>
                  {getNotifIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary group-hover:text-cyan-400 transition-colors truncate">{n.title}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{n.message}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-bold text-text-dim uppercase">{formatRelativeTime(n.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Unread Conversations */}
        <Card variant="glass" className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Active Chats</CardTitle>
              <CardDescription>Direct messages and group channels</CardDescription>
            </div>
            <Link href="/dashboard/chat">
              <Button variant="secondary" size="xs">Open Inbox</Button>
            </Link>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {recentChannels.map((ch: any) => (
              <Link
                key={ch.id}
                href="/dashboard/chat"
                className="flex items-center gap-4 p-4 rounded-2xl bg-surface-hover border border-border-subtle hover:bg-surface-hover hover:border-border-medium transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="h-4 w-4 text-text-dim" />
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-surface to-background border border-border-subtle flex items-center justify-center flex-shrink-0 relative">
                  <MessageSquare className="h-5 w-5 text-text-secondary" />
                  {ch.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-cyan-500 border-2 border-border-subtle flex items-center justify-center text-[9px] font-black text-white shadow-lg">
                      {ch.unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate tracking-tight">{ch.name}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5 font-medium">
                    {ch.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Portfolio Snapshot Grid ───────────────────────────────────────── */}
      <Card variant="surface" className="border-cyan-500/5 bg-gradient-to-br from-surface to-background">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-[0.2em] flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-500" />
            Live Network Pulse
          </h3>
          <Badge variant="cyan" size="sm" className="animate-pulse">Active Now</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 divide-x divide-border-subtle">
          {[
            { label: "Active Users", value: liveStats?.activeUsers ?? "—", icon: Users, color: "text-cyan-400" },
            { label: "GPS Pings", value: liveStats?.onlineNow ?? "—", icon: Activity, color: "text-emerald-400" },
            { label: "Photos Logged", value: liveStats?.photosToday ?? "—", icon: Camera, color: "text-purple-400" },
            { label: "Live Chats", value: liveStats?.messagesSent ?? "—", icon: MessageSquare, color: "text-blue-400" },
            { label: "Tasks Done", value: liveStats?.tasksDone ?? "—", icon: CheckCircle2, color: "text-teal-400" },
            { label: "Bids Submitted", value: liveStats?.bidsSubmitted ?? "—", icon: DollarSign, color: "text-amber-400" },
            { label: "Inspections", value: liveStats?.inspections ?? "—", icon: MapPin, color: "text-rose-400" },
            { label: "Avg Response", value: liveStats?.avgResponseTime ?? "—", icon: Clock, color: "text-orange-400" },
          ].map((stat) => (
            <div key={stat.label} className="p-6 flex flex-col items-center text-center group hover:bg-surface-hover transition-colors">
              <stat.icon className={cn("h-5 w-5 mb-3 group-hover:scale-110 transition-transform", stat.color)} />
              <p className="text-2xl font-bold text-text-primary tabular-nums">{stat.value}</p>
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mt-1.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NEW: "#3b82f6", PENDING: "#eab308", ASSIGNED: "#a855f7", IN_PROGRESS: "#06b6d4",
    FIELD_COMPLETE: "#14b8a6", QC_REVIEW: "#f97316", PENDING_REVIEW: "#f59e0b",
    REVISIONS_NEEDED: "#ef4444", OFFICE_COMPLETE: "#10b981", CLOSED: "#8b5cf6", CANCELLED: "#f43f5e",
  };
  return colors[status] || "#3b82f6";
}

function getNotifIcon(type: string) {
  switch (type) {
    case "MESSAGE": return <MessageSquare className="h-4 w-4" />;
    case "WORK_ORDER":
    case "DUE":
    case "OVERDUE":
    case "CANCELLED": return <ClipboardList className="h-4 w-4" />;
    default: return <Bell className="h-4 w-4" />;
  }
}

function getNotifColor(type: string) {
  switch (type) {
    case "MESSAGE": return "text-cyan-400 bg-cyan-500/10";
    case "WORK_ORDER": return "text-purple-400 bg-purple-500/10";
    case "OVERDUE":
    case "CANCELLED": return "text-rose-400 bg-rose-500/10";
    case "DUE": return "text-amber-400 bg-amber-500/10";
    default: return "text-text-secondary bg-surface-hover";
  }
}
