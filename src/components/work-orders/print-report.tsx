"use client";

import {
  formatDate,
  formatDateTime,
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
} from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PrintData {
  workOrder: any;
  tasks: any[];
  bids: any[];
  photos: any[];
  complianceItems: any[];
  invoices?: any[];
}

// ─── Color palette ───────────────────────────────────────────────────────────

const COLORS = {
  primary: "#0891b2",
  primaryLight: "#ecfeff",
  accent: "#6366f1",
  accentLight: "#eef2ff",
  success: "#059669",
  successLight: "#d1fae5",
  warning: "#d97706",
  warningLight: "#fef3c7",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  dark: "#0f172a",
  gray: "#64748b",
  grayLight: "#f1f5f9",
  border: "#e2e8f0",
  white: "#ffffff",
};

// ─── Print Work Order ────────────────────────────────────────────────────────

export function printWorkOrder(data: PrintData) {
  const { workOrder: wo, tasks, bids, photos, complianceItems, invoices } = data;

  const serviceLabel =
    SERVICE_TYPE_LABELS[wo.serviceType] ||
    wo.serviceType?.replace(/_/g, " ")?.toLowerCase()?.replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
    wo.serviceType;

  const completedTasks = tasks.filter((t) => t.completed).length;
  const approvedBids = bids.filter((b) => b.status === "APPROVED");
  const totalBidAmount = bids.reduce((s, b) => s + b.amount, 0);
  const approvedBidAmount = approvedBids.reduce((s, b) => s + b.amount, 0);
  const complianceDone = complianceItems.filter((c) => c.completed).length;
  const complianceTotal = complianceItems.length;
  const compliancePct = complianceTotal > 0 ? Math.round((complianceDone / complianceTotal) * 100) : 0;

  const now = new Date().toLocaleString();
  const woNumber = wo.id?.slice(-8)?.toUpperCase() || "—";

  // Build task sections with inline photos
  const taskSections = tasks.map((task, i) => {
    const taskPhotos = task.photos || [];
    const beforeP = taskPhotos.filter((p: any) => p.category === "BEFORE");
    const duringP = taskPhotos.filter((p: any) => p.category === "DURING");
    const afterP = taskPhotos.filter((p: any) => p.category === "AFTER");
    const hasPhotos = beforeP.length + duringP.length + afterP.length > 0;

    return `
      <div class="task-card" style="margin-bottom:20px;page-break-inside:avoid;">
        <div class="task-header">
          <div class="task-status ${task.completed ? "done" : "pending"}">
            ${task.completed ? "✓" : "○"}
          </div>
          <div class="task-info">
            <div class="task-title ${task.completed ? "completed" : ""}">${esc(task.title)}</div>
            ${task.description ? `<div class="task-desc">${esc(task.description)}</div>` : ""}
            ${task.completedAt ? `<div class="task-meta">Completed: ${formatDateTime(task.completedAt)}</div>` : ""}
          </div>
          <div class="task-number">#${i + 1}</div>
        </div>
        ${hasPhotos ? `
        <div class="task-photos">
          ${renderPhotoSection("Before", beforeP, COLORS.warning, "📋")}
          ${renderPhotoSection("During", duringP, COLORS.primary, "🔧")}
          ${renderPhotoSection("After", afterP, COLORS.success, "✅")}
        </div>` : ""}
      </div>
    `;
  }).join("");

  // Build bid sections with inline photos
  const bidSections = bids.map((bid) => {
    const bidPhotos = bid.photos || [];
    const hasPhotos = bidPhotos.length > 0;
    const statusClass = bid.status === "APPROVED" ? "approved" : bid.status === "REJECTED" ? "rejected" : "pending";

    return `
      <div class="bid-card" style="margin-bottom:16px;page-break-inside:avoid;">
        <div class="bid-header">
          <div class="bid-info">
            <div class="bid-title">${esc(bid.title)}</div>
            ${bid.description ? `<div class="bid-desc">${esc(bid.description)}</div>` : ""}
          </div>
          <div class="bid-right">
            <div class="bid-amount">$${bid.amount.toLocaleString()}</div>
            <span class="bid-status ${statusClass}">${bid.status}</span>
          </div>
        </div>
        ${hasPhotos ? `
        <div class="task-photos" style="margin-top:12px;">
          ${renderPhotoSection("Photos", bidPhotos, COLORS.accent, "📷")}
        </div>` : ""}
      </div>
    `;
  }).join("");

  // Build inspection sections with inline photos
  const inspectionSections = complianceItems.map((item, i) => {
    // Find photos tagged for this compliance item
    const itemPhotos = photos.filter((p: any) =>
      p.name?.startsWith(`compliance-${i}-`) || p.category === "INSPECTION"
    );
    const hasPhotos = itemPhotos.length > 0;

    return `
      <div class="inspection-card" style="margin-bottom:12px;page-break-inside:avoid;">
        <div class="inspection-row">
          <div class="inspection-check ${item.completed ? "done" : ""}">${item.completed ? "✓" : "○"}</div>
          <div class="inspection-info">
            <div class="inspection-title ${item.completed ? "completed" : ""}">${esc(item.label)}</div>
            ${item.description ? `<div class="inspection-desc">${esc(item.description)}</div>` : ""}
          </div>
          ${item.required ? `<span class="required-badge">Required</span>` : ""}
        </div>
        ${hasPhotos ? `
        <div class="task-photos" style="margin-top:8px;margin-left:32px;">
          ${renderPhotoSection("Evidence", itemPhotos, COLORS.primary, "📷")}
        </div>` : ""}
      </div>
    `;
  }).join("");

  // Invoice section
  const invoiceSection = (invoices && invoices.length > 0) ? `
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:${COLORS.accentLight};color:${COLORS.accent}">💰</div>
        <div>
          <div class="section-title">Invoice</div>
          <div class="section-subtitle">${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}</div>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Description</th>
            <th>Status</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoices.map((inv: any) => `
            <tr>
              <td style="font-weight:600;font-family:monospace;">${esc(inv.invoiceNumber || inv.id?.slice(-6) || "—")}</td>
              <td>${esc(inv.description || inv.notes || "—")}</td>
              <td><span class="status-pill ${inv.status?.toLowerCase() || "pending"}">${inv.status || "DRAFT"}</span></td>
              <td style="text-align:right;font-weight:700;">$${(inv.total || 0).toLocaleString()}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align:right;font-weight:700;">Total:</td>
            <td style="text-align:right;font-weight:800;font-size:16px;color:${COLORS.dark};">$${invoices.reduce((s: number, i: any) => s + (i.total || 0), 0).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  ` : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Work Order #${woNumber} — ${esc(wo.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: ${COLORS.dark};
      background: ${COLORS.white};
      padding: 0;
      font-size: 13px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ─── Cover / Header ────────────────────────────────────────── */
    .cover {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      color: white;
      padding: 48px 48px 40px;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%);
      border-radius: 50%;
    }
    .cover::after {
      content: '';
      position: absolute;
      bottom: -30%;
      left: -10%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
      border-radius: 50%;
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      position: relative;
      z-index: 1;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
    }
    .brand-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, ${COLORS.primary}, #6366f1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 12px rgba(6,182,212,0.3);
    }
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #67e8f9, #a5b4fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .cover-title {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.2;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .cover-address {
      font-size: 15px;
      color: #94a3b8;
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .cover-meta {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      position: relative;
      z-index: 1;
    }
    .cover-meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cover-meta-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      font-weight: 600;
    }
    .cover-meta-value {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
    }
    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border-radius: 24px;
      font-size: 13px;
      font-weight: 700;
      background: rgba(6,182,212,0.15);
      color: #67e8f9;
      border: 1px solid rgba(6,182,212,0.25);
      position: relative;
      z-index: 1;
    }
    .cover-id {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 12px;
      color: #475569;
      margin-top: 16px;
      position: relative;
      z-index: 1;
    }

    /* ─── Content Area ──────────────────────────────────────────── */
    .content {
      padding: 36px 48px;
    }

    /* ─── Summary Cards ─────────────────────────────────────────── */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 36px;
    }
    .summary-card {
      padding: 20px;
      border-radius: 16px;
      border: 1px solid ${COLORS.border};
      background: ${COLORS.white};
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .summary-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }
    .summary-card.tasks::before { background: linear-gradient(90deg, ${COLORS.primary}, #06b6d4); }
    .summary-card.bids::before { background: linear-gradient(90deg, ${COLORS.accent}, #818cf8); }
    .summary-card.photos::before { background: linear-gradient(90deg, ${COLORS.success}, #34d399); }
    .summary-card.compliance::before { background: linear-gradient(90deg, ${COLORS.warning}, #f59e0b); }
    .summary-number {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1;
      margin-bottom: 4px;
    }
    .summary-card.tasks .summary-number { color: ${COLORS.primary}; }
    .summary-card.bids .summary-number { color: ${COLORS.accent}; }
    .summary-card.photos .summary-number { color: ${COLORS.success}; }
    .summary-card.compliance .summary-number { color: ${COLORS.warning}; }
    .summary-label {
      font-size: 11px;
      font-weight: 600;
      color: ${COLORS.gray};
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* ─── Sections ──────────────────────────────────────────────── */
    .section {
      margin-bottom: 32px;
      page-break-inside: avoid;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 2px solid ${COLORS.border};
    }
    .section-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: ${COLORS.dark};
    }
    .section-subtitle {
      font-size: 12px;
      color: ${COLORS.gray};
      margin-top: 1px;
    }

    /* ─── Details Grid ──────────────────────────────────────────── */
    .details-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .detail-card {
      padding: 14px 16px;
      background: ${COLORS.grayLight};
      border-radius: 12px;
      border: 1px solid ${COLORS.border};
    }
    .detail-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${COLORS.gray};
      font-weight: 600;
      margin-bottom: 3px;
    }
    .detail-value {
      font-size: 14px;
      font-weight: 700;
      color: ${COLORS.dark};
    }
    .detail-value.mono {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 13px;
      letter-spacing: 0.05em;
    }
    .detail-wide {
      grid-column: 1 / -1;
    }
    .detail-desc {
      font-size: 13px;
      color: #334155;
      line-height: 1.7;
      white-space: pre-wrap;
    }

    /* ─── Task Cards ────────────────────────────────────────────── */
    .task-card {
      border: 1px solid ${COLORS.border};
      border-radius: 16px;
      overflow: hidden;
      background: ${COLORS.white};
    }
    .task-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 18px 20px;
      background: ${COLORS.grayLight};
      border-bottom: 1px solid ${COLORS.border};
    }
    .task-status {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .task-status.done {
      background: ${COLORS.successLight};
      color: ${COLORS.success};
      border: 2px solid ${COLORS.success};
    }
    .task-status.pending {
      background: ${COLORS.white};
      color: ${COLORS.gray};
      border: 2px solid ${COLORS.border};
    }
    .task-info { flex: 1; min-width: 0; }
    .task-title {
      font-size: 15px;
      font-weight: 700;
      color: ${COLORS.dark};
      margin-bottom: 2px;
    }
    .task-title.completed {
      text-decoration: line-through;
      color: ${COLORS.gray};
    }
    .task-desc {
      font-size: 12px;
      color: ${COLORS.gray};
      line-height: 1.5;
      margin-top: 4px;
      padding: 8px 12px;
      background: ${COLORS.white};
      border-radius: 8px;
      border: 1px solid ${COLORS.border};
    }
    .task-meta {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .task-number {
      font-size: 12px;
      font-weight: 700;
      color: ${COLORS.gray};
      background: ${COLORS.white};
      border: 1px solid ${COLORS.border};
      padding: 4px 10px;
      border-radius: 8px;
      flex-shrink: 0;
    }
    .task-photos {
      padding: 16px 20px;
    }

    /* ─── Photo Sections ────────────────────────────────────────── */
    .photo-section {
      margin-bottom: 14px;
    }
    .photo-section:last-child { margin-bottom: 0; }
    .photo-section-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 8px;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-flex;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .photo-cell {
      aspect-ratio: 4/3;
      border-radius: 10px;
      overflow: hidden;
      border: 2px solid ${COLORS.border};
      background: ${COLORS.grayLight};
      position: relative;
    }
    .photo-cell img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .photo-cell .photo-label {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 3px 8px;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
      color: white;
      font-size: 9px;
      font-weight: 600;
      text-align: center;
    }

    /* ─── Bid Cards ─────────────────────────────────────────────── */
    .bid-card {
      border: 1px solid ${COLORS.border};
      border-radius: 16px;
      overflow: hidden;
      background: ${COLORS.white};
      padding: 18px 20px;
    }
    .bid-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .bid-info { flex: 1; }
    .bid-title {
      font-size: 15px;
      font-weight: 700;
      color: ${COLORS.dark};
    }
    .bid-desc {
      font-size: 12px;
      color: ${COLORS.gray};
      margin-top: 4px;
    }
    .bid-right {
      text-align: right;
      flex-shrink: 0;
    }
    .bid-amount {
      font-size: 22px;
      font-weight: 800;
      color: ${COLORS.dark};
      letter-spacing: -0.02em;
    }
    .bid-status {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .bid-status.approved { background: ${COLORS.successLight}; color: ${COLORS.success}; }
    .bid-status.pending { background: ${COLORS.warningLight}; color: ${COLORS.warning}; }
    .bid-status.rejected { background: ${COLORS.dangerLight}; color: ${COLORS.danger}; }

    /* ─── Inspection Cards ──────────────────────────────────────── */
    .inspection-card {
      padding: 14px 18px;
      border: 1px solid ${COLORS.border};
      border-radius: 12px;
      background: ${COLORS.white};
    }
    .inspection-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .inspection-check {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      flex-shrink: 0;
      background: ${COLORS.white};
      border: 2px solid ${COLORS.border};
      color: ${COLORS.gray};
    }
    .inspection-check.done {
      background: ${COLORS.successLight};
      border-color: ${COLORS.success};
      color: ${COLORS.success};
    }
    .inspection-info { flex: 1; }
    .inspection-title {
      font-size: 14px;
      font-weight: 600;
      color: ${COLORS.dark};
    }
    .inspection-title.completed {
      text-decoration: line-through;
      color: ${COLORS.gray};
    }
    .inspection-desc {
      font-size: 12px;
      color: ${COLORS.gray};
      margin-top: 2px;
    }
    .required-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: ${COLORS.dangerLight};
      color: ${COLORS.danger};
      text-transform: uppercase;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    /* ─── Data Table ────────────────────────────────────────────── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .data-table th {
      background: ${COLORS.grayLight};
      padding: 10px 14px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${COLORS.gray};
      border-bottom: 2px solid ${COLORS.border};
    }
    .data-table td {
      padding: 10px 14px;
      border-bottom: 1px solid ${COLORS.border};
      vertical-align: middle;
    }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tfoot td {
      border-top: 2px solid ${COLORS.border};
      border-bottom: none;
      padding: 12px 14px;
    }
    .status-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .status-pill.paid { background: ${COLORS.successLight}; color: ${COLORS.success}; }
    .status-pill.approved { background: ${COLORS.successLight}; color: ${COLORS.success}; }
    .status-pill.sent { background: ${COLORS.primaryLight}; color: ${COLORS.primary}; }
    .status-pill.pending { background: ${COLORS.warningLight}; color: ${COLORS.warning}; }
    .status-pill.overdue { background: ${COLORS.dangerLight}; color: ${COLORS.danger}; }
    .status-pill.draft { background: ${COLORS.grayLight}; color: ${COLORS.gray}; }
    .status-pill.rejected { background: ${COLORS.dangerLight}; color: ${COLORS.danger}; }

    /* ─── Compliance Summary Bar ────────────────────────────────── */
    .compliance-bar-container {
      margin-top: 16px;
      padding: 16px 20px;
      background: ${COLORS.grayLight};
      border-radius: 12px;
      border: 1px solid ${COLORS.border};
    }
    .compliance-bar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .compliance-bar-label {
      font-size: 12px;
      font-weight: 600;
      color: ${COLORS.gray};
    }
    .compliance-bar-pct {
      font-size: 14px;
      font-weight: 800;
      color: ${COLORS.dark};
    }
    .compliance-bar {
      height: 10px;
      background: ${COLORS.border};
      border-radius: 99px;
      overflow: hidden;
    }
    .compliance-bar-fill {
      height: 100%;
      border-radius: 99px;
      background: linear-gradient(90deg, ${COLORS.success}, #34d399);
      transition: width 0.5s;
    }

    /* ─── Access Codes Box ──────────────────────────────────────── */
    .access-box {
      margin-top: 16px;
      padding: 16px 20px;
      background: #fefce8;
      border: 1px solid #fde68a;
      border-radius: 12px;
    }
    .access-box-title {
      font-size: 12px;
      font-weight: 700;
      color: ${COLORS.warning};
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .access-codes {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .access-code-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .access-code-label {
      font-size: 11px;
      color: ${COLORS.gray};
      font-weight: 600;
    }
    .access-code-value {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 14px;
      font-weight: 700;
      color: ${COLORS.dark};
      background: white;
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid #fde68a;
      letter-spacing: 0.08em;
    }

    /* ─── Footer ────────────────────────────────────────────────── */
    .footer {
      margin-top: 40px;
      padding: 24px 48px;
      border-top: 2px solid ${COLORS.border};
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: ${COLORS.gray};
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 12px;
      color: ${COLORS.dark};
    }

    /* ─── Page Break Helpers ────────────────────────────────────── */
    .page-break {
      page-break-before: always;
    }
    .avoid-break {
      page-break-inside: avoid;
    }

    /* ─── Print Overrides ───────────────────────────────────────── */
    @media print {
      body { padding: 0; }
      .cover { padding: 36px 36px 32px; }
      .content { padding: 28px 36px; }
      .footer { padding: 16px 36px; }
      .no-print { display: none !important; }
      .task-card, .bid-card, .inspection-card { page-break-inside: avoid; }
      .section { page-break-inside: avoid; }
      .photo-cell { border-color: #d1d5db; }
    }
  </style>
</head>
<body>

  <!-- ═══════════════════════ COVER / HEADER ═══════════════════════ -->
  <div class="cover">
    <div class="cover-top">
      <div>
        <div class="brand">
          <div class="brand-icon">🛡️</div>
          <div class="brand-name">PropPreserve</div>
        </div>
        <div class="cover-title">${esc(wo.title)}</div>
        <div class="cover-address">
          📍 ${esc(wo.address)}${wo.city ? `, ${esc(wo.city)}` : ""}${wo.state ? `, ${esc(wo.state)}` : ""}${wo.zipCode ? ` ${esc(wo.zipCode)}` : ""}
        </div>
        <div class="cover-meta">
          <div class="cover-meta-item">
            <span class="cover-meta-label">Service Type</span>
            <span class="cover-meta-value">${esc(serviceLabel)}</span>
          </div>
          <div class="cover-meta-item">
            <span class="cover-meta-label">Work Order</span>
            <span class="cover-meta-value" style="font-family:monospace;">#${woNumber}</span>
          </div>
          ${wo.dueDate ? `
          <div class="cover-meta-item">
            <span class="cover-meta-label">Due Date</span>
            <span class="cover-meta-value">${formatDate(wo.dueDate)}</span>
          </div>` : ""}
          ${wo.contractor ? `
          <div class="cover-meta-item">
            <span class="cover-meta-label">Contractor</span>
            <span class="cover-meta-value">${esc(wo.contractor.name)}</span>
          </div>` : ""}
          ${wo.coordinator ? `
          <div class="cover-meta-item">
            <span class="cover-meta-label">Coordinator</span>
            <span class="cover-meta-value">${esc(wo.coordinator.name)}</span>
          </div>` : ""}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div class="cover-badge">
          <span style="font-size:14px;">●</span>
          ${STATUS_LABELS[wo.status] || wo.status}
        </div>
        <div class="cover-id">ID: ${wo.id}</div>
        <div style="margin-top:12px;font-size:11px;color:#475569;">
          Printed: ${now}
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════ CONTENT ═══════════════════════════════ -->
  <div class="content">

    <!-- ─── Summary Cards ──────────────────────────────────────── -->
    <div class="summary-grid">
      <div class="summary-card tasks">
        <div class="summary-number">${completedTasks}/${tasks.length}</div>
        <div class="summary-label">Tasks Complete</div>
      </div>
      <div class="summary-card bids">
        <div class="summary-number">$${totalBidAmount.toLocaleString()}</div>
        <div class="summary-label">Total Bids</div>
      </div>
      <div class="summary-card photos">
        <div class="summary-number">${photos.length + tasks.reduce((s, t) => s + (t.photos?.length || 0), 0) + bids.reduce((s, b) => s + (b.photos?.length || 0), 0)}</div>
        <div class="summary-label">Total Photos</div>
      </div>
      <div class="summary-card compliance">
        <div class="summary-number">${compliancePct}%</div>
        <div class="summary-label">Compliance</div>
      </div>
    </div>

    <!-- ─── Work Order Details ─────────────────────────────────── -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:${COLORS.primaryLight};color:${COLORS.primary};">📋</div>
        <div>
          <div class="section-title">Work Order Details</div>
          <div class="section-subtitle">Instructions and property information</div>
        </div>
      </div>
      <div class="details-grid">
        <div class="detail-card">
          <div class="detail-label">Service Type</div>
          <div class="detail-value">${esc(serviceLabel)}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Status</div>
          <div class="detail-value">${STATUS_LABELS[wo.status] || wo.status}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Due Date</div>
          <div class="detail-value">${wo.dueDate ? formatDate(wo.dueDate) : "Not set"}</div>
        </div>
        ${wo.contractor ? `
        <div class="detail-card">
          <div class="detail-label">Contractor</div>
          <div class="detail-value">${esc(wo.contractor.name)}</div>
        </div>` : ""}
        ${wo.coordinator ? `
        <div class="detail-card">
          <div class="detail-label">Coordinator</div>
          <div class="detail-value">${esc(wo.coordinator.name)}</div>
        </div>` : ""}
        ${wo.processor ? `
        <div class="detail-card">
          <div class="detail-label">Processor</div>
          <div class="detail-value">${esc(wo.processor.name)}</div>
        </div>` : ""}
        <div class="detail-card">
          <div class="detail-label">Created</div>
          <div class="detail-value">${wo.createdAt ? formatDateTime(wo.createdAt) : "—"}</div>
        </div>
        ${wo.completedAt ? `
        <div class="detail-card">
          <div class="detail-label">Completed</div>
          <div class="detail-value">${formatDateTime(wo.completedAt)}</div>
        </div>` : ""}
        ${wo.description ? `
        <div class="detail-card detail-wide">
          <div class="detail-label">Description</div>
          <div class="detail-desc">${esc(wo.description)}</div>
        </div>` : ""}
        ${wo.specialInstructions ? `
        <div class="detail-card detail-wide">
          <div class="detail-label">Special Instructions</div>
          <div class="detail-desc">${esc(wo.specialInstructions)}</div>
        </div>` : ""}
      </div>

      ${(wo.lockCode || wo.gateCode || wo.keyCode) ? `
      <div class="access-box">
        <div class="access-box-title">🔑 Access Codes</div>
        <div class="access-codes">
          ${wo.lockCode ? `<div class="access-code-item"><span class="access-code-label">Lock:</span><span class="access-code-value">${esc(wo.lockCode)}</span></div>` : ""}
          ${wo.gateCode ? `<div class="access-code-item"><span class="access-code-label">Gate:</span><span class="access-code-value">${esc(wo.gateCode)}</span></div>` : ""}
          ${wo.keyCode ? `<div class="access-code-item"><span class="access-code-label">Key:</span><span class="access-code-value">${esc(wo.keyCode)}</span></div>` : ""}
        </div>
      </div>` : ""}
    </div>

    <!-- ─── Tasks ──────────────────────────────────────────────── -->
    ${tasks.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:${COLORS.successLight};color:${COLORS.success};">✅</div>
        <div>
          <div class="section-title">Tasks & Completion Items</div>
          <div class="section-subtitle">${completedTasks} of ${tasks.length} completed</div>
        </div>
      </div>

      <!-- Task progress bar -->
      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:12px;font-weight:600;color:${COLORS.gray};">Progress</span>
          <span style="font-size:14px;font-weight:800;color:${COLORS.dark};">${tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%</span>
        </div>
        <div style="height:8px;background:${COLORS.border};border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%;background:linear-gradient(90deg,${COLORS.success},#34d399);border-radius:99px;"></div>
        </div>
      </div>

      ${taskSections}
    </div>` : ""}

    <!-- ─── Bids ───────────────────────────────────────────────── -->
    ${bids.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:${COLORS.accentLight};color:${COLORS.accent};">💰</div>
        <div>
          <div class="section-title">Bid Items</div>
          <div class="section-subtitle">$${totalBidAmount.toLocaleString()} total · ${approvedBids.length} approved</div>
        </div>
      </div>
      ${bidSections}
      ${approvedBids.length > 0 ? `
      <div style="margin-top:16px;padding:16px 20px;background:${COLORS.successLight};border-radius:12px;border:1px solid #a7f3d0;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:600;color:${COLORS.success};">Approved Total</span>
        <span style="font-size:24px;font-weight:800;color:${COLORS.success};">$${approvedBidAmount.toLocaleString()}</span>
      </div>` : ""}
    </div>` : ""}

    <!-- ─── Inspection ─────────────────────────────────────────── -->
    ${complianceItems.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:${COLORS.warningLight};color:${COLORS.warning};">🔍</div>
        <div>
          <div class="section-title">Inspection Checklist</div>
          <div class="section-subtitle">${complianceDone} of ${complianceTotal} items complete</div>
        </div>
      </div>
      ${inspectionSections}
      <div class="compliance-bar-container">
        <div class="compliance-bar-header">
          <span class="compliance-bar-label">Overall Completion</span>
          <span class="compliance-bar-pct">${compliancePct}%</span>
        </div>
        <div class="compliance-bar">
          <div class="compliance-bar-fill" style="width:${compliancePct}%;"></div>
        </div>
      </div>
    </div>` : ""}

    <!-- ─── Invoice ────────────────────────────────────────────── -->
    ${invoiceSection}

  </div>

  <!-- ═══════════════════════ FOOTER ═══════════════════════════════ -->
  <div class="footer">
    <div class="footer-brand">
      🛡️ PropPreserve — Work Order Report
    </div>
    <div>
      #${woNumber} · Printed ${now}
    </div>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  // Open in new window and print
  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// ─── Render Photo Section Helper ─────────────────────────────────────────────

function renderPhotoSection(label: string, photos: any[], color: string, icon: string): string {
  if (photos.length === 0) return "";

  const photoCells = photos.map((p) => `
    <div class="photo-cell">
      <img src="${p.url || p.path}" alt="${esc(p.name || p.originalName || "Photo")}" loading="lazy" />
    </div>
  `).join("");

  return `
    <div class="photo-section">
      <div class="photo-section-label" style="background:${color}15;color:${color};">
        ${icon} ${label} (${photos.length})
      </div>
      <div class="photo-grid">
        ${photoCells}
      </div>
    </div>
  `;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
