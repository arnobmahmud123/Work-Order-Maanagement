"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useWorkOrders } from "@/hooks/use-data";
import { GPSCamera, type CapturedPhoto } from "@/components/gps-camera";
import { PhotoViewer } from "@/components/photo-viewer";
import { Button, Card, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  Camera,
  MapPin,
  Calendar,
  Clock,
  Download,
  Trash2,
  Upload,
  CheckCircle2,
  Image as ImageIcon,
  ChevronRight,
  Loader2,
  Eye,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

type PhotoCategory = "BEFORE" | "DURING" | "AFTER";

interface QueuedPhoto {
  id: string;
  captured: CapturedPhoto;
  url: string;
  category: PhotoCategory;
  workOrderId?: string;
  uploaded: boolean;
  uploading: boolean;
}

export default function CameraPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [showCamera, setShowCamera] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory>("DURING");
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<string>("");
  const [photoQueue, setPhotoQueue] = useState<QueuedPhoto[]>([]);
  const [viewingPhoto, setViewingPhoto] = useState<QueuedPhoto | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: workOrdersData } = useWorkOrders({
    status: ["IN_PROGRESS", "ASSIGNED", "FIELD_COMPLETE"],
  });
  const workOrders = workOrdersData?.workOrders || [];

  function handleCapture(photo: CapturedPhoto) {
    const url = URL.createObjectURL(photo.blob);
    const queued: QueuedPhoto = {
      id: `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      captured: photo,
      url,
      category: selectedCategory,
      workOrderId: selectedWorkOrder || undefined,
      uploaded: false,
      uploading: false,
    };
    setPhotoQueue((prev) => [queued, ...prev]);
    setShowCamera(false);
    toast.success("Photo captured with GPS data!");
  }

  function removePhoto(id: string) {
    setPhotoQueue((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function uploadPhoto(photo: QueuedPhoto) {
    setPhotoQueue((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, uploading: true } : p))
    );

    try {
      const formData = new FormData();
      formData.append("file", photo.captured.blob, `gps-photo-${Date.now()}.jpg`);
      formData.append("category", photo.category);
      if (photo.workOrderId) {
        formData.append("workOrderId", photo.workOrderId);
      }
      // Add GPS metadata
      if (photo.captured.gps) {
        formData.append("latitude", String(photo.captured.gps.latitude));
        formData.append("longitude", String(photo.captured.gps.longitude));
        if (photo.captured.gps.altitude !== undefined) {
          formData.append("altitude", String(photo.captured.gps.altitude));
        }
        if (photo.captured.gps.accuracy !== undefined) {
          formData.append("accuracy", String(photo.captured.gps.accuracy));
        }
      }
      formData.append("capturedAt", photo.captured.timestamp.toISOString());
      if (photo.captured.address) {
        formData.append("address", photo.captured.address);
      }

      const res = await fetch("/api/upload/gps-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      setPhotoQueue((prev) =>
        prev.map((p) =>
          p.id === photo.id ? { ...p, uploaded: true, uploading: false } : p
        )
      );
      toast.success("Photo uploaded with GPS metadata!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setPhotoQueue((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, uploading: false } : p))
      );
    }
  }

  async function uploadAll() {
    const pending = photoQueue.filter((p) => !p.uploaded && !p.uploading);
    if (pending.length === 0) return;

    setUploading(true);
    for (const photo of pending) {
      await uploadPhoto(photo);
    }
    setUploading(false);
  }

  // Download with EXIF GPS data
  async function downloadPhoto(photo: QueuedPhoto) {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gps-photo-${photo.captured.timestamp.toISOString().replace(/[:.]/g, "-")}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  }

  const pendingCount = photoQueue.filter((p) => !p.uploaded).length;

  // ─── Camera View ──────────────────────────────────────────────────────

  if (showCamera) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCamera(false)}
            className="p-2 rounded-lg bg-surface-hover text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-text-primary">GPS Camera</h1>
            <p className="text-xs text-text-muted">
              Photos will include GPS coordinates and timestamp in EXIF data
            </p>
          </div>
        </div>

        {/* Category + Work Order selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted">Category:</span>
            {(["BEFORE", "DURING", "AFTER"] as PhotoCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                  selectedCategory === cat
                    ? cat === "BEFORE"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : cat === "DURING"
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-surface-hover text-text-muted border border-border-subtle hover:bg-surface-hover"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={selectedWorkOrder}
            onChange={(e) => setSelectedWorkOrder(e.target.value)}
            className="px-3 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-primary focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="">No Work Order</option>
            {workOrders.map((wo: any) => (
              <option key={wo.id} value={wo.id}>
                WO-{wo.id.slice(-6).toUpperCase()}: {wo.title}
              </option>
            ))}
          </select>
        </div>

        <GPSCamera
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
          className="aspect-[4/3] max-h-[70vh]"
        />
      </div>
    );
  }

  // ─── Main Page ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Camera className="h-6 w-6 text-cyan-400" />
            GPS Camera
          </h1>
          <p className="text-text-muted mt-1 text-sm">
            Take photos with automatic GPS coordinates and timestamp embedded
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button variant="outline" size="sm" onClick={uploadAll} loading={uploading}>
              <Upload className="h-3.5 w-3.5" />
              Upload All ({pendingCount})
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCamera(true)}>
            <Camera className="h-3.5 w-3.5" />
            Open Camera
          </Button>
        </div>
      </div>

      {/* Quick Settings */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted">Default Category:</span>
            {(["BEFORE", "DURING", "AFTER"] as PhotoCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                  selectedCategory === cat
                    ? cat === "BEFORE"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : cat === "DURING"
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-surface-hover text-text-muted border border-border-subtle hover:bg-surface-hover"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted">Work Order:</span>
            <select
              value={selectedWorkOrder}
              onChange={(e) => setSelectedWorkOrder(e.target.value)}
              className="px-3 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-primary focus:border-cyan-500/50 focus:outline-none min-w-[200px]"
            >
              <option value="">None</option>
              {workOrders.map((wo: any) => (
                <option key={wo.id} value={wo.id}>
                  WO-{wo.id.slice(-6).toUpperCase()}: {wo.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Features info */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: MapPin, label: "GPS Coordinates", desc: "Auto-embedded in EXIF", color: "text-emerald-400" },
            { icon: Calendar, label: "Date & Time", desc: "From EXIF data", color: "text-cyan-400" },
            { icon: Clock, label: "Timestamp Overlay", desc: "Optional on download", color: "text-amber-400" },
            { icon: Download, label: "Multiple Formats", desc: "Original or stamped", color: "text-purple-400" },
          ].map((feat) => (
            <div key={feat.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-hover">
              <feat.icon className={cn("h-4 w-4 flex-shrink-0", feat.color)} />
              <div>
                <p className="text-[11px] font-medium text-text-secondary">{feat.label}</p>
                <p className="text-[10px] text-text-dim">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Photo Queue */}
      {photoQueue.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-text-muted" />
              <h3 className="text-sm font-semibold text-text-primary">
                Captured Photos ({photoQueue.length})
              </h3>
              {pendingCount > 0 && (
                <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                  {pendingCount} pending
                </Badge>
              )}
            </div>
            {pendingCount > 0 && (
              <Button variant="outline" size="sm" onClick={uploadAll} loading={uploading}>
                <Upload className="h-3.5 w-3.5" />
                Upload All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photoQueue.map((photo) => (
              <div
                key={photo.id}
                className="relative group rounded-xl overflow-hidden bg-surface-hover border border-border-subtle"
              >
                {/* Photo */}
                <div className="aspect-square">
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* GPS badge */}
                {photo.captured.gps && (
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
                    <MapPin className="h-2.5 w-2.5 text-emerald-400" />
                    <span className="text-[8px] font-mono text-emerald-300">
                      {photo.captured.gps.latitude.toFixed(4)}, {photo.captured.gps.longitude.toFixed(4)}
                    </span>
                  </div>
                )}

                {/* Status badge */}
                {photo.uploaded ? (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 backdrop-blur-sm">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                    <span className="text-[8px] text-emerald-300">Uploaded</span>
                  </div>
                ) : photo.uploading ? (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/20 backdrop-blur-sm">
                    <Loader2 className="h-2.5 w-2.5 text-cyan-400 animate-spin" />
                    <span className="text-[8px] text-cyan-300">Uploading</span>
                  </div>
                ) : null}

                {/* Category badge */}
                <div className="absolute bottom-1.5 left-1.5">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-md text-[8px] font-semibold border",
                      photo.category === "BEFORE"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : photo.category === "DURING"
                        ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    )}
                  >
                    {photo.category}
                  </span>
                </div>

                {/* Timestamp */}
                <div className="absolute bottom-1.5 right-1.5">
                  <span className="text-[8px] text-white/70 bg-black/40 px-1 rounded">
                    {photo.captured.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setViewingPhoto(photo)}
                    className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => downloadPhoto(photo)}
                    className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {!photo.uploaded && (
                    <button
                      onClick={() => uploadPhoto(photo)}
                      className="p-2 rounded-lg bg-cyan-500/80 text-white hover:bg-cyan-500 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="p-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {photoQueue.length === 0 && (
        <Card className="p-12 text-center">
          <Camera className="h-16 w-16 text-text-dim mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No photos captured yet
          </h3>
          <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
            Open the GPS camera to take photos. All photos will automatically
            include GPS coordinates, timestamp, and location data in the EXIF metadata.
          </p>
          <Button onClick={() => setShowCamera(true)}>
            <Camera className="h-4 w-4" />
            Open GPS Camera
          </Button>
        </Card>
      )}

      {/* Photo Viewer */}
      {viewingPhoto && (
        <PhotoViewer
          photoUrl={viewingPhoto.url}
          photoName={`GPS Photo ${viewingPhoto.captured.timestamp.toLocaleString()}`}
          photoSize={viewingPhoto.captured.blob.size}
          timestamp={viewingPhoto.captured.timestamp.toISOString()}
          category={viewingPhoto.category}
          onClose={() => setViewingPhoto(null)}
        />
      )}
    </div>
  );
}
