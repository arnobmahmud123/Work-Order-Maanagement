import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  GRASS_CUT: "Grass Cut",
  DEBRIS_REMOVAL: "Debris Removal",
  WINTERIZATION: "Winterization",
  BOARD_UP: "Board-Up",
  INSPECTION: "Inspection",
  MOLD_REMEDIATION: "Mold Remediation",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  FIELD_COMPLETE: "Field Complete",
  QC_REVIEW: "QC Review",
  PENDING_REVIEW: "Pending Review",
  REVISIONS_NEEDED: "Revisions Needed",
  OFFICE_COMPLETE: "Office Complete",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  ASSETS: "Assets",
};

export const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  ASSIGNED: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  IN_PROGRESS: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  FIELD_COMPLETE: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  QC_REVIEW: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  PENDING_REVIEW: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  REVISIONS_NEEDED: "bg-red-500/10 text-red-400 border border-red-500/20",
  OFFICE_COMPLETE: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  CLOSED: "bg-gray-500/10 text-text-secondary border border-gray-500/20",
  CANCELLED: "bg-gray-500/10 text-text-muted border border-gray-500/20",
  ASSETS: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export const TICKET_PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-500/10 text-text-secondary border border-gray-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  URGENT: "bg-red-500/10 text-red-400 border border-red-500/20",
};

export const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  WAITING: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  RESOLVED: "bg-green-500/10 text-green-400 border border-green-500/20",
  CLOSED: "bg-gray-500/10 text-text-secondary border border-gray-500/20",
};

// ─── Overdue Countdown ──────────────────────────────────────────────────────

export interface OverdueInfo {
  isOverdue: boolean;
  isDueSoon: boolean; // within 24 hours
  overdueText: string;
  dueInText: string;
  diffMs: number;
}

export function getOverdueInfo(dueDate: Date | string | null | undefined, status?: string): OverdueInfo {
  const none = { isOverdue: false, isDueSoon: false, overdueText: "", dueInText: "", diffMs: 0 };
  if (!dueDate) return none;

  // Closed/completed orders aren't overdue
  const closedStatuses = ["CLOSED", "CANCELLED", "OFFICE_COMPLETE"];
  if (status && closedStatuses.includes(status)) return none;

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = now.getTime() - due.getTime();
  const absDiff = Math.abs(diffMs);

  const days = Math.floor(absDiff / 86400000);
  const hours = Math.floor((absDiff % 86400000) / 3600000);
  const minutes = Math.floor((absDiff % 3600000) / 60000);

  const isOverdue = diffMs > 0;
  const isDueSoon = !isOverdue && diffMs > 0 && absDiff < 86400000; // within 24h

  let overdueText = "";
  let dueInText = "";

  if (isOverdue) {
    if (days > 0) overdueText = `${days}d ${hours}h overdue`;
    else if (hours > 0) overdueText = `${hours}h ${minutes}m overdue`;
    else overdueText = `${minutes}m overdue`;
  } else {
    if (days > 0) dueInText = `due in ${days}d ${hours}h`;
    else if (hours > 0) dueInText = `due in ${hours}h ${minutes}m`;
    else dueInText = `due in ${minutes}m`;
  }

  return { isOverdue, isDueSoon, overdueText, dueInText, diffMs };
}

export function formatOverdueCountdown(dueDate: Date | string | null | undefined, status?: string): string {
  const info = getOverdueInfo(dueDate, status);
  if (info.isOverdue) return info.overdueText;
  if (info.dueInText) return info.dueInText;
  return "";
}
