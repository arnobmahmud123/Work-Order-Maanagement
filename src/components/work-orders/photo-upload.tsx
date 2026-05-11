"use client";

import { useState, useRef, lazy, Suspense, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  Camera,
  Upload,
  X,
  ZoomIn,
  Trash2,
  Loader2,
  MapPin,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Lazy load the editor to avoid bloating initial bundle
const ImageEditor = lazy(() =>
  import("@/components/image-editor").then((m) => ({ default: m.ImageEditor }))
);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PhotoItem {
  id: string;
  url: string;
  name: string;
  size: number;
  category: PhotoCategory;
  timestamp?: string;
  /** If true, this photo is already saved on the server (not a blob URL) */
  persisted?: boolean;
}

export type PhotoCategory = "BEFORE" | "DURING" | "AFTER" | "BID" | "INSPECTION" | "PROPERTY_FRONT";

const CATEGORY_CONFIG: Record<
  PhotoCategory,
  { label: string; color: string; gradient: string; icon: string }
> = {
  BEFORE: {
    label: "Before",
    color: "text-amber-400",
    gradient: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    icon: "📋",
  },
  DURING: {
    label: "During",
    color: "text-cyan-400",
    gradient: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
    icon: "🔧",
  },
  AFTER: {
    label: "After",
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
    icon: "✅",
  },
  BID: {
    label: "Bid",
    color: "text-rose-400",
    gradient: "from-rose-500/20 to-pink-500/20 border-rose-500/30",
    icon: "💰",
  },
  INSPECTION: {
    label: "Inspection",
    color: "text-violet-400",
    gradient: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
    icon: "🔍",
  },
  PROPERTY_FRONT: {
    label: "Property Front",
    color: "text-sky-400",
    gradient: "from-sky-500/20 to-indigo-500/20 border-sky-500/30",
    icon: "🏠",
  },
};

// ─── Photo Bucket ────────────────────────────────────────────────────────────

function PhotoBucket({
  category,
  photos,
  onDrop,
  onRemove,
  onView,
  onEdit,
  hideLabel,
  uploading,
  compact,
}: {
  category: PhotoCategory;
  photos: PhotoItem[];
  onDrop: (files: File[], category: PhotoCategory) => void;
  onRemove: (id: string) => void;
  onView: (photo: PhotoItem) => void;
  onEdit?: (photo: PhotoItem) => void;
  hideLabel?: boolean;
  uploading?: boolean;
  compact?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const config = CATEGORY_CONFIG[category];

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) onDrop(files, category);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) onDrop(files, category);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Bucket header */}
      {!hideLabel && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{config.icon}</span>
          <h4 className={cn("text-sm font-semibold", config.color)}>
            {config.label}
          </h4>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-hover text-text-muted">
            {photos.length}
          </span>
          {uploading && (
            <Loader2 className="h-3 w-3 text-cyan-400 animate-spin" />
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col",
          compact ? "min-h-[92px]" : "min-h-[140px]",
          isDragOver
            ? `bg-gradient-to-br ${config.gradient} border-solid scale-[1.02]`
            : photos.length === 0
            ? "border-border-subtle hover:border-border-subtle bg-surface-hover hover:bg-surface-hover"
            : "border-border-subtle bg-surface-hover hover:border-border-subtle"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {photos.length === 0 ? (
          <div className={cn("flex-1 flex flex-col items-center justify-center gap-2", compact ? "p-3" : "p-4")}>
            <div
              className={cn(
                "rounded-xl flex items-center justify-center transition-all",
                compact ? "h-8 w-8" : "h-10 w-10",
                isDragOver
                  ? `bg-gradient-to-br ${config.gradient}`
                  : "bg-surface-hover"
              )}
            >
              <Upload
                className={cn(
                  "transition-colors",
                  compact ? "h-4 w-4" : "h-5 w-5",
                  isDragOver ? config.color : "text-text-dim"
                )}
              />
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-medium", isDragOver ? config.color : "text-text-muted")}>
                {isDragOver ? "Drop photos here" : "Drag & drop photos"}
              </p>
              <p className="text-[10px] text-text-dim mt-0.5">
                or click to browse
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            {/* Photo grid — scrollable container caps visible height */}
            <div className={cn("overflow-y-auto overflow-x-hidden pr-1", compact ? "max-h-[156px]" : "max-h-[400px]")}>
              <div className={cn("grid gap-1.5", compact ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8" : "grid-cols-2")}>
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group rounded-lg overflow-hidden aspect-square bg-surface-hover"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      loading="lazy"
                      decoding="async"
                      className={cn(
                        "w-full h-full object-cover transition-opacity",
                        !photo.persisted && photo.url.startsWith("blob:") && "opacity-60"
                      )}
                    />
                    {!photo.persisted && photo.url.startsWith("blob:") && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(photo);
                        }}
                        className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                      >
                        <ZoomIn className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(photo.id);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add more */}
            <div className="mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border-subtle hover:border-border-subtle text-text-dim hover:text-text-secondary transition-colors">
              <Camera className="h-3.5 w-3.5" />
              <span className="text-[11px]">Add more</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Photo Upload Section (3 buckets) ────────────────────────────────────────

/**
 * Photo upload section with Before/During/After buckets.
 *
 * Props:
 * - `photos` / `onPhotosChange`: local photo state (includes both blob and persisted photos)
 * - `onUpload`: called when files need to be uploaded to the server. Should return permanent URL.
 *   Signature: (file: File, category: PhotoCategory) => Promise<{ url: string; id: string }>
 * - `existingFiles`: files already saved on the server (from workOrder.files)
 */
export function PhotoUploadSection({
  photos,
  onPhotosChange,
  onUpload,
  existingFiles,
  title = "Photos",
  singleBucket,
  singleBucketCategory,
  showCategories,
  onOpenCamera,
  className,
  compact,
}: {
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  onUpload?: (file: File, category: PhotoCategory) => Promise<{ url: string; id: string }>;
  existingFiles?: any[];
  title?: string;
  singleBucket?: boolean;
  /** Category used by single-bucket mode. Defaults to the first shown category. */
  singleBucketCategory?: PhotoCategory;
  /** Which categories to show. Defaults to ["BEFORE","DURING","AFTER"]. */
  showCategories?: PhotoCategory[];
  /** Called when user taps the GPS Camera button */
  onOpenCamera?: (category: PhotoCategory) => void;
  className?: string;
  compact?: boolean;
}) {
  const [viewerPhoto, setViewerPhoto] = useState<PhotoItem | null>(null);
  const [editorPhoto, setEditorPhoto] = useState<PhotoItem | null>(null);
  const [uploading, setUploading] = useState(false);

  const categories: PhotoCategory[] =
    showCategories && showCategories.length > 0
      ? showCategories
      : ["BEFORE", "DURING", "AFTER"];
  const bucketCategory = singleBucketCategory || categories[0] || "DURING";

  function getPhotosByCategory(cat: PhotoCategory): PhotoItem[] {
    return photos.filter((p) => p.category === cat);
  }

  async function handleDrop(files: File[], category: PhotoCategory) {
    // Create immediate blob URL previews
    const previews: PhotoItem[] = files.map((file) => ({
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      category,
      timestamp: new Date().toISOString(),
      persisted: false,
    }));

    // Add previews immediately for instant feedback
    onPhotosChange([...photos, ...previews]);

    // If upload handler provided, upload each file
    if (onUpload) {
      setUploading(true);
      try {
        const uploaded: PhotoItem[] = [];
        for (let i = 0; i < files.length; i++) {
          try {
            const result = await onUpload(files[i], category);
            uploaded.push({
              id: result.id,
              url: result.url,
              name: files[i].name,
              size: files[i].size,
              category,
              timestamp: new Date().toISOString(),
              persisted: true,
            });
          } catch (err) {
            console.error("Failed to upload:", files[i].name, err);
          }
        }

        // Replace blob previews with persisted URLs
        const withoutPreviews = photos.filter(
          (p) => !previews.find((pre) => pre.id === p.id)
        );
        onPhotosChange([...withoutPreviews, ...uploaded]);
      } finally {
        setUploading(false);
      }
    }
  }

  function handleRemove(id: string) {
    const photo = photos.find((p) => p.id === id);
    if (photo?.url.startsWith("blob:")) URL.revokeObjectURL(photo.url);
    onPhotosChange(photos.filter((p) => p.id !== id));
  }

  const totalPhotos = photos.length;

  // Single bucket mode (for bids / inspection)
  if (singleBucket) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            {totalPhotos > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <PhotoBucket
          category={bucketCategory}
          photos={photos}
          onDrop={(files) => handleDrop(files, bucketCategory)}
          onRemove={handleRemove}
          onView={setViewerPhoto}
          onEdit={setEditorPhoto}
          hideLabel
          uploading={uploading}
          compact={compact}
        />

        {onOpenCamera && (
          <button
            type="button"
            onClick={() => onOpenCamera(bucketCategory)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/[0.05] text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all text-xs font-medium"
          >
            <MapPin className="h-3.5 w-3.5" />
            GPS Camera
          </button>
        )}

        {/* Lightbox */}
        {viewerPhoto && createPortal(
          <PhotoLightboxNav
            photos={photos}
            currentPhoto={viewerPhoto}
            onClose={() => setViewerPhoto(null)}
            onEdit={(photo) => { setEditorPhoto(photo); setViewerPhoto(null); }}
            onRemove={(id) => { handleRemove(id); setViewerPhoto(null); }}
          />,
          document.body
        )}

        {/* Image Editor (single bucket) - portaled to body */}
        {editorPhoto && createPortal(
          <Suspense fallback={
            <div className="fixed inset-0 flex items-center justify-center bg-black/90" style={{ zIndex: 2147483647 }}>
              <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
            </div>
          }>
            <ImageEditor
              imageUrl={editorPhoto.url}
              imageName={editorPhoto.name}
              onClose={() => setEditorPhoto(null)}
            />
          </Suspense>,
          document.body
        )}
      </div>
    );
  }

  // Multi-bucket mode (default)
  const activeBuckets = categories.map((cat) => ({ cat, photos: getPhotosByCategory(cat) }));
  const filledBuckets = activeBuckets.filter((b) => b.photos.length > 0).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {totalPhotos > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
              {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""}
            </span>
          )}
          {uploading && (
            <span className="text-[10px] text-cyan-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading...
            </span>
          )}
        </div>
        {filledBuckets > 0 && (
          <div className="flex items-center gap-1">
            {activeBuckets.map((b, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 w-6 rounded-full transition-all",
                  b.photos.length > 0
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600"
                    : "bg-surface-hover"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Buckets */}
      <div className={cn("grid grid-cols-1 gap-4", categories.length >= 3 ? "sm:grid-cols-3" : categories.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
        {categories.map((cat) => (
          <div key={cat} className="space-y-2">
            <PhotoBucket
              category={cat}
              photos={getPhotosByCategory(cat)}
              onDrop={handleDrop}
              onRemove={handleRemove}
              onView={setViewerPhoto}
              onEdit={setEditorPhoto}
              uploading={uploading}
            />
            {/* GPS Camera button */}
            {onOpenCamera && (
              <button
                type="button"
                onClick={() => onOpenCamera(cat)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/[0.05] text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all text-xs font-medium"
              >
                <MapPin className="h-3.5 w-3.5" />
                GPS Camera
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Completion indicator */}
      {filledBuckets > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border-subtle">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-text-secondary">Photo Progress</span>
              <span className="text-[11px] font-semibold text-text-secondary">
                {filledBuckets}/{categories.length} stages
              </span>
            </div>
            <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(filledBuckets / categories.length) * 100}%` }}
              />
            </div>
          </div>
          {filledBuckets === categories.length && (
            <span className="text-xs text-emerald-400 font-medium">✓ Complete</span>
          )}
        </div>
      )}

      {/* Lightbox */}
      {viewerPhoto && createPortal(
        <PhotoLightboxNav
          photos={photos}
          currentPhoto={viewerPhoto}
          onClose={() => setViewerPhoto(null)}
          onEdit={(photo) => { setEditorPhoto(photo); setViewerPhoto(null); }}
          onRemove={(id) => { handleRemove(id); setViewerPhoto(null); }}
        />,
        document.body
      )}

      {/* Image Editor - portaled to body to escape stacking context */}
      {editorPhoto && createPortal(
        <Suspense fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-black/90" style={{ zIndex: 2147483647 }}>
            <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
          </div>
        }>
          <ImageEditor
            imageUrl={editorPhoto.url}
            imageName={editorPhoto.name}
            onClose={() => setEditorPhoto(null)}
            onSave={(blob) => {
              // If there's an upload handler, save the edited image
              if (onUpload) {
                const file = new File([blob], editorPhoto.name.replace(/\.[^.]+$/, "") + "-edited.png", { type: "image/png" });
                onUpload(file, editorPhoto.category).then((result) => {
                  // Update the photo in the list
                  onPhotosChange(photos.map((p) =>
                    p.id === editorPhoto.id ? { ...p, url: result.url, id: result.id, persisted: true } : p
                  ));
                }).catch((err) => console.error("Failed to save edited image:", err));
              }
              setEditorPhoto(null);
            }}
          />
        </Suspense>,
        document.body
      )}
    </div>
  );
}

// ─── Navigable Photo Lightbox ────────────────────────────────────────────────

function PhotoLightboxNav({
  photos,
  currentPhoto,
  onClose,
  onEdit,
  onRemove,
}: {
  photos: PhotoItem[];
  currentPhoto: PhotoItem;
  onClose: () => void;
  onEdit?: (photo: PhotoItem) => void;
  onRemove?: (id: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    photos.findIndex((p) => p.id === currentPhoto.id)
  );
  const [isZoomed, setIsZoomed] = useState(false);

  const photo = photos[currentIndex] || currentPhoto;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsZoomed(false);
    }
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsZoomed(false);
    }
  }, [currentIndex, photos.length]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = photo.url;
    a.download = photo.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goPrev, goNext, onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-hidden"
      style={{ zIndex: 2147483647 }}
      onClick={onClose}
    >
      <div className="relative flex h-full w-full max-w-6xl items-center justify-center">
        {/* Prev button */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface-hover text-white hover:bg-surface-hover transition-colors z-10"
            title="Previous (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div 
          className={cn(
            "relative transition-all duration-300 ease-out flex items-center justify-center overflow-auto max-w-full max-h-full",
            isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
          )}
          onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
        >
          <img
            src={photo.url}
            alt={photo.name}
            className={cn(
              "rounded-xl transition-all duration-300",
              isZoomed 
                ? "max-w-none scale-150" 
                : "max-w-[calc(100vw-96px)] max-h-[calc(100vh-120px)] object-contain"
            )}
          />
        </div>

        {/* Next button */}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface-hover text-white hover:bg-surface-hover transition-colors z-10"
            title="Next (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Top toolbar buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-surface-hover text-white hover:bg-surface-hover transition-colors"
            title="Download image"
          >
            <Upload className="h-4 w-4 rotate-180" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isZoomed ? "bg-cyan-500 text-white" : "bg-surface-hover text-white hover:bg-surface-hover"
            )}
            title="Toggle zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(photo); }}
              className="p-2 rounded-lg bg-cyan-500/80 text-white hover:bg-cyan-500 transition-colors"
              title="Edit in editor"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }}
              className="p-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
              title="Delete photo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <div className="w-px h-8 bg-surface-hover mx-1" />
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom info + counter */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm p-3 rounded-xl border border-border-subtle">
            <p className="text-sm font-medium text-white">{photo.name}</p>
            <p className="text-xs text-text-secondary">
              {CATEGORY_CONFIG[photo.category]?.label} •{" "}
              {(photo.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <span className="text-xs text-text-secondary bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border-subtle">
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: convert existing FileUpload records to PhotoItem[] ──────────────

export function fileUploadsToPhotos(files: any[]): PhotoItem[] {
  return (files || [])
    .filter((f: any) => f.mimeType?.startsWith("image/"))
    .map((f: any) => ({
      id: f.id,
      url: f.path,
      name: f.originalName || f.filename,
      size: f.size || 0,
      category: (f.category as PhotoCategory) || "DURING",
      timestamp: f.createdAt,
      persisted: true,
    }));
}
