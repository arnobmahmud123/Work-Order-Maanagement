"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { embedGPSInJPEG, reverseGeocode, type GPSData } from "@/lib/exif";
import {
  Camera,
  CameraOff,
  Locate,
  LocateOff,
  X,
  Check,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  FlipHorizontal,
  MapPin,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CapturedPhoto {
  blob: Blob;
  url: string;
  gps: GPSData | null;
  timestamp: Date;
  address: string | null;
  width: number;
  height: number;
}

interface GPSCameraProps {
  onCapture: (photo: CapturedPhoto) => void;
  onClose: () => void;
  className?: string;
  facingMode?: "environment" | "user";
  showGrid?: boolean;
  /** If true, camera stays open after each capture for taking multiple photos */
  multiCapture?: boolean;
  /** Category label shown in the UI (e.g. "Before", "During", "After") */
  categoryLabel?: string;
}

// ─── GPS Camera Component ────────────────────────────────────────────────────

export function GPSCamera({
  onCapture,
  onClose,
  className,
  facingMode: initialFacing = "environment",
  showGrid = true,
  multiCapture = false,
  categoryLabel,
}: GPSCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState(initialFacing);
  const [zoom, setZoom] = useState(1);
  const [flash, setFlash] = useState(false);

  // GPS state
  const [gps, setGps] = useState<GPSData | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);

  // Capture state
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);

  // Start camera
  useEffect(() => {
    mountedRef.current = true;
    startCamera();
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [facingMode]);

  // Re-attach stream to video element when it re-enters the DOM
  // (happens after confirming/retaking a photo in multi-capture mode)
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream && !video.srcObject) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [capturedPhoto]);

  // Start GPS tracking
  useEffect(() => {
    startGPS();
    return () => stopGPS();
  }, []);

  async function startCamera() {
    try {
      setCameraError(null);
      setCameraReady(false);

      // Cancel any pending play request
      if (playPromiseRef.current) {
        playPromiseRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          // @ts-ignore
          focusMode: "continuous",
          exposureMode: "continuous",
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current && mountedRef.current) {
        videoRef.current.srcObject = stream;
        const playPromise = videoRef.current.play();
        playPromiseRef.current = playPromise;
        try {
          await playPromise;
          if (mountedRef.current) {
            setCameraReady(true);
          }
        } catch (playErr: any) {
          // Ignore AbortError - it's expected when camera is quickly re-opened
          if (playErr.name !== "AbortError") {
            console.error("Video play error:", playErr);
          }
        }
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera found. Please connect a camera and try again.");
      } else {
        setCameraError(err.message || "Failed to start camera");
      }
    }
  }

  function stopCamera() {
    playPromiseRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function startGPS() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported by this browser");
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gpsData: GPSData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude || undefined,
          accuracy: pos.coords.accuracy,
        };
        setGps(gpsData);
        setGpsLoading(false);

        // Reverse geocode
        reverseGeocode(gpsData.latitude, gpsData.longitude).then(setAddress);
      },
      (err) => {
        setGpsError(err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Watch for updates
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const gpsData: GPSData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude || undefined,
          accuracy: pos.coords.accuracy,
        };
        setGps(gpsData);
        setGpsError(null);

        // Update address periodically (not every tick)
        if (!address || Math.random() < 0.1) {
          reverseGeocode(gpsData.latitude, gpsData.longitude).then(setAddress);
        }
      },
      (err) => {
        if (err.code !== 2) { // Ignore timeout on watch
          setGpsError(err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    setGpsWatchId(watchId);
  }

  function stopGPS() {
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      setGpsWatchId(null);
    }
  }

  function switchCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  function handleZoomIn() {
    setZoom((z) => Math.min(z + 0.5, 5));
  }

  function handleZoomOut() {
    setZoom((z) => Math.max(z - 0.5, 1));
  }

  // Capture photo
  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    // Set canvas size to video resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Guard: video metadata not loaded yet
    if (canvas.width === 0 || canvas.height === 0) {
      setIsCapturing(false);
      toast.error("Camera not ready — please wait a moment and try again");
      return;
    }

    // Apply zoom
    if (zoom > 1) {
      const scale = 1 / zoom;
      const w = canvas.width * scale;
      const h = canvas.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(video, x, y, w, h, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0);
    }

    // Convert to JPEG blob — try toBlob first, fall back to toDataURL
    let blob: Blob | null = null;
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    if (!blob) {
      // Fallback for environments where toBlob returns null
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const res = await fetch(dataUrl);
      blob = await res.blob();
    }

    // At this point blob is guaranteed non-null (fallback above)
    const finalBlob = blob!;

    // Embed GPS into EXIF
    let resultBlob: Blob = finalBlob;
    if (gps) {
      try {
        const arrayBuffer = await finalBlob.arrayBuffer();
        const withGPS = embedGPSInJPEG(arrayBuffer, gps, new Date());
        resultBlob = new Blob([withGPS], { type: "image/jpeg" });
      } catch (err) {
        console.warn("Failed to embed GPS in EXIF:", err);
        // Use original blob — GPS data is still in the metadata object
      }
    }

    const url = URL.createObjectURL(resultBlob);

    setCapturedPhoto({
      blob: resultBlob,
      url,
      gps,
      timestamp: new Date(),
      address,
      width: canvas.width,
      height: canvas.height,
    });

    setIsCapturing(false);
  }

  function retakePhoto() {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto.url);
    }
    setCapturedPhoto(null);
  }

  function confirmPhoto() {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      setCapturedCount((c) => c + 1);
      setCapturedPhoto(null);
      // In multi-capture mode, go straight back to camera
      // In single mode, onCapture callback typically closes the camera
    }
  }

  // ─── Preview (after capture) ──────────────────────────────────────────

  if (capturedPhoto) {
    return (
      <div className={cn("relative bg-black rounded-2xl overflow-hidden", className)}>
        <img
          src={capturedPhoto.url}
          alt="Captured"
          className="w-full h-full object-contain"
        />

        {/* Category + count badge */}
        {multiCapture && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
            <Camera className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium text-white">
              {categoryLabel || "Photo"} #{capturedCount + 1}
            </span>
            {capturedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                {capturedCount} taken
              </span>
            )}
          </div>
        )}

        {/* GPS badge */}
        {capturedPhoto.gps && (
          <div className={cn("absolute left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm", multiCapture ? "top-12" : "top-3")}>
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] font-mono text-emerald-300">
              {capturedPhoto.gps.latitude.toFixed(6)}, {capturedPhoto.gps.longitude.toFixed(6)}
            </span>
          </div>
        )}

        {/* Timestamp badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
          <span className="text-[11px] font-mono text-cyan-300">
            {capturedPhoto.timestamp.toLocaleString()}
          </span>
        </div>

        {/* Address badge */}
        {capturedPhoto.address && (
          <div className="absolute bottom-20 left-3 right-3 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
            <p className="text-[11px] text-text-secondary truncate">{capturedPhoto.address}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
          <button
            onClick={retakePhoto}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-hover text-white hover:bg-surface-hover backdrop-blur-sm transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm font-medium">Retake</span>
          </button>
          <button
            onClick={confirmPhoto}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">{multiCapture ? "Add & Continue" : "Use Photo"}</span>
          </button>
          {multiCapture && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 backdrop-blur-sm transition-all border border-emerald-500/30"
            >
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Done ({capturedCount})</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Camera Viewfinder ────────────────────────────────────────────────

  return (
    <div className={cn("relative bg-black rounded-2xl overflow-hidden", className)}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: facingMode === "user" ? "scaleX(-1)" : undefined }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera error overlay */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface p-6">
          <CameraOff className="h-12 w-12 text-red-400 mb-4" />
          <p className="text-sm text-text-secondary text-center mb-4">{cameraError}</p>
          <button
            onClick={startCamera}
            className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {!cameraReady && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-text-secondary">Starting camera...</p>
          </div>
        </div>
      )}

      {/* Grid overlay */}
      {showGrid && cameraReady && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="border border-border-subtle" />
            ))}
          </div>
        </div>
      )}

      {/* GPS indicator */}
      <div className="absolute top-3 left-3">
        {gpsLoading ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
            <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
            <span className="text-[11px] text-amber-300">Acquiring GPS...</span>
          </div>
        ) : gps ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] font-mono text-emerald-300">
              {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
            </span>
            {gps.accuracy && (
              <span className="text-[10px] text-emerald-400/70 ml-1">±{gps.accuracy.toFixed(0)}m</span>
            )}
          </div>
        ) : gpsError ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/20 backdrop-blur-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[11px] text-red-300">GPS unavailable</span>
          </div>
        ) : null}
      </div>

      {/* Address indicator */}
      {address && gps && (
        <div className="absolute top-12 left-3 right-3">
          <div className="px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
            <p className="text-[10px] text-text-secondary truncate">{address}</p>
          </div>
        </div>
      )}

      {/* Category + batch count (multi-capture mode) */}
      {multiCapture && capturedCount > 0 && (
        <div className="absolute top-3 right-14 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 backdrop-blur-sm">
          <Camera className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] font-medium text-cyan-300">
            {capturedCount} photo{capturedCount !== 1 ? "s" : ""} taken
          </span>
        </div>
      )}
      {multiCapture && categoryLabel && (
        <div className={cn("absolute left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm", gps || gpsLoading ? "top-12" : "top-3")}>
          <span className="text-[11px] font-medium text-amber-300">
            📸 {categoryLabel}
          </span>
        </div>
      )}

      {/* Zoom indicator */}
      {zoom > 1 && (
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
          <span className="text-[11px] font-mono text-white">{zoom.toFixed(1)}x</span>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-4 left-0 right-0">
        <div className="flex items-center justify-between px-6">
          {/* Left: Zoom controls */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors disabled:opacity-30"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>

          {/* Center: Capture button */}
          <button
            onClick={capturePhoto}
            disabled={!cameraReady || isCapturing}
            className="relative h-16 w-16 rounded-full bg-surface-hover border-4 border-white hover:bg-white/30 transition-all disabled:opacity-30 active:scale-95"
          >
            {isCapturing ? (
              <Loader2 className="h-6 w-6 text-white animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            ) : (
              <div className="absolute inset-2 rounded-full bg-white" />
            )}
          </button>

          {/* Right: Flip + Close */}
          <div className="flex flex-col gap-2">
            <button
              onClick={switchCamera}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
            >
              <FlipHorizontal className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
