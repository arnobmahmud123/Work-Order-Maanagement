"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Image,
  Type,
  Highlighter,
  Undo2,
  Redo2,
  Code,
  Quote,
  Minus,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

const TOOLBAR_BUTTONS = [
  { group: "text", items: [
    { cmd: "bold", icon: Bold, label: "Bold", shortcut: "Ctrl+B" },
    { cmd: "italic", icon: Italic, label: "Italic", shortcut: "Ctrl+I" },
    { cmd: "underline", icon: Underline, label: "Underline", shortcut: "Ctrl+U" },
    { cmd: "strikeThrough", icon: Minus, label: "Strikethrough" },
  ]},
  { group: "heading", items: [
    { cmd: "formatBlock", arg: "h2", icon: Type, label: "Heading" },
  ]},
  { group: "list", items: [
    { cmd: "insertUnorderedList", icon: List, label: "Bullet List" },
    { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered List" },
  ]},
  { group: "align", items: [
    { cmd: "justifyLeft", icon: AlignLeft, label: "Align Left" },
    { cmd: "justifyCenter", icon: AlignCenter, label: "Center" },
    { cmd: "justifyRight", icon: AlignRight, label: "Align Right" },
  ]},
  { group: "insert", items: [
    { cmd: "createLink", icon: Link2, label: "Insert Link" },
    { cmd: "formatBlock", arg: "blockquote", icon: Quote, label: "Quote" },
    { cmd: "formatBlock", arg: "pre", icon: Code, label: "Code Block" },
    { cmd: "insertHorizontalRule", icon: Minus, label: "Horizontal Rule" },
  ]},
  { group: "history", items: [
    { cmd: "undo", icon: Undo2, label: "Undo" },
    { cmd: "redo", icon: Redo2, label: "Redo" },
  ]},
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something...",
  minHeight = 200,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});

  // Sync value from outside
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, []);

  const updateActiveStates = useCallback(() => {
    const states: Record<string, boolean> = {};
    ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"].forEach((cmd) => {
      states[cmd] = document.queryCommandState(cmd);
    });
    setActiveStates(states);
  }, []);

  const handleCommand = useCallback((cmd: string, arg?: string) => {
    if (cmd === "createLink") {
      const url = prompt("Enter URL:");
      if (url) document.execCommand("createLink", false, url);
    } else if (cmd === "formatBlock") {
      document.execCommand("formatBlock", false, arg || "p");
    } else {
      document.execCommand(cmd, false, arg || undefined);
    }
    editorRef.current?.focus();
    updateActiveStates();
  }, [updateActiveStates]);

  const handleInput = useCallback(() => {
    const html = editorRef.current?.innerHTML || "";
    onChange(html === "<br>" || html === "<div><br></div>" ? "" : html);
    updateActiveStates();
  }, [onChange, updateActiveStates]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "    ");
    }
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); handleCommand("bold"); }
      if (e.key === "i") { e.preventDefault(); handleCommand("italic"); }
      if (e.key === "u") { e.preventDefault(); handleCommand("underline"); }
    }
  }, [handleCommand]);

  const isEmpty = !value || value === "<br>" || value === "<p><br></p>";

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200 overflow-hidden",
        isFocused
          ? "border-cyan-500/50 ring-2 ring-cyan-500/15 shadow-lg shadow-cyan-500/5"
          : "border-border-subtle hover:border-border-subtle",
        "bg-surface-hover",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border-subtle bg-surface-hover flex-wrap">
        {TOOLBAR_BUTTONS.map((group, gi) => (
          <div key={gi} className="flex items-center">
            {gi > 0 && <div className="w-px h-5 bg-surface-hover mx-1" />}
            {group.items.map((item: { cmd: string; arg?: string; icon: any; label: string; shortcut?: string }) => {
              const Icon = item.icon;
              const isActive = activeStates[item.cmd];
              return (
                <button
                  key={`${item.cmd}-${item.arg || ""}`}
                  type="button"
                  onClick={() => handleCommand(item.cmd, item.arg)}
                  title={`${item.label}${item.shortcut ? ` (${item.shortcut})` : ""}`}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    isActive
                      ? "bg-cyan-500/15 text-cyan-400"
                      : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Editor Area */}
      <div className="relative">
        {isEmpty && !isFocused && (
          <div className="absolute top-3 left-3 text-text-dim text-sm pointer-events-none select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => { setIsFocused(false); updateActiveStates(); }}
          onKeyDown={handleKeyDown}
          onMouseUp={updateActiveStates}
          onKeyUp={updateActiveStates}
          className="px-3 py-2.5 text-sm text-text-primary focus:outline-none prose prose-invert prose-sm max-w-none min-h-[200px]"
          style={{ minHeight }}
        />
      </div>

      {/* Footer with formatting hint */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border-subtle bg-surface-hover">
        <div className="flex items-center gap-2 text-[10px] text-text-dim">
          <kbd className="px-1 py-0.5 bg-surface-hover rounded border border-border-subtle">Ctrl+B</kbd> bold
          <kbd className="px-1 py-0.5 bg-surface-hover rounded border border-border-subtle">Ctrl+I</kbd> italic
          <kbd className="px-1 py-0.5 bg-surface-hover rounded border border-border-subtle">Ctrl+U</kbd> underline
        </div>
        <span className="text-[10px] text-text-dim">
          Rich text editor
        </span>
      </div>
    </div>
  );
}
