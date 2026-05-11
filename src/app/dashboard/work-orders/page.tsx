"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useWorkOrders, useUsers, usePropertyHistory } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button, Badge, Card, Avatar } from "@/components/ui";
import {
  Search,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Check,
  Download,
  RefreshCw,
  Filter,
  CheckSquare,
  Square,
  Building2,
  X,
  Camera,
  History,
  Bookmark,
  Save,
  Trash2,
  Star,
  GripVertical,
  Calendar,
  UserPlus,
  MoreHorizontal,
  FileSpreadsheet,
  Trash,
  Users,
  ArrowUpDown,
  CheckCircle2,
  FileText,
  Activity,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import {
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  formatDateTime,
  cn,
} from "@/lib/utils";
import toast from "react-hot-toast";
import { OverdueCountdown } from "@/components/work-orders/overdue-countdown";

// ─── Status color pills ──────────────────────────────────────────────────────

const STATUS_PILL_COLORS: Record<string, string> = {
  NEW: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  ASSIGNED: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  FIELD_COMPLETE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  QC_REVIEW: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  PENDING_REVIEW: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  REVISIONS_NEEDED: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  OFFICE_COMPLETE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  CLOSED: "bg-slate-500/10 text-text-secondary border-slate-500/20",
  CANCELLED: "bg-slate-700/10 text-text-muted border-border-medium/20",
};

// ─── Work Order Number Generator ─────────────────────────────────────────────

function getWorkOrderNumber(id: string): string {
  const short = id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `WO-${short}`;
}

// ─── Column definitions ──────────────────────────────────────────────────────

interface ColumnDef {
  id: string;
  label: string;
  className?: string;
  headerClassName?: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "checkbox", label: "", className: "w-10", headerClassName: "w-10 px-3" },
  { id: "wo", label: "WO #", className: "", headerClassName: "text-left px-3" },
  { id: "property", label: "Property", className: "", headerClassName: "text-left px-3" },
  { id: "workOrderType", label: "Work Order Type", className: "", headerClassName: "text-left px-3 hidden lg:table-cell" },
  { id: "location", label: "Location", className: "", headerClassName: "text-left px-3 hidden lg:table-cell" },
  { id: "status", label: "Status", className: "", headerClassName: "text-left px-3" },
  { id: "contractor", label: "Contractor", className: "", headerClassName: "text-left px-3 hidden lg:table-cell" },
  { id: "client", label: "Client", className: "", headerClassName: "text-left px-3 hidden xl:table-cell" },
  { id: "due", label: "Due", className: "", headerClassName: "text-left px-3 hidden md:table-cell" },
  { id: "photos", label: "📷", className: "", headerClassName: "text-center px-3 hidden sm:table-cell" },
  { id: "history", label: "📋", className: "", headerClassName: "text-center px-3 hidden sm:table-cell" },
  { id: "arrow", label: "", className: "w-8", headerClassName: "w-8 px-2" },
];

// ─── Multi-Select Status Dropdown ────────────────────────────────────────────

function MultiStatusSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (statuses: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(status: string) {
    onChange(selected.includes(status) ? selected.filter((s) => s !== status) : [...selected, status]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-all min-w-[180px]",
          open ? "border-cyan-500/50 ring-1 ring-cyan-500/20" : "border-border-subtle hover:border-border-subtle",
          selected.length > 0 ? "bg-cyan-500/[0.06]" : "bg-surface-hover"
        )}
      >
        <Filter className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
        {selected.length === 0 ? (
          <span className="flex-1 text-left text-text-secondary">All Statuses</span>
        ) : selected.length <= 2 ? (
          <span className="flex-1 text-left text-text-primary truncate">{selected.map((s) => STATUS_LABELS[s]).join(", ")}</span>
        ) : (
          <span className="flex-1 text-left text-cyan-600 font-bold">{selected.length} selected</span>
        )}
        {selected.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); onChange([]); }} className="p-0.5 rounded hover:bg-surface-hover text-text-muted">
            <X className="h-3 w-3" />
          </button>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 text-text-muted transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
            <button onClick={() => onChange(Object.keys(STATUS_LABELS))} className="text-[11px] text-cyan-600 hover:text-cyan-700 font-bold">Select all</button>
            <button onClick={() => onChange([])} className="text-[11px] text-text-muted hover:text-text-secondary font-medium">Clear</button>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => toggle(value)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                  selected.includes(value) ? "bg-cyan-500/[0.06] text-text-primary" : "text-text-secondary hover:bg-surface-hover"
                )}
              >
                <div className={cn("h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-all", selected.includes(value) ? "bg-cyan-500 border-cyan-500" : "border-border-subtle")}>
                  {selected.includes(value) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className={cn("h-2 w-2 rounded-full flex-shrink-0", STATUS_PILL_COLORS[value]?.split(" ")[0] || "bg-gray-500")} />
                <span className="flex-1 text-left">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bulk Actions Dropdown ───────────────────────────────────────────────────

function BulkActionsDropdown({
  selectedCount,
  onExport,
  onBulkAssign,
  onBulkDueDate,
  onBulkDelete,
  onBulkStatusUpdate,
}: {
  selectedCount: number;
  onExport: () => void;
  onBulkAssign: () => void;
  onBulkDueDate: () => void;
  onBulkDelete: () => void;
  onBulkStatusUpdate: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showStatusSub, setShowStatusSub] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowStatusSub(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <MoreHorizontal className="h-3.5 w-3.5" />
        Bulk Actions
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border-subtle">
            <p className="text-xs font-medium text-text-secondary">{selectedCount} work orders selected</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { onExport(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <div className="text-left">
                <p className="font-medium">Export Selected</p>
                <p className="text-[10px] text-text-muted">Download as Excel/CSV</p>
              </div>
            </button>
            <button
              onClick={() => { onBulkAssign(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
            >
              <UserPlus className="h-4 w-4 text-cyan-600" />
              <div className="text-left">
                <p className="font-medium">Assign Contractor</p>
                <p className="text-[10px] text-text-muted">Bulk assign to a contractor</p>
              </div>
            </button>
            <button
              onClick={() => { onBulkDueDate(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Calendar className="h-4 w-4 text-amber-500" />
              <div className="text-left">
                <p className="font-medium">Change Due Date</p>
                <p className="text-[10px] text-text-muted">Set due date for selected</p>
              </div>
            </button>
            <div className="relative">
              <button
                onMouseEnter={() => setShowStatusSub(true)}
                onMouseLeave={() => setShowStatusSub(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-primary hover:bg-surface-hover transition-colors"
              >
                <ArrowUpDown className="h-4 w-4 text-violet-500" />
                <div className="text-left flex-1">
                  <p className="font-medium">Update Status</p>
                  <p className="text-[10px] text-text-muted">Change status for selected</p>
                </div>
                <ChevronRight className="h-3 w-3 text-text-muted" />
              </button>
              {showStatusSub && (
                <div
                  className="absolute left-full top-0 ml-1 w-52 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-50 py-1 max-h-64 overflow-y-auto"
                  onMouseEnter={() => setShowStatusSub(true)}
                  onMouseLeave={() => setShowStatusSub(false)}
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => { onBulkStatusUpdate(val); setOpen(false); setShowStatusSub(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-hover transition-colors",
                        STATUS_PILL_COLORS[val] || "text-text-secondary"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", STATUS_PILL_COLORS[val]?.split(" ")[0] || "bg-gray-500")} />
                      <span className="text-text-primary">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-border-subtle my-1" />
            <button
              onClick={() => { onBulkDelete(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-500/[0.06] transition-colors"
            >
              <Trash className="h-4 w-4" />
              <div className="text-left">
                <p className="font-medium">Delete Selected</p>
                <p className="text-[10px] text-text-muted">Permanently remove selected orders</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Draggable Column Header ─────────────────────────────────────────────────

function DraggableColumnHeader({
  column,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  children,
}: {
  column: ColumnDef;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  children: React.ReactNode;
}) {
  return (
    <th
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, index);
      }}
      onDrop={() => onDrop(index)}
      className={cn(
        "text-[11px] font-semibold text-text-muted uppercase tracking-wider py-3 cursor-grab active:cursor-grabbing select-none group",
        column.headerClassName
      )}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        {children}
      </div>
    </th>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function WorkOrdersContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    // Initialize from URL search params (e.g. ?status=IN_PROGRESS or ?status=NEW,ASSIGNED)
    const urlStatus = searchParams.get("status");
    if (urlStatus) {
      return urlStatus.split(",").filter((s) => s in STATUS_LABELS);
    }
    return [];
  });
  const [serviceFilter, setServiceFilter] = useState(() => {
    return searchParams.get("serviceType") || "";
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [showSavedMenu, setShowSavedMenu] = useState(false);
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // History popup state
  const [historyPopup, setHistoryPopup] = useState<{ open: boolean; workOrder: any }>({ open: false, workOrder: null });

  // Bulk action modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkContractorId, setBulkContractorId] = useState("");

  const { data, isLoading, refetch } = useWorkOrders({
    search: search || undefined,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    serviceType: serviceFilter || undefined,
  });
  const { data: usersData } = useUsers();
  const contractors = (usersData || []).filter((u: any) => u.role === "CONTRACTOR");

  const workOrders = data?.workOrders || [];

  // Compute work order count per property (by propertyId or address)
  const propertyWOCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const wo of workOrders) {
      const key = wo.propertyId || wo.address || "";
      if (key) map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [workOrders]);

  function getPropertyWOCount(wo: any): number {
    const key = wo.propertyId || wo.address || "";
    return key ? (propertyWOCountMap[key] || 1) : 1;
  }

  // Column drag handlers
  const handleColumnDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
  }, []);

  const handleColumnDrop = useCallback((dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    setColumns((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });
    setDragIndex(null);
  }, [dragIndex]);

  function toggleSelect(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selected.length === workOrders.length) {
      setSelected([]);
    } else {
      setSelected(workOrders.map((wo: any) => wo.id));
    }
  }

  function handleBulkExport() {
    const selectedOrders = workOrders.filter((wo: any) => selected.includes(wo.id));
    const csv = [
      ["WO #", "Title", "Property Address", "City", "State", "ZIP", "Work Order Type", "Status", "Contractor", "Client", "Due Date", "Photos", "History", "Created"].join(","),
      ...selectedOrders.map((wo: any) =>
        [
          getWorkOrderNumber(wo.id),
          `"${wo.title}"`,
          `"${wo.address || wo.property?.address || ""}"`,
          wo.city || wo.property?.city || "",
          wo.state || wo.property?.state || "",
          wo.zipCode || wo.property?.zipCode || "",
          SERVICE_TYPE_LABELS[wo.serviceType] || wo.serviceType,
          STATUS_LABELS[wo.status],
          wo.contractor?.name || "Unassigned",
          wo.createdBy?.name || "",
          wo.dueDate ? formatDate(wo.dueDate) : "",
          wo._count?.files || 0,
          getPropertyWOCount(wo),
          formatDate(wo.createdAt),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} work orders`);
  }

  function handleBulkAssign() {
    if (contractors.length === 0) {
      toast.error("No contractors available");
      return;
    }
    setShowAssignModal(true);
  }

  async function confirmBulkAssign() {
    if (!bulkContractorId) {
      toast.error("Select a contractor");
      return;
    }
    const contractor = contractors.find((c: any) => c.id === bulkContractorId);
    try {
      const res = await fetch("/api/work-orders/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: selected, contractorId: bulkContractorId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to assign");
      }
      const data = await res.json();
      toast.success(`${data.updated} orders assigned to ${contractor?.name || "contractor"}`);
      setSelected([]);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Bulk assign failed");
    }
    setShowAssignModal(false);
    setBulkContractorId("");
  }

  function handleBulkDueDate() {
    setShowDueDateModal(true);
  }

  async function confirmBulkDueDate() {
    if (!bulkDueDate) {
      toast.error("Select a date");
      return;
    }
    try {
      const res = await fetch("/api/work-orders/bulk-due-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: selected, dueDate: bulkDueDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update due date");
      }
      const data = await res.json();
      toast.success(`Due date updated for ${data.updated} orders`);
      setSelected([]);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Bulk due date update failed");
    }
    setShowDueDateModal(false);
    setBulkDueDate("");
  }

  function handleBulkDelete() {
    setShowDeleteModal(true);
  }

  async function confirmBulkDelete() {
    try {
      const res = await fetch("/api/work-orders/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: selected }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }
      const data = await res.json();
      toast.success(`${data.deleted} orders deleted`);
      setSelected([]);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Bulk delete failed");
    }
    setShowDeleteModal(false);
  }

  async function handleBulkStatusUpdate(status: string) {
    try {
      const res = await fetch("/api/work-orders/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderIds: selected, status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }
      const data = await res.json();
      toast.success(`${data.updated} orders updated to ${STATUS_LABELS[status]}`);
      setSelected([]);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Bulk status update failed");
    }
  }

  const activeFilterCount = statusFilter.length + (serviceFilter ? 1 : 0) + (search ? 1 : 0);

  // Render cell content by column id
  function renderCell(columnId: string, wo: any) {
    const propertyImage = wo.files?.find((f: any) => f.mimeType?.startsWith("image/"))?.path;

    switch (columnId) {
      case "checkbox":
        return (
          <button onClick={() => toggleSelect(wo.id)}>
            {selected.includes(wo.id) ? (
              <CheckSquare className="h-4 w-4 text-cyan-600" />
            ) : (
              <Square className="h-4 w-4 text-text-dim" />
            )}
          </button>
        );
      case "wo":
        return (
          <Link href={`/dashboard/work-orders/${wo.id}`} className="group">
            <span className="text-xs font-mono font-bold text-cyan-600 group-hover:text-cyan-700 transition-colors">
              {getWorkOrderNumber(wo.id)}
            </span>
          </Link>
        );
      case "property":
        return (
          <Link href={`/dashboard/work-orders/${wo.id}`} className="flex items-center gap-2.5 group">
            <div className="h-10 w-10 rounded-lg overflow-hidden bg-surface-hover border border-border-subtle flex-shrink-0">
              {propertyImage ? (
                <img src={propertyImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-text-dim" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate group-hover:text-cyan-600 transition-colors max-w-[200px]">
                {wo.title}
              </p>
              <p className="text-[11px] text-text-muted truncate max-w-[200px]">
                {wo.address || wo.property?.address}
              </p>
            </div>
          </Link>
        );
      case "workOrderType":
        return (
          <span className="text-xs text-text-secondary">
            {SERVICE_TYPE_LABELS[wo.serviceType] || wo.serviceType?.replace(/_/g, " ") || "—"}
          </span>
        );
      case "location":
        return (
          <div className="text-xs text-text-secondary">
            {wo.city || wo.property?.city ? <span>{wo.city || wo.property?.city}</span> : null}
            {(wo.city || wo.property?.city) && (wo.state || wo.property?.state) ? <span>, </span> : null}
            {wo.state || wo.property?.state ? <span>{wo.state || wo.property?.state}</span> : null}
            {wo.zipCode || wo.property?.zipCode ? <span className="ml-1 text-text-muted">{wo.zipCode || wo.property?.zipCode}</span> : null}
            {!wo.city && !wo.state && !wo.zipCode && !wo.property?.city && !wo.property?.state && !wo.property?.zipCode && <span className="text-text-dim">—</span>}
          </div>
        );
      case "status":
        return (
          <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md border", STATUS_PILL_COLORS[wo.status] || "bg-gray-500/10 text-text-secondary border-gray-500/20")}>
            {STATUS_LABELS[wo.status] || wo.status}
          </span>
        );
      case "contractor": {
        // Count messages/threads for this work order
        const messageCount = wo._count?.threads || 0;
        return wo.contractor ? (
          <div className="flex items-center gap-1.5 relative">
            <div className="relative">
              <Avatar src={wo.contractor.image} name={wo.contractor.name} size="xs" />
              {messageCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center text-[9px] font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-full border border-border-subtle shadow-sm">
                  {messageCount > 9 ? "9+" : messageCount}
                </span>
              )}
            </div>
            <span className="text-xs text-text-secondary truncate max-w-[120px]">
              {wo.contractor.name}
            </span>
            {messageCount > 0 && (
              <Link
                href={`/dashboard/work-orders/${wo.id}`}
                className="ml-1 p-0.5 rounded hover:bg-surface-hover text-text-muted hover:text-cyan-600 transition-colors"
                title={`${messageCount} message${messageCount !== 1 ? "s" : ""} — click to view`}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </Link>
            )}
          </div>
        ) : (
          <span className="text-xs text-text-dim italic">Unassigned</span>
        );
      }
      case "client":
        return wo.createdBy ? (
          <span className="text-xs text-text-secondary truncate max-w-[100px] block">{wo.createdBy.name}</span>
        ) : (
          <span className="text-xs text-text-dim">—</span>
        );
      case "due":
        return wo.dueDate ? (
          <div className="flex flex-col gap-1">
            <span className={cn("text-xs", new Date(wo.dueDate) < new Date() && wo.status !== "CLOSED" && wo.status !== "OFFICE_COMPLETE" ? "text-rose-500 font-bold" : "text-text-secondary")}>
              {formatDate(wo.dueDate)}
            </span>
            <OverdueCountdown dueDate={wo.dueDate} status={wo.status} size="sm" />
          </div>
        ) : (
          <span className="text-xs text-text-dim">—</span>
        );
      case "photos":
        return (
          <span className={cn("inline-flex items-center gap-1 text-xs", (wo._count?.files || 0) > 0 ? "text-text-secondary" : "text-text-dim")}>
            <Camera className="h-3 w-3" />
            {wo._count?.files || 0}
          </span>
        );
      case "history":
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setHistoryPopup({ open: true, workOrder: wo });
            }}
            className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-cyan-600 cursor-pointer"
            title="View property history"
          >
            <History className="h-3 w-3" />
            {getPropertyWOCount(wo)}
          </button>
        );
      case "arrow":
        return (
          <Link href={`/dashboard/work-orders/${wo.id}`}>
            <ChevronRight className="h-4 w-4 text-text-dim hover:text-text-secondary transition-colors" />
          </Link>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Work Orders</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-surface-hover rounded-md text-[10px] font-bold text-text-muted uppercase tracking-widest border border-border-subtle">Inventory Management</span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <p className="text-text-secondary text-sm font-medium">{data?.total || 0} active records</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/work-orders/finder">
            <Button variant="outline" size="sm" className="hover:bg-surface-hover">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Finders
            </Button>
          </Link>
          <Link href="/dashboard/work-orders/by-property">
            <Button variant="outline" size="sm" className="hover:bg-surface-hover">
              <Building2 className="h-4 w-4 mr-2" />
              Property Groups
            </Button>
          </Link>
          {["ADMIN", "COORDINATOR", "PROCESSOR", "CLIENT"].includes(role) && (
            <Link href="/dashboard/work-orders/new">
              <Button size="sm" variant="primary" className="shadow-cyan-500/20">
                <ClipboardList className="h-4 w-4 mr-2" />
                New Work Order
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card variant="glass" padding={false} className="overflow-visible">
        <div className="p-4 flex flex-col xl:flex-row items-center gap-4">
          <div className="w-full xl:flex-1">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-cyan-500 transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder="Search by ID, address, client, or contractor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <MultiStatusSelect selected={statusFilter} onChange={setStatusFilter} />
            
            <div className="relative min-w-[160px]">
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-secondary focus:border-cyan-500/50 focus:outline-none transition-all appearance-none cursor-pointer hover:bg-surface-hover"
              >
                <option value="" className="bg-surface-hover">All Service Types</option>
                {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val} className="bg-surface-hover">{label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
            </div>

            {/* Saved Filters dropdown */}
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowSavedMenu(!showSavedMenu)}>
                <Bookmark className="h-3.5 w-3.5" />
                Saved
              </Button>
              {showSavedMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSavedMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-72 bg-surface border border-border-medium rounded-xl shadow-2xl shadow-black/60 z-20 overflow-hidden">
                    <div className="p-3 border-b border-border-subtle">
                      {showSaveFilter ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={saveFilterName}
                            onChange={(e) => setSaveFilterName(e.target.value)}
                            placeholder="Filter name..."
                            className="flex-1 px-2.5 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && saveFilterName.trim()) {
                                const newFilter = { id: `filter-${Date.now()}`, name: saveFilterName.trim(), search, statuses: [...statusFilter], serviceType: serviceFilter, createdAt: new Date().toISOString() };
                                setSavedFilters((prev) => [...prev, newFilter]);
                                setSaveFilterName("");
                                setShowSaveFilter(false);
                                toast.success(`Filter "${newFilter.name}" saved`);
                              }
                              if (e.key === "Escape") setShowSaveFilter(false);
                            }}
                          />
                          <button onClick={() => setShowSaveFilter(false)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowSaveFilter(true)}
                          disabled={activeFilterCount === 0}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/[0.06] transition-colors disabled:opacity-40 disabled:cursor-default"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save current filters
                        </button>
                      )}
                    </div>
                    {savedFilters.length === 0 ? (
                      <div className="p-4 text-center">
                        <Bookmark className="h-8 w-8 text-text-dim mx-auto mb-2" />
                        <p className="text-xs text-text-muted">No saved filters</p>
                      </div>
                    ) : (
                      <div className="py-1 max-h-64 overflow-y-auto">
                        {savedFilters.map((filter) => (
                          <div key={filter.id} className="flex items-center gap-2 px-3 py-2 hover:bg-surface-hover group transition-colors">
                            <button
                              onClick={() => { setSearch(filter.search); setStatusFilter(filter.statuses); setServiceFilter(filter.serviceType); setShowSavedMenu(false); toast.success(`Loaded "${filter.name}"`); }}
                              className="flex-1 text-left min-w-0"
                            >
                              <p className="text-sm text-text-primary font-medium truncate">{filter.name}</p>
                            </button>
                            <button
                              onClick={() => { const updated = savedFilters.filter((f) => f.id !== filter.id); setSavedFilters(updated); toast.success(`Deleted "${filter.name}"`); }}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-[11px] text-text-muted">Filters:</span>
              {statusFilter.map((s) => (
                <span key={s} className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg border", STATUS_PILL_COLORS[s] || "bg-gray-500/10 text-text-secondary border-gray-500/20")}>
                  {STATUS_LABELS[s]}
                  <button onClick={() => setStatusFilter((prev) => prev.filter((x) => x !== s))} className="hover:text-white ml-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {serviceFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg border bg-violet-500/10 text-violet-400 border-violet-500/20">
                  {SERVICE_TYPE_LABELS[serviceFilter]}
                  <button onClick={() => setServiceFilter("")} className="hover:text-white ml-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg border bg-surface-hover text-text-secondary border-border-medium">
                  &quot;{search}&quot;
                  <button onClick={() => setSearch("")} className="hover:text-white ml-0.5">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              <button onClick={() => { setStatusFilter([]); setServiceFilter(""); setSearch(""); }} className="text-[11px] text-text-muted hover:text-text-secondary underline">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Bulk actions bar */}
        {selected.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-cyan-500/[0.06] border-b border-cyan-500/10">
            <span className="text-sm font-medium text-cyan-400">{selected.length} selected</span>
            <div className="flex-1" />
            <BulkActionsDropdown
              selectedCount={selected.length}
              onExport={handleBulkExport}
              onBulkAssign={handleBulkAssign}
              onBulkDueDate={handleBulkDueDate}
              onBulkDelete={handleBulkDelete}
              onBulkStatusUpdate={handleBulkStatusUpdate}
            />
            <Button variant="outline" size="sm" onClick={handleBulkExport}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        )}

        {/* ─── Data Table ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-5 w-5 text-text-muted animate-spin mx-auto mb-2" />
            <p className="text-sm text-text-muted">Loading work orders...</p>
          </div>
        ) : workOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium text-text-primary">No work orders found</p>
            <p className="text-sm text-text-muted mt-1">
              {activeFilterCount > 0 ? "Try adjusting your filters" : "Create your first work order to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {columns.map((col, index) => (
                    <DraggableColumnHeader
                      key={col.id}
                      column={col}
                      index={index}
                      onDragStart={handleColumnDragStart}
                      onDragOver={handleColumnDragOver}
                      onDrop={handleColumnDrop}
                    >
                      {col.id === "checkbox" ? (
                        <button onClick={toggleSelectAll}>
                          {selected.length === workOrders.length && workOrders.length > 0 ? (
                            <CheckSquare className="h-4 w-4 text-cyan-400" />
                          ) : (
                            <Square className="h-4 w-4 text-text-dim" />
                          )}
                        </button>
                      ) : (
                        col.label
                      )}
                    </DraggableColumnHeader>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {workOrders.map((wo: any) => (
                  <tr key={wo.id} className={cn("hover:bg-surface-hover transition-colors", selected.includes(wo.id) && "bg-cyan-500/[0.04]")}>
                    {columns.map((col) => (
                      <td key={col.id} className={cn("px-3 py-3", col.className, col.id === "checkbox" && "px-3", col.id === "arrow" && "px-2", col.id === "workOrderType" && "hidden lg:table-cell", col.id === "location" && "hidden lg:table-cell", col.id === "client" && "hidden xl:table-cell", col.id === "due" && "hidden md:table-cell", col.id === "photos" && "text-center hidden sm:table-cell", col.id === "history" && "text-center hidden sm:table-cell")}>
                        {renderCell(col.id, wo)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle bg-surface-hover">
              <span className="text-xs text-text-muted">
                {data?.total || 0} work order{(data?.total || 0) !== 1 ? "s" : ""}
                {activeFilterCount > 0 && ` (filtered)`}
              </span>
              {data?.totalPages > 1 && (
                <span className="text-xs text-text-muted">Page {data.page} of {data.totalPages}</span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ─── Modals ────────────────────────────────────────────────────────── */}

      {/* Bulk Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Bulk Assign Contractor</h3>
            <p className="text-sm text-text-muted mb-4">Assign {selected.length} work orders to a contractor</p>
            <select
              value={bulkContractorId}
              onChange={(e) => setBulkContractorId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none mb-4"
            >
              <option value="">Select contractor...</option>
              {contractors.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowAssignModal(false); setBulkContractorId(""); }}>Cancel</Button>
              <Button size="sm" onClick={confirmBulkAssign} disabled={!bulkContractorId}>
                <UserPlus className="h-3.5 w-3.5" />
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Due Date Modal */}
      {showDueDateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-1">Change Due Date</h3>
            <p className="text-sm text-text-muted mb-4">Set due date for {selected.length} work orders</p>
            <input
              type="date"
              value={bulkDueDate}
              onChange={(e) => setBulkDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowDueDateModal(false); setBulkDueDate(""); }}>Cancel</Button>
              <Button size="sm" onClick={confirmBulkDueDate} disabled={!bulkDueDate}>
                <Calendar className="h-3.5 w-3.5" />
                Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-red-500/20 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-red-400 mb-1">Delete Work Orders</h3>
            <p className="text-sm text-text-secondary mb-4">
              Are you sure you want to delete {selected.length} work order{selected.length !== 1 ? "s" : ""}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmBulkDelete}>
                <Trash className="h-3.5 w-3.5" />
                Delete {selected.length} Order{selected.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Property History Popup */}
      {historyPopup.open && historyPopup.workOrder && (
        <PropertyHistoryPopup
          workOrder={historyPopup.workOrder}
          onClose={() => setHistoryPopup({ open: false, workOrder: null })}
        />
      )}
    </div>
  );
}


// ─── Property History Popup (Excel-like View) ──────────────────────────────────

function PropertyHistoryPopup({
  workOrder,
  onClose,
}: {
  workOrder: any;
  onClose: () => void;
}) {
  const { data, isLoading } = usePropertyHistory(
    workOrder?.propertyId || undefined,
    workOrder?.address || undefined
  );
  const [searchWO, setSearchWO] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchDesc, setSearchDesc] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [searchService, setSearchService] = useState("");
  const [searchBids, setSearchBids] = useState("");
  const [searchTasks, setSearchTasks] = useState("");
  const [searchPhotos, setSearchPhotos] = useState("");
  const [searchCreated, setSearchCreated] = useState("");
  const [photoPopup, setPhotoPopup] = useState<{ open: boolean; photos: any[]; title: string }>({ open: false, photos: [], title: "" });

  const historyWorkOrders = data?.workOrders || [];

  const filteredOrders = historyWorkOrders.filter((wo: any) => {
    const woNum = "WO-" + wo.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
    const bids = (wo.metadata?.bids as any[]) || [];
    const bidDesc = bids.map((b: any) => b.title).join(" ");
    const addr = [wo.address || "", wo.city || "", wo.state || ""].filter(Boolean).join(" ");
    const statusLabel = STATUS_LABELS[wo.status] || wo.status || "";
    const serviceLabel = SERVICE_TYPE_LABELS[wo.serviceType] || wo.serviceType || "";
    const totalBidAmount = bids.reduce((s: number, b: any) => s + (b.amount || 0), 0);
    const bidsStr = totalBidAmount > 0 ? "$" + totalBidAmount.toLocaleString() : "";
    const tasks = (wo.tasks as any[]) || [];
    const tasksStr = tasks.map((t: any) => t.title || t.description || "").join(" ");
    const files = wo.files || [];
    const photosStr = files.length > 0 ? String(files.length) : "0";
    const createdStr = formatDate(wo.createdAt);
    if (searchWO && !woNum.toLowerCase().includes(searchWO.toLowerCase())) return false;
    if (searchStatus && !statusLabel.toLowerCase().includes(searchStatus.toLowerCase())) return false;
    if (searchDesc && !bidDesc.toLowerCase().includes(searchDesc.toLowerCase())) return false;
    if (searchAddress && !addr.toLowerCase().includes(searchAddress.toLowerCase())) return false;
    if (searchService && !serviceLabel.toLowerCase().includes(searchService.toLowerCase())) return false;
    if (searchBids && !bidsStr.toLowerCase().includes(searchBids.toLowerCase())) return false;
    if (searchTasks && !tasksStr.toLowerCase().includes(searchTasks.toLowerCase())) return false;
    if (searchPhotos && !photosStr.includes(searchPhotos)) return false;
    if (searchCreated && !createdStr.toLowerCase().includes(searchCreated.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[2vh]">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-w-[95vw] max-h-[96vh] mx-4 bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <History className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">Property History</h2>
                <p className="text-[11px] text-text-muted">
                  {workOrder?.address || "All work orders"} &bull; {filteredOrders.length} of {historyWorkOrders.length} orders
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="text-center py-16">
                <div className="h-6 w-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-text-muted">Loading property history...</p>
              </div>
            ) : historyWorkOrders.length === 0 ? (
              <div className="text-center py-16">
                <History className="h-12 w-12 text-text-dim mx-auto mb-3" />
                <p className="text-text-secondary font-medium">No property history</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface border-b border-border-subtle">
                    <th className="p-2 min-w-[140px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
                        <input type="text" value={searchWO} onChange={(e) => setSearchWO(e.target.value)} placeholder="Search WO #..." className="w-full pl-7 pr-2 py-1 bg-surface-hover border border-border-subtle rounded-md text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none" />
                      </div>
                    </th>
                    <th className="p-2 min-w-[100px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
                        <input type="text" value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} placeholder="Search status..." className="w-full pl-7 pr-2 py-1 bg-surface-hover border border-border-subtle rounded-md text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none" />
                      </div>
                    </th>
                    <th className="p-2 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
                        <input type="text" value={searchDesc} onChange={(e) => setSearchDesc(e.target.value)} placeholder="Search bid desc..." className="w-full pl-7 pr-2 py-1 bg-surface-hover border border-border-subtle rounded-md text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none" />
                      </div>
                    </th>
                    <th className="p-2 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
                        <input type="text" value={searchAddress} onChange={(e) => setSearchAddress(e.target.value)} placeholder="Search address..." className="w-full pl-7 pr-2 py-1 bg-surface-hover border border-border-subtle rounded-md text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none" />
                      </div>
                    </th>
                    <th className="p-2 min-w-[80px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
                        <input type="text" value={searchService} onChange={(e) => setSearchService(e.target.value)} placeholder="Search..." className="w-full pl-7 pr-2 py-1 bg-surface-hover border border-border-subtle rounded-md text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none" />
                      </div>
                    </th>
                    <th className="p-2 min-w-[100px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
                        <input type="text" value={searchBids} onChange={(e) => setSearchBids(e.target.value)} placeholder="Search..." className="w-full pl-7 pr-2 py-1 bg-surface-hover border border-border-subtle rounded-md text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none" />
                      </div>
                    </th>
                    <th className="p-2 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
                        <input type="text" value={searchTasks} onChange={(e) => setSearchTasks(e.target.value)} placeholder="Search tasks..." className="w-full pl-7 pr-2 py-1 bg-surface-hover border border-border-subtle rounded-md text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none" />
                      </div>
                    </th>
                    <th className="p-2 min-w-[80px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
                        <input type="text" value={searchPhotos} onChange={(e) => setSearchPhotos(e.target.value)} placeholder="Search..." className="w-full pl-7 pr-2 py-1 bg-surface-hover border border-border-subtle rounded-md text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none" />
                      </div>
                    </th>
                    <th className="p-2 min-w-[100px]">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
                        <input type="text" value={searchCreated} onChange={(e) => setSearchCreated(e.target.value)} placeholder="Search..." className="w-full pl-7 pr-2 py-1 bg-surface-hover border border-border-subtle rounded-md text-[11px] text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none" />
                      </div>
                    </th>
                    <th className="p-2 min-w-[60px] text-center"><span className="text-[10px] font-semibold text-text-muted uppercase">Link</span></th>
                  </tr>
                  <tr className="bg-surface-hover border-b border-border-medium">
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">WO #</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Bid Description</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Address</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Service</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Bids $</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Tasks</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Photos</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Created</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Go</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredOrders.map((wo: any) => {
                    const woNum = "WO-" + wo.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
                    const tasks = (wo.tasks as any[]) || [];
                    const files = wo.files || [];
                    const bids = (wo.metadata?.bids as any[]) || [];
                    const totalBidAmount = bids.reduce((s: number, b: any) => s + (b.amount || 0), 0);
                    const isCurrent = wo.id === workOrder?.id;
                    return (
                      <tr key={wo.id} className={cn("hover:bg-surface-hover transition-colors", isCurrent && "bg-cyan-500/[0.04] border-l-2 border-l-cyan-500")}>
                        <td className="px-3 py-2">
                          <span className="text-xs font-mono font-semibold text-cyan-400">{woNum}</span>
                          {isCurrent && <span className="ml-1 text-[8px] px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">CURRENT</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn("inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold rounded border", STATUS_PILL_COLORS[wo.status] || "bg-gray-500/10 text-text-secondary border-gray-500/20")}>
                            {STATUS_LABELS[wo.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {bids.length > 0 ? (
                            <div className="space-y-0.5">
                              {bids.slice(0, 3).map((bid: any, i: number) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <DollarSign className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />
                                  <span className="text-[11px] text-text-secondary truncate max-w-[180px]">{bid.title}</span>
                                  <span className="text-[9px] text-text-muted">${(bid.amount || 0).toLocaleString()}</span>
                                </div>
                              ))}
                              {bids.length > 3 && <span className="text-[9px] text-text-muted">+{bids.length - 3} more</span>}
                            </div>
                          ) : <span className="text-[11px] text-text-dim">No bids</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[11px] text-text-secondary truncate max-w-[200px] block">
                            {wo.address}{wo.city ? ", " + wo.city : ""}{wo.state ? ", " + wo.state : ""}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center"><span className="text-[10px] text-text-secondary">{SERVICE_TYPE_LABELS[wo.serviceType] || wo.serviceType}</span></td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn("text-xs font-medium", totalBidAmount > 0 ? "text-amber-400" : "text-text-dim")}>
                            {totalBidAmount > 0 ? "$" + totalBidAmount.toLocaleString() : "\u2014"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {tasks.length > 0 ? (
                            <div className="space-y-0.5">
                              {tasks.slice(0, 4).map((task: any, i: number) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <div className={cn(
                                    "w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center",
                                    task.completed
                                      ? "bg-emerald-500 border-emerald-500"
                                      : "border-gray-600 bg-transparent"
                                  )}>
                                    {task.completed && (
                                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className={cn(
                                    "text-[11px] truncate max-w-[180px]",
                                    task.completed ? "text-text-muted line-through" : "text-text-secondary"
                                  )}>
                                    {task.title || task.description || "Untitled task"}
                                  </span>
                                </div>
                              ))}
                              {tasks.length > 4 && (
                                <span className="text-[9px] text-text-muted pl-4">+{tasks.length - 4} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-text-dim">No tasks</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {files.length > 0 ? (
                            <button onClick={(e) => { e.stopPropagation(); const imgs = files.filter((f: any) => f.mimeType?.startsWith("image/")); if (imgs.length > 0) setPhotoPopup({ open: true, photos: imgs, title: woNum + " Photos" }); }} className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-cyan-400 cursor-pointer transition-colors">
                              <Camera className="h-3 w-3" />{files.length}
                            </button>
                          ) : <span className="text-[11px] text-text-dim">0</span>}
                        </td>
                        <td className="px-3 py-2 text-center"><span className="text-[10px] text-text-muted">{formatDate(wo.createdAt)}</span></td>
                        <td className="px-3 py-2 text-center">
                          <Link href={"/dashboard/work-orders/" + wo.id} onClick={onClose} className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors">
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-2.5 border-t border-border-subtle bg-surface-hover flex-shrink-0">
            <span className="text-xs text-text-muted">
              {filteredOrders.length} work order{filteredOrders.length !== 1 ? "s" : ""}
              {(searchWO || searchStatus || searchDesc || searchAddress || searchService || searchBids || searchTasks || searchPhotos || searchCreated) && " (filtered from " + historyWorkOrders.length + ")"}
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>

      {photoPopup.open && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/90 backdrop-blur-md" onClick={() => setPhotoPopup({ open: false, photos: [], title: "" })}>
          <div className="relative max-w-5xl max-h-[90vh] mx-4">
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <p className="text-sm font-medium text-white bg-black/60 px-3 py-1.5 rounded-lg">{photoPopup.title}</p>
              <button onClick={() => setPhotoPopup({ open: false, photos: [], title: "" })} className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[90vh] overflow-y-auto pt-16 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 px-2">
              {photoPopup.photos.map((photo: any, i: number) => (
                <div key={photo.id || i} className="aspect-square rounded-xl overflow-hidden bg-surface-hover border border-border-subtle">
                  <img src={photo.path || photo.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function WorkOrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div></div>}>
      <WorkOrdersContent />
    </Suspense>
  );
}
