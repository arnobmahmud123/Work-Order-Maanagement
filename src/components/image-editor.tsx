"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Crop,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  Pen,
  Type,
  Square,
  Circle,
  Minus,
  Undo2,
  Redo2,
  Download,
  Save,
  Sun,
  Contrast,
  Droplets,
  Palette,
  Eraser,
  MousePointer2,
  Image as ImageIcon,
  Layers,
  SlidersHorizontal,
  Paintbrush,
  Maximize2,
  FlipHorizontal,
  FlipVertical,
  Scissors,
  Sparkles,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PaintBucket,
  Stamp,
  ArrowUpRight,
  History,
  Bold,
  Italic,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryEntry {
  imageData: ImageData;
  label: string;
  thumbnail?: string;
}

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  opacity: number;
}

interface ShapeElement {
  id: string;
  type: "line" | "rect" | "circle" | "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
  opacity: number;
  fill?: boolean;
}

export type EditorTool =
  | "select"
  | "move"
  | "crop"
  | "draw"
  | "erase"
  | "text"
  | "line"
  | "rect"
  | "circle"
  | "arrow"
  | "eyedropper"
  | "gradient"
  | "cloneStamp"
  | "paintBucket";

export interface ImageEditorProps {
  imageUrl: string;
  imageName?: string;
  onSave?: (blob: Blob, dataUrl: string) => void;
  onClose: () => void;
  className?: string;
}

// ─── Main Editor Component ───────────────────────────────────────────────────

export function ImageEditor({
  imageUrl,
  imageName,
  onSave,
  onClose,
  className,
}: ImageEditorProps) {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Image state
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Tool state
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState("#22d3ee");
  const [fgColor, setFgColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#000000");
  const [opacity, setOpacity] = useState(100);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [fillShape, setFillShape] = useState(false);

  // Transform state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Container sizing for proper centering
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Adjustments
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [hue, setHue] = useState(0);
  const [blur, setBlur] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [invert, setInvert] = useState(false);
  const [sepia, setSepia] = useState(false);

  // History (undo/redo)
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // UI state
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCropUI, setShowCropUI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leftNavCollapsed, setLeftNavCollapsed] = useState(false);

  // Crop state
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });
  const [shapeStart, setShapeStart] = useState({ x: 0, y: 0 });

  // Text state
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [shapeElements, setShapeElements] = useState<ShapeElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [isDraggingShape, setIsDraggingShape] = useState(false);
  const [dragTextOffset, setDragTextOffset] = useState({ x: 0, y: 0 });
  const [dragShapeOffset, setDragShapeOffset] = useState({ x1: 0, y1: 0, x2: 0, y2: 0 });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus text input when it appears
  useEffect(() => {
    if (showTextInput && textAreaRef.current) {
      requestAnimationFrame(() => {
        textAreaRef.current?.focus();
      });
    }
  }, [showTextInput]);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const prevToolRef = useRef<EditorTool | null>(null);

  // Clone stamp state
  const [cloneSource, setCloneSource] = useState<{ x: number; y: number } | null>(null);
  const [cloneOffset, setCloneOffset] = useState({ x: 0, y: 0 });

  // Gradient state
  const [gradientType, setGradientType] = useState<"linear" | "radial">("linear");

  // Mouse position for status bar
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // ─── Load Image ──────────────────────────────────────────────────────────

  // Lock body scroll & hide site chrome when editor is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("editor-open");

    // Directly hide header and sidebar with inline styles (most reliable)
    const hiddenEls: Array<{ el: HTMLElement; prevDisplay: string; prevVisibility: string; prevWidth: string; prevZIndex: string }> = [];
    
    // Hide main layout elements
    const selectors = [
      "header", 
      "aside", 
      "[data-sidebar]", 
      "[data-top-nav]", 
      "[data-main-nav]",
      ".sidebar",
      ".top-nav",
      ".main-nav",
      ".dashboard-header",
      ".dashboard-sidebar"
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        hiddenEls.push({
          el: htmlEl,
          prevDisplay: htmlEl.style.display,
          prevVisibility: htmlEl.style.visibility,
          prevWidth: htmlEl.style.width,
          prevZIndex: htmlEl.style.zIndex,
        });
        htmlEl.style.setProperty("display", "none", "important");
        htmlEl.style.setProperty("visibility", "hidden", "important");
        htmlEl.style.setProperty("width", "0", "important");
        htmlEl.style.setProperty("min-width", "0", "important");
        htmlEl.style.setProperty("max-width", "0", "important");
        htmlEl.style.setProperty("overflow", "hidden", "important");
        htmlEl.style.setProperty("pointer-events", "none", "important");
        htmlEl.style.setProperty("z-index", "-1", "important");
      });
    });

    // Also hide floating elements and modals
    const floatingSelectors = [
      "[data-floating-chat]",
      "[data-modal]",
      ".modal",
      ".popup",
      ".overlay",
      ".floating",
      ".toast",
      ".notification"
    ];
    
    floatingSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        hiddenEls.push({
          el: htmlEl,
          prevDisplay: htmlEl.style.display,
          prevVisibility: htmlEl.style.visibility,
          prevWidth: htmlEl.style.width,
          prevZIndex: htmlEl.style.zIndex,
        });
        htmlEl.style.setProperty("display", "none", "important");
        htmlEl.style.setProperty("visibility", "hidden", "important");
        htmlEl.style.setProperty("pointer-events", "none", "important");
        htmlEl.style.setProperty("z-index", "-1", "important");
      });
    });

    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("editor-open");
      // Restore hidden elements
      hiddenEls.forEach(({ el, prevDisplay, prevVisibility, prevWidth, prevZIndex }) => {
        el.style.removeProperty("display");
        el.style.removeProperty("visibility");
        el.style.removeProperty("width");
        el.style.removeProperty("min-width");
        el.style.removeProperty("max-width");
        el.style.removeProperty("overflow");
        el.style.removeProperty("pointer-events");
        el.style.removeProperty("z-index");
        if (prevDisplay) el.style.display = prevDisplay;
        if (prevVisibility) el.style.visibility = prevVisibility;
        if (prevWidth) el.style.width = prevWidth;
        if (prevZIndex) el.style.zIndex = prevZIndex;
      });
    };
  }, []);

  // Track container size for proper canvas centering
  // Re-run when `loading` changes so the observer attaches after the
  // loading spinner is replaced by the actual canvas container.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Measure immediately
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setContainerSize({ width: rect.width, height: rect.height });
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [loading]);

  // Set initial zoom to fit when image loads and container is ready
  const initialZoomSet = useRef(false);
  useEffect(() => {
    if (originalImage && containerSize.width > 0 && containerSize.height > 0 && !initialZoomSet.current) {
      // Use container size with some padding
      const padW = containerSize.width - 32;
      const padH = containerSize.height - 32;
      const fitZoom = Math.min(padW / originalImage.width, padH / originalImage.height, 1);
      setZoom(Math.max(0.1, fitZoom));
      initialZoomSet.current = true;
    }
  }, [originalImage, containerSize]);

  // Compute display size: canvas native size * zoom
  const displaySize = {
    width: canvasSize.width * zoom,
    height: canvasSize.height * zoom,
  };

  useEffect(() => {
    function drawImageToCanvas(loadedImg: HTMLImageElement) {
      const canvas = canvasRef.current;
      if (!canvas) {
        // Retry if canvas not ready
        requestAnimationFrame(() => drawImageToCanvas(loadedImg));
        return;
      }
      
      try {
        canvas.width = loadedImg.width;
        canvas.height = loadedImg.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("Failed to get 2D context from canvas");
          return;
        }
        ctx.drawImage(loadedImg, 0, 0);
        saveToHistory("Original image");
      } catch (err) {
        console.error("Error drawing image to canvas:", err);
      }
    }

    function handleImageLoaded(loadedImg: HTMLImageElement) {
      setOriginalImage(loadedImg);
      setCanvasSize({ width: loadedImg.width, height: loadedImg.height });
      setLoading(false);

      // Draw to canvas with retries if needed
      requestAnimationFrame(() => drawImageToCanvas(loadedImg));
    }

    const img = new Image();
    // Only set crossOrigin for non-blob URLs (needed for canvas export)
    if (!imageUrl.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = function () { handleImageLoaded(this as HTMLImageElement); };
    img.onerror = () => {
      // If crossOrigin load failed, retry without it (canvas will be tainted but still usable for display)
      if (img.crossOrigin) {
        const retry = new Image();
        retry.onload = function () { handleImageLoaded(this as HTMLImageElement); };
        retry.onerror = () => {
          console.error("Failed to load image from:", imageUrl);
          setLoading(false);
        };
        retry.src = imageUrl;
      } else {
        console.error("Failed to load image from:", imageUrl);
        setLoading(false);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // ─── History Management ──────────────────────────────────────────────────

  const saveToHistory = useCallback(
    (label: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Generate thumbnail
      let thumbnail: string | undefined;
      try {
        const tc = document.createElement("canvas");
        const s = 40;
        const a = canvas.width / canvas.height;
        tc.width = a > 1 ? s : Math.round(s * a);
        tc.height = a > 1 ? Math.round(s / a) : s;
        tc.getContext("2d")!.drawImage(canvas, 0, 0, tc.width, tc.height);
        thumbnail = tc.toDataURL("image/jpeg", 0.4);
      } catch { /* tainted canvas */ }

      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({ imageData, label, thumbnail });
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const canvas = canvasRef.current;
    if (!canvas || !history[newIndex]) return;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(history[newIndex].imageData, 0, 0);
    setHistoryIndex(newIndex);
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const canvas = canvasRef.current;
    if (!canvas || !history[newIndex]) return;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(history[newIndex].imageData, 0, 0);
    setHistoryIndex(newIndex);
  }, [historyIndex, history]);

  const jumpToHistory = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !history[index]) return;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(history[index].imageData, 0, 0);
    setHistoryIndex(index);
  }, [history]);

  // ─── Apply Adjustments (non-destructive via CSS filter preview) ──────────

  const getFilterString = useCallback(() => {
    const filters: string[] = [];
    if (brightness !== 0) filters.push(`brightness(${1 + brightness / 100})`);
    if (contrast !== 0) filters.push(`contrast(${1 + contrast / 100})`);
    if (saturation !== 0) filters.push(`saturate(${1 + saturation / 100})`);
    if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);
    if (blur > 0) filters.push(`blur(${blur}px)`);
    if (grayscale) filters.push("grayscale(1)");
    if (invert) filters.push("invert(1)");
    if (sepia) filters.push("sepia(1)");
    return filters.length > 0 ? filters.join(" ") : "none";
  }, [brightness, contrast, saturation, hue, blur, grayscale, invert, sepia]);

  // ─── Apply Adjustments Destructively ────────────────────────────────────

  const applyAdjustments = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const br = brightness / 100;
    const ct = contrast / 100;
    const sat = saturation / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Brightness
      if (br !== 0) {
        r += 255 * br;
        g += 255 * br;
        b += 255 * br;
      }

      // Contrast
      if (ct !== 0) {
        const factor = (259 * (ct * 255 + 255)) / (255 * (259 - ct * 255));
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;
      }

      // Saturation
      if (sat !== 0) {
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + (1 + sat) * (r - gray);
        g = gray + (1 + sat) * (g - gray);
        b = gray + (1 + sat) * (b - gray);
      }

      // Grayscale
      if (grayscale) {
        const avg = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = g = b = avg;
      }

      // Invert
      if (invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      // Sepia
      if (sepia) {
        const sr = 0.393 * r + 0.769 * g + 0.189 * b;
        const sg = 0.349 * r + 0.686 * g + 0.168 * b;
        const sb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = sr;
        g = sg;
        b = sb;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    ctx.putImageData(imageData, 0, 0);

    // Reset adjustments
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setHue(0);
    setGrayscale(false);
    setInvert(false);
    setSepia(false);

    saveToHistory("Applied adjustments");
  }, [brightness, contrast, saturation, grayscale, invert, sepia, saveToHistory]);

  // ─── Transform Operations ───────────────────────────────────────────────

  const rotateImage = useCallback(
    (degrees: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d")!;

      if (degrees === 90 || degrees === -90) {
        tempCanvas.width = canvas.height;
        tempCanvas.height = canvas.width;
      } else {
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
      }

      tempCtx.save();
      tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      tempCtx.rotate((degrees * Math.PI) / 180);
      tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      tempCtx.restore();

      // Store the rotated image; React will re-render and clear canvas when canvasSize changes
      const rotatedData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      pendingLabelRef.current = `Rotated ${degrees}°`;
      pendingImageDataRef.current = rotatedData;
      setCanvasSize({ width: tempCanvas.width, height: tempCanvas.height });

      setRotation((prev) => (prev + degrees) % 360);
    },
    []
  );

  const flipImage = useCallback(
    (direction: "horizontal" | "vertical") => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      tempCtx.save();
      if (direction === "horizontal") {
        tempCtx.translate(canvas.width, 0);
        tempCtx.scale(-1, 1);
      } else {
        tempCtx.translate(0, canvas.height);
        tempCtx.scale(1, -1);
      }
      tempCtx.drawImage(canvas, 0, 0);
      tempCtx.restore();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);

      if (direction === "horizontal") setFlipH((prev) => !prev);
      else setFlipV((prev) => !prev);

      saveToHistory(`Flipped ${direction}`);
    },
    [saveToHistory]
  );

  const resizeImage = useCallback(
    (newWidth: number, newHeight: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCanvas.width = newWidth;
      tempCanvas.height = newHeight;
      tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, newWidth, newHeight);

      // Store the resized image; React will re-render and clear canvas when canvasSize changes
      pendingLabelRef.current = `Resized to ${newWidth}×${newHeight}`;
      pendingImageDataRef.current = tempCtx.getImageData(0, 0, newWidth, newHeight);
      setCanvasSize({ width: newWidth, height: newHeight });
    },
    [saveToHistory]
  );

  // ─── Crop ──────────────────────────────────────────────────────────────

  const startCrop = useCallback(() => {
    setShowCropUI(false);
    setActiveTool("crop");
  }, []);

  // Ref to hold pending image data that needs to be redrawn after React
  // re-renders the canvas (e.g. after crop changes canvasSize)
  const pendingImageDataRef = useRef<ImageData | null>(null);

  const pendingLabelRef = useRef<string>("Canvas operation");

  // Sync overlay canvas dimensions with main canvas
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    const main = canvasRef.current;
    if (overlay && main) {
      overlay.width = canvasSize.width;
      overlay.height = canvasSize.height;
    }
  }, [canvasSize]);

  // Redraw pending image data after React updates canvas dimensions
  useEffect(() => {
    if (pendingImageDataRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d")!;
        ctx.putImageData(pendingImageDataRef.current, 0, 0);
        saveToHistory(pendingLabelRef.current);
      }
      pendingImageDataRef.current = null;
    }
  }, [canvasSize, saveToHistory]);

  const applyCrop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const imageData = ctx.getImageData(
      Math.round(cropRect.x),
      Math.round(cropRect.y),
      Math.round(cropRect.w),
      Math.round(cropRect.h)
    );

    // Store the cropped data; it will be redrawn after React updates canvas dimensions
    pendingLabelRef.current = "Cropped image";
    pendingImageDataRef.current = imageData;
    setCanvasSize({ width: Math.round(cropRect.w), height: Math.round(cropRect.h) });

    setShowCropUI(false);
    setActiveTool("select");
  }, [cropRect]);

  const cancelCrop = useCallback(() => {
    setShowCropUI(false);
    setActiveTool("select");
  }, []);

  // ─── Paint Bucket (Flood Fill) ─────────────────────────────────────────

  const floodFill = useCallback(
    (startX: number, startY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width;
      const h = canvas.height;
      const sx = Math.floor(startX);
      const sy = Math.floor(startY);
      if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;
      const si = (sy * w + sx) * 4;
      const tR = data[si], tG = data[si + 1], tB = data[si + 2], tA = data[si + 3];
      const hex = fgColor.replace("#", "");
      const fR = parseInt(hex.substring(0, 2), 16);
      const fG = parseInt(hex.substring(2, 4), 16);
      const fB = parseInt(hex.substring(4, 6), 16);
      const fA = Math.round((opacity / 100) * 255);
      if (fR === tR && fG === tG && fB === tB && fA === tA) return;
      const tol = 30;
      const stack = [sx, sy];
      const visited = new Uint8Array(w * h);
      while (stack.length > 0) {
        const cy = stack.pop()!;
        const cx = stack.pop()!;
        if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
        const pi = cy * w + cx;
        if (visited[pi]) continue;
        const di = pi * 4;
        if (Math.abs(data[di] - tR) > tol || Math.abs(data[di + 1] - tG) > tol || Math.abs(data[di + 2] - tB) > tol || Math.abs(data[di + 3] - tA) > tol) continue;
        visited[pi] = 1;
        data[di] = fR; data[di + 1] = fG; data[di + 2] = fB; data[di + 3] = fA;
        stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
      }
      ctx.putImageData(imgData, 0, 0);
      saveToHistory("Paint bucket fill");
    },
    [fgColor, opacity, saveToHistory]
  );

  // ─── Drawing ──────────────────────────────────────────────────────────

  const getCanvasPoint = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const point = getCanvasPoint(e);
      setMousePos({ x: Math.round(point.x), y: Math.round(point.y) });

      // Space+drag = temporary hand tool
      if (spaceHeld) return;

      // Select or Move tool: try to hit-test elements
      if (activeTool === "select" || activeTool === "move") {
        const textHit = hitTestTextElement(point.x, point.y);
        const shapeHit = hitTestShapeElement(point.x, point.y);

        if (textHit) {
          e.stopPropagation();
          setSelectedTextId(textHit.id);
          setSelectedShapeId(null);
          setIsDraggingText(true);
          setDragTextOffset({ x: point.x - textHit.x, y: point.y - textHit.y });
          return;
        } else if (shapeHit) {
          e.stopPropagation();
          setSelectedShapeId(shapeHit.id);
          setSelectedTextId(null);
          setIsDraggingShape(true);
          setDragShapeOffset({ x1: point.x - shapeHit.x1, y1: point.y - shapeHit.y1, x2: 0, y2: 0 });
          return;
        } else {
          setSelectedTextId(null);
          setSelectedShapeId(null);
        }
      }

      // Move/Pan: handled by container-level events
      if (activeTool === "move") return;

      // Paint bucket
      if (activeTool === "paintBucket") {
        floodFill(point.x, point.y);
        return;
      }

      // Clone stamp: Alt+click to set source
      if (activeTool === "cloneStamp" && e.altKey) {
        setCloneSource(point);
        return;
      }

      if (activeTool === "text") {
        setTextPos(point);
        setShowTextInput(true);
        return;
      }

      if (activeTool === "eyedropper") {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        const pixel = ctx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data;
        const hex = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`;
        setFgColor(hex);
        setBrushColor(hex);
        return;
      }

      if (activeTool === "crop") {
        setCropStart(point);
        setIsCropping(true);
        setCropRect({ x: point.x, y: point.y, w: 0, h: 0 });
        setShowCropUI(true);
        return;
      }

      setIsDrawing(true);
      setDrawStart(point);
      setLastPoint(point);
      setShapeStart(point);

      if (activeTool === "draw" || activeTool === "erase" || activeTool === "cloneStamp") {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        if (activeTool === "cloneStamp") {
          if (cloneSource) {
            setCloneOffset({ x: point.x - cloneSource.x, y: point.y - cloneSource.y });
          }
        } else {
          ctx.strokeStyle = activeTool === "erase" ? "#000000" : brushColor;
          ctx.lineWidth = activeTool === "erase" ? brushSize * 3 : brushSize;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = opacity / 100;
          if (activeTool === "erase") {
            ctx.globalCompositeOperation = "destination-out";
          }
        }
      }
    },
    [activeTool, brushColor, brushSize, opacity, getCanvasPoint, spaceHeld, floodFill, cloneSource, textElements, shapeElements]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const point = getCanvasPoint(e);

      // Dragging text element
      if (isDraggingText && selectedTextId) {
        setTextElements(prev =>
          prev.map(el =>
            el.id === selectedTextId
              ? { ...el, x: point.x - dragTextOffset.x, y: point.y - dragTextOffset.y }
              : el
          )
        );
        return;
      }

      // Dragging shape element
      if (isDraggingShape && selectedShapeId) {
        setShapeElements(prev =>
          prev.map(el => {
            if (el.id === selectedShapeId) {
              const newX1 = point.x - dragShapeOffset.x1;
              const newY1 = point.y - dragShapeOffset.y1;
              const dx = newX1 - el.x1;
              const dy = newY1 - el.y1;
              return { ...el, x1: newX1, y1: newY1, x2: el.x2 + dx, y2: el.y2 + dy };
            }
            return el;
          })
        );
        return;
      }

      // Move/Pan: scroll the container
      if (activeTool === "move" && isPanning) {
        const container = containerRef.current;
        if (!container) return;
        container.scrollLeft = panStart.x - e.clientX;
        container.scrollTop = panStart.y - e.clientY;
        return;
      }

      // Crop: drag to select region
      if (activeTool === "crop" && isCropping) {
        const x = Math.min(cropStart.x, point.x);
        const y = Math.min(cropStart.y, point.y);
        const w = Math.abs(point.x - cropStart.x);
        const h = Math.abs(point.y - cropStart.y);
        setCropRect({ x, y, w, h });
        return;
      }

      if (!isDrawing) return;

      // Clone stamp painting
      if (activeTool === "cloneStamp" && cloneSource) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        const srcX = point.x - cloneOffset.x;
        const srcY = point.y - cloneOffset.y;
        const r = brushSize;
        try {
          const srcData = ctx.getImageData(Math.floor(srcX - r), Math.floor(srcY - r), r * 2, r * 2);
          ctx.putImageData(srcData, Math.floor(point.x - r), Math.floor(point.y - r));
        } catch { /* out of bounds */ }
        setLastPoint(point);
        return;
      }

      if (activeTool === "draw" || activeTool === "erase") {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        setLastPoint(point);
      }

      // Shape preview on overlay
      if (["line", "rect", "circle", "arrow"].includes(activeTool)) {
        const overlay = overlayCanvasRef.current;
        if (!overlay) return;
        const octx = overlay.getContext("2d")!;
        octx.clearRect(0, 0, overlay.width, overlay.height);
        octx.strokeStyle = brushColor;
        octx.lineWidth = brushSize;
        octx.globalAlpha = opacity / 100;

        if (activeTool === "line") {
          octx.beginPath();
          octx.moveTo(shapeStart.x, shapeStart.y);
          octx.lineTo(point.x, point.y);
          octx.stroke();
        } else if (activeTool === "rect") {
          const w = point.x - shapeStart.x;
          const h = point.y - shapeStart.y;
          if (fillShape) {
            octx.fillStyle = brushColor;
            octx.fillRect(shapeStart.x, shapeStart.y, w, h);
          } else {
            octx.strokeRect(shapeStart.x, shapeStart.y, w, h);
          }
        } else if (activeTool === "circle") {
          const rx = Math.abs(point.x - shapeStart.x) / 2;
          const ry = Math.abs(point.y - shapeStart.y) / 2;
          const cx = shapeStart.x + (point.x - shapeStart.x) / 2;
          const cy = shapeStart.y + (point.y - shapeStart.y) / 2;
          octx.beginPath();
          octx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          if (fillShape) {
            octx.fillStyle = brushColor;
            octx.fill();
          } else {
            octx.stroke();
          }
        } else if (activeTool === "arrow") {
          drawArrow(octx, shapeStart.x, shapeStart.y, point.x, point.y, brushSize);
          octx.stroke();
        }
      }
    },
    [isDrawing, isCropping, isPanning, isDraggingText, isDraggingShape, activeTool, brushColor, brushSize, opacity, fillShape, cropStart, shapeStart, panStart, selectedTextId, selectedShapeId, dragTextOffset, dragShapeOffset, getCanvasPoint, cloneSource, cloneOffset, shapeElements, textElements]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      // Stop dragging
      if (isDraggingText || isDraggingShape) {
        setIsDraggingText(false);
        setIsDraggingShape(false);
        return;
      }

      // Move/Pan: stop panning
      if (activeTool === "move" && isPanning) {
        setIsPanning(false);
        return;
      }

      // Crop: finish dragging
      if (activeTool === "crop" && isCropping) {
        setIsCropping(false);
        // If the crop rect is too small, reset to default
        if (Math.abs(cropRect.w) < 10 || Math.abs(cropRect.h) < 10) {
          const canvas = canvasRef.current;
          if (canvas) {
            const margin = 0.1;
            setCropRect({
              x: canvas.width * margin,
              y: canvas.height * margin,
              w: canvas.width * (1 - 2 * margin),
              h: canvas.height * (1 - 2 * margin),
            });
          }
        }
        return;
      }

      if (!isDrawing) return;
      setIsDrawing(false);

      const point = getCanvasPoint(e);

      // Finalize shapes as objects
      if (["line", "rect", "circle", "arrow"].includes(activeTool)) {
        const newShape: ShapeElement = {
          id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: activeTool as "line" | "rect" | "circle" | "arrow",
          x1: shapeStart.x,
          y1: shapeStart.y,
          x2: point.x,
          y2: point.y,
          color: brushColor,
          strokeWidth: brushSize,
          opacity: opacity / 100,
          fill: fillShape,
        };
        setShapeElements(prev => [...prev, newShape]);

        // Clear overlay
        const overlay = overlayCanvasRef.current;
        if (overlay) {
          overlay.width = overlay.width; // full clear
        }

        saveToHistory(`Added ${activeTool}`);
      }

      if (activeTool === "draw" || activeTool === "erase" || activeTool === "cloneStamp") {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d")!;
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
        saveToHistory(activeTool === "erase" ? "Erased" : activeTool === "cloneStamp" ? "Clone stamp" : "Drew stroke");
      }
    },
    [isDrawing, isCropping, isPanning, isDraggingText, isDraggingShape, activeTool, brushColor, brushSize, opacity, fillShape, cropRect, shapeStart, getCanvasPoint, saveToHistory]
  );

  // ─── Text Tool ────────────────────────────────────────────────────────

  const addText = useCallback(() => {
    if (!textInput.trim() || !textPos) return;
    const newElement: TextElement = {
      id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: textInput,
      x: textPos.x,
      y: textPos.y,
      fontSize,
      fontFamily,
      color: brushColor,
      bold: textBold,
      italic: textItalic,
      opacity: opacity / 100,
    };
    setTextElements(prev => [...prev, newElement]);
    setTextInput("");
    setTextPos(null);
    setShowTextInput(false);
    saveToHistory("Added text");
  }, [textInput, textPos, fontSize, fontFamily, brushColor, opacity, textBold, textItalic, saveToHistory]);

  // Render all elements (text and shapes) onto the overlay canvas
  const renderElements = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // 1. Render Shapes
    for (const el of shapeElements) {
      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.globalAlpha = el.opacity;
      ctx.lineCap = "round";

      if (el.type === "line") {
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
      } else if (el.type === "rect") {
        const w = el.x2 - el.x1;
        const h = el.y2 - el.y1;
        if (el.fill) {
          ctx.fillStyle = el.color;
          ctx.fillRect(el.x1, el.y1, w, h);
        } else {
          ctx.strokeRect(el.x1, el.y1, w, h);
        }
      } else if (el.type === "circle") {
        const rx = Math.abs(el.x1 - el.x2) / 2;
        const ry = Math.abs(el.y1 - el.y2) / 2;
        const cx = (el.x1 + el.x2) / 2;
        const cy = (el.y1 + el.y2) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (el.fill) {
          ctx.fillStyle = el.color;
          ctx.fill();
        } else {
          ctx.stroke();
        }
      } else if (el.type === "arrow") {
        drawArrow(ctx, el.x1, el.y1, el.x2, el.y2, el.strokeWidth);
      }

      // Selection highlight for shapes
      if (el.id === selectedShapeId) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        const left = Math.min(el.x1, el.x2) - 4;
        const top = Math.min(el.y1, el.y2) - 4;
        const width = Math.abs(el.x1 - el.x2) + 8;
        const height = Math.abs(el.y1 - el.y2) + 8;
        ctx.strokeRect(left, top, width, height);
      }
      ctx.restore();
    }

    // 2. Render Text
    for (const el of textElements) {
      ctx.save();
      const weight = el.bold ? "bold" : "normal";
      const style = el.italic ? "italic" : "normal";
      ctx.font = `${style} ${weight} ${el.fontSize}px ${el.fontFamily}`;
      ctx.fillStyle = el.color;
      ctx.globalAlpha = el.opacity;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const lines = el.text.split("\n");
      const lineHeight = el.fontSize * 1.3;
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x, el.y + i * lineHeight);
      });

      // Selection highlight for text
      if (el.id === selectedTextId) {
        ctx.shadowColor = "transparent";
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
        const totalH = lines.length * lineHeight;
        ctx.strokeRect(el.x - 4, el.y - el.fontSize - 2, maxW + 8, totalH + 6);
      }
      ctx.restore();
    }
  }, [textElements, shapeElements, selectedTextId, selectedShapeId]);

  // Re-render elements whenever they change
  useEffect(() => {
    renderElements();
  }, [textElements, shapeElements, selectedTextId, selectedShapeId, renderElements]);

  function distToSegment(p: {x:number,y:number}, v: {x:number,y:number}, w: {x:number,y:number}) {
    const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return Math.sqrt((p.x - v.x)**2 + (p.y - v.y)**2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((p.x - (v.x + t * (w.x - v.x)))**2 + (p.y - (v.y + t * (w.y - v.y)))**2);
  }

  function hitTestShapeElement(x: number, y: number): ShapeElement | null {
    for (let i = shapeElements.length - 1; i >= 0; i--) {
      const el = shapeElements[i];
      if (el.type === "rect") {
        const left = Math.min(el.x1, el.x2);
        const top = Math.min(el.y1, el.y2);
        const width = Math.abs(el.x1 - el.x2);
        const height = Math.abs(el.y1 - el.y2);
        if (x >= left && x <= left + width && y >= top && y <= top + height) return el;
      } else if (el.type === "circle") {
        const rx = Math.abs(el.x1 - el.x2) / 2;
        const ry = Math.abs(el.y1 - el.y2) / 2;
        const cx = (el.x1 + el.x2) / 2;
        const cy = (el.y1 + el.y2) / 2;
        const dx = (x - cx) / Math.max(rx, 1);
        const dy = (y - cy) / Math.max(ry, 1);
        if (dx * dx + dy * dy <= 1) return el;
      } else if (el.type === "line" || el.type === "arrow") {
        const dist = distToSegment({ x, y }, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
        if (dist <= Math.max(el.strokeWidth, 5)) return el;
      }
    }
    return null;
  }

  // Hit-test: find text element at canvas coordinates (searches topmost first)
  function hitTestTextElement(x: number, y: number): TextElement | null {
    for (let i = textElements.length - 1; i >= 0; i--) {
      const el = textElements[i];
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) continue;
      const weight = el.bold ? "bold" : "normal";
      const style = el.italic ? "italic" : "normal";
      ctx.font = `${style} ${weight} ${el.fontSize}px ${el.fontFamily}`;
      const lines = el.text.split("\n");
      const lineHeight = el.fontSize * 1.3;
      const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
      const totalH = lines.length * lineHeight;
      const pad = 6;
      if (
        x >= el.x - pad &&
        x <= el.x + maxW + pad &&
        y >= el.y - el.fontSize - 2 &&
        y <= el.y - el.fontSize - 2 + totalH + pad
      ) {
        return el;
      }
    }
    return null;
  }

  // Bake all elements onto the main canvas (for save/export)
  const bakeElements = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // 1. Bake Shapes
    for (const el of shapeElements) {
      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.globalAlpha = el.opacity;
      ctx.lineCap = "round";

      if (el.type === "line") {
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
      } else if (el.type === "rect") {
        const w = el.x2 - el.x1;
        const h = el.y2 - el.y1;
        if (el.fill) {
          ctx.fillStyle = el.color;
          ctx.fillRect(el.x1, el.y1, w, h);
        } else {
          ctx.strokeRect(el.x1, el.y1, w, h);
        }
      } else if (el.type === "circle") {
        const rx = Math.abs(el.x1 - el.x2) / 2;
        const ry = Math.abs(el.y1 - el.y2) / 2;
        const cx = (el.x1 + el.x2) / 2;
        const cy = (el.y1 + el.y2) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (el.fill) {
          ctx.fillStyle = el.color;
          ctx.fill();
        } else {
          ctx.stroke();
        }
      } else if (el.type === "arrow") {
        drawArrow(ctx, el.x1, el.y1, el.x2, el.y2, el.strokeWidth);
      }
      ctx.restore();
    }

    // 2. Bake Text
    for (const el of textElements) {
      ctx.save();
      const weight = el.bold ? "bold" : "normal";
      const style = el.italic ? "italic" : "normal";
      ctx.font = `${style} ${weight} ${el.fontSize}px ${el.fontFamily}`;
      ctx.fillStyle = el.color;
      ctx.globalAlpha = el.opacity;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      const lines = el.text.split("\n");
      const lineHeight = el.fontSize * 1.3;
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x, el.y + i * lineHeight);
      });
      ctx.restore();
    }
    return canvas;
  }, [textElements, shapeElements]);

  // ─── Save / Export ─────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Bake elements before saving
      bakeElements();

      let blob: Blob | null = null;
      let dataUrl = "";

      try {
        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png", 1);
        });
        dataUrl = canvas.toDataURL("image/png");
      } catch {
        // Canvas is tainted — export via offscreen copy
        const offscreen = document.createElement("canvas");
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const octx = offscreen.getContext("2d")!;
        octx.drawImage(canvas, 0, 0);
        blob = await new Promise<Blob>((resolve) => {
          offscreen.toBlob((b) => resolve(b!), "image/png", 1);
        });
        dataUrl = offscreen.toDataURL("image/png");
      }

      if (onSave) {
        onSave(blob, dataUrl);
      } else {
        // Default: download
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = imageName?.replace(/\.[^.]+$/, "") + "-edited.png" || "edited-image.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      setSaving(false);
    }
  }, [onSave, imageName, bakeElements]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Bake elements before download
    bakeElements();

    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch {
      const offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      offscreen.getContext("2d")!.drawImage(canvas, 0, 0);
      dataUrl = offscreen.toDataURL("image/png");
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = imageName?.replace(/\.[^.]+$/, "") + "-edited.png" || "edited-image.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [imageName, bakeElements]);

  // ─── Keyboard Shortcuts (Photoshop-standard) ────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger tool shortcuts when typing in inputs
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;

      // Space held = temporary hand tool
      if (e.key === " " && !e.repeat && !inInput) {
        e.preventDefault();
        setSpaceHeld(true);
        prevToolRef.current = activeTool;
        setActiveTool("move");
        return;
      }

      if (inInput) return;

      // Modifier shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); redo(); }
        else if (e.key === "s") { e.preventDefault(); handleSave(); }
        else if (e.key === "d") { e.preventDefault(); if (showCropUI) cancelCrop(); }
        else if (e.key === "0") {
          e.preventDefault();
          // Fit to screen
          if (containerSize.width > 0 && containerSize.height > 0) {
            const padW = containerSize.width - 32;
            const padH = containerSize.height - 32;
            setZoom(Math.max(0.1, Math.min(padW / canvasSize.width, padH / canvasSize.height, 1)));
          }
        }
        else if (e.key === "1") { e.preventDefault(); setZoom(1); }
        else if (e.key === "=" || e.key === "+") { e.preventDefault(); setZoom(z => Math.min(5, z + 0.25)); }
        else if (e.key === "-") { e.preventDefault(); setZoom(z => Math.max(0.1, z - 0.25)); }
        else if (e.key === "e" && e.shiftKey) { e.preventDefault(); applyAdjustments(); }
        return;
      }

      if (e.key === "Enter" && showCropUI) { e.preventDefault(); applyCrop(); }
      if (e.key === "Escape") {
        if (showCropUI) cancelCrop();
        else if (showTextInput) { setShowTextInput(false); setTextPos(null); }
      }

      // Brush size: [ and ]
      if (e.key === "[") { setBrushSize(s => Math.max(1, s - 2)); return; }
      if (e.key === "]") { setBrushSize(s => Math.min(100, s + 2)); return; }

      // Color shortcuts
      if (e.key === "x" || e.key === "X") {
        setFgColor(prev => { const old = prev; setBgColor(prev2 => { setFgColor(prev2); return old; }); return prev; });
        return;
      }
      if (e.key === "d" || e.key === "D") { setFgColor("#ffffff"); setBgColor("#000000"); setBrushColor("#ffffff"); return; }

      // Tool shortcuts (Photoshop-standard, no modifier)
      if (!e.altKey) {
        const keyMap: Record<string, EditorTool> = {
          v: "select", V: "select",
          m: "select", M: "select",
          b: "draw", B: "draw",
          e: "erase", E: "erase",
          t: "text", T: "text",
          h: "move", H: "move",
          i: "eyedropper", I: "eyedropper",
          g: "gradient", G: "gradient",
          k: "paintBucket", K: "paintBucket",
          s: "cloneStamp", S: "cloneStamp",
          u: "rect", U: "rect",
          o: "circle", O: "circle",
          l: "line", L: "line",
          c: "crop", C: "crop",
        };
        const tool = keyMap[e.key];
        if (tool) {
          if (tool === "crop") startCrop();
          else setActiveTool(tool);
        }
        if (e.key === "f" || e.key === "F") {
          if (containerSize.width > 0 && containerSize.height > 0) {
            const padW = containerSize.width - 32;
            const padH = containerSize.height - 32;
            setZoom(Math.max(0.1, Math.min(padW / canvasSize.width, padH / canvasSize.height, 1)));
          }
        }
        // Delete selected element
        if ((e.key === "Delete" || e.key === "Backspace") && (selectedTextId || selectedShapeId) && (activeTool === "select" || activeTool === "move")) {
          e.preventDefault();
          if (selectedTextId) {
            setTextElements(prev => prev.filter(el => el.id !== selectedTextId));
            setSelectedTextId(null);
          } else if (selectedShapeId) {
            setShapeElements(prev => prev.filter(el => el.id !== selectedShapeId));
            setSelectedShapeId(null);
          }
          saveToHistory("Deleted object");
          return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          // Fill with background color
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            saveToHistory("Filled with BG color");
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setSpaceHeld(false);
        if (prevToolRef.current) {
          setActiveTool(prevToolRef.current);
          prevToolRef.current = null;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeTool, undo, redo, handleSave, showCropUI, cancelCrop, showTextInput, applyCrop, startCrop, containerSize, canvasSize, bgColor, applyAdjustments, saveToHistory, selectedTextId, selectedShapeId]);

  // ─── Zoom with Wheel ──────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.1, Math.min(5, prev + delta)));
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-surface-hover" style={{ zIndex: 2147483647 }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
          <p className="text-sm text-text-secondary">Loading image editor...</p>
        </div>
      </div>
    );
  }

  const toolGroups = [
    {
      label: "Select",
      tools: [
        { id: "select" as EditorTool, icon: MousePointer2, label: "Select (V)", shortcut: "V" },
        { id: "move" as EditorTool, icon: Move, label: "Pan (H) / Space+Drag", shortcut: "H" },
        { id: "eyedropper" as EditorTool, icon: Droplets, label: "Eyedropper (I)", shortcut: "I" },
      ],
    },
    {
      label: "Draw",
      tools: [
        { id: "draw" as EditorTool, icon: Pen, label: "Brush (B) — [/] resize", shortcut: "B" },
        { id: "erase" as EditorTool, icon: Eraser, label: "Eraser (E)", shortcut: "E" },
        { id: "text" as EditorTool, icon: Type, label: "Text (T)", shortcut: "T" },
        { id: "cloneStamp" as EditorTool, icon: Stamp, label: "Clone Stamp (S) — Alt+click to sample", shortcut: "S" },
        { id: "paintBucket" as EditorTool, icon: PaintBucket, label: "Paint Bucket (K)", shortcut: "K" },
      ],
    },
    {
      label: "Shapes",
      tools: [
        { id: "line" as EditorTool, icon: Minus, label: "Line (L)", shortcut: "L" },
        { id: "rect" as EditorTool, icon: Square, label: "Rectangle (U)", shortcut: "U" },
        { id: "circle" as EditorTool, icon: Circle, label: "Ellipse (O)", shortcut: "O" },
        { id: "arrow" as EditorTool, icon: ArrowUpRight, label: "Arrow", shortcut: "" },
      ],
    },
  ];

  return (
    <div className={cn("fixed inset-0 flex flex-col bg-surface-hover", className)} style={{ zIndex: 2147483647 }}>
      {/* ── Top Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-hover border-b border-border-subtle flex-shrink-0 relative z-[10000]">
        {/* Left: File info + close */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-text-primary">
              {imageName || "Image Editor"}
            </span>
            <span className="text-[10px] text-text-muted bg-surface-hover px-1.5 py-0.5 rounded">
              {canvasSize.width} × {canvasSize.height}
            </span>
          </div>
        </div>

        {/* Center: History */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <span className="text-[10px] text-text-dim ml-2">
            {historyIndex + 1}/{history.length}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover text-text-secondary hover:bg-surface-hover text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Left Tool Panel ─────────────────────────────────────────────── */}
        <div className={cn(
          "bg-surface-hover border-r border-border-subtle flex flex-col flex-shrink-0 transition-all duration-200",
          leftNavCollapsed ? "w-12" : "w-14"
        )}>
          {/* Toggle button */}
          <button
            onClick={() => setLeftNavCollapsed(!leftNavCollapsed)}
            className="w-full h-10 flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors border-b border-border-subtle flex-shrink-0"
            title={leftNavCollapsed ? "Expand toolbar" : "Collapse toolbar"}
          >
            {leftNavCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          {/* Tools container - scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center py-2 gap-1">
            {leftNavCollapsed ? (
              /* ── Collapsed: essential tools only ── */
              <>
                {toolGroups.flatMap((group) => group.tools).map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                      activeTool === tool.id
                        ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                        : "text-text-muted hover:text-text-secondary hover:bg-surface-hover border border-transparent"
                    )}
                    title={`${tool.label} (${tool.shortcut})`}
                  >
                    <tool.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
                <div className="w-5 h-px bg-surface-hover my-0.5 flex-shrink-0" />
                <button
                  onClick={startCrop}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                    activeTool === "crop"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "text-text-muted hover:text-text-secondary hover:bg-surface-hover border border-transparent"
                  )}
                  title="Crop (C)"
                >
                  <Crop className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              /* ── Expanded: full toolbar ── */
              <>
                {toolGroups.map((group) => (
                  <div key={group.label} className="flex flex-col items-center gap-1">
                    {group.tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                          activeTool === tool.id
                            ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                            : "text-text-muted hover:text-text-secondary hover:bg-surface-hover border border-transparent"
                        )}
                        title={`${tool.label} (${tool.shortcut})`}
                      >
                        <tool.icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                ))}
                <div className="w-6 h-px bg-surface-hover my-0.5 flex-shrink-0" />

                {/* Crop */}
                <button
                  onClick={startCrop}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                    activeTool === "crop"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "text-text-muted hover:text-text-secondary hover:bg-surface-hover border border-transparent"
                  )}
                  title="Crop (C)"
                >
                  <Crop className="h-4 w-4" />
                </button>

                <div className="w-6 h-px bg-surface-hover my-0.5 flex-shrink-0" />

                {/* Transform */}
                <button
                  onClick={() => rotateImage(-90)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors flex-shrink-0"
                  title="Rotate Left"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => rotateImage(90)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors flex-shrink-0"
                  title="Rotate Right"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => flipImage("horizontal")}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors flex-shrink-0"
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="h-4 w-4" />
                </button>
                <button
                  onClick={() => flipImage("vertical")}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors flex-shrink-0"
                  title="Flip Vertical"
                >
                  <FlipVertical className="h-4 w-4" />
                </button>

                <div className="w-6 h-px bg-surface-hover my-0.5 flex-shrink-0" />

                {/* Panels */}
                <button
                  onClick={() => { setShowAdjustments(!showAdjustments); setShowFilters(false); setShowHistory(false); }}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                    showAdjustments ? "bg-violet-500/15 text-violet-400" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                  )}
                  title="Adjustments"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setShowFilters(!showFilters); setShowAdjustments(false); setShowHistory(false); }}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                    showFilters ? "bg-violet-500/15 text-violet-400" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                  )}
                  title="Filters"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setShowHistory(!showHistory); setShowAdjustments(false); setShowFilters(false); }}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                    showHistory ? "bg-cyan-500/15 text-cyan-400" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                  )}
                  title="History Panel"
                >
                  <History className="h-4 w-4" />
                </button>

                <div className="w-6 h-px bg-surface-hover my-0.5 flex-shrink-0" />

                {/* FG/BG Color (Photoshop-style) */}
                <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0" title="FG/BG Colors · X=swap · D=reset">
                  {/* Background color picker */}
                  <label className="absolute bottom-1 right-1 w-5 h-5 rounded-sm border border-border-medium cursor-pointer overflow-hidden" style={{ backgroundColor: bgColor }}>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </label>
                  {/* Foreground color picker */}
                  <label className="absolute top-1 left-1 w-5 h-5 rounded-sm border-2 border-white/40 cursor-pointer shadow-lg z-[1] overflow-hidden" style={{ backgroundColor: fgColor }}>
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => { setFgColor(e.target.value); setBrushColor(e.target.value); }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </label>
                  {/* Swap icon */}
                  <button
                    onClick={() => { const tmp = fgColor; setFgColor(bgColor); setBgColor(tmp); setBrushColor(bgColor); }}
                    className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-surface-hover flex items-center justify-center text-[8px] text-text-secondary hover:bg-surface-hover z-[2]"
                    title="Swap (X)"
                  >⇄</button>
                  {/* Reset icon */}
                  <button
                    onClick={() => { setFgColor("#ffffff"); setBgColor("#000000"); setBrushColor("#ffffff"); }}
                    className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full bg-surface-hover flex items-center justify-center text-[7px] text-text-secondary hover:bg-surface-hover z-[2]"
                    title="Reset (D)"
                  >D</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Canvas Area ────────────────────────────────────────────────── */}
        <div className="flex-1 relative bg-surface">
          {/* Scrollable canvas container */}
          <div
            className="absolute inset-0 overflow-auto"
            ref={containerRef}
            onWheel={handleWheel}
            style={{
              cursor:
                activeTool === "move"
                  ? isPanning ? "grabbing" : "grab"
                  : "default",
            }}
            onPointerDown={(e) => {
              if (activeTool !== "move") return;
              e.preventDefault();
              e.stopPropagation();
              const container = containerRef.current;
              if (!container) return;
              setIsPanning(true);
              setPanStart({
                x: e.clientX + container.scrollLeft,
                y: e.clientY + container.scrollTop,
              });
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (activeTool !== "move" || !isPanning) return;
              e.preventDefault();
              const container = containerRef.current;
              if (!container) return;
              container.scrollLeft = panStart.x - e.clientX;
              container.scrollTop = panStart.y - e.clientY;
            }}
            onPointerUp={(e) => {
              if (activeTool === "move" && isPanning) {
                setIsPanning(false);
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              }
            }}
            onPointerCancel={(e) => {
              if (activeTool === "move" && isPanning) {
                setIsPanning(false);
              }
            }}
          >
          {/* Checkerboard background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #1a1a2e 25%, transparent 25%), linear-gradient(-45deg, #1a1a2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a2e 75%), linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
              backgroundColor: "#12122a",
            }}
          />

          {/* Canvas container with proper centering */}
          <div
            className="flex items-center justify-center p-4"
            style={{ minHeight: "100%", minWidth: "100%", position: "relative" }}
          >
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="shadow-2xl shadow-black/60"
              style={{
                width: `${displaySize.width}px`,
                height: `${displaySize.height}px`,
                filter: getFilterString(),
                imageRendering: zoom > 2 ? "pixelated" : "auto",
                cursor:
                  isDraggingText
                    ? "grabbing"
                    : activeTool === "select"
                    ? "pointer"
                    : activeTool === "move"
                    ? isPanning ? "grabbing" : "grab"
                    : activeTool === "draw"
                    ? "crosshair"
                    : activeTool === "text"
                    ? "text"
                    : activeTool === "crop"
                    ? "crosshair"
                    : activeTool === "eyedropper"
                    ? "crosshair"
                    : "default",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => { setIsDrawing(false); if (isDraggingText) setIsDraggingText(false); }}
            />
            {/* Overlay canvas for shape previews */}
            <canvas
              ref={overlayCanvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="absolute pointer-events-none shadow-2xl shadow-black/60"
              style={{
                width: `${displaySize.width}px`,
                height: `${displaySize.height}px`,
              }}
            />

            {/* Crop overlay — inside canvas wrapper to scroll with canvas */}
            {showCropUI && cropRect.w > 0 && cropRect.h > 0 && (() => {
              const canvas = canvasRef.current;
              if (!canvas) return null;
              const rect = canvas.getBoundingClientRect();
              const wrapperRect = canvas.parentElement?.getBoundingClientRect();
              if (!wrapperRect) return null;
              const scaleX = rect.width / canvas.width;
              const scaleY = rect.height / canvas.height;
              const offsetX = rect.left - wrapperRect.left;
              const offsetY = rect.top - wrapperRect.top;
              return (
                <div className="absolute pointer-events-none" style={{ inset: 0 }}>
                  <div
                    className="absolute border-2 border-dashed border-amber-400"
                    style={{
                      left: offsetX + cropRect.x * scaleX,
                      top: offsetY + cropRect.y * scaleY,
                      width: cropRect.w * scaleX,
                      height: cropRect.h * scaleY,
                      boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                    }}
                  >
                    {["top-left", "top-right", "bottom-left", "bottom-right"].map((pos) => (
                      <div
                        key={pos}
                        className={cn(
                          "absolute w-3 h-3 bg-amber-400 rounded-sm",
                          pos === "top-left" && "-top-1.5 -left-1.5",
                          pos === "top-right" && "-top-1.5 -right-1.5",
                          pos === "bottom-left" && "-bottom-1.5 -left-1.5",
                          pos === "bottom-right" && "-bottom-1.5 -right-1.5"
                        )}
                      />
                    ))}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white text-[10px] px-2 py-0.5 rounded font-mono whitespace-nowrap">
                      {Math.round(cropRect.w)} × {Math.round(cropRect.h)}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Text input overlay — inside canvas wrapper to scroll with canvas */}
            {showTextInput && textPos && (() => {
              const canvas = canvasRef.current;
              if (!canvas) return null;
              const rect = canvas.getBoundingClientRect();
              const wrapperRect = canvas.parentElement?.getBoundingClientRect();
              if (!wrapperRect) return null;
              const scaleX = rect.width / canvas.width;
              const scaleY = rect.height / canvas.height;
              const scaledFont = fontSize * Math.min(scaleX, scaleY);
              return (
                <div
                  className="absolute z-10"
                  style={{
                    left: (rect.left - wrapperRect.left) + textPos.x * scaleX,
                    top: (rect.top - wrapperRect.top) + textPos.y * scaleY,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <textarea
                    ref={textAreaRef}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type here..."
                    rows={1}
                    className="bg-black/30 border border-cyan-500/40 rounded outline-none text-white resize-both p-1"
                    style={{
                      fontSize: `${scaledFont}px`,
                      fontFamily: fontFamily,
                      fontWeight: textBold ? "bold" : "normal",
                      fontStyle: textItalic ? "italic" : "normal",
                      color: brushColor,
                      opacity: opacity / 100,
                      minWidth: '60px',
                      minHeight: `${scaledFont + 8}px`,
                      caretColor: '#22d3ee',
                      textShadow: '0 0 4px rgba(0,0,0,0.8)',
                      lineHeight: 1.3,
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addText(); }
                      if (e.key === "Escape") {
                        setShowTextInput(false);
                        setTextPos(null);
                        setTextInput("");
                      }
                      e.stopPropagation();
                    }}
                  />
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={() => addText()}
                      className="px-2 py-0.5 rounded bg-cyan-500 text-white text-[10px] font-medium hover:bg-cyan-400"
                    >
                      Add ↵
                    </button>
                    <button
                      onClick={() => { setShowTextInput(false); setTextPos(null); setTextInput(""); }}
                      className="px-2 py-0.5 rounded bg-surface-hover text-text-secondary text-[10px] hover:bg-surface-hover"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setTextBold(!textBold)}
                      className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px]", textBold ? "bg-cyan-500/20 text-cyan-400" : "bg-surface-hover text-text-muted")}
                      title="Bold"
                    >
                      <Bold className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setTextItalic(!textItalic)}
                      className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px]", textItalic ? "bg-cyan-500/20 text-cyan-400" : "bg-surface-hover text-text-muted")}
                      title="Italic"
                    >
                      <Italic className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Font/size quick bar when text tool active */}
            {activeTool === "text" && !showTextInput && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-hover/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border-subtle z-10">
                <span className="text-[10px] text-text-muted">Click on image to type · Enter to commit · Shift+Enter for new line</span>
                <div className="w-px h-3 bg-surface-hover" />
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer"
                  title="Text color"
                />
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="px-1.5 py-0.5 bg-surface-hover border border-border-subtle rounded text-[10px] text-text-secondary"
                >
                  {[12, 16, 20, 24, 32, 48, 64, 96, 128].map((s) => (
                    <option key={s} value={s}>{s}px</option>
                  ))}
                </select>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="px-1.5 py-0.5 bg-surface-hover border border-border-subtle rounded text-[10px] text-text-secondary"
                >
                  {["Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana", "Impact"].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <button onClick={() => setTextBold(!textBold)} className={cn("px-1 py-0.5 rounded text-[10px] font-bold", textBold ? "bg-cyan-500/20 text-cyan-400" : "text-text-muted")}>B</button>
                <button onClick={() => setTextItalic(!textItalic)} className={cn("px-1 py-0.5 rounded text-[10px] italic", textItalic ? "bg-cyan-500/20 text-cyan-400" : "text-text-muted")}>I</button>
              </div>
            )}

            {/* Clone stamp info bar */}
            {activeTool === "cloneStamp" && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-hover/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border-subtle z-10">
                <Stamp className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-[10px] text-text-secondary">
                  {cloneSource ? `Source: ${Math.round(cloneSource.x)}, ${Math.round(cloneSource.y)} — Paint to clone` : "Alt+Click to set source point"}
                </span>
              </div>
            )}

            </div>
          </div>

          {/* Zoom indicator — fixed overlay outside scrollable area */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-surface-hover/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border-subtle z-10">
            <button
              onClick={() => setZoom((z) => Math.max(0.1, z - 0.25))}
              className="p-1 rounded hover:bg-surface-hover text-text-secondary"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-text-secondary font-mono min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
              className="p-1 rounded hover:bg-surface-hover text-text-secondary"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { 
                if (containerSize.width > 0 && containerSize.height > 0) {
                  const padW = containerSize.width - 32;
                  const padH = containerSize.height - 32;
                  const newZoom = Math.min(padW / canvasSize.width, padH / canvasSize.height, 1);
                  setZoom(Math.max(0.1, newZoom));
                }
              }}
              className="p-1 rounded hover:bg-surface-hover text-text-secondary"
              title="Fit to screen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Crop action bar — fixed overlay outside scrollable area */}
          {showCropUI && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-hover/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-amber-500/20 z-10">
              <Scissors className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-amber-300 font-medium">Crop Mode</span>
              <div className="w-px h-4 bg-surface-hover mx-1" />
              <span className="text-[11px] text-text-secondary">Drag to select area, then press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">Enter</kbd>
              <span className="text-[11px] text-text-secondary">to crop</span>
              <div className="w-px h-4 bg-surface-hover mx-1" />
              <button
                onClick={applyCrop}
                className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-medium"
              >
                Apply
              </button>
              <button
                onClick={cancelCrop}
                className="px-3 py-1 rounded-lg bg-surface-hover text-text-secondary text-xs font-medium"
              >
                Cancel (Esc)
              </button>
            </div>
          )}
        </div>

        {/* ── Right Panel (Options / Adjustments / Filters / History) ──────── */}
        {(showAdjustments || showFilters || showHistory) && (
          <div className="w-72 bg-surface-hover border-l border-border-subtle flex flex-col overflow-y-auto flex-shrink-0">
            {/* History Panel */}
            {showHistory && (
              <>
                <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-text-primary">History</h3>
                    <span className="text-[10px] text-text-muted">{history.length} states</span>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1 rounded hover:bg-surface-hover text-text-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {history.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-text-dim">
                      No history yet.<br />Actions will appear here.
                    </div>
                  ) : (
                    <div className="py-1">
                      {history.map((entry, i) => (
                        <button
                          key={i}
                          onClick={() => jumpToHistory(i)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors",
                            i === historyIndex
                              ? "bg-cyan-500/10 border-l-2 border-cyan-400"
                              : i > historyIndex
                              ? "opacity-40 hover:opacity-60 hover:bg-surface-hover"
                              : "hover:bg-surface-hover"
                          )}
                        >
                          {entry.thumbnail ? (
                            <img src={entry.thumbnail} alt="" className="w-8 h-8 rounded object-cover border border-border-subtle flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-surface-hover border border-border-subtle flex-shrink-0 flex items-center justify-center">
                              <Layers className="h-3 w-3 text-text-dim" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-[11px] truncate", i === historyIndex ? "text-cyan-300 font-medium" : "text-text-secondary")}>
                              {entry.label}
                            </p>
                            <p className="text-[9px] text-text-dim">
                              Step {i + 1}{i === historyIndex && " — current"}
                            </p>
                          </div>
                          {i === historyIndex && (
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 border-t border-border-subtle flex items-center gap-1">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] hover:bg-surface-hover disabled:opacity-30 flex items-center justify-center gap-1"
                  >
                    <Undo2 className="h-3 w-3" /> Undo
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] hover:bg-surface-hover disabled:opacity-30 flex items-center justify-center gap-1"
                  >
                    <Redo2 className="h-3 w-3" /> Redo
                  </button>
                </div>
              </>
            )}
            {/* Adjustments Panel */}
            {showAdjustments && (
              <>
                <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-violet-400" />
                    <h3 className="text-sm font-semibold text-text-primary">Adjustments</h3>
                  </div>
                  <button
                    onClick={() => setShowAdjustments(false)}
                    className="p-1 rounded hover:bg-surface-hover text-text-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <AdjustmentSlider
                    icon={<Sun className="h-3.5 w-3.5" />}
                    label="Brightness"
                    value={brightness}
                    onChange={setBrightness}
                    color="text-amber-400"
                  />
                  <AdjustmentSlider
                    icon={<Contrast className="h-3.5 w-3.5" />}
                    label="Contrast"
                    value={contrast}
                    onChange={setContrast}
                    color="text-cyan-400"
                  />
                  <AdjustmentSlider
                    icon={<Palette className="h-3.5 w-3.5" />}
                    label="Saturation"
                    value={saturation}
                    onChange={setSaturation}
                    color="text-emerald-400"
                  />
                  <AdjustmentSlider
                    icon={<Palette className="h-3.5 w-3.5" />}
                    label="Hue Rotate"
                    value={hue}
                    onChange={setHue}
                    min={-180}
                    max={180}
                    color="text-purple-400"
                  />
                  <AdjustmentSlider
                    icon={<Droplets className="h-3.5 w-3.5" />}
                    label="Blur"
                    value={blur}
                    onChange={setBlur}
                    min={0}
                    max={20}
                    color="text-blue-400"
                  />

                  {/* Quick toggles */}
                  <div className="space-y-2 pt-2 border-t border-border-subtle">
                    <ToggleOption label="Grayscale" checked={grayscale} onChange={setGrayscale} />
                    <ToggleOption label="Invert Colors" checked={invert} onChange={setInvert} />
                    <ToggleOption label="Sepia Tone" checked={sepia} onChange={setSepia} />
                  </div>

                  <button
                    onClick={applyAdjustments}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium hover:from-violet-400 hover:to-purple-500 transition-all shadow-lg shadow-violet-500/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    Apply Adjustments
                  </button>

                  <button
                    onClick={() => {
                      setBrightness(0);
                      setContrast(0);
                      setSaturation(0);
                      setHue(0);
                      setBlur(0);
                      setGrayscale(false);
                      setInvert(false);
                      setSepia(false);
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-surface-hover border border-border-subtle text-text-secondary text-xs hover:bg-surface-hover transition-colors"
                  >
                    Reset All
                  </button>
                </div>
              </>
            )}

            {/* Filters Panel */}
            {showFilters && (
              <>
                <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    <h3 className="text-sm font-semibold text-text-primary">Filters</h3>
                  </div>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-1 rounded hover:bg-surface-hover text-text-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {FILTER_PRESETS.map((filter) => (
                      <button
                        key={filter.name}
                        onClick={() => {
                          setBrightness(filter.brightness || 0);
                          setContrast(filter.contrast || 0);
                          setSaturation(filter.saturation || 0);
                          setHue(filter.hue || 0);
                          setGrayscale(filter.grayscale || false);
                          setInvert(filter.invert || false);
                          setSepia(filter.sepia || false);
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-surface-hover border border-border-subtle hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                      >
                        <div
                          className="w-12 h-12 rounded-lg overflow-hidden"
                          style={{ filter: filter.cssFilter }}
                        >
                          <div className="w-full h-full bg-gradient-to-br from-cyan-500 via-purple-500 to-amber-500" />
                        </div>
                        <span className="text-[10px] text-text-secondary">{filter.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Right Tool Options Panel ───────────────────────────────────── */}
        {!showAdjustments && !showFilters && !showHistory && (
          <div className="w-56 bg-surface-hover border-l border-border-subtle flex flex-col overflow-y-auto flex-shrink-0">
            <div className="px-3 py-3 border-b border-border-subtle">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Tool Options
              </h3>
            </div>
            <div className="p-3 space-y-4">
              {/* Color picker */}
              <div>
                <label className="text-[11px] text-text-muted mb-1.5 block">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border-medium"
                  />
                  <span className="text-xs font-mono text-text-secondary">{brushColor}</span>
                </div>
                {/* Quick colors */}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {[
                    "#ffffff", "#000000", "#ef4444", "#f97316", "#eab308",
                    "#22c55e", "#22d3ee", "#3b82f6", "#8b5cf6", "#ec4899",
                  ].map((c) => (
                    <button
                      key={c}
                      onClick={() => setBrushColor(c)}
                      className={cn(
                        "w-5 h-5 rounded border transition-all",
                        brushColor === c
                          ? "border-white ring-1 ring-white/30 scale-110"
                          : "border-border-medium hover:border-border-subtle"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Brush size */}
              {(activeTool === "draw" || activeTool === "erase" || activeTool === "line" || activeTool === "rect" || activeTool === "circle" || activeTool === "arrow" || activeTool === "cloneStamp") && (
                <div>
                  <label className="text-[11px] text-text-muted mb-1.5 block">
                    Size: {brushSize}px
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  {/* Size preview */}
                  <div className="flex items-center justify-center mt-2 h-12 bg-surface-hover rounded-lg">
                    <div
                      className="rounded-full bg-current"
                      style={{
                        width: Math.min(brushSize, 40),
                        height: Math.min(brushSize, 40),
                        color: brushColor,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Opacity */}
              <div>
                <label className="text-[11px] text-text-muted mb-1.5 block">
                  Opacity: {opacity}%
                </label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Shape options */}
              {["rect", "circle"].includes(activeTool) && (
                <div>
                  <label className="text-[11px] text-text-muted mb-1.5 block">Fill</label>
                  <ToggleOption
                    label="Fill shape"
                    checked={fillShape}
                    onChange={setFillShape}
                  />
                </div>
              )}

              {/* Text options */}
              {activeTool === "text" && (
                <>
                  <div>
                    <label className="text-[11px] text-text-muted mb-1.5 block">
                      Font Size: {fontSize}px
                    </label>
                    <input
                      type="range"
                      min={12}
                      max={120}
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-text-muted mb-1.5 block">Font</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-2 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-secondary"
                    >
                      {["Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana", "Impact"].map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Resize */}
              <div className="pt-3 border-t border-border-subtle">
                <label className="text-[11px] text-text-muted mb-2 block">Resize Canvas</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={canvasSize.width}
                      onChange={(e) =>
                        setCanvasSize((prev) => ({
                          ...prev,
                          width: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-2 py-1 bg-surface-hover border border-border-subtle rounded text-xs text-text-secondary font-mono"
                      placeholder="Width"
                    />
                    <span className="text-text-dim self-center">×</span>
                    <input
                      type="number"
                      value={canvasSize.height}
                      onChange={(e) =>
                        setCanvasSize((prev) => ({
                          ...prev,
                          height: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-2 py-1 bg-surface-hover border border-border-subtle rounded text-xs text-text-secondary font-mono"
                      placeholder="Height"
                    />
                  </div>
                  <button
                    onClick={() => resizeImage(canvasSize.width, canvasSize.height)}
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-hover border border-border-subtle text-text-secondary text-xs hover:bg-surface-hover transition-colors"
                  >
                    Apply Resize
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Status Bar (Photoshop-style) ─────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1 bg-surface-hover border-t border-border-subtle flex-shrink-0 text-[10px] text-text-muted font-mono">
        <div className="flex items-center gap-4">
          <span>X: {mousePos.x} Y: {mousePos.y}</span>
          <span>{canvasSize.width} × {canvasSize.height}px</span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-secondary">{activeTool.replace(/([A-Z])/g, ' $1').trim()}</span>
          <span>FG: <span style={{color: fgColor}}>■</span> BG: <span style={{color: bgColor}}>■</span></span>
          <span className="text-text-dim">Ctrl+Z undo · Ctrl+S save · Space+drag pan</span>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Presets ──────────────────────────────────────────────────────────

const FILTER_PRESETS = [
  { name: "Normal", cssFilter: "none", brightness: 0, contrast: 0, saturation: 0 },
  { name: "Vivid", cssFilter: "saturate(1.5) contrast(1.1)", brightness: 0, contrast: 10, saturation: 50 },
  { name: "Warm", cssFilter: "sepia(0.3) saturate(1.2) brightness(1.05)", brightness: 5, contrast: 0, saturation: 20, sepia: false },
  { name: "Cool", cssFilter: "hue-rotate(30deg) saturate(0.9)", brightness: 0, contrast: 0, saturation: -10, hue: 30 },
  { name: "B&W", cssFilter: "grayscale(1)", brightness: 0, contrast: 10, saturation: 0, grayscale: true },
  { name: "Sepia", cssFilter: "sepia(1)", brightness: 0, contrast: 0, saturation: 0, sepia: true },
  { name: "Vintage", cssFilter: "sepia(0.4) contrast(0.9) brightness(1.1)", brightness: 10, contrast: -10, saturation: -20 },
  { name: "Dramatic", cssFilter: "contrast(1.4) brightness(0.9) saturate(0.8)", brightness: -10, contrast: 40, saturation: -20 },
  { name: "Fade", cssFilter: "contrast(0.8) brightness(1.2) saturate(0.7)", brightness: 20, contrast: -20, saturation: -30 },
  { name: "Invert", cssFilter: "invert(1)", invert: true, brightness: 0, contrast: 0, saturation: 0 },
  { name: "Noir", cssFilter: "grayscale(1) contrast(1.3) brightness(0.9)", grayscale: true, brightness: -10, contrast: 30, saturation: 0 },
  { name: "Sunset", cssFilter: "hue-rotate(-20deg) saturate(1.3) brightness(1.05)", brightness: 5, contrast: 0, saturation: 30, hue: -20 },
];

// ─── Helper Components ───────────────────────────────────────────────────────

function AdjustmentSlider({
  icon,
  label,
  value,
  onChange,
  min = -100,
  max = 100,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={color}>{icon}</span>
          <span className="text-[11px] text-text-secondary">{label}</span>
        </div>
        <span className="text-[11px] font-mono text-text-muted">
          {value > 0 ? "+" : ""}
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-cyan-500"
      />
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

// ─── Arrow Drawing Helper ────────────────────────────────────────────────────

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number
) {
  const headLen = width * 4;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}
