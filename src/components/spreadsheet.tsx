"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Download, Upload, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Bold, X, FileSpreadsheet,
  Maximize2, Minimize2,
  Eye, EyeOff,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Cell {
  value: string;
  formula?: string;
  format?: "currency" | "percent" | "number" | "text";
  bold?: boolean;
  italic?: boolean;
  bgColor?: string;
}

export interface Column {
  key: string;
  label: string;
  width: number;
  type: "text" | "number" | "currency" | "date" | "select";
  options?: string[];
}

export interface SheetData {
  id: string;
  name: string;
  columns: Column[];
  rows: Record<string, Cell>[];
}

// ─── Default Sheets ──────────────────────────────────────────────────────────

export const DEFAULT_COLUMNS: Column[] = [
  { key: "date", label: "Date", width: 120, type: "date" },
  { key: "description", label: "Description", width: 250, type: "text" },
  { key: "category", label: "Category", width: 150, type: "select", options: ["Revenue", "Expense", "Payroll", "Materials", "Equipment", "Subcontractor", "Overhead", "Other"] },
  { key: "reference", label: "Reference #", width: 130, type: "text" },
  { key: "vendor", label: "Vendor / Client", width: 180, type: "text" },
  { key: "debit", label: "Debit ($)", width: 120, type: "currency" },
  { key: "credit", label: "Credit ($)", width: 120, type: "currency" },
  { key: "balance", label: "Balance ($)", width: 130, type: "currency" },
  { key: "notes", label: "Notes", width: 200, type: "text" },
];

export function createEmptyRow(columns?: Column[]): Record<string, Cell> {
  const row: Record<string, Cell> = {};
  (columns || DEFAULT_COLUMNS).forEach((col) => {
    row[col.key] = { value: "" };
  });
  return row;
}

export function createDefaultSheet(): SheetData {
  return {
    id: "transactions",
    name: "Transactions",
    columns: DEFAULT_COLUMNS,
    rows: Array.from({ length: 100 }, () => createEmptyRow()),
  };
}

export const SHEET_TEMPLATES: Record<string, () => SheetData> = {
  transactions: createDefaultSheet,
  invoices: () => ({
    id: "invoices",
    name: "Invoices",
    columns: [
      { key: "invoiceNo", label: "Invoice #", width: 120, type: "text" },
      { key: "date", label: "Date", width: 120, type: "date" },
      { key: "client", label: "Client", width: 180, type: "text" },
      { key: "property", label: "Property", width: 200, type: "text" },
      { key: "description", label: "Description", width: 250, type: "text" },
      { key: "amount", label: "Amount ($)", width: 120, type: "currency" },
      { key: "tax", label: "Tax ($)", width: 100, type: "currency" },
      { key: "total", label: "Total ($)", width: 130, type: "currency" },
      { key: "status", label: "Status", width: 110, type: "select", options: ["Draft", "Sent", "Paid", "Overdue", "Cancelled"] },
      { key: "paidDate", label: "Paid Date", width: 120, type: "date" },
    ],
    rows: Array.from({ length: 50 }, () => {
      const row: Record<string, Cell> = {};
      ["invoiceNo", "date", "client", "property", "description", "amount", "tax", "total", "status", "paidDate"].forEach((k) => { row[k] = { value: "" }; });
      return row;
    }),
  }),
  expenses: () => ({
    id: "expenses",
    name: "Expenses",
    columns: [
      { key: "date", label: "Date", width: 120, type: "date" },
      { key: "vendor", label: "Vendor", width: 180, type: "text" },
      { key: "category", label: "Category", width: 150, type: "select", options: ["Materials", "Equipment", "Labor", "Subcontractor", "Fuel", "Insurance", "Office", "Marketing", "Other"] },
      { key: "description", label: "Description", width: 250, type: "text" },
      { key: "amount", label: "Amount ($)", width: 120, type: "currency" },
      { key: "paymentMethod", label: "Payment Method", width: 140, type: "select", options: ["Check", "Credit Card", "ACH", "Cash", "Wire"] },
      { key: "reference", label: "Reference #", width: 130, type: "text" },
      { key: "workOrder", label: "Work Order", width: 150, type: "text" },
      { key: "deductible", label: "Deductible", width: 100, type: "select", options: ["Yes", "No"] },
    ],
    rows: Array.from({ length: 50 }, () => {
      const row: Record<string, Cell> = {};
      ["date", "vendor", "category", "description", "amount", "paymentMethod", "reference", "workOrder", "deductible"].forEach((k) => { row[k] = { value: "" }; });
      return row;
    }),
  }),
  profitLoss: () => ({
    id: "profitLoss",
    name: "Profit & Loss",
    columns: [
      { key: "category", label: "Category", width: 250, type: "text" },
      { key: "jan", label: "Jan", width: 100, type: "currency" },
      { key: "feb", label: "Feb", width: 100, type: "currency" },
      { key: "mar", label: "Mar", width: 100, type: "currency" },
      { key: "apr", label: "Apr", width: 100, type: "currency" },
      { key: "may", label: "May", width: 100, type: "currency" },
      { key: "jun", label: "Jun", width: 100, type: "currency" },
      { key: "jul", label: "Jul", width: 100, type: "currency" },
      { key: "aug", label: "Aug", width: 100, type: "currency" },
      { key: "sep", label: "Sep", width: 100, type: "currency" },
      { key: "oct", label: "Oct", width: 100, type: "currency" },
      { key: "nov", label: "Nov", width: 100, type: "currency" },
      { key: "dec", label: "Dec", width: 100, type: "currency" },
      { key: "total", label: "Total", width: 130, type: "currency" },
    ],
    rows: [
      ...["Revenue", "  Grass Cut Services", "  Debris Removal", "  Winterization", "  Board-Up", "  Inspections", "  Other Services", "TOTAL REVENUE"].map((cat) => {
        const row: Record<string, Cell> = {};
        ["category", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "total"].forEach((k) => { row[k] = { value: k === "category" ? cat : "", bold: cat.startsWith("TOTAL") }; });
        return row;
      }),
      ...["", "EXPENSES", "  Materials & Supplies", "  Equipment", "  Labor / Payroll", "  Subcontractors", "  Fuel & Transportation", "  Insurance", "  Office & Admin", "  Marketing", "  Other Expenses", "TOTAL EXPENSES", "", "NET PROFIT / (LOSS)"].map((cat) => {
        const row: Record<string, Cell> = {};
        ["category", "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "total"].forEach((k) => { row[k] = { value: k === "category" ? cat : "", bold: cat.startsWith("TOTAL") || cat === "NET PROFIT / (LOSS)" || cat === "EXPENSES" }; });
        return row;
      }),
    ],
  }),
};

// ─── Spreadsheet Component ───────────────────────────────────────────────────

type CellRef = { row: number; col: string };
type CellLocation = { row: number; colKey: string };

interface SpreadsheetProps {
  sheet: SheetData;
  onChange: (sheet: SheetData) => void;
}

export function Spreadsheet({ sheet, onChange }: SpreadsheetProps) {
  const [activeCell, setActiveCell] = useState<CellRef | null>(null);
  const [editingCell, setEditingCell] = useState<CellRef | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [clipboard, setClipboard] = useState<Cell | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [formulaBarVisible, setFormulaBarVisible] = useState(true);
  const [showGridLines, setShowGridLines] = useState(true);
  const [cellSize, setCellSize] = useState<"compact" | "normal" | "comfortable">("normal");
  const [isFormulaEditing, setIsFormulaEditing] = useState(false);
  const [dragStart, setDragStart] = useState<CellRef | null>(null);
  const [dragEnd, setDragEnd] = useState<CellRef | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const getWidth = (col: Column) => colWidths[col.key] || col.width;
  const cellPadding = cellSize === "compact" ? "px-2 py-1" : cellSize === "comfortable" ? "px-3 py-2.5" : "px-2 py-1.5";

  const displayRows = useMemo(() => {
    let rows = sheet.rows.map((row, idx) => ({ ...row, _idx: idx })) as (Record<string, Cell> & { _idx: number })[];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((row) => Object.values(row).some((cell) => typeof cell === "object" && cell !== null && "value" in cell && (cell as Cell).value.toLowerCase().includes(q)));
    }
    if (sortCol) {
      rows.sort((a, b) => {
        const aVal = (a[sortCol] as Cell)?.value || "";
        const bVal = (b[sortCol] as Cell)?.value || "";
        const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ""));
        const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ""));
        if (!isNaN(aNum) && !isNaN(bNum)) return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return rows;
  }, [sheet.rows, sortCol, sortDir, searchQuery]);

  function startEdit(rowIdx: number, colKey: string) {
    const cell = sheet.rows[rowIdx]?.[colKey];
    setEditingCell({ row: rowIdx, col: colKey });
    setEditValue(cell?.formula || cell?.value || "");
    setIsFormulaEditing(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Insert a cell reference (like "F6") into the current formula being edited
  function insertCellRefIntoFormula(rowIdx: number, colKey: string) {
    const letter = colKeyToLetter(colKey, sheet.columns);
    const ref = `${letter}${rowIdx + 1}`;
    const newVal = editValue + ref;
    setEditValue(newVal);
    // Live-evaluate the formula as user builds it
    if (newVal.startsWith("=")) {
      const tempRows = [...sheet.rows];
      const evaluated = evaluateFormula(newVal, tempRows, editingCell!.row, sheet.columns);
      // Update the cell preview in real-time
      const newRows = [...sheet.rows];
      const cell: Cell = { ...newRows[editingCell!.row][editingCell!.col] };
      cell.formula = newVal;
      cell.value = evaluated;
      newRows[editingCell!.row] = { ...newRows[editingCell!.row], [editingCell!.col]: cell };
      onChange({ ...sheet, rows: recalcFormulas(newRows) });
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function recalcFormulas(rows: Record<string, Cell>[]): Record<string, Cell>[] {
    const newRows = rows.map(r => ({ ...r }));
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
      changed = false;
      iterations++;
      newRows.forEach((row, rowIdx) => {
        sheet.columns.forEach((col) => {
          const cell = row[col.key];
          if (cell?.formula) {
            const newVal = evaluateFormula(cell.formula, newRows, rowIdx, sheet.columns);
            if (newVal !== cell.value) { newRows[rowIdx] = { ...newRows[rowIdx], [col.key]: { ...cell, value: newVal } }; changed = true; }
          }
        });
      });
    }
    return newRows;
  }

  function commitEdit() {
    if (!editingCell) return;
    const { row, col } = editingCell;
    let newRows = [...sheet.rows];
    const cell: Cell = { ...newRows[row][col] };
    if (editValue.startsWith("=")) { cell.formula = editValue; cell.value = evaluateFormula(editValue, newRows, row, sheet.columns); }
    else { cell.value = editValue; cell.formula = undefined; }
    newRows[row] = { ...newRows[row], [col]: cell };
    if (col === "debit" || col === "credit") recalcBalance(newRows, row);
    newRows = recalcFormulas(newRows);
    onChange({ ...sheet, rows: newRows });
    setEditingCell(null);
    setIsFormulaEditing(false);
  }

  function getCellNumeric(row: Record<string, Cell>, colKey: string): number { const val = row[colKey]?.value?.replace(/[^0-9.-]/g, "") || "0"; const num = parseFloat(val); return isNaN(num) ? 0 : num; }
  function getCellRaw(row: Record<string, Cell>, colKey: string): string { return row[colKey]?.value || ""; }
  function getCellText(row: Record<string, Cell>, colKey: string): string { return row[colKey]?.value?.toString() || ""; }
  function letterToColKey(letter: string, columns: Column[]): string | null { const idx = letter.toUpperCase().charCodeAt(0) - 65; if (idx >= 0 && idx < columns.length) return columns[idx].key; /* Support double letters AA-ZZ */ if (letter.length === 2) { const idx2 = (letter.toUpperCase().charCodeAt(0) - 65 + 1) * 26 + (letter.toUpperCase().charCodeAt(1) - 65); if (idx2 >= 0 && idx2 < columns.length) return columns[idx2].key; } return null; }
  function colKeyToLetter(key: string, columns: Column[]): string { const idx = columns.findIndex(c => c.key === key); if (idx < 0) return "?"; if (idx < 26) return String.fromCharCode(65 + idx); return String.fromCharCode(65 + Math.floor(idx / 26) - 1) + String.fromCharCode(65 + (idx % 26)); }

  // Resolve a cell reference like "A1" or "debit3" to {row, colKey}
  function resolveCellRef(ref: string, columns: Column[]): CellLocation | null {
    // Try letter+number format: A1, B2, AA5
    const letterMatch = ref.match(/^([A-Z]{1,2})(\d+)$/i);
    if (letterMatch) {
      const colKey = letterToColKey(letterMatch[1], columns);
      const rowIdx = parseInt(letterMatch[2]) - 1;
      if (colKey && rowIdx >= 0) return { row: rowIdx, colKey };
    }
    // Try columnKey+number format: debit1, description5
    const keyMatch = ref.match(/^([a-zA-Z_]+)(\d+)$/);
    if (keyMatch) {
      const col = columns.find(c => c.key === keyMatch[1].toLowerCase());
      if (col) return { row: parseInt(keyMatch[2]) - 1, colKey: col.key };
    }
    return null;
  }

  // Parse a range like "A1:C5" or "debit1:credit5" into array of cell refs
  function parseRange(rangeStr: string, columns: Column[]): CellLocation[] {
    const parts = rangeStr.split(":");
    if (parts.length !== 2) return [];
    const start = resolveCellRef(parts[0].trim(), columns);
    const end = resolveCellRef(parts[1].trim(), columns);
    if (!start || !end) return [];

    const refs: CellLocation[] = [];
    const startColIdx = columns.findIndex(c => c.key === start.colKey);
    const endColIdx = columns.findIndex(c => c.key === end.colKey);
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (r >= 0 && r < 1000 && c >= 0 && c < columns.length) {
          refs.push({ row: r, colKey: columns[c].key });
        }
      }
    }
    return refs;
  }

  // Get numeric values from a range
  function getRangeValues(rangeStr: string, rows: Record<string, Cell>[], columns: Column[]): number[] {
    const refs = parseRange(rangeStr, columns);
    return refs.filter(r => r.row >= 0 && r.row < rows.length).map(r => getCellNumeric(rows[r.row], r.colKey));
  }

  // Get raw text values from a range
  function getRangeTexts(rangeStr: string, rows: Record<string, Cell>[], columns: Column[]): string[] {
    const refs = parseRange(rangeStr, columns);
    return refs.filter(r => r.row >= 0 && r.row < rows.length).map(r => getCellText(rows[r.row], r.colKey));
  }

  // ─── Full Excel-like Formula Engine ─────────────────────────────────────
  function evaluateFormula(formula: string, rows: Record<string, Cell>[], currentRow: number, columns: Column[]): string {
    try {
      let expr = formula.slice(1).trim();

      // ── Helper: evaluate a function call ──
      const evalFunc = (name: string, rawArgs: string): string => {
        const fn = name.toUpperCase();

        // IF(condition, trueVal, falseVal)
        if (fn === "IF") {
          const parts = splitFuncArgs(rawArgs);
          if (parts.length < 2) return "#ERROR";
          const condition = evalExpression(parts[0].trim(), rows, currentRow, columns);
          const isTrue = typeof condition === "number" ? condition !== 0 : condition.toLowerCase() === "true" || condition === "1";
          if (isTrue) return evalExpression(parts[1].trim(), rows, currentRow, columns).toString();
          return parts.length > 2 ? evalExpression(parts[2].trim(), rows, currentRow, columns).toString() : "FALSE";
        }

        // IFS(cond1, val1, cond2, val2, ...)
        if (fn === "IFS") {
          const parts = splitFuncArgs(rawArgs);
          for (let i = 0; i < parts.length - 1; i += 2) {
            const cond = evalExpression(parts[i].trim(), rows, currentRow, columns);
            const isTrue = typeof cond === "number" ? cond !== 0 : cond.toLowerCase() === "true" || cond === "1";
            if (isTrue) return evalExpression(parts[i + 1].trim(), rows, currentRow, columns).toString();
          }
          return "#N/A";
        }

        // CONCATENATE(val1, val2, ...) or CONCAT(...)
        if (fn === "CONCATENATE" || fn === "CONCAT") {
          const parts = splitFuncArgs(rawArgs);
          return parts.map(p => {
            const v = evalExpression(p.trim(), rows, currentRow, columns);
            return v.toString();
          }).join("");
        }

        // LEN(text)
        if (fn === "LEN") {
          const val = evalExpression(rawArgs.trim(), rows, currentRow, columns);
          return String(val.toString().length);
        }

        // UPPER(text), LOWER(text), TRIM(text)
        if (fn === "UPPER") { return evalExpression(rawArgs.trim(), rows, currentRow, columns).toString().toUpperCase(); }
        if (fn === "LOWER") { return evalExpression(rawArgs.trim(), rows, currentRow, columns).toString().toLowerCase(); }
        if (fn === "TRIM") { return evalExpression(rawArgs.trim(), rows, currentRow, columns).toString().trim(); }

        // LEFT(text, n), RIGHT(text, n), MID(text, start, n)
        if (fn === "LEFT") { const parts = splitFuncArgs(rawArgs); const text = evalExpression(parts[0].trim(), rows, currentRow, columns).toString(); const n = parseInt(evalExpression(parts[1]?.trim() || "1", rows, currentRow, columns).toString()) || 1; return text.slice(0, n); }
        if (fn === "RIGHT") { const parts = splitFuncArgs(rawArgs); const text = evalExpression(parts[0].trim(), rows, currentRow, columns).toString(); const n = parseInt(evalExpression(parts[1]?.trim() || "1", rows, currentRow, columns).toString()) || 1; return text.slice(-n); }
        if (fn === "MID") { const parts = splitFuncArgs(rawArgs); const text = evalExpression(parts[0].trim(), rows, currentRow, columns).toString(); const start = (parseInt(evalExpression(parts[1]?.trim() || "1", rows, currentRow, columns).toString()) || 1) - 1; const n = parseInt(evalExpression(parts[2]?.trim() || "1", rows, currentRow, columns).toString()) || 1; return text.slice(start, start + n); }

        // ABS, ROUND, CEILING, FLOOR, POWER, SQRT, MOD
        if (fn === "ABS") { const v = parseFloat(evalExpression(rawArgs.trim(), rows, currentRow, columns).toString()); return isNaN(v) ? "#ERROR" : String(Math.abs(v)); }
        if (fn === "ROUND") { const parts = splitFuncArgs(rawArgs); const v = parseFloat(evalExpression(parts[0].trim(), rows, currentRow, columns).toString()); const d = parseInt(evalExpression(parts[1]?.trim() || "0", rows, currentRow, columns).toString()) || 0; return isNaN(v) ? "#ERROR" : v.toFixed(d); }
        if (fn === "CEILING") { const v = parseFloat(evalExpression(rawArgs.trim(), rows, currentRow, columns).toString()); return isNaN(v) ? "#ERROR" : String(Math.ceil(v)); }
        if (fn === "FLOOR") { const v = parseFloat(evalExpression(rawArgs.trim(), rows, currentRow, columns).toString()); return isNaN(v) ? "#ERROR" : String(Math.floor(v)); }
        if (fn === "SQRT") { const v = parseFloat(evalExpression(rawArgs.trim(), rows, currentRow, columns).toString()); return isNaN(v) || v < 0 ? "#ERROR" : String(Math.sqrt(v)); }
        if (fn === "POWER" || fn === "POW") { const parts = splitFuncArgs(rawArgs); const base = parseFloat(evalExpression(parts[0].trim(), rows, currentRow, columns).toString()); const exp = parseFloat(evalExpression(parts[1]?.trim() || "1", rows, currentRow, columns).toString()); return (isNaN(base) || isNaN(exp)) ? "#ERROR" : String(Math.pow(base, exp)); }
        if (fn === "MOD") { const parts = splitFuncArgs(rawArgs); const a = parseFloat(evalExpression(parts[0].trim(), rows, currentRow, columns).toString()); const b = parseFloat(evalExpression(parts[1]?.trim() || "1", rows, currentRow, columns).toString()); return (isNaN(a) || isNaN(b) || b === 0) ? "#ERROR" : String(a % b); }

        // TODAY(), NOW()
        if (fn === "TODAY") { return new Date().toLocaleDateString("en-US"); }
        if (fn === "NOW") { return new Date().toLocaleString("en-US"); }

        // VLOOKUP(lookupValue, range, colIndex, [approxMatch])
        if (fn === "VLOOKUP" || fn === "HLOOKUP") {
          const parts = splitFuncArgs(rawArgs);
          if (parts.length < 3) return "#ERROR";
          const lookupVal = evalExpression(parts[0].trim(), rows, currentRow, columns).toString().toLowerCase();
          const rangeStr = parts[1].trim();
          const colIdx = parseInt(evalExpression(parts[2].trim(), rows, currentRow, columns).toString()) - 1;
          const approxMatch = parts.length > 3 ? evalExpression(parts[3].trim(), rows, currentRow, columns).toString().toLowerCase() === "true" : false;

          const refs = parseRange(rangeStr, columns);
          if (refs.length === 0) return "#REF";

          // Group refs by row
          const rowGroups = new Map<number, CellLocation[]>();
          refs.forEach(r => {
            if (!rowGroups.has(r.row)) rowGroups.set(r.row, []);
            rowGroups.get(r.row)!.push(r);
          });

          for (const [, cells] of rowGroups) {
            if (cells.length === 0) continue;
            // First column of range is the lookup column
            const firstCell = cells[0];
            if (firstCell.row < 0 || firstCell.row >= rows.length) continue;
            const cellVal = getCellText(rows[firstCell.row], firstCell.colKey).toLowerCase();

            const match = approxMatch ? cellVal.includes(lookupVal) : cellVal === lookupVal;
            if (match && colIdx >= 0 && colIdx < cells.length) {
              const resultCell = cells[colIdx];
              if (resultCell.row >= 0 && resultCell.row < rows.length) {
                return getCellText(rows[resultCell.row], resultCell.colKey);
              }
            }
          }
          return "#N/A";
        }

        // COUNTIF(range, criteria), SUMIF(range, criteria, [sumRange])
        if (fn === "COUNTIF") {
          const parts = splitFuncArgs(rawArgs);
          if (parts.length < 2) return "#ERROR";
          const texts = getRangeTexts(parts[0].trim(), rows, columns);
          const criteria = evalExpression(parts[1].trim(), rows, currentRow, columns).toString().toLowerCase();
          // Support >, <, >=, <= operators
          if (criteria.startsWith(">=")) { const t = parseFloat(criteria.slice(2)); return String(texts.filter(v => parseFloat(v.replace(/[^0-9.-]/g, "")) >= t).length); }
          if (criteria.startsWith("<=")) { const t = parseFloat(criteria.slice(2)); return String(texts.filter(v => parseFloat(v.replace(/[^0-9.-]/g, "")) <= t).length); }
          if (criteria.startsWith(">")) { const t = parseFloat(criteria.slice(1)); return String(texts.filter(v => parseFloat(v.replace(/[^0-9.-]/g, "")) > t).length); }
          if (criteria.startsWith("<")) { const t = parseFloat(criteria.slice(1)); return String(texts.filter(v => parseFloat(v.replace(/[^0-9.-]/g, "")) < t).length); }
          return String(texts.filter(v => v.toLowerCase() === criteria || v.toLowerCase().includes(criteria)).length);
        }

        if (fn === "SUMIF") {
          const parts = splitFuncArgs(rawArgs);
          if (parts.length < 2) return "#ERROR";
          const rangeStr = parts[0].trim();
          const criteria = evalExpression(parts[1].trim(), rows, currentRow, columns).toString().toLowerCase();
          const sumRangeStr = parts.length > 2 ? parts[2].trim() : rangeStr;
          const texts = getRangeTexts(rangeStr, rows, columns);
          const sumValues = getRangeValues(sumRangeStr, rows, columns);
          let sum = 0;
          texts.forEach((v, i) => {
            const match = criteria.startsWith(">=") ? parseFloat(v.replace(/[^0-9.-]/g, "")) >= parseFloat(criteria.slice(2))
              : criteria.startsWith("<=") ? parseFloat(v.replace(/[^0-9.-]/g, "")) <= parseFloat(criteria.slice(2))
              : criteria.startsWith(">") ? parseFloat(v.replace(/[^0-9.-]/g, "")) > parseFloat(criteria.slice(1))
              : criteria.startsWith("<") ? parseFloat(v.replace(/[^0-9.-]/g, "")) < parseFloat(criteria.slice(1))
              : v.toLowerCase() === criteria || v.toLowerCase().includes(criteria);
            if (match && i < sumValues.length) sum += sumValues[i];
          });
          return String(sum);
        }

        // SUMPRODUCT(range1, range2, ...) — multiply corresponding elements then sum
        if (fn === "SUMPRODUCT") {
          const parts = splitFuncArgs(rawArgs);
          const allRanges = parts.map(p => getRangeValues(p.trim(), rows, columns));
          if (allRanges.length === 0) return "#ERROR";
          const len = Math.min(...allRanges.map(r => r.length));
          let sum = 0;
          for (let i = 0; i < len; i++) {
            let product = 1;
            allRanges.forEach(range => { product *= range[i]; });
            sum += product;
          }
          return String(sum);
        }

        // MAX, MIN, SUM, AVG, COUNT — with range support
        const rangeMatch = rawArgs.match(/^([A-Za-z]{1,2}\d*|[a-zA-Z_]+\d*):([A-Za-z]{1,2}\d*|[a-zA-Z_]+\d*)$/);
        if (rangeMatch) {
          const values = getRangeValues(rawArgs.trim(), rows, columns);
          if (fn === "SUM") return String(values.reduce((a, b) => a + b, 0));
          if (fn === "AVG" || fn === "AVERAGE") return values.length > 0 ? String(values.reduce((a, b) => a + b, 0) / values.length) : "0";
          if (fn === "MIN") return values.length > 0 ? String(Math.min(...values)) : "0";
          if (fn === "MAX") return values.length > 0 ? String(Math.max(...values)) : "0";
          if (fn === "COUNT") return String(values.filter(v => v !== 0).length);
          if (fn === "COUNTA") return String(values.length);
        }

        // Comma-separated args fallback
        const parts = splitFuncArgs(rawArgs);
        const values = parts.map(a => {
          const trimmed = a.trim();
          // Check if it's a range
          if (trimmed.includes(":")) {
            return getRangeValues(trimmed, rows, columns);
          }
          // Check cell reference
          const ref = resolveCellRef(trimmed, columns);
          if (ref && ref.row >= 0 && ref.row < rows.length) return [getCellNumeric(rows[ref.row], ref.colKey)];
          // Number literal
          const num = parseFloat(trimmed);
          return [isNaN(num) ? 0 : num];
        }).flat();

        if (fn === "SUM") return String(values.reduce((a, b) => a + b, 0));
        if (fn === "AVG" || fn === "AVERAGE") return values.length > 0 ? String(values.reduce((a, b) => a + b, 0) / values.length) : "0";
        if (fn === "MIN") return values.length > 0 ? String(Math.min(...values)) : "0";
        if (fn === "MAX") return values.length > 0 ? String(Math.max(...values)) : "0";
        if (fn === "COUNT") return String(values.filter(v => v !== 0).length);
        if (fn === "COUNTA") return String(values.length);
        return "0";
      };

      // Split function arguments respecting nested parentheses
      const splitFuncArgs = (args: string): string[] => {
        const parts: string[] = [];
        let depth = 0;
        let current = "";
        for (let i = 0; i < args.length; i++) {
          const ch = args[i];
          if (ch === "(") depth++;
          else if (ch === ")") depth--;
          if (ch === "," && depth === 0) { parts.push(current); current = ""; }
          else current += ch;
        }
        if (current) parts.push(current);
        return parts;
      };

      // Evaluate a sub-expression (number, cell ref, or formula result)
      const evalExpression = (subExpr: string, rows: Record<string, Cell>[], currentRow: number, columns: Column[]): string | number => {
        const trimmed = subExpr.trim();
        // String literal
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
        // Boolean
        if (trimmed.toLowerCase() === "true") return 1;
        if (trimmed.toLowerCase() === "false") return 0;
        // Cell reference
        const ref = resolveCellRef(trimmed, columns);
        if (ref && ref.row >= 0 && ref.row < rows.length) {
          const cellVal = getCellText(rows[ref.row], ref.colKey);
          const num = parseFloat(cellVal.replace(/[^0-9.-]/g, ""));
          return isNaN(num) ? cellVal : num;
        }
        // Column key reference (current row)
        const col = columns.find(c => c.key === trimmed.toLowerCase());
        if (col) return getCellNumeric(rows[currentRow], col.key);
        // Number
        const num = parseFloat(trimmed);
        if (!isNaN(num)) return num;
        // Nested function — evaluate recursively
        return evaluateFormula("=" + trimmed, rows, currentRow, columns);
      };

      // ── Main evaluation pipeline ────────────────────────────────────────

      // Step 1: Replace function calls (innermost first, handle nesting)
      // Process functions in a loop to handle nested calls
      let maxIterations = 20;
      while (maxIterations-- > 0) {
        const funcMatch = expr.match(/\b([A-Z_]+)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/i);
        if (!funcMatch) break;
        const [fullMatch, fnName, fnArgs] = funcMatch;
        const result = evalFunc(fnName, fnArgs);
        expr = expr.replace(fullMatch, typeof result === "string" && !isNaN(parseFloat(result)) && result !== "#ERROR" && result !== "#N/A" && result !== "#REF" ? result : `"${result}"`);
      }

      // Step 2: Replace cell references (A1, B2, etc.)
      expr = expr.replace(/\b([A-Z]{1,2})(\d+)\b/gi, (_, letter, rowNum) => {
        const colKey = letterToColKey(letter, columns);
        const rowIdx = parseInt(rowNum) - 1;
        if (colKey && rowIdx >= 0 && rowIdx < rows.length) return String(getCellNumeric(rows[rowIdx], colKey));
        return "0";
      });

      // Step 3: Replace column key references (debit, credit, etc.)
      columns.forEach((col) => {
        const regex = new RegExp(`\\b${col.key}\\b`, "gi");
        expr = expr.replace(regex, String(getCellNumeric(rows[currentRow], col.key)));
      });

      // Step 4: Handle & concatenation operator
      expr = expr.replace(/"([^"]*?)"\s*&\s*"([^"]*?)"/g, '"$1$2"');
      expr = expr.replace(/"([^"]*?)"\s*&\s*(\d+)/g, '"$1$2"');
      expr = expr.replace(/(\d+)\s*&\s*"([^"]*?)"/g, '"$1$2"');

      // Step 5: Handle comparison operators in arithmetic
      expr = expr.replace(/!=/g, "!==");

      // Step 6: Evaluate arithmetic (strip non-numeric strings for math)
      // If the expression is a pure string, return it
      const stringMatch = expr.match(/^"([^"]*)"$/);
      if (stringMatch) return stringMatch[1];

      // Sanitize for safe eval
      const sanitized = expr.replace(/[^0-9+\-*/.() e!<>=&|%,]/gi, "").replace(/[^0-9+\-*/.() e]/gi, "");
      if (sanitized.trim() === "") return expr.replace(/"/g, "");

      const result = Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) return Number.isInteger(result) ? String(result) : result.toFixed(2);
      if (typeof result === "boolean") return result ? "TRUE" : "FALSE";
      return String(result);
    } catch (e) { return "#ERROR"; }
  }

  function recalcBalance(rows: Record<string, Cell>[], rowIdx: number) {
    const hasBalance = sheet.columns.some((c) => c.key === "balance"); if (!hasBalance) return;
    let balance = 0;
    for (let i = 0; i <= rowIdx; i++) { const debit = parseFloat(rows[i]["debit"]?.value?.replace(/[^0-9.-]/g, "") || "0"); const credit = parseFloat(rows[i]["credit"]?.value?.replace(/[^0-9.-]/g, "") || "0"); if (!isNaN(debit)) balance += debit; if (!isNaN(credit)) balance -= credit; rows[i]["balance"] = { value: balance.toFixed(2), format: "currency" }; }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && isFullscreen) { setIsFullscreen(false); return; }
    if (e.key === "Escape" && editingCell) { setEditingCell(null); return; }
    if (!activeCell) return;
    const rowIdx = activeCell.row; const colIdx = sheet.columns.findIndex((c) => c.key === activeCell.col);
    if (editingCell) {
      if (e.key === "Enter") { commitEdit(); if (rowIdx < sheet.rows.length - 1) setActiveCell({ row: rowIdx + 1, col: activeCell.col }); }
      else if (e.key === "Tab") { e.preventDefault(); commitEdit(); if (colIdx < sheet.columns.length - 1) setActiveCell({ row: rowIdx, col: sheet.columns[colIdx + 1].key }); }
      return;
    }
    if (e.key === "ArrowDown" && rowIdx < sheet.rows.length - 1) setActiveCell({ row: rowIdx + 1, col: activeCell.col });
    else if (e.key === "ArrowUp" && rowIdx > 0) setActiveCell({ row: rowIdx - 1, col: activeCell.col });
    else if (e.key === "ArrowRight" && colIdx < sheet.columns.length - 1) setActiveCell({ row: rowIdx, col: sheet.columns[colIdx + 1].key });
    else if (e.key === "ArrowLeft" && colIdx > 0) setActiveCell({ row: rowIdx, col: sheet.columns[colIdx - 1].key });
    else if (e.key === "Enter" || e.key === "F2") startEdit(rowIdx, activeCell.col);
    else if (e.key === "Delete" || e.key === "Backspace") { let newRows = [...sheet.rows]; newRows[rowIdx] = { ...newRows[rowIdx], [activeCell.col]: { value: "" } }; newRows = recalcFormulas(newRows); onChange({ ...sheet, rows: newRows }); }
    else if (e.key === "Tab") { e.preventDefault(); if (colIdx < sheet.columns.length - 1) setActiveCell({ row: rowIdx, col: sheet.columns[colIdx + 1].key }); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { startEdit(rowIdx, activeCell.col); setEditValue(e.key); }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "c" && activeCell) { setClipboard(sheet.rows[rowIdx][activeCell.col]); toast.success("Copied"); }
      else if (e.key === "v" && clipboard && activeCell) { let newRows = [...sheet.rows]; newRows[rowIdx] = { ...newRows[rowIdx], [activeCell.col]: { ...clipboard } }; newRows = recalcFormulas(newRows); onChange({ ...sheet, rows: newRows }); }
      else if (e.key === "b") { e.preventDefault(); toggleBold(); }
    }
  }

  function toggleBold() { if (!activeCell) return; const newRows = [...sheet.rows]; const cell = { ...newRows[activeCell.row][activeCell.col] }; cell.bold = !cell.bold; newRows[activeCell.row] = { ...newRows[activeCell.row], [activeCell.col]: cell }; onChange({ ...sheet, rows: newRows }); }
  function formatActiveCell(format: Cell["format"]) { if (!activeCell) return; const newRows = [...sheet.rows]; const cell = { ...newRows[activeCell.row][activeCell.col] }; cell.format = format; newRows[activeCell.row] = { ...newRows[activeCell.row], [activeCell.col]: cell }; onChange({ ...sheet, rows: newRows }); }
  function addRow() { onChange({ ...sheet, rows: [...sheet.rows, createEmptyRow(sheet.columns)] }); }
  function deleteSelectedRows() { if (selectedRows.size === 0) return; const newRows = sheet.rows.filter((_, i) => !selectedRows.has(i)); onChange({ ...sheet, rows: newRows }); setSelectedRows(new Set()); }
  function handleSort(colKey: string) { if (sortCol === colKey) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortCol(colKey); setSortDir("asc"); } }

  // ── Drag-fill (like Excel's fill handle) ────────────────────────────────
  function handleDragStart(e: React.MouseEvent, row: number, col: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragStart({ row, col });
    setDragEnd({ row, col });
    setIsDragging(true);
  }

  function handleDragMove(e: React.MouseEvent, row: number, col: string) {
    if (!isDragging || !dragStart) return;
    setDragEnd({ row, col });
  }

  function handleDragEnd() {
    if (!isDragging || !dragStart || !dragEnd) { setIsDragging(false); return; }

    const sourceCell = sheet.rows[dragStart.row]?.[dragStart.col];
    if (!sourceCell) { setIsDragging(false); setDragStart(null); setDragEnd(null); return; }

    const startRow = Math.min(dragStart.row, dragEnd.row);
    const endRow = Math.max(dragStart.row, dragEnd.row);
    const startColIdx = sheet.columns.findIndex(c => c.key === dragStart.col);
    const endColIdx = sheet.columns.findIndex(c => c.key === dragEnd.col);
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);

    const newRows = [...sheet.rows];

    // Detect pattern: numbers increment, dates increment, text repeats
    const sourceVal = parseFloat(sourceCell.value.replace(/[^0-9.-]/g, ""));
    const isSourceNumber = !isNaN(sourceVal) && sourceCell.value.trim() !== "";

    // Check if there's a sequence (2+ cells in the drag direction)
    let step = 1;
    if (isSourceNumber && startRow !== endRow) {
      // Vertical fill — check if there's a second value to determine step
      const secondCell = newRows[dragStart.row + 1]?.[dragStart.col];
      if (secondCell) {
        const secondVal = parseFloat(secondCell.value.replace(/[^0-9.-]/g, ""));
        if (!isNaN(secondVal)) step = secondVal - sourceVal;
      }
    }

    let fillIdx = 0;
    for (let r = startRow; r <= endRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const colKey = sheet.columns[c].key;
        if (r === dragStart.row && colKey === dragStart.col) continue; // Skip source

        const newCell: Cell = { ...sourceCell };

        if (isSourceNumber) {
          fillIdx++;
          const newVal = sourceVal + step * fillIdx;
          newCell.value = Number.isInteger(newVal) ? String(newVal) : newVal.toFixed(2);
          newCell.formula = undefined;
        } else {
          // Repeat text or increment if it ends with a number
          const textMatch = sourceCell.value.match(/^(.*?)(\d+)$/);
          if (textMatch) {
            fillIdx++;
            newCell.value = textMatch[1] + (parseInt(textMatch[2]) + fillIdx);
          } else {
            newCell.value = sourceCell.value; // Just copy
          }
        }

        newRows[r] = { ...newRows[r], [colKey]: newCell };
      }
    }

    // Recalculate formulas
    const recalculated = recalcFormulas(newRows);
    onChange({ ...sheet, rows: recalculated });

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    toast.success("Filled");
  }

  // Check if a cell is in the drag selection range
  function isInDragRange(row: number, col: string): boolean {
    if (!isDragging || !dragStart || !dragEnd) return false;
    const colIdx = sheet.columns.findIndex(c => c.key === col);
    const startColIdx = sheet.columns.findIndex(c => c.key === dragStart.col);
    const endColIdx = sheet.columns.findIndex(c => c.key === dragEnd.col);
    const minRow = Math.min(dragStart.row, dragEnd.row);
    const maxRow = Math.max(dragStart.row, dragEnd.row);
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);
    return row >= minRow && row <= maxRow && colIdx >= minCol && colIdx <= maxCol;
  }

  function exportCSV() {
    const headers = sheet.columns.map((c) => c.label); const csvRows = [headers.join(",")];
    sheet.rows.forEach((row) => { const vals = sheet.columns.map((c) => { const v = row[c.key]?.value || ""; return `"${v.replace(/"/g, '""')}"`; }); csvRows.push(vals.join(",")); });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${sheet.name.toLowerCase().replace(/\s+/g, "-")}.csv`; a.click(); URL.revokeObjectURL(url); toast.success("Exported to CSV");
  }

  function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string; const lines = text.split("\n").filter((l) => l.trim()); if (lines.length < 2) return;
      const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim()); const newRows: Record<string, Cell>[] = [];
      for (let i = 1; i < lines.length; i++) { const vals = lines[i].match(/(".*?"|[^,]+)/g)?.map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"')) || []; const row: Record<string, Cell> = {}; sheet.columns.forEach((col, colIdx) => { row[col.key] = { value: vals[colIdx] || "" }; }); newRows.push(row); }
      while (newRows.length < 100) newRows.push(createEmptyRow(sheet.columns));
      onChange({ ...sheet, rows: newRows }); toast.success(`Imported ${lines.length - 1} rows`);
    };
    reader.readAsText(file); e.target.value = "";
  }

  function formatCellValue(cell: Cell): string {
    if (!cell.value) return "";
    if (cell.format === "currency") { const num = parseFloat(cell.value.replace(/[^0-9.-]/g, "")); if (isNaN(num)) return cell.value; return num.toLocaleString("en-US", { style: "currency", currency: "USD" }); }
    if (cell.format === "percent") { const num = parseFloat(cell.value); if (isNaN(num)) return cell.value; return `${num}%`; }
    if (cell.format === "number") { const num = parseFloat(cell.value); if (isNaN(num)) return cell.value; return num.toLocaleString(); }
    return cell.value;
  }

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    sheet.columns.forEach((col) => { if (col.type === "currency") { let sum = 0; sheet.rows.forEach((row) => { const val = parseFloat(row[col.key]?.value?.replace(/[^0-9.-]/g, "") || "0"); if (!isNaN(val)) sum += val; }); totals[col.key] = sum; } });
    return totals;
  }, [sheet]);

  const spreadsheetContent = (
    <div className="flex flex-col h-full">
      {/* ── Toolbar (collapsible) ────────────────────────────────────── */}
      {toolbarVisible && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border-subtle bg-surface flex-wrap flex-shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-7 pr-2 py-1 bg-surface-hover border border-border-subtle rounded text-xs text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none w-36" />
          </div>
          <div className="w-px h-4 bg-surface-hover" />

          {/* Formatting */}
          <button onClick={toggleBold} className={cn("p-1 rounded hover:bg-surface-hover text-text-muted", activeCell && sheet.rows[activeCell.row]?.[activeCell.col]?.bold && "bg-cyan-500/10 text-cyan-400")} title="Bold (Ctrl+B)"><Bold className="h-3 w-3" /></button>
          <div className="w-px h-4 bg-surface-hover" />

          {/* Cell color picker */}
          <div className="flex items-center gap-0.5">
            {[
              { name: "none", cls: "", preview: "bg-surface-hover" },
              { name: "red", cls: "bg-red-500/70", preview: "bg-red-500" },
              { name: "green", cls: "bg-emerald-500/70", preview: "bg-emerald-500" },
              { name: "blue", cls: "bg-blue-500/70", preview: "bg-blue-500" },
              { name: "yellow", cls: "bg-yellow-500/70", preview: "bg-yellow-500" },
              { name: "purple", cls: "bg-purple-500/70", preview: "bg-purple-500" },
              { name: "orange", cls: "bg-orange-500/70", preview: "bg-orange-500" },
              { name: "cyan", cls: "bg-cyan-500/70", preview: "bg-cyan-500" },
            ].map((c) => (
              <button
                key={c.name}
                onClick={() => {
                  if (!activeCell) return;
                  const newRows = [...sheet.rows];
                  const cell = { ...newRows[activeCell.row][activeCell.col] };
                  cell.bgColor = c.name === "none" ? undefined : c.cls;
                  newRows[activeCell.row] = { ...newRows[activeCell.row], [activeCell.col]: cell };
                  onChange({ ...sheet, rows: newRows });
                }}
                className={cn("w-5 h-5 rounded border border-border-subtle transition-all hover:scale-110", c.name === "none" ? "bg-surface flex items-center justify-center" : c.preview, activeCell && sheet.rows[activeCell.row]?.[activeCell.col]?.bgColor === c.cls && "ring-2 ring-white/60 ring-offset-1 ring-offset-background")}
                title={c.name === "none" ? "Clear color" : c.name}
              >
                {c.name === "none" && <X className="h-2.5 w-2.5 text-text-muted" />}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-surface-hover" />

          {/* Row actions */}
          <button onClick={addRow} className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary text-[11px]"><Plus className="h-3 w-3" />Row</button>
          {selectedRows.size > 0 && <button onClick={deleteSelectedRows} className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-red-500/10 text-red-400 text-[11px]"><Trash2 className="h-3 w-3" />{selectedRows.size}</button>}
          <div className="flex-1" />

          {/* Import/Export */}
          <label className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary text-[11px] cursor-pointer"><Upload className="h-3 w-3" />Import<input type="file" accept=".csv" className="hidden" onChange={importCSV} /></label>
          <button onClick={exportCSV} className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary text-[11px]"><Download className="h-3 w-3" />CSV</button>
          <div className="w-px h-4 bg-surface-hover" />

          {/* Fullscreen */}
          <button onClick={() => setIsFullscreen(!isFullscreen)} className={cn("p-1 rounded hover:bg-surface-hover", isFullscreen ? "text-cyan-400" : "text-text-secondary")} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
          <button onClick={() => setToolbarVisible(false)} className="p-1 rounded hover:bg-surface-hover text-text-muted" title="Hide toolbar"><EyeOff className="h-3 w-3" /></button>
        </div>
      )}

      {/* Show toolbar button (when hidden) */}
      {!toolbarVisible && (
        <div className="flex items-center gap-1 px-2 py-0.5 border-b border-border-subtle bg-surface flex-shrink-0">
          <button onClick={() => setToolbarVisible(true)} className="px-2 py-0.5 rounded text-[10px] text-text-muted hover:bg-surface-hover flex items-center gap-1">
            <Eye className="h-3 w-3" /> Show toolbar
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className={cn("p-0.5 rounded hover:bg-surface-hover", isFullscreen ? "text-cyan-400" : "text-text-muted")}>
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-text-dim">{sheet.name} · {sheet.rows.length} rows</span>
        </div>
      )}

      {/* ── Formula bar ─────────────────────────────────────────────── */}
      {toolbarVisible && (
        <div className="flex items-center gap-2 px-2 py-1 border-b border-border-subtle bg-surface-hover flex-shrink-0">
          <span className="text-[10px] font-mono text-text-muted w-14 text-center flex-shrink-0 bg-surface-hover rounded px-1 py-0.5 border border-border-subtle">
            {activeCell ? `${activeCell.col.toUpperCase()}${activeCell.row + 1}` : "—"}
          </span>
          <span className="text-text-dim text-[11px] italic">fx</span>
          <input
            type="text"
            value={activeCell ? (sheet.rows[activeCell.row]?.[activeCell.col]?.formula || sheet.rows[activeCell.row]?.[activeCell.col]?.value || "") : ""}
            onChange={(e) => {
              if (!activeCell) return; const val = e.target.value;
              setIsFormulaEditing(val.startsWith("="));
              let newRows = [...sheet.rows]; const cell: Cell = { ...newRows[activeCell.row][activeCell.col] };
              if (val.startsWith("=")) { cell.formula = val; cell.value = evaluateFormula(val, newRows, activeCell.row, sheet.columns); } else { cell.value = val; cell.formula = undefined; }
              newRows[activeCell.row] = { ...newRows[activeCell.row], [activeCell.col]: cell };
              if (activeCell.col === "debit" || activeCell.col === "credit") recalcBalance(newRows, activeCell.row);
              newRows = recalcFormulas(newRows); onChange({ ...sheet, rows: newRows });
            }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); tableRef.current?.focus(); } }}
            placeholder="=SUM(A1:E1) =IF(debit>100,debit*0.9,debit) =VLOOKUP(val,A1:D10,3)"
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-dim"
          />
          {isFormulaEditing && editingCell && (
            <span className="text-[10px] text-amber-400 animate-pulse flex-shrink-0">Click a cell to insert ref</span>
          )}
        </div>
      )}

      {/* ── Spreadsheet grid ─────────────────────────────────────────── */}
      <div ref={tableRef} className="flex-1 overflow-auto bg-surface" tabIndex={0} onKeyDown={handleKeyDown}
        onMouseUp={handleDragEnd}
        onMouseLeave={() => { if (isDragging) handleDragEnd(); }}
      >
        <table className="w-full border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-hover">
              <th className="w-8 px-1 py-1.5 border border-border-subtle text-center text-[10px] text-text-muted font-medium bg-surface-hover">#</th>
              {sheet.columns.map((col) => (
                <th key={col.key} className="border border-border-subtle text-left group bg-surface-hover" style={{ width: getWidth(col), minWidth: 70 }}>
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider truncate">{col.label}</span>
                    <button onClick={() => handleSort(col.key)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                      {sortCol === col.key ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-cyan-400" /> : <ArrowDown className="h-3 w-3 text-cyan-400" />) : <ArrowUpDown className="h-3 w-3 text-text-dim" />}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const rowIdx = row._idx; const isSelected = selectedRows.has(rowIdx);
              return (
                <tr key={rowIdx} className={cn("transition-colors", isSelected ? "bg-cyan-500/[0.06]" : rowIdx % 2 === 0 ? "bg-surface" : "bg-surface", "hover:bg-cyan-500/[0.04]")}>
                  <td className={cn("px-1 py-1 border text-center text-[10px]", showGridLines ? "border-border-subtle" : "border-transparent", "bg-surface-hover")}>
                    <button onClick={() => { const newSet = new Set(selectedRows); if (newSet.has(rowIdx)) newSet.delete(rowIdx); else newSet.add(rowIdx); setSelectedRows(newSet); }}
                      className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px]", isSelected ? "bg-cyan-500/20 text-cyan-400" : "hover:bg-surface-hover text-text-dim")}>
                      {rowIdx + 1}
                    </button>
                  </td>
                  {sheet.columns.map((col) => {
                    const cell = row[col.key] as Cell;
                    const isActive = activeCell?.row === rowIdx && activeCell?.col === col.key;
                    const isEditing = editingCell?.row === rowIdx && editingCell?.col === col.key;
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "cursor-cell transition-all duration-75 relative",
                          cellPadding,
                          showGridLines ? "border border-border-subtle" : "border border-transparent",
                          isActive ? "ring-2 ring-cyan-400 ring-inset bg-cyan-500/[0.15] border-cyan-500/50 shadow-[inset_0_0_12px_rgba(6,182,212,0.2)] z-[1]" : "",
                          !isActive && isInDragRange(rowIdx, col.key) ? "bg-cyan-500/[0.08] border-cyan-500/20" : "",
                          !isActive && !isInDragRange(rowIdx, col.key) && cell?.bgColor ? `${cell.bgColor} border-l-2 border-l-white/40 shadow-[inset_0_0_8px_rgba(255,255,255,0.05)]` : "",
                          !isActive && !isInDragRange(rowIdx, col.key) && !cell?.bgColor && "hover:bg-surface-hover"
                        )}
                        onClick={() => {
                          // If we're editing a formula (value starts with "="), insert cell reference
                          if (editingCell && editValue.startsWith("=")) {
                            insertCellRefIntoFormula(rowIdx, col.key);
                            return;
                          }
                          setActiveCell({ row: rowIdx, col: col.key });
                        }}
                        onDoubleClick={() => startEdit(rowIdx, col.key)}
                        onMouseMove={(e) => handleDragMove(e, rowIdx, col.key)}
                      >
                        {isEditing ? (
                          <input ref={inputRef} type="text" value={editValue} onChange={(e) => { setEditValue(e.target.value); setIsFormulaEditing(e.target.value.startsWith("=")); }} onBlur={commitEdit}
                            className="w-full bg-cyan-500/[0.1] text-sm text-text-primary outline-none ring-1 ring-cyan-400/60 rounded px-1 py-0.5" />
                        ) : (
                          <span className={cn("text-sm truncate block", cell?.bold && "font-bold", cell?.italic && "italic", cell?.formula && "text-cyan-300", !cell?.formula && col.type === "currency" && cell?.value ? "text-emerald-300" : "", !cell?.formula && col.type !== "currency" ? "text-text-primary" : "", !cell?.value && "text-text-dim")}>
                            {cell?.value ? formatCellValue(cell) : ""}
                          </span>
                        )}
                        {/* Drag-fill handle (small square at bottom-right of active cell) */}
                        {isActive && !isEditing && (
                          <div
                            className="absolute -right-1 -bottom-1 w-2.5 h-2.5 bg-cyan-400 border border-cyan-300 rounded-sm cursor-crosshair z-10 shadow-sm hover:bg-cyan-300 hover:scale-125 transition-all"
                            onMouseDown={(e) => handleDragStart(e, rowIdx, col.key)}
                            title="Drag to fill"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {Object.keys(columnTotals).length > 0 && (
              <tr className="bg-surface-hover border-t-2 border-cyan-500/40 sticky bottom-0">
                <td className={cn("px-1 py-2 text-center text-[10px] text-cyan-400 font-bold", showGridLines ? "border border-border-subtle" : "border border-transparent", "bg-surface-hover")}>Σ</td>
                {sheet.columns.map((col) => (
                  <td key={col.key} className={cn("px-2 py-2", showGridLines ? "border border-border-subtle" : "border border-transparent", "bg-surface-hover")}>
                    {columnTotals[col.key] !== undefined ? <span className="text-sm font-bold text-cyan-400">{formatCurrency(columnTotals[col.key])}</span>
                      : col.key === sheet.columns[0].key ? <span className="text-xs text-text-muted font-medium">TOTALS</span> : null}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-2 py-1 border-t border-border-subtle bg-surface-hover text-[10px] text-text-muted flex-shrink-0">
        <span className="font-mono bg-surface-hover rounded px-1.5 py-0.5 border border-border-subtle">{activeCell ? `${activeCell.col.toUpperCase()}${activeCell.row + 1}` : "Ready"}</span>
        {activeCell && sheet.rows[activeCell.row]?.[activeCell.col]?.formula && <span className="text-cyan-400">{sheet.rows[activeCell.row][activeCell.col].formula} → {sheet.rows[activeCell.row][activeCell.col].value}</span>}
        <span>{sheet.rows.length} rows × {sheet.columns.length} cols</span>
        {selectedRows.size > 0 && <span className="text-cyan-400">{selectedRows.size} selected</span>}
        <span className="ml-auto hidden sm:inline">Arrow keys · Enter edit · Ctrl+C/V · Ctrl+B · Drag handle to fill · Esc exit</span>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-surface flex flex-col animate-fade-in">
        {spreadsheetContent}
      </div>
    );
  }

  return spreadsheetContent;
}
