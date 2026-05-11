"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui";
import { Button } from "@/components/ui";
import {
  Plus, X, FileSpreadsheet, ChevronUp, ChevronDown,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  Spreadsheet,
  SHEET_TEMPLATES,
  DEFAULT_COLUMNS,
  createEmptyRow,
  createDefaultSheet,
} from "@/components/spreadsheet";
import type { Cell, Column, SheetData } from "@/components/spreadsheet";

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AccountingPage() {
  const [sheets, setSheets] = useState<SheetData[]>([SHEET_TEMPLATES.transactions(), SHEET_TEMPLATES.invoices(), SHEET_TEMPLATES.expenses(), SHEET_TEMPLATES.profitLoss()]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [showAddSheetMenu, setShowAddSheetMenu] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  function updateSheet(idx: number, sheet: SheetData) { const newSheets = [...sheets]; newSheets[idx] = sheet; setSheets(newSheets); }

  function addSheet(template?: string) {
    const newSheet = template && SHEET_TEMPLATES[template] ? SHEET_TEMPLATES[template]() : { id: `sheet-${Date.now()}`, name: `Sheet ${sheets.length + 1}`, columns: DEFAULT_COLUMNS, rows: Array.from({ length: 100 }, () => createEmptyRow()) };
    setSheets([...sheets, newSheet]); setActiveSheet(sheets.length);
  }

  function deleteSheet(idx: number) { if (sheets.length <= 1) { toast.error("Cannot delete last sheet"); return; } if (!confirm(`Delete "${sheets[idx].name}"?`)) return; const newSheets = sheets.filter((_, i) => i !== idx); setSheets(newSheets); if (activeSheet >= newSheets.length) setActiveSheet(newSheets.length - 1); }
  function renameSheet(idx: number) { const name = prompt("Sheet name:", sheets[idx].name); if (!name?.trim()) return; const newSheets = [...sheets]; newSheets[idx] = { ...newSheets[idx], name: name.trim() }; setSheets(newSheets); }

  const summary = useMemo(() => {
    let totalRevenue = 0, totalExpenses = 0;
    sheets.forEach((sheet) => { sheet.rows.forEach((row) => { if (row.debit) { const val = parseFloat(row.debit.value?.replace(/[^0-9.-]/g, "") || "0"); if (!isNaN(val) && val > 0) totalRevenue += val; } if (row.credit) { const val = parseFloat(row.credit.value?.replace(/[^0-9.-]/g, "") || "0"); if (!isNaN(val) && val > 0) totalExpenses += val; } if (row.amount) { const val = parseFloat(row.amount.value?.replace(/[^0-9.-]/g, "") || "0"); if (!isNaN(val)) totalExpenses += val; } if (row.total && sheet.id === "invoices") { const val = parseFloat(row.total.value?.replace(/[^0-9.-]/g, "") || "0"); if (!isNaN(val)) totalRevenue += val; } }); });
    return { totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses };
  }, [sheets]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* ── Header (collapsible) ────────────────────────────────────── */}
      {headerCollapsed ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border-b border-border-subtle flex-shrink-0">
          <FileSpreadsheet className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-text-primary">Accounting</span>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] text-emerald-400">{formatCurrency(summary.totalRevenue)}</span>
            <span className="text-[10px] text-text-dim">·</span>
            <span className="text-[10px] text-red-400">{formatCurrency(summary.totalExpenses)}</span>
            <span className="text-[10px] text-text-dim">·</span>
            <span className={cn("text-[10px] font-medium", summary.profit >= 0 ? "text-cyan-400" : "text-red-400")}>{formatCurrency(summary.profit)}</span>
          </div>
          <button onClick={() => setHeaderCollapsed(false)} className="p-1 rounded hover:bg-surface-hover text-text-muted"><ChevronDown className="h-3.5 w-3.5" /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border-subtle flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
            <div>
              <h1 className="text-lg font-bold text-text-primary">Accounting</h1>
              <p className="text-[11px] text-text-muted">Spreadsheet for financial tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20"><p className="text-[9px] text-emerald-400">Revenue</p><p className="text-xs font-bold text-emerald-300">{formatCurrency(summary.totalRevenue)}</p></div>
              <div className="px-2.5 py-1 rounded-lg bg-red-500/[0.06] border border-red-500/20"><p className="text-[9px] text-red-400">Expenses</p><p className="text-xs font-bold text-red-300">{formatCurrency(summary.totalExpenses)}</p></div>
              <div className="px-2.5 py-1 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/20"><p className="text-[9px] text-cyan-400">Profit</p><p className={cn("text-xs font-bold", summary.profit >= 0 ? "text-cyan-300" : "text-red-300")}>{formatCurrency(summary.profit)}</p></div>
            </div>
            <button onClick={() => setHeaderCollapsed(true)} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted" title="Collapse header"><ChevronUp className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* ── Sheet tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2 pt-1 bg-surface flex-shrink-0 overflow-x-auto">
        {sheets.map((sheet, idx) => (
          <div key={sheet.id} role="button" tabIndex={0} onClick={() => setActiveSheet(idx)} onDoubleClick={() => renameSheet(idx)} onKeyDown={(e) => { if (e.key === "Enter") setActiveSheet(idx); }}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all border border-b-0 rounded-t-md whitespace-nowrap group cursor-pointer",
              activeSheet === idx ? "bg-surface-hover text-cyan-400 border-border-subtle" : "text-text-muted hover:text-text-secondary border-transparent hover:bg-surface-hover")}>
            <FileSpreadsheet className="h-3 w-3" />{sheet.name}
            {sheets.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteSheet(idx); }} className="ml-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/10 hover:text-red-400 transition-all"><X className="h-2.5 w-2.5" /></button>}
          </div>
        ))}
        <div className="relative">
          <button onClick={() => setShowAddSheetMenu(!showAddSheetMenu)} className="flex items-center gap-1 px-2 py-1.5 text-xs text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors rounded-t-md"><Plus className="h-3 w-3" /></button>
          {showAddSheetMenu && (<>
            <div className="fixed inset-0 z-10" onClick={() => setShowAddSheetMenu(false)} />
            <div className="absolute left-0 top-full z-20"><div className="bg-surface border border-border-medium rounded-lg shadow-xl mt-1 py-1 min-w-[160px]">
              <button onClick={() => { addSheet(); setShowAddSheetMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover">Blank Sheet</button>
              <div className="h-px bg-surface-hover my-1" />
              {Object.keys(SHEET_TEMPLATES).map((key) => <button key={key} onClick={() => { addSheet(key); setShowAddSheetMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover">{SHEET_TEMPLATES[key]().name}</button>)}
            </div></div>
          </>)}
        </div>
      </div>

      {/* ── Active spreadsheet ──────────────────────────────────────── */}
      <Card padding={false} className="flex-1 min-h-0 overflow-hidden rounded-t-none border-t-0">
        <Spreadsheet sheet={sheets[activeSheet]} onChange={(sheet) => updateSheet(activeSheet, sheet)} />
      </Card>
    </div>
  );
}
