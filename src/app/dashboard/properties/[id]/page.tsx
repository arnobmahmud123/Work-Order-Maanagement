"use client";

import { use, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, Button } from "@/components/ui";
import toast from "react-hot-toast";
import {
  DonutChart,
  BarChart,
  ProgressRing,
} from "@/components/ui/charts";
import {
  Building2,
  MapPin,
  Calendar,
  Lock,
  Key,
  Shield,
  Camera,
  DollarSign,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  MessageSquare,
  History,
  User,
  Receipt,
  Eye,
  ChevronRight,
  Activity,
  Navigation,
  StickyNote,
  Upload,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  cn,
  formatDate,
  formatCurrency,
  formatRelativeTime,
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
} from "@/lib/utils";

// ─── Fetcher ─────────────────────────────────────────────────────────────────

function useProperty(id: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${id}`);
      if (!res.ok) throw new Error("Failed to fetch property");
      return res.json();
    },
    enabled: !!id,
  });
}

// ─── Status pill colors ──────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  NEW: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PENDING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  ASSIGNED: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  IN_PROGRESS: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  FIELD_COMPLETE: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  QC_REVIEW: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  PENDING_REVIEW: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  REVISIONS_NEEDED: "bg-red-500/15 text-red-400 border-red-500/30",
  OFFICE_COMPLETE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-gray-500/15 text-text-secondary border-gray-500/30",
  CANCELLED: "bg-gray-500/15 text-text-muted border-gray-500/30",
};

// ─── Timeline icon/color ─────────────────────────────────────────────────────

function getTimelineIcon(type: string) {
  if (type.includes("WORK_ORDER")) return { icon: ClipboardList, color: "text-cyan-400 bg-cyan-500/10" };
  if (type.includes("INVOICE")) return { icon: Receipt, color: "text-amber-400 bg-amber-500/10" };
  if (type.includes("STATUS")) return { icon: Activity, color: "text-violet-400 bg-violet-500/10" };
  if (type.includes("ASSIGN")) return { icon: User, color: "text-purple-400 bg-purple-500/10" };
  if (type.includes("MESSAGE") || type.includes("COMMENT")) return { icon: MessageSquare, color: "text-blue-400 bg-blue-500/10" };
  if (type.includes("FILE") || type.includes("PHOTO")) return { icon: Camera, color: "text-emerald-400 bg-emerald-500/10" };
  if (type.includes("INSPECT")) return { icon: Shield, color: "text-teal-400 bg-teal-500/10" };
  return { icon: History, color: "text-text-secondary bg-surface-hover" };
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, refetch } = useProperty(id);
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [uploadingFrontPhoto, setUploadingFrontPhoto] = useState(false);
  const frontPhotoInputRef = useRef<HTMLInputElement>(null);

  async function handlePropertyFrontUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFrontPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "FRONT");

      const res = await fetch(`/api/properties/${id}/front-photo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      await refetch();
      toast.success("Property front photo uploaded");
    } catch {
      toast.error("Failed to upload property front photo");
    } finally {
      setUploadingFrontPhoto(false);
      if (frontPhotoInputRef.current) frontPhotoInputRef.current.value = "";
    }
  }

  async function handleDeletePropertyFrontPhoto(photoId: string) {
    try {
      const res = await fetch(`/api/properties/${id}/front-photo?photoId=${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await refetch();
      toast.success("Property front photo removed");
    } catch {
      toast.error("Failed to remove property front photo");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-6 w-6 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-text-muted">Property not found</div>
    );
  }

  const { property, stats, serviceBreakdown, statusBreakdown, accessDetails,
    recentCompleted, overdueOrders, pendingReviewOrders, workOrders,
    invoices, timeline, files, propertyPhotos = [] } = data;
  const frontPropertyPhoto =
    propertyPhotos.find((photo: any) => photo.category === "FRONT") ||
    propertyPhotos[0];

  const fullAddress = [property.address, property.city, property.state, property.zipCode]
    .filter(Boolean)
    .join(", ");

  const compliancePhotos = stats.beforePhotos + stats.duringPhotos + stats.afterPhotos;
  const compliancePct = compliancePhotos > 0
    ? Math.round(((stats.beforePhotos > 0 ? 1 : 0) + (stats.duringPhotos > 0 ? 1 : 0) + (stats.afterPhotos > 0 ? 1 : 0)) / 3 * 100)
    : 0;

  const tabs: { id: string; label: string; icon: any; count?: number }[] = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "work-orders", label: "Work Orders", icon: ClipboardList, count: stats.totalOrders },
    { id: "photos", label: "Photos", icon: Camera, count: stats.totalPhotos },
    { id: "inspections", label: "Inspections", icon: Shield },
    { id: "finance", label: "Finance", icon: DollarSign },
    { id: "timeline", label: "Timeline", icon: History },
    { id: "access", label: "Access", icon: Lock },
    { id: "notes", label: "Notes", icon: StickyNote },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-5">
        {/* Property photo */}
        <div className="relative">
          <div className="h-28 w-40 rounded-xl overflow-hidden bg-surface-hover border border-border-subtle flex-shrink-0">
            {frontPropertyPhoto ? (
              <img src={frontPropertyPhoto.path} alt="Property front" className="h-full w-full object-cover" />
            ) : property.imageUrl ? (
              <img src={property.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : files.find((f: any) => f.mimeType?.startsWith("image/")) ? (
              <img
                src={files.find((f: any) => f.mimeType?.startsWith("image/"))?.path}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Building2 className="h-10 w-10 text-text-dim" />
              </div>
            )}
          </div>
          <input
            ref={frontPhotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePropertyFrontUpload}
          />
          <button
            type="button"
            onClick={() => frontPhotoInputRef.current?.click()}
            disabled={uploadingFrontPhoto}
            className="absolute -bottom-2 left-2 right-2 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-sky-500/90 text-white text-[11px] font-medium shadow-lg hover:bg-sky-500 disabled:opacity-60"
          >
            {uploadingFrontPhoto ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            Front Photo
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-text-primary">{property.address}</h1>
          <p className="text-text-muted mt-0.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {fullAddress}
          </p>
          {property.latitude && property.longitude && (
            <p className="text-[11px] text-text-dim mt-1 flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              {property.latitude.toFixed(6)}, {property.longitude.toFixed(6)}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {overdueOrders.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                <AlertTriangle className="h-3 w-3" />
                {overdueOrders.length} Overdue
              </span>
            )}
            {pendingReviewOrders.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Clock className="h-3 w-3" />
                {pendingReviewOrders.length} Pending Review
              </span>
            )}
            {stats.unassignedOrders > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <User className="h-3 w-3" />
                {stats.unassignedOrders} Unassigned
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Alerts Bar ──────────────────────────────────────────────────── */}
      {(overdueOrders.length > 0 || pendingReviewOrders.length > 0) && (
        <div className="space-y-2">
          {overdueOrders.map((wo: any) => (
            <div
              key={wo.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-red-500/[0.06] border border-red-500/20"
            >
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-300 truncate">
                  OVERDUE: {wo.title}
                </p>
                <p className="text-[11px] text-red-400/70">
                  Due {formatDate(wo.dueDate)} • {wo.contractor?.name || "Unassigned"}
                </p>
              </div>
              <Link href={`/dashboard/work-orders/${wo.id}`}>
                <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                  View
                </Button>
              </Link>
            </div>
          ))}
          {pendingReviewOrders.map((wo: any) => (
            <div
              key={wo.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20"
            >
              <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-300 truncate">
                  PENDING REVIEW: {wo.title}
                </p>
                <p className="text-[11px] text-amber-400/70">
                  Updated {formatRelativeTime(wo.updatedAt)}
                </p>
              </div>
              <Link href={`/dashboard/work-orders/${wo.id}`}>
                <Button variant="outline" size="sm" className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
                  Review
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Work Orders", value: stats.totalOrders, icon: ClipboardList, color: "text-cyan-400" },
          { label: "Active", value: stats.activeOrders, icon: Activity, color: "text-violet-400" },
          { label: "Completed", value: stats.completedOrders, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Overdue", value: stats.overdueOrders, icon: AlertTriangle, color: stats.overdueOrders > 0 ? "text-red-400" : "text-text-muted" },
          { label: "Photos", value: stats.totalPhotos, icon: Camera, color: "text-blue-400" },
          { label: "Invoices", value: stats.totalInvoices, icon: Receipt, color: "text-amber-400" },
          { label: "Billed", value: formatCurrency(stats.totalBilled), icon: DollarSign, color: "text-green-400" },
          { label: "Compliance", value: `${compliancePct}%`, icon: Shield, color: "text-teal-400" },
        ].map((s) => (
          <div key={s.label} className="bg-surface/80 backdrop-blur-sm rounded-xl border border-border-subtle p-3 text-center">
            <s.icon className={cn("h-4 w-4 mx-auto mb-1.5", s.color)} />
            <p className="text-lg font-bold text-text-primary">{s.value}</p>
            <p className="text-[9px] text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface-hover rounded-xl border border-border-subtle overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-hover border border-transparent"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full",
                activeTab === tab.id ? "bg-cyan-500/20 text-cyan-300" : "bg-surface-hover text-text-muted"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Status & Service Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Status Breakdown</CardTitle>
                </CardHeader>
                {Object.keys(statusBreakdown).length > 0 ? (
                  <DonutChart
                    data={Object.entries(statusBreakdown).map(([s, c]) => ({
                      label: STATUS_LABELS[s] || s,
                      value: c as number,
                      color: getStatusHex(s),
                    }))}
                    size={110}
                    thickness={14}
                  />
                ) : (
                  <p className="text-xs text-text-dim text-center py-6">No data</p>
                )}
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Service Types</CardTitle>
                </CardHeader>
                {Object.keys(serviceBreakdown).length > 0 ? (
                  <BarChart
                    data={Object.entries(serviceBreakdown).map(([t, c]) => ({
                      label: SERVICE_TYPE_LABELS[t] || t.replace(/_/g, " "),
                      value: c as number,
                    }))}
                    height={110}
                  />
                ) : (
                  <p className="text-xs text-text-dim text-center py-6">No data</p>
                )}
              </Card>
            </div>

            {/* Finance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Financial Summary</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-xl bg-surface-hover">
                  <p className="text-[11px] text-text-muted">Total Billed</p>
                  <p className="text-xl font-bold text-text-primary">{formatCurrency(stats.totalBilled)}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-emerald-500/[0.05]">
                  <p className="text-[11px] text-text-muted">Paid</p>
                  <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.totalPaid)}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-amber-500/[0.05]">
                  <p className="text-[11px] text-text-muted">Pending</p>
                  <p className="text-xl font-bold text-amber-400">{formatCurrency(stats.totalPending)}</p>
                </div>
              </div>
            </Card>

            {/* Photo Volume */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Photo Volume</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Before", count: stats.beforePhotos, color: "from-amber-500 to-orange-500", icon: "📋" },
                  { label: "During", count: stats.duringPhotos, color: "from-cyan-500 to-blue-500", icon: "🔧" },
                  { label: "After", count: stats.afterPhotos, color: "from-emerald-500 to-teal-500", icon: "✅" },
                  { label: "Inspection", count: stats.inspectionPhotos, color: "from-violet-500 to-purple-500", icon: "🔍" },
                ].map((p) => (
                  <div key={p.label} className="text-center p-3 rounded-xl bg-surface-hover">
                    <span className="text-base">{p.icon}</span>
                    <p className="text-lg font-bold text-text-primary mt-1">{p.count}</p>
                    <p className="text-[9px] text-text-muted">{p.label}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Completed Work Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Completed Work Orders</CardTitle>
              </CardHeader>
              {recentCompleted.length > 0 ? (
                <div className="space-y-2">
                  {recentCompleted.map((wo: any) => (
                    <Link
                      key={wo.id}
                      href={`/dashboard/work-orders/${wo.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-hover transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{wo.title}</p>
                        <p className="text-[11px] text-text-muted">
                          {SERVICE_TYPE_LABELS[wo.serviceType]} • {wo.contractor?.name || "No contractor"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] text-text-secondary">{wo.completedAt ? formatDate(wo.completedAt) : "—"}</p>
                        <p className="text-[10px] text-text-muted">{wo.filesCount} photos</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-dim text-center py-6">No completed work orders</p>
              )}
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Property Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Property Info</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-text-dim flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-text-dim">Address</p>
                    <p className="text-sm font-medium text-text-primary">{property.address}</p>
                  </div>
                </div>
                {property.city && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-text-dim flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-dim">City / State / ZIP</p>
                      <p className="text-sm font-medium text-text-primary">
                        {[property.city, property.state, property.zipCode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                )}
                {property.latitude && (
                  <div className="flex items-center gap-3">
                    <Navigation className="h-4 w-4 text-text-dim flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-dim">GPS Coordinates</p>
                      <p className="text-sm font-mono text-text-primary">
                        {property.latitude.toFixed(6)}, {property.longitude?.toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-text-dim flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-text-dim">Added</p>
                    <p className="text-sm text-text-primary">{formatDate(property.createdAt)}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Access Details */}
            {accessDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lock className="h-4 w-4 text-text-muted" />
                    Access Details
                  </CardTitle>
                </CardHeader>
                <div className="space-y-2.5">
                  {accessDetails.lockCode && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface-hover">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-text-dim" />
                        <span className="text-xs text-text-secondary">Lock Code</span>
                      </div>
                      <span className="text-sm font-mono font-semibold text-cyan-400">{accessDetails.lockCode}</span>
                    </div>
                  )}
                  {accessDetails.gateCode && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface-hover">
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-text-dim" />
                        <span className="text-xs text-text-secondary">Gate Code</span>
                      </div>
                      <span className="text-sm font-mono font-semibold text-cyan-400">{accessDetails.gateCode}</span>
                    </div>
                  )}
                  {accessDetails.keyCode && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface-hover">
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-text-dim" />
                        <span className="text-xs text-text-secondary">Key Code</span>
                      </div>
                      <span className="text-sm font-mono font-semibold text-cyan-400">{accessDetails.keyCode}</span>
                    </div>
                  )}
                  {!accessDetails.lockCode && !accessDetails.gateCode && !accessDetails.keyCode && (
                    <p className="text-xs text-text-dim text-center py-3">No access codes on file</p>
                  )}
                  <Link
                    href={`/dashboard/work-orders/${workOrders[0]?.id}#access`}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-2"
                  >
                    View full access details <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            )}

            {/* Inspection & Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-teal-400" />
                  Inspection & Compliance
                </CardTitle>
              </CardHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <ProgressRing value={compliancePct} size={56} thickness={5} color="#14b8a6">
                    <span className="text-xs font-bold text-text-primary">{compliancePct}%</span>
                  </ProgressRing>
                  <div className="flex-1 space-y-1.5">
                    {[
                      { label: "Before photos", done: stats.beforePhotos > 0 },
                      { label: "During photos", done: stats.duringPhotos > 0 },
                      { label: "After photos", done: stats.afterPhotos > 0 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        {item.done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-gray-600" />
                        )}
                        <span className={cn("text-xs", item.done ? "text-text-secondary" : "text-text-muted")}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Document Storage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-text-muted" />
                  Documents
                </CardTitle>
              </CardHeader>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-hover">
                  <span className="text-xs text-text-secondary">Total files</span>
                  <span className="text-sm font-semibold text-text-primary">{stats.totalPhotos}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-hover">
                  <span className="text-xs text-text-secondary">Invoices</span>
                  <span className="text-sm font-semibold text-text-primary">{stats.totalInvoices}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface-hover">
                  <span className="text-xs text-text-secondary">History events</span>
                  <span className="text-sm font-semibold text-text-primary">{stats.totalHistoryEvents}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "work-orders" && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">WO #</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">Title</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">Service</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">Contractor</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">Due</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">📷</th>
                  <th className="w-8 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {workOrders.map((wo: any) => (
                  <tr key={wo.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-cyan-400">WO-{wo.id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/work-orders/${wo.id}`} className="text-sm text-text-primary hover:text-cyan-300 truncate max-w-[200px] block">
                        {wo.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{SERVICE_TYPE_LABELS[wo.serviceType]}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md border", STATUS_PILL[wo.status])}>
                        {STATUS_LABELS[wo.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{wo.contractor?.name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{wo.dueDate ? formatDate(wo.dueDate) : "—"}</td>
                    <td className="px-4 py-3 text-center text-xs text-text-secondary">{wo.filesCount}</td>
                    <td className="px-2 py-3">
                      <Link href={`/dashboard/work-orders/${wo.id}`}><ChevronRight className="h-4 w-4 text-text-dim" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "photos" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">All Photos ({stats.totalPhotos})</CardTitle>
            <button
              type="button"
              onClick={() => frontPhotoInputRef.current?.click()}
              disabled={uploadingFrontPhoto}
              className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-60"
            >
              {uploadingFrontPhoto ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Upload Property Front
            </button>
          </CardHeader>
          {propertyPhotos.length > 0 || files.some((f: any) => f.mimeType?.startsWith("image/")) ? (
            <div className="space-y-5">
              {propertyPhotos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-sky-400" />
                    <h3 className="text-xs font-semibold text-text-secondary">Property Front</h3>
                    <span className="text-[10px] text-text-muted">{propertyPhotos.length}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {propertyPhotos.map((photo: any) => (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square bg-surface-hover">
                        <img src={photo.path} alt={photo.originalName || "Property front"} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                          <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-sky-500/80 text-white">
                            PROPERTY FRONT
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePropertyFrontPhoto(photo.id)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500/85 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          title="Remove property front photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {files.some((f: any) => f.mimeType?.startsWith("image/")) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-xs font-semibold text-text-secondary">Work Order Photos</h3>
                    <span className="text-[10px] text-text-muted">
                      {files.filter((f: any) => f.mimeType?.startsWith("image/")).length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {files.filter((f: any) => f.mimeType?.startsWith("image/")).map((f: any) => (
                      <div key={f.id} className="relative group rounded-lg overflow-hidden aspect-square bg-surface-hover">
                        <img src={f.path} alt={f.originalName} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                          <span className={cn(
                            "text-[9px] font-medium px-1 py-0.5 rounded",
                            f.category === "BEFORE" ? "bg-amber-500/20 text-amber-300" :
                            f.category === "DURING" ? "bg-cyan-500/20 text-cyan-300" :
                            f.category === "AFTER" ? "bg-emerald-500/20 text-emerald-300" :
                            f.category === "BID" ? "bg-rose-500/20 text-rose-300" :
                            "bg-violet-500/20 text-violet-300"
                          )}>
                            {f.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-text-dim text-center py-8">No photos uploaded</p>
          )}
        </Card>
      )}

      {activeTab === "inspections" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-teal-400" />
              Inspection & Compliance
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Before", count: stats.beforePhotos, done: stats.beforePhotos > 0, color: "amber", icon: "📋" },
              { label: "During", count: stats.duringPhotos, done: stats.duringPhotos > 0, color: "cyan", icon: "🔧" },
              { label: "After", count: stats.afterPhotos, done: stats.afterPhotos > 0, color: "emerald", icon: "✅" },
            ].map((s) => (
              <div key={s.label} className={cn(
                "p-4 rounded-xl border text-center",
                s.done
                  ? `bg-${s.color}-500/[0.06] border-${s.color}-500/20`
                  : "bg-surface-hover border-border-subtle"
              )}>
                <span className="text-2xl">{s.icon}</span>
                <p className="text-2xl font-bold text-text-primary mt-2">{s.count}</p>
                <p className="text-xs text-text-muted">{s.label} Photos</p>
                {s.done && <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto mt-2" />}
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl bg-surface-hover border border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Overall Compliance</span>
              <span className="text-sm font-bold text-text-primary">{compliancePct}%</span>
            </div>
            <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500 rounded-full transition-all"
                style={{ width: `${compliancePct}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {activeTab === "finance" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <div className="text-center p-2">
                <DollarSign className="h-5 w-5 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-text-primary">{formatCurrency(stats.totalBilled)}</p>
                <p className="text-xs text-text-muted">Total Billed</p>
              </div>
            </Card>
            <Card>
              <div className="text-center p-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalPaid)}</p>
                <p className="text-xs text-text-muted">Paid</p>
              </div>
            </Card>
            <Card>
              <div className="text-center p-2">
                <Clock className="h-5 w-5 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.totalPending)}</p>
                <p className="text-xs text-text-muted">Pending</p>
              </div>
            </Card>
          </div>

          <Card padding={false}>
            <div className="p-4 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-text-primary">Invoices</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">Invoice #</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">Due</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-surface-hover">
                      <td className="px-4 py-3 text-sm font-mono text-text-primary">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                          inv.status === "PAID" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                          inv.status === "SENT" ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" :
                          inv.status === "OVERDUE" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                          "bg-gray-500/15 text-text-secondary border-gray-500/30"
                        )}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-text-primary">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{inv.paidAt ? formatDate(inv.paidAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-text-muted" />
              Property Timeline
            </CardTitle>
          </CardHeader>
          <div className="space-y-0.5">
            {timeline.length > 0 ? (
              timeline.map((event: any, i: number) => {
                const { icon: Icon, color } = getTimelineIcon(event.type);
                return (
                  <div key={i} className="flex gap-3 py-2.5">
                    <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {event.user && (
                          <span className="text-[11px] text-text-muted">{event.user.name}</span>
                        )}
                        <span className="text-[11px] text-text-dim">{formatRelativeTime(event.date)}</span>
                        {event.workOrderTitle && (
                          <Link
                            href={`/dashboard/work-orders/${event.workOrderId}`}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 truncate"
                          >
                            {event.workOrderTitle}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-text-dim text-center py-8">No timeline events</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === "access" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lock className="h-4 w-4 text-cyan-400" />
              Property Access Details
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Lock Code", value: accessDetails?.lockCode, icon: Lock },
              { label: "Gate Code", value: accessDetails?.gateCode, icon: Key },
              { label: "Key Code", value: accessDetails?.keyCode, icon: Key },
              { label: "GPS", value: property.latitude ? `${property.latitude.toFixed(6)}, ${property.longitude?.toFixed(6)}` : null, icon: Navigation },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl bg-surface-hover border border-border-subtle">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="h-4 w-4 text-text-dim" />
                  <span className="text-xs text-text-muted">{item.label}</span>
                </div>
                <p className={cn("text-lg font-semibold", item.value ? "text-cyan-400 font-mono" : "text-text-dim")}>
                  {item.value || "Not set"}
                </p>
              </div>
            ))}
            {accessDetails?.specialInstructions && (
              <div className="p-4 rounded-xl bg-surface-hover border border-border-subtle sm:col-span-2">
                <p className="text-xs text-text-muted mb-2">Special Instructions</p>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">{accessDetails.specialInstructions}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === "notes" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-400" />
              Property Notes
            </CardTitle>
          </CardHeader>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this property..."
            rows={8}
            className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none resize-none"
          />
          <p className="text-[11px] text-text-muted mt-2">
            Notes are saved locally. Connect a backend endpoint to persist them.
          </p>
        </Card>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusHex(status: string): string {
  const map: Record<string, string> = {
    NEW: "#3b82f6", PENDING: "#eab308", ASSIGNED: "#a855f7",
    IN_PROGRESS: "#06b6d4", FIELD_COMPLETE: "#14b8a6", QC_REVIEW: "#f97316",
    PENDING_REVIEW: "#f59e0b", REVISIONS_NEEDED: "#ef4444",
    OFFICE_COMPLETE: "#10b981", CLOSED: "#6b7280", CANCELLED: "#4b5563",
  };
  return map[status] || "#6b7280";
}
