"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  readEXIF,
  generatePhotoWithOverlay,
  reverseGeocode,
  DEFAULT_OVERLAY_OPTIONS,
  type EXIFInfo,
  type OverlayOptions,
  type GPSData,
} from "@/lib/exif";
import {
  X,
  Download,
  MapPin,
  Calendar,
  Clock,
  Camera,
  Settings2,
  ChevronDown,
  ChevronUp,
  Info,
  Image as ImageIcon,
  Loader2,
  Pencil,
} from "lucide-react";

// Lazy load the editor
const ImageEditor = lazy(() =>
  import("@/components/image-editor").then((m) => ({ default: m.ImageEditor }))
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhotoViewerProps {
  photoUrl: string;
  photoName?: string;
  photoSize?: number;
  timestamp?: string;
  category?: string;
  onClose: () => void;
  onSave?: (blob: Blob, dataUrl: string) => void;
  className?: string;
}

// ─── Photo Viewer with EXIF + Download Options ──────────────────────────────

export function PhotoViewer({
  photoUrl,
  photoName,
  photoSize,
  timestamp,
  category,
  onClose,
  onSave,
  className,
}: PhotoViewerProps) {
  const [exifData, setExifData] = useState<EXIFInfo | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExifPanel, setShowExifPanel] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Download overlay options
  const [overlayOpts, setOverlayOpts] = useState<Partial<OverlayOptions>>({
    ...DEFAULT_OVERLAY_OPTIONS,
  });

  // Load EXIF data
  useEffect(() => {
    async function loadEXIF() {
      setLoading(true);
      try {
        const res = await fetch(photoUrl);
        const buffer = await res.arrayBuffer();
        const exif = readEXIF(buffer);
        setExifData(exif);

        // Reverse geocode if GPS data found
        if (exif.gps) {
          const addr = await reverseGeocode(exif.gps.latitude, exif.gps.longitude);
          setAddress(addr);
        }
      } catch (err) {
        console.warn("Failed to read EXIF:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEXIF();
  }, [photoUrl]);

  // Download original
  async function downloadOriginal() {
    setDownloading(true);
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photoName || "photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download photo:", err);
    } finally {
      setDownloading(false);
    }
  }

  // Download with overlay
  async function downloadWithOverlay() {
    if (!imageRef.current) return;
    setDownloading(true);

    try {
      const photoDate = exifData?.dateTime
        ? parseEXIFDate(exifData.dateTime)
        : timestamp
        ? new Date(timestamp)
        : new Date();

      const canvas = generatePhotoWithOverlay(
        imageRef.current,
        {
          dateTime: photoDate,
          gps: exifData?.gps || undefined,
          address: address || undefined,
          contractorName: undefined,
        },
        overlayOpts
      );

      // Download canvas as JPEG
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95);
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (photoName?.replace(/\.[^.]+$/, "") || "photo") + "-timestamped.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const photoDate = exifData?.dateTime
    ? parseEXIFDate(exifData.dateTime)
    : timestamp
    ? new Date(timestamp)
    : null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className={cn("relative w-full max-w-[95vw] max-h-[95vh] mx-4 flex flex-col overflow-hidden", className)}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 relative z-[9999]">
          <div className="flex items-center gap-3 min-w-0">
            <ImageIcon className="h-5 w-5 text-cyan-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{photoName || "Photo"}</p>
              <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                {photoSize && <span>{(photoSize / 1024).toFixed(0)} KB</span>}
                {category && <span>• {category}</span>}
                {photoDate && <span>• {photoDate.toLocaleDateString()}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct download button */}
            <button
              onClick={downloadOriginal}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-sm font-medium"
              title="Download photo"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Download with overlay toggle */}
            <button
              onClick={() => setShowDownloadOptions(!showDownloadOptions)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showDownloadOptions ? "bg-violet-500/10 text-violet-400" : "bg-surface-hover text-text-secondary hover:bg-surface-hover"
              )}
              title="Download with timestamp overlay"
            >
              <Settings2 className="h-4 w-4" />
            </button>

            {/* Edit button */}
            <button
              onClick={() => setShowEditor(true)}
              className="p-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
              title="Edit photo"
            >
              <Pencil className="h-4 w-4" />
            </button>

            {/* EXIF Info toggle */}
            <button
              onClick={() => setShowExifPanel(!showExifPanel)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showExifPanel ? "bg-cyan-500/10 text-cyan-400" : "bg-surface-hover text-text-secondary hover:bg-surface-hover"
              )}
              title="Photo information"
            >
              <Info className="h-4 w-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-surface-hover text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 gap-4">
          {/* Main image */}
          <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
            <img
              ref={imageRef}
              src={photoUrl}
              alt={photoName || "Photo"}
              className="max-w-full max-h-[80vh] rounded-xl object-contain mx-auto my-auto"
              style={{ display: 'block' }}
              crossOrigin="anonymous"
              onLoad={() => setLoading(false)}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Side panel: EXIF info */}
          {showExifPanel && (
            <div className="w-72 flex-shrink-0 bg-surface border border-border-subtle rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border-subtle">
                <h3 className="text-sm font-semibold text-text-primary">Photo Information</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Date/Time */}
                <EXIFSection
                  icon={<Calendar className="h-4 w-4" />}
                  title="Date & Time"
                  color="text-cyan-400"
                >
                  {photoDate ? (
                    <>
                      <EXIFRow label="Date" value={photoDate.toLocaleDateString()} />
                      <EXIFRow label="Time" value={photoDate.toLocaleTimeString()} />
                      {exifData?.dateTime && (
                        <EXIFRow label="EXIF DateTime" value={exifData.dateTime} />
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-text-muted">No date/time data</p>
                  )}
                </EXIFSection>

                {/* GPS */}
                <EXIFSection
                  icon={<MapPin className="h-4 w-4" />}
                  title="GPS Location"
                  color="text-emerald-400"
                >
                  {exifData?.gps ? (
                    <>
                      <EXIFRow label="Latitude" value={exifData.gps.latitude.toFixed(6) + "°"} />
                      <EXIFRow label="Longitude" value={exifData.gps.longitude.toFixed(6) + "°"} />
                      {exifData.gps.altitude !== undefined && (
                        <EXIFRow label="Altitude" value={`${exifData.gps.altitude.toFixed(1)}m`} />
                      )}
                      {exifData.gps.accuracy !== undefined && (
                        <EXIFRow label="Accuracy" value={`±${exifData.gps.accuracy.toFixed(0)}m`} />
                      )}
                      {address && (
                        <div className="mt-2">
                          <p className="text-[10px] text-text-muted mb-1">Address</p>
                          <p className="text-xs text-text-secondary leading-relaxed">{address}</p>
                        </div>
                      )}
                      <a
                        href={`https://www.google.com/maps?q=${exifData.gps.latitude},${exifData.gps.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        <MapPin className="h-3 w-3" />
                        Open in Google Maps
                      </a>
                    </>
                  ) : (
                    <p className="text-xs text-text-muted">No GPS data embedded</p>
                  )}
                </EXIFSection>

                {/* Camera */}
                <EXIFSection
                  icon={<Camera className="h-4 w-4" />}
                  title="Camera"
                  color="text-amber-400"
                >
                  {exifData?.make || exifData?.model ? (
                    <>
                      {exifData.make && <EXIFRow label="Make" value={exifData.make} />}
                      {exifData.model && <EXIFRow label="Model" value={exifData.model} />}
                    </>
                  ) : (
                    <p className="text-xs text-text-muted">No camera info</p>
                  )}
                </EXIFSection>

                {/* Description */}
                {exifData?.imageDescription && (
                  <EXIFSection
                    icon={<Info className="h-4 w-4" />}
                    title="Description"
                    color="text-purple-400"
                  >
                    <p className="text-xs text-text-secondary">{exifData.imageDescription}</p>
                  </EXIFSection>
                )}
              </div>
            </div>
          )}

          {/* Side panel: Download options */}
          {showDownloadOptions && (
            <div className="w-72 flex-shrink-0 bg-surface border border-border-subtle rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border-subtle">
                <h3 className="text-sm font-semibold text-text-primary">Download Options</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Quick downloads */}
                <div className="space-y-2">
                  <button
                    onClick={downloadOriginal}
                    disabled={downloading}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-hover border border-border-subtle hover:bg-surface-hover transition-colors text-left"
                  >
                    <Download className="h-4 w-4 text-text-secondary" />
                    <div>
                      <p className="text-xs font-medium text-text-primary">Original Photo</p>
                      <p className="text-[10px] text-text-muted">As uploaded, with EXIF</p>
                    </div>
                  </button>
                  <button
                    onClick={downloadWithOverlay}
                    disabled={downloading}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:from-cyan-500/20 hover:to-blue-500/20 transition-colors text-left"
                  >
                    {downloading ? (
                      <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 text-cyan-400" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-cyan-300">With Timestamp</p>
                      <p className="text-[10px] text-cyan-400/70">Date, time & GPS overlay</p>
                    </div>
                  </button>
                </div>

                <div className="h-px bg-surface-hover" />

                {/* Overlay customization */}
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-3">Overlay Settings</p>

                  {/* Toggle options */}
                  <div className="space-y-2">
                    <ToggleOption
                      label="Show Date"
                      checked={overlayOpts.showDate ?? true}
                      onChange={(v) => setOverlayOpts({ ...overlayOpts, showDate: v })}
                    />
                    <ToggleOption
                      label="Show Time"
                      checked={overlayOpts.showTime ?? true}
                      onChange={(v) => setOverlayOpts({ ...overlayOpts, showTime: v })}
                    />
                    <ToggleOption
                      label="Show GPS Coordinates"
                      checked={overlayOpts.showGPS ?? true}
                      onChange={(v) => setOverlayOpts({ ...overlayOpts, showGPS: v })}
                    />
                    <ToggleOption
                      label="Show Address"
                      checked={overlayOpts.showAddress ?? false}
                      onChange={(v) => setOverlayOpts({ ...overlayOpts, showAddress: v })}
                    />
                  </div>
                </div>

                {/* Date format */}
                <div>
                  <p className="text-[11px] text-text-muted mb-1.5">Date Format</p>
                  <div className="grid grid-cols-3 gap-1">
                    {(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setOverlayOpts({ ...overlayOpts, dateFormat: fmt })}
                        className={cn(
                          "px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors",
                          overlayOpts.dateFormat === fmt
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : "bg-surface-hover text-text-muted border border-border-subtle hover:bg-surface-hover"
                        )}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time format */}
                <div>
                  <p className="text-[11px] text-text-muted mb-1.5">Time Format</p>
                  <div className="grid grid-cols-2 gap-1">
                    {(["24h", "12h"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setOverlayOpts({ ...overlayOpts, format: fmt })}
                        className={cn(
                          "px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors",
                          overlayOpts.format === fmt
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : "bg-surface-hover text-text-muted border border-border-subtle hover:bg-surface-hover"
                        )}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position */}
                <div>
                  <p className="text-[11px] text-text-muted mb-1.5">Overlay Position</p>
                  <div className="grid grid-cols-2 gap-1">
                    {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setOverlayOpts({ ...overlayOpts, position: pos })}
                        className={cn(
                          "px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors",
                          overlayOpts.position === pos
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : "bg-surface-hover text-text-muted border border-border-subtle hover:bg-surface-hover"
                        )}
                      >
                        {pos.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font size */}
                <div>
                  <p className="text-[11px] text-text-muted mb-1.5">
                    Font Size: {overlayOpts.fontSize ?? 16}px
                  </p>
                  <input
                    type="range"
                    min={10}
                    max={36}
                    value={overlayOpts.fontSize ?? 16}
                    onChange={(e) => setOverlayOpts({ ...overlayOpts, fontSize: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>

                {/* Custom text */}
                <div>
                  <p className="text-[11px] text-text-muted mb-1.5">Custom Text</p>
                  <input
                    type="text"
                    value={overlayOpts.customText || ""}
                    onChange={(e) => setOverlayOpts({ ...overlayOpts, customText: e.target.value })}
                    placeholder="Add custom text..."
                    className="w-full px-3 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>

                {/* Download button */}
                <button
                  onClick={downloadWithOverlay}
                  disabled={downloading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">Download with Overlay</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Editor - portaled to body to escape backdrop-blur/overflow-hidden clipping */}
      {showEditor && createPortal(
        <Suspense fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-black/90" style={{ zIndex: 2147483647 }}>
            <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
          </div>
        }>
          <ImageEditor
            imageUrl={photoUrl}
            imageName={photoName}
            onClose={() => setShowEditor(false)}
            onSave={onSave}
          />
        </Suspense>,
        document.body
      )}
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────────────────────

function EXIFSection({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn("flex items-center gap-2 w-full text-left", color)}
      >
        {icon}
        <span className="text-xs font-semibold flex-1">{title}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && <div className="mt-2 pl-6 space-y-1.5">{children}</div>}
    </div>
  );
}

function EXIFRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-text-muted flex-shrink-0">{label}</span>
      <span className="text-[11px] text-text-secondary font-mono text-right truncate">{value}</span>
    </div>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-xs text-text-secondary">{label}</span>
      <div
        className={cn(
          "w-8 h-4 rounded-full transition-colors relative",
          checked ? "bg-cyan-500" : "bg-gray-700"
        )}
        onClick={() => onChange(!checked)}
      >
        <div
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform",
            checked ? "left-4" : "left-0.5"
          )}
        />
      </div>
    </label>
  );
}

// ─── Date Parser ─────────────────────────────────────────────────────────────

function parseEXIFDate(dateStr: string): Date {
  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const match = dateStr.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    return new Date(
      parseInt(match[1]),
      parseInt(match[2]) - 1,
      parseInt(match[3]),
      parseInt(match[4]),
      parseInt(match[5]),
      parseInt(match[6])
    );
  }
  return new Date(dateStr);
}
