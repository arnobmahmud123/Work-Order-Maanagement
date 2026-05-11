"use client";

import { useState, useEffect } from "react";
import { X, Upload, MapPin, Link2, Tag, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "GENERAL", label: "General", color: "text-text-secondary" },
  { value: "WORK_RELATED", label: "Work Related", color: "text-blue-400" },
  { value: "HELP_NEEDED", label: "Help Needed", color: "text-amber-400" },
  { value: "URGENT", label: "Urgent", color: "text-rose-400" },
  { value: "ANNOUNCEMENT", label: "Announcement", color: "text-purple-400" },
  { value: "JOB_COVERAGE", label: "Job Coverage Request", color: "text-emerald-400" },
];

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isAdmin?: boolean;
  workOrders?: Array<{ id: string; title: string; address: string }>;
  editingPost?: any | null;
}

export function CreatePostModal({ isOpen, onClose, onSubmit, isAdmin, workOrders, editingPost }: CreatePostModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [workOrderId, setWorkOrderId] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Job coverage fields
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [urgency, setUrgency] = useState("MEDIUM");

  const isEditing = !!editingPost;
  const isJobCoverage = category === "JOB_COVERAGE";

  // Pre-populate fields when editing
  useEffect(() => {
    if (editingPost && isOpen) {
      setTitle(editingPost.title || "");
      setContent(editingPost.content || "");
      setCategory(editingPost.category || "GENERAL");
      setWorkOrderId(editingPost.workOrderId || "");
      setLocation(editingPost.location || "");
      setTags(editingPost.tags?.join(", ") || "");
      setIsUrgent(editingPost.isUrgent || false);
      setAttachments(editingPost.attachments || []);
      if (editingPost.jobRequest) {
        setScopeOfWork(editingPost.jobRequest.scopeOfWork || "");
        setBudget(editingPost.jobRequest.budget?.toString() || "");
        setDeadline(editingPost.jobRequest.deadline ? new Date(editingPost.jobRequest.deadline).toISOString().split("T")[0] : "");
        setUrgency(editingPost.jobRequest.urgency || "MEDIUM");
      }
    } else if (!isOpen) {
      resetForm();
    }
  }, [editingPost, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const uploaded: any[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/network/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          uploaded.push(data);
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setAttachments((prev) => [...prev, ...uploaded]);
    setUploading(false);
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError(null);

    const postData: any = {
      ...(isEditing && { id: editingPost.id }),
      title: title.trim(),
      content: content.trim(),
      category,
      workOrderId: workOrderId || undefined,
      location: location || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      isUrgent: isUrgent || category === "URGENT",
      attachments,
    };

    if (isJobCoverage) {
      postData.scopeOfWork = scopeOfWork || content.trim();
      postData.budget = budget ? parseFloat(budget) : undefined;
      postData.deadline = deadline || undefined;
      postData.urgency = urgency;
    }

    try {
      await onSubmit(postData);
      setSubmitting(false);
      resetForm();
      onClose();
    } catch (err: any) {
      setSubmitting(false);
      setError(err?.message || `Failed to ${isEditing ? "update" : "create"} post. Please try again.`);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("GENERAL");
    setWorkOrderId("");
    setLocation("");
    setTags("");
    setIsUrgent(false);
    setAttachments([]);
    setScopeOfWork("");
    setBudget("");
    setDeadline("");
    setUrgency("MEDIUM");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-hover border border-border-subtle rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 className="text-lg font-bold text-text-primary">{isEditing ? "Edit Post" : "Create Post"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Category */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Category *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                if (cat.value === "ANNOUNCEMENT" && !isAdmin) return null;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-sm border transition-colors",
                      category === cat.value
                        ? "bg-surface-hover border-border-active text-white"
                        : "border-border-subtle text-text-secondary hover:border-border-subtle"
                    )}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's this about?"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/40 text-sm"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share details..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/40 text-sm resize-none"
            />
          </div>

          {/* Work Order Link */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Link Work Order (optional)
            </label>
            <select
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary focus:outline-none focus:border-cyan-500/40 text-sm"
            >
              <option value="">None</option>
              {workOrders?.map((wo) => (
                <option key={wo.id} value={wo.id}>{wo.title} - {wo.address}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State or address"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/40 text-sm"
            />
          </div>

          {/* Job Coverage Fields */}
          {isJobCoverage && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
              <h3 className="text-sm font-semibold text-emerald-300">Job Coverage Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Budget ($)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-lg bg-surface-hover border border-border-subtle text-text-primary text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-hover border border-border-subtle text-text-primary text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Urgency</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-hover border border-border-subtle text-text-primary text-sm"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-2">
              <Tag className="h-4 w-4" /> Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="grasscut, lockchange, urgent"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/40 text-sm"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-2">
              <Upload className="h-4 w-4" /> Attachments
            </label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border-medium hover:border-border-active cursor-pointer transition-colors">
              <Upload className="h-5 w-5 text-text-muted" />
              <span className="text-sm text-text-secondary">
                {uploading ? "Uploading..." : "Click to upload images, videos, or documents"}
              </span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-hover text-xs text-text-secondary">
                    <span className="truncate max-w-[120px]">{att.originalName}</span>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-text-muted hover:text-rose-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Urgent toggle */}
          {category !== "URGENT" && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="rounded border-border-medium bg-surface-hover"
              />
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span className="text-sm text-text-secondary">Mark as urgent</span>
            </label>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || submitting}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (isEditing ? "Saving..." : "Posting...") : (isEditing ? "Save Changes" : "Publish Post")}
          </button>
        </div>
      </div>
    </div>
  );
}
