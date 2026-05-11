"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { PhotoUploadSection, PhotoItem } from "./photo-upload";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Camera,
  DollarSign,
  Edit3,
  Save,
  X,
  FileText,
  MessageSquare,
  Send,
  XCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

// ─── Task Entry ──────────────────────────────────────────────────────────────

export interface TaskEntry {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  assignee?: string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "NOT_NEEDED";
  statusNote?: string;
  messages?: TaskMessage[];
  photos: PhotoItem[];
  expanded: boolean;
  chatOpen?: boolean;
}

export interface TaskMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorImage?: string;
  content: string;
  createdAt: string;
}

// ─── Service-Type Task Templates ─────────────────────────────────────────────

export interface TaskTemplate {
  title: string;
  description: string;
}

export const SERVICE_TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  GRASS_CUT: [
    {
      title: "Front yard grass cut",
      description:
        "Mow front yard completely. Trim edges along walkways, driveway, and flower beds. Remove all clippings from hard surfaces.",
    },
    {
      title: "Back yard grass cut",
      description:
        "Mow back yard completely. Trim edges along fence line, shed, and play areas. Remove all clippings from hard surfaces.",
    },
    {
      title: "Left side yard",
      description:
        "Mow left side of property between fence and house. Trim around AC unit, utility meters, and any obstacles.",
    },
    {
      title: "Right side yard",
      description:
        "Mow right side of property between fence and house. Trim around AC unit, utility meters, and any obstacles.",
    },
    {
      title: "Property front photo",
      description:
        "Take a clear front-facing photo of the property from the street showing the full front yard and house exterior.",
    },
    {
      title: "Left side photo",
      description:
        "Take a photo of the left side of the property showing yard condition and any visible issues.",
    },
    {
      title: "Back yard photo",
      description:
        "Take a photo of the back yard showing the full area, fence line, and any structures.",
    },
    {
      title: "Right side photo",
      description:
        "Take a photo of the right side of the property showing yard condition and any visible issues.",
    },
  ],
  DEBRIS_REMOVAL: [
    {
      title: "Front yard debris removal",
      description:
        "Remove all debris from front yard including branches, trash, leaves, and any abandoned items. Bag and dispose properly.",
    },
    {
      title: "Back yard debris removal",
      description:
        "Remove all debris from back yard including branches, trash, leaves, and any abandoned items. Bag and dispose properly.",
    },
    {
      title: "Interior debris removal",
      description:
        "Remove any abandoned furniture, trash, or debris from inside the property. Document items removed with photos.",
    },
    {
      title: "Before photos - all areas",
      description:
        "Take before photos of front, back, left side, right side, and interior showing debris condition before starting work.",
    },
    {
      title: "After photos - all areas",
      description:
        "Take after photos of front, back, left side, right side, and interior showing clean condition after debris removal.",
    },
  ],
  WINTERIZATION: [
    {
      title: "Shut off water supply",
      description:
        "Locate and shut off the main water supply valve. Drain all pipes, water heater, and fixtures to prevent freezing.",
    },
    {
      title: "Blow out water lines",
      description:
        "Use air compressor to blow out all remaining water from supply lines, toilets, and appliances.",
    },
    {
      title: "Add antifreeze to traps",
      description:
        "Pour non-toxic antifreeze into all sink drains, toilet bowls, bathtub/shower drains, and washing machine drain.",
    },
    {
      title: "Lock change",
      description:
        "Install new lock set on front door. Place key inside lockbox and document lockbox combination.",
    },
    {
      title: "Before/during/after photos",
      description:
        "Take photos before starting, during each step, and after completion. Document water meter, valves, and lock installation.",
    },
  ],
  BOARD_UP: [
    {
      title: "Measure and cut boards",
      description:
        "Measure all open windows and doorways. Cut plywood to size for each opening. Document measurements.",
    },
    {
      title: "Board windows",
      description:
        "Secure plywood over all open/broken windows using appropriate screws. Ensure tight fit with no gaps.",
    },
    {
      title: "Board doors",
      description:
        "Secure plywood over any open/broken doorways. Ensure entry point is sealed but accessible for future work.",
    },
    {
      title: "Before/during/after photos",
      description:
        "Take photos of each opening before boarding, during installation, and after completion. Document all entry points.",
    },
  ],
  INSPECTION: [
    {
      title: "Exterior inspection",
      description:
        "Walk the entire exterior. Check roof, gutters, siding, foundation, windows, doors. Document any damage or issues with photos.",
    },
    {
      title: "Interior inspection",
      description:
        "Check all rooms for damage, water stains, mold, broken fixtures, missing appliances. Document with photos.",
    },
    {
      title: "Utility check",
      description:
        "Check water, electric, gas meters. Look for leaks, standing water, or signs of vandalism.",
    },
    {
      title: "Yard and grounds",
      description:
        "Check lawn condition, overgrown vegetation, fallen trees, fencing, mailbox, and any HOA violations.",
    },
    {
      title: "Property photos - all sides",
      description:
        "Take photos from front, left side, back, right side. Include close-ups of any damage or concerns found.",
    },
  ],
  MOLD_REMEDIATION: [
    {
      title: "Mold assessment",
      description:
        "Identify all mold-affected areas. Document extent of growth with photos and measurements. Note moisture sources.",
    },
    {
      title: "Containment setup",
      description:
        "Set up containment barriers with plastic sheeting. Establish negative air pressure if needed.",
    },
    {
      title: "Mold removal",
      description:
        "Remove all mold-contaminated materials. Clean affected surfaces with appropriate antimicrobial solutions.",
    },
    {
      title: "Air quality test",
      description:
        "Perform post-remediation air quality test to verify mold spore levels are within acceptable range.",
    },
    {
      title: "Before/during/after photos",
      description:
        "Take photos of all affected areas before, during remediation, and after completion. Document containment setup.",
    },
  ],
};

export function getTemplatesForService(serviceType?: string): TaskTemplate[] {
  if (!serviceType) return [];
  return SERVICE_TASK_TEMPLATES[serviceType] || [];
}

export function TaskEntryList({
  tasks,
  onTasksChange,
  serviceType,
  onUpload,
  onOpenCamera,
  className,
}: {
  tasks: TaskEntry[];
  onTasksChange: (tasks: TaskEntry[]) => void;
  serviceType?: string;
  onUpload?: (file: File, category: string) => Promise<{ url: string; id: string }>;
  onOpenCamera?: (category: string, taskId: string) => void;
  className?: string;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const templates = getTemplatesForService(serviceType);

  function addTask() {
    if (!newTaskTitle.trim()) return;
    const newTask: TaskEntry = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      completed: false,
      photos: [],
      expanded: false,
    };
    onTasksChange([...tasks, newTask]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setShowAddForm(false);
  }

  function loadTemplates() {
    const newTasks: TaskEntry[] = templates.map((t, i) => ({
      id: `task-tpl-${Date.now()}-${i}`,
      title: t.title,
      description: t.description,
      completed: false,
      photos: [],
      expanded: false,
    }));
    onTasksChange([...tasks, ...newTasks]);
    setShowTemplates(false);
  }

  function toggleComplete(id: string) {
    onTasksChange(
      tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  }

  function toggleExpand(id: string) {
    onTasksChange(
      tasks.map((t) => (t.id === id ? { ...t, expanded: !t.expanded } : t))
    );
  }

  function removeTask(id: string) {
    onTasksChange(tasks.filter((t) => t.id !== id));
  }

  function updateTaskPhotos(id: string, photos: PhotoItem[]) {
    onTasksChange(
      tasks.map((t) => (t.id === id ? { ...t, photos } : t))
    );
  }

  function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    onTasksChange(
      tasks.map((t) =>
        t.id === id
          ? { ...t, title: editTitle.trim(), description: editDesc.trim() || undefined }
          : t
      )
    );
    setEditingId(null);
  }

  function startEdit(task: TaskEntry) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
  }

  function updateTaskStatus(id: string, status: TaskEntry["status"], note?: string) {
    onTasksChange(
      tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              statusNote: note || t.statusNote,
              completed: status === "COMPLETED",
              completedAt: status === "COMPLETED" ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
  }

  function addTaskMessage(taskId: string, content: string, authorName: string, authorId: string, authorImage?: string) {
    onTasksChange(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              messages: [
                ...(t.messages || []),
                {
                  id: `msg-${Date.now()}`,
                  authorId,
                  authorName,
                  authorImage,
                  content,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : t
      )
    );
  }

  function toggleChat(id: string) {
    onTasksChange(
      tasks.map((t) => (t.id === id ? { ...t, chatOpen: !t.chatOpen } : t))
    );
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with progress */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <CheckCircle2 className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Project Tasks</h3>
              <p className="text-[10px] font-bold text-text-muted">{completedCount} of {totalCount} requirements met</p>
            </div>
          </div>
          {totalCount > 0 && (
            <div className="text-right">
              <span className="text-lg font-black text-cyan-400 leading-none">{Math.round(progressPct)}%</span>
              <p className="text-[9px] font-black text-text-dim uppercase tracking-tighter">Completion</p>
            </div>
          )}
        </div>
        
        {totalCount > 0 && (
          <div className="relative h-2 w-full bg-surface-hover rounded-full overflow-hidden border border-border-subtle">
            <div
              className={cn(
                "absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out",
                progressPct === 100
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-border-subtle rounded-3xl text-center">
            <FileText className="h-10 w-10 text-slate-800 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-text-dim font-medium">No tasks assigned to this work order.</p>
          </div>
        ) : (
          tasks.map((task, idx) => (
            <div
              key={task.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                task.completed
                  ? "bg-emerald-500/[0.04] border-emerald-500/20 shadow-[0_4px_20px_-10px_rgba(16,185,129,0.1)]"
                  : "bg-surface/60 backdrop-blur-md border-border-subtle hover:border-border-subtle hover:bg-surface-hover"
              )}
            >
              {/* Task row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="text-[10px] font-black text-text-dim w-4 flex-shrink-0">
                  {(idx + 1).toString().padStart(2, "0")}
                </div>

                <button
                  onClick={() => toggleComplete(task.id)}
                  className="relative flex-shrink-0 group/check"
                >
                  {task.completed ? (
                    <div className="h-6 w-6 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform group-active/check:scale-90">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 rounded-lg border-2 border-border-medium group-hover/check:border-cyan-500/50 flex items-center justify-center transition-all group-active/check:scale-90">
                      <div className="h-2 w-2 rounded-sm bg-surface-hover opacity-0 group-hover/check:opacity-100 transition-opacity" />
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {editingId === task.id ? (
                    <div className="space-y-3 py-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-hover border border-border-medium rounded-xl text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(task.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Add directions or description..."
                        rows={2}
                        className="w-full px-3 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-secondary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEdit(task.id)}
                          className="px-4 py-1.5 rounded-lg bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] font-black uppercase tracking-widest hover:bg-surface-hover transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h4
                          className={cn(
                            "text-sm font-bold transition-colors",
                            task.completed || task.status === "COMPLETED"
                              ? "text-text-muted"
                              : task.status === "REJECTED" || task.status === "NOT_NEEDED"
                              ? "text-rose-400/60"
                              : "text-text-primary"
                          )}
                        >
                          {task.title}
                        </h4>
                        {task.status && task.status !== "PENDING" && (
                          <span
                            className={cn(
                              "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                              task.status === "COMPLETED" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                              task.status === "IN_PROGRESS" && "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
                              task.status === "REJECTED" && "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                              task.status === "NOT_NEEDED" && "bg-slate-500/10 text-text-secondary border border-slate-500/20"
                            )}
                          >
                            {task.status === "NOT_NEEDED" ? "NOT NEEDED" : task.status.replace("_", " ")}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-text-muted mt-1 line-clamp-1 group-hover:line-clamp-none transition-all leading-relaxed italic">
                          {task.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="flex -space-x-2 mr-2">
                    {task.photos.slice(0, 3).map((p, i) => (
                      <div key={p.id} className="h-7 w-7 rounded-lg border-2 border-border-subtle overflow-hidden bg-surface shadow-lg">
                        <img src={p.url} className="h-full w-full object-cover" />
                      </div>
                    ))}
                    {task.photos.length > 3 && (
                      <div className="h-7 w-7 rounded-lg border-2 border-border-subtle bg-surface-hover flex items-center justify-center text-[8px] font-black text-text-secondary shadow-lg">
                        +{task.photos.length - 3}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center bg-surface-hover border border-border-subtle rounded-xl p-1 gap-1">
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        task.expanded ? "bg-cyan-500 text-white shadow-lg" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                      )}
                      title="Documentation"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => toggleChat(task.id)}
                      className={cn(
                        "p-2 rounded-lg transition-all relative",
                        task.chatOpen ? "bg-violet-500 text-white shadow-lg" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                      )}
                      title="Task Communication"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {task.messages && task.messages.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-500 text-[8px] font-black text-white rounded-full flex items-center justify-center border-2 border-border-subtle">
                          {task.messages.length}
                        </span>
                      )}
                    </button>

                    <div className="w-px h-4 bg-surface-hover mx-0.5" />

                    <button
                      onClick={() => startEdit(task)}
                      className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-all"
                      title="Edit Protocol"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    {!task.completed && task.status !== "REJECTED" && task.status !== "NOT_NEEDED" && (
                      <button
                        onClick={() => {
                          const note = prompt("Reason for rejection (optional):");
                          if (note !== null) {
                            updateTaskStatus(task.id, "REJECTED", note || "Not needed");
                          }
                        }}
                        className="p-2 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Mark Unnecessary"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => removeTask(task.id)}
                      className="p-2 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="p-2 rounded-xl text-text-dim hover:text-text-secondary transition-all ml-1"
                  >
                    {task.expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded: Photo upload */}
              {task.expanded && (
                <div className="px-5 pb-5 pt-2 border-t border-border-subtle bg-surface-hover">
                  <PhotoUploadSection
                    photos={task.photos}
                    onPhotosChange={(photos) =>
                      updateTaskPhotos(task.id, photos)
                    }
                    onUpload={onUpload}
                    onOpenCamera={onOpenCamera ? (cat) => onOpenCamera(cat, task.id) : undefined}
                    title={`${task.title} Assets`}
                  />
                </div>
              )}

              {/* Task chat / messages */}
              {task.chatOpen && (
                <div className="border-t border-border-subtle">
                  <TaskChatInline
                    task={task}
                    onAddMessage={(content, authorName, authorId, authorImage) =>
                      addTaskMessage(task.id, content, authorName, authorId, authorImage)
                    }
                    onUpdateStatus={(status, note) => updateTaskStatus(task.id, status, note)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border-subtle">
        {showAddForm ? (
          <div className="w-full p-6 rounded-3xl border border-border-medium bg-surface/60 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-cyan-400" />
              </div>
              <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">New Project Task</h4>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Requirement Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Secure perimeter gate"
                  className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTaskTitle.trim()) addTask();
                    if (e.key === "Escape") setShowAddForm(false);
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Execution Details</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Provide specific instructions for field technicians..."
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-xs text-text-secondary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none transition-all shadow-inner"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addTask}
                disabled={!newTaskTitle.trim()}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20"
              >
                Create Requirement
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewTaskTitle("");
                  setNewTaskDesc("");
                }}
                className="px-6 py-3 rounded-2xl bg-surface-hover text-white text-xs font-black uppercase tracking-widest hover:bg-surface-hover transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-hover text-text-muted hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/[0.02] transition-all group"
            >
              <div className="h-8 w-8 rounded-xl bg-surface-hover group-hover:bg-cyan-500/10 flex items-center justify-center transition-all">
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest">Manual Requirement</span>
            </button>
            
            {templates.length > 0 && (
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-cyan-500/10 bg-cyan-500/[0.01] text-cyan-500/60 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/[0.04] transition-all group"
              >
                <div className="h-8 w-8 rounded-xl bg-cyan-500/5 group-hover:bg-cyan-500/10 flex items-center justify-center transition-all">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest">Project Templates</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Templates Dropdown */}
      {showTemplates && templates.length > 0 && (
        <div className="p-6 rounded-3xl border border-cyan-500/20 bg-cyan-500/[0.02] backdrop-blur-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-cyan-400" />
              </div>
              <h4 className="text-sm font-black text-cyan-100 uppercase tracking-widest">Smart Protocol Generator</h4>
            </div>
            <button
              onClick={loadTemplates}
              className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-all"
            >
              Add All Templates
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates
              .filter((t) => !tasks.some((et) => et.title === t.title))
              .map((t, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const newTask: TaskEntry = {
                      id: `task-tpl-${Date.now()}-${i}`,
                      title: t.title,
                      description: t.description,
                      completed: false,
                      photos: [],
                      expanded: false,
                    };
                    onTasksChange([...tasks, newTask]);
                  }}
                  className="group flex items-start gap-4 p-4 rounded-2xl bg-surface-hover border border-border-subtle hover:bg-surface-hover hover:border-cyan-500/30 transition-all text-left"
                >
                  <div className="h-6 w-6 rounded-lg bg-surface-hover group-hover:bg-cyan-500/20 flex items-center justify-center flex-shrink-0 transition-all">
                    <Plus className="h-3 w-3 text-text-muted group-hover:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary group-hover:text-white transition-colors">{t.title}</p>
                    <p className="text-[10px] text-text-muted mt-1 line-clamp-1 italic group-hover:text-text-secondary">
                      {t.description}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bid Entry ───────────────────────────────────────────────────────────────

export interface BidEntry {
  id: string;
  title: string;
  amount: number;
  description?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  photos: PhotoItem[];
  expanded: boolean;
}

export function BidEntryList({
  bids,
  onBidsChange,
  onUpload,
  onOpenCamera,
  className,
}: {
  bids: BidEntry[];
  onBidsChange: (bids: BidEntry[]) => void;
  onUpload?: (file: File, category: string) => Promise<{ url: string; id: string }>;
  onOpenCamera?: (category: string, bidId: string) => void;
  className?: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");

  function addBid() {
    if (!newTitle.trim() || !newAmount) return;
    const newBid: BidEntry = {
      id: `bid-${Date.now()}`,
      title: newTitle.trim(),
      amount: parseFloat(newAmount),
      description: newDesc.trim() || undefined,
      status: "PENDING",
      photos: [],
      expanded: false,
    };
    onBidsChange([...bids, newBid]);
    setNewTitle("");
    setNewAmount("");
    setNewDesc("");
    setShowAdd(false);
  }

  function removeBid(id: string) {
    onBidsChange(bids.filter((b) => b.id !== id));
  }

  function toggleExpand(id: string) {
    onBidsChange(
      bids.map((b) => (b.id === id ? { ...b, expanded: !b.expanded } : b))
    );
  }

  function updateBidPhotos(id: string, photos: PhotoItem[]) {
    onBidsChange(
      bids.map((b) => (b.id === id ? { ...b, photos } : b))
    );
  }

  function updateStatus(id: string, status: BidEntry["status"]) {
    onBidsChange(
      bids.map((b) => (b.id === id ? { ...b, status } : b))
    );
  }

  function startEdit(bid: BidEntry) {
    setEditingId(bid.id);
    setEditTitle(bid.title);
    setEditAmount(String(bid.amount));
    setEditDesc(bid.description || "");
  }

  function saveEdit(id: string) {
    if (!editTitle.trim() || !editAmount) return;
    onBidsChange(
      bids.map((b) =>
        b.id === id
          ? {
              ...b,
              title: editTitle.trim(),
              amount: parseFloat(editAmount),
              description: editDesc.trim() || undefined,
            }
          : b
      )
    );
    setEditingId(null);
  }

  const totalAmount = bids.reduce((s, b) => s + b.amount, 0);
  const approvedAmount = bids
    .filter((b) => b.status === "APPROVED")
    .reduce((s, b) => s + b.amount, 0);

  const statusColors = {
    PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    REJECTED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Financial Estimates</h3>
            <p className="text-[10px] font-bold text-text-muted">{bids.length} proposed bid{bids.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-emerald-400 leading-none">
            ${totalAmount.toLocaleString()}
          </span>
          <p className="text-[9px] font-black text-text-dim uppercase tracking-tighter">Projected Value</p>
        </div>
      </div>

      <div className="space-y-3">
        {bids.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-border-subtle rounded-3xl text-center">
            <DollarSign className="h-10 w-10 text-slate-800 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-text-dim font-medium">No financial bids have been created yet.</p>
          </div>
        ) : (
          bids.map((bid) => (
            <div
              key={bid.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                bid.status === "APPROVED"
                  ? "bg-emerald-500/[0.04] border-emerald-500/20 shadow-[0_4px_20px_-10px_rgba(16,185,129,0.1)]"
                  : "bg-surface/60 backdrop-blur-md border-border-subtle hover:border-border-subtle hover:bg-surface-hover"
              )}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="h-10 w-10 rounded-xl bg-surface-hover flex items-center justify-center border border-border-subtle group-hover:scale-110 transition-transform">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === bid.id ? (
                    <div className="space-y-3 py-1">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-surface-hover border border-border-medium rounded-xl text-sm text-text-primary focus:border-emerald-500/50 focus:outline-none"
                            autoFocus
                          />
                        </div>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim" />
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 bg-surface-hover border border-border-medium rounded-xl text-sm text-emerald-400 font-black focus:border-emerald-500/50 focus:outline-none"
                          />
                        </div>
                      </div>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Provide justification..."
                        className="w-full px-4 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-secondary focus:border-emerald-500/50 focus:outline-none resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(bid.id)} className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors">Update Bid</button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] font-black uppercase tracking-widest">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-bold text-text-primary">{bid.title}</h4>
                        <span className={cn(
                          "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                          statusColors[bid.status]
                        )}>
                          {bid.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-black text-emerald-400">${bid.amount.toLocaleString()}</span>
                        {bid.description && <span className="text-[11px] text-text-muted italic line-clamp-1 group-hover:line-clamp-none group-hover:text-text-secondary transition-all max-w-[300px]">"{bid.description}"</span>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-surface-hover border border-border-subtle rounded-xl p-1 gap-1">
                    <button
                      onClick={() => toggleExpand(bid.id)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        bid.expanded ? "bg-emerald-500 text-white shadow-lg" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                      )}
                      title="Documentation"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-4 bg-surface-hover mx-0.5" />
                    <button
                      onClick={() => {
                        setEditingId(bid.id);
                        setEditTitle(bid.title);
                        setEditAmount(String(bid.amount));
                        setEditDesc(bid.description || "");
                      }}
                      className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-all"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    {bid.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => updateStatus(bid.id, "APPROVED")}
                          className="p-2 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => updateStatus(bid.id, "REJECTED")}
                          className="p-2 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => removeBid(bid.id)}
                      className="p-2 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => toggleExpand(bid.id)}
                    className="p-2 rounded-xl text-text-dim hover:text-text-secondary transition-all ml-1"
                  >
                    {bid.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {bid.expanded && (
                <div className="px-5 pb-5 pt-2 border-t border-border-subtle bg-surface-hover">
                  <PhotoUploadSection
                    photos={bid.photos}
                    onPhotosChange={(photos) => updateBidPhotos(bid.id, photos)}
                    onUpload={onUpload}
                    onOpenCamera={onOpenCamera ? (cat) => onOpenCamera(cat, bid.id) : undefined}
                    title={`${bid.title} Documentation`}
                    singleBucket
                    singleBucketCategory="BID"
                    showCategories={["BID"]}
                    compact
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Bid Form */}
      {showAdd ? (
        <div className="p-6 rounded-3xl border border-border-medium bg-surface/60 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-emerald-400" />
            </div>
            <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">New Estimate Proposal</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Proposal Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Roof Damage Remediation"
                className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Estimated Cost ($)</label>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-emerald-400 font-black focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Detailed Justification</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Explain the scope of work and financial reasoning..."
              rows={3}
              className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-xs text-text-secondary focus:border-emerald-500/50 focus:outline-none resize-none shadow-inner"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addBid}
              disabled={!newTitle.trim() || !newAmount}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
            >
              Submit Financial Proposal
            </button>
            <button onClick={() => setShowAdd(false)} className="px-6 py-3 rounded-2xl bg-surface-hover text-white text-xs font-black uppercase tracking-widest hover:bg-surface-hover">Dismiss</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-hover text-text-muted hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] transition-all group shadow-inner"
        >
          <div className="h-8 w-8 rounded-xl bg-surface-hover group-hover:bg-emerald-500/10 flex items-center justify-center transition-all">
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          </div>
          <span className="text-sm font-black uppercase tracking-widest">Create New Financial Bid</span>
        </button>
      )}
    </div>
  );
}

// ─── Task Inline Chat ────────────────────────────────────────────────────────

function TaskChatInline({
  task,
  onAddMessage,
  onUpdateStatus,
}: {
  task: TaskEntry;
  onAddMessage: (content: string, authorName: string, authorId: string, authorImage?: string) => void;
  onUpdateStatus: (status: TaskEntry["status"], note?: string) => void;
}) {
  const [msg, setMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = task.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    // Use session info if available, otherwise generic
    onAddMessage(msg.trim(), "You", "current-user");
    setMsg("");
  }

  const statusActions = [
    { label: "Accept", status: "IN_PROGRESS" as const, color: "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20" },
    { label: "Complete", status: "COMPLETED" as const, color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" },
    { label: "Not Needed", status: "NOT_NEEDED" as const, color: "bg-gray-500/10 text-text-secondary hover:bg-gray-500/20" },
  ];

  return (
    <div className="border-t border-border-subtle bg-surface">
      {/* Quick status actions */}
      <div className="px-3 py-2 flex items-center gap-1.5 border-b border-border-subtle">
        <span className="text-[10px] text-text-muted mr-1">Quick:</span>
        {statusActions.map((action) => (
          <button
            key={action.status}
            onClick={() => {
              if (action.status === "NOT_NEEDED") {
                const note = prompt("Reason (optional):");
                if (note !== null) onUpdateStatus(action.status, note || "Not needed");
              } else {
                onUpdateStatus(action.status);
              }
            }}
            className={cn(
              "text-[10px] font-medium px-2 py-1 rounded-md transition-colors",
              action.color
            )}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="max-h-40 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 ? (
          <p className="text-[11px] text-text-dim text-center py-4">
            No messages yet. Add a note or reply about this task.
          </p>
        ) : (
          messages.map((m, idx) => {
            const isOwn = m.authorId === "current-user";
            const prevMsg = messages[idx - 1];
            const nextMsg = messages[idx + 1];
            const isFirstInGroup = !prevMsg || prevMsg.authorId !== m.authorId;
            const isLastInGroup = !nextMsg || nextMsg.authorId !== m.authorId;

            return (
              <div
                key={m.id}
                className={cn(
                  "flex gap-2.5",
                  isOwn && "flex-row-reverse",
                  isFirstInGroup ? "mt-4" : "mt-0.5"
                )}
              >
                <div className="w-7 flex-shrink-0">
                  {isFirstInGroup && !isOwn && (
                    <Avatar
                      name={m.authorName}
                      src={m.authorImage}
                      size="sm"
                      className="ring-1 ring-white/10"
                    />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] flex flex-col",
                    isOwn ? "items-end" : "items-start"
                  )}
                >
                  {isFirstInGroup && (
                    <div className={cn(
                      "flex items-center gap-2 mb-0.5 px-1",
                      isOwn && "flex-row-reverse"
                    )}>
                      <span className="text-[10px] font-bold text-text-secondary">
                        {isOwn ? "You" : m.authorName}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "px-3 py-1.5 text-[12px] leading-relaxed shadow-sm transition-all",
                      isOwn
                        ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                        : "bg-surface-hover text-text-primary border border-border-subtle",
                      // Grouped corners
                      isOwn 
                        ? cn(
                            "rounded-2xl rounded-tr-md",
                            !isFirstInGroup && "rounded-tr-2xl",
                            !isLastInGroup && "rounded-br-md"
                          )
                        : cn(
                            "rounded-2xl rounded-tl-md",
                            !isFirstInGroup && "rounded-tl-2xl",
                            !isLastInGroup && "rounded-bl-md"
                          )
                    )}
                  >
                    <p>{m.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-3 py-2 border-t border-border-subtle"
      >
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Reply about this task..."
          className="flex-1 px-2.5 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!msg.trim()}
          className="p-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg disabled:opacity-40"
        >
          <Send className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}
