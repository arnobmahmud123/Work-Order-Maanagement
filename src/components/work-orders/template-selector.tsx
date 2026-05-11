"use client";

import { useState, useMemo } from "react";
import { Search, ChevronRight, Info, Building2, ClipboardList, Sparkles, FilterX } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORK_ORDER_TEMPLATES, WorkOrderTemplate } from "@/lib/work-order-templates";

interface WorkOrderTemplateSelectorProps {
  onSelect: (template: WorkOrderTemplate) => void;
  className?: string;
}

export function WorkOrderTemplateSelector({ onSelect, className }: WorkOrderTemplateSelectorProps) {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const clients = useMemo(() => {
    const set = new Set(WORK_ORDER_TEMPLATES.map(t => t.client));
    return Array.from(set).sort();
  }, []);

  const filteredTemplates = useMemo(() => {
    return WORK_ORDER_TEMPLATES.filter(t => {
      const matchesSearch = 
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.client.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      
      const matchesClient = !selectedClient || t.client === selectedClient;
      
      return matchesSearch && matchesClient;
    });
  }, [search, selectedClient]);

  return (
    <div className={cn("space-y-6 animate-fade-in", className)}>
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-cyan-500 transition-colors pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates (e.g., Initial Secure MCS)..."
          className="w-full pl-11 pr-4 py-3.5 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner"
        />
      </div>

      <div className="space-y-3">
        <p className="px-1 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Filter by Client</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedClient(null)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider",
              !selectedClient 
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]" 
                : "bg-surface-hover border-border-subtle text-text-muted hover:text-text-secondary hover:bg-surface-hover"
            )}
          >
            All Partners
          </button>
          {clients.map(client => (
            <button
              key={client}
              onClick={() => setSelectedClient(client)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border uppercase tracking-wider",
                selectedClient === client
                  ? "bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]" 
                  : "bg-surface-hover border-border-subtle text-text-muted hover:text-text-secondary hover:bg-surface-hover"
              )}
            >
              {client}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="group flex items-start gap-4 p-4 rounded-2xl bg-surface-hover border border-border-subtle hover:bg-surface-hover hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/5 transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Sparkles className="h-4 w-4 text-cyan-500/50" />
              </div>

              <div className="h-12 w-12 rounded-xl bg-surface-hover/50 border border-border-subtle flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20 transition-all duration-300">
                <Building2 className="h-6 w-6 text-text-dim group-hover:text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-black text-text-primary tracking-tight group-hover:text-cyan-400 transition-colors">
                    {template.title}
                  </h4>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-surface-hover text-text-muted uppercase tracking-widest border border-border-subtle">
                    {template.client}
                  </span>
                </div>
                <p className="text-xs text-text-muted font-medium line-clamp-1">
                  {template.description}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-dim uppercase tracking-tighter">
                    <ClipboardList className="h-3.5 w-3.5 text-text-dim" />
                    {template.tasks.length} Step Workflow
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-dim uppercase tracking-tighter">
                    <Info className="h-3.5 w-3.5 text-text-dim" />
                    {template.category}
                  </div>
                </div>
              </div>

              <div className="self-center flex items-center justify-center h-8 w-8 rounded-full bg-surface-hover group-hover:bg-cyan-500/10 transition-colors">
                <ChevronRight className="h-4 w-4 text-text-dim group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))
        ) : (
          <div className="py-16 text-center space-y-4">
            <div className="h-16 w-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto">
              <FilterX className="h-8 w-8 text-text-dim" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-text-secondary">No matching templates found</p>
              <p className="text-xs text-text-dim">Try adjusting your search or client filters.</p>
            </div>
            <button 
              onClick={() => { setSearch(""); setSelectedClient(null); }}
              className="px-4 py-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-xl transition-all uppercase tracking-widest border border-cyan-500/20"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
