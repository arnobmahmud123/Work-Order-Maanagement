"use client";

import { use, useState, useRef, useEffect, Fragment, lazy, Suspense, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWorkOrder,
  useUpdateWorkOrder,
  useCreateWorkOrder,
  useTaskMessages,
  useSendTaskMessage,
  usePropertyHistory,
  useLogActivity,
  useChatMessages,
  useChatChannels,
  useCreateChatChannel,
} from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Select,
  Avatar,
} from "@/components/ui";
import {
  MapPin,
  Calendar,
  User,
  Lock,
  Key,
  FileText,
  MessageSquare,
  Receipt,
  Edit,
  Edit3,
  Send,
  CheckCircle2,
  Camera,
  Shield,
  Phone,
  Mail,
  X,
  Sparkles,
  DollarSign,
  Activity,
  Printer,
  Copy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  ZoomIn,
  Info,
  Download,
  Clock,
  Loader2,
  Pencil,
  Wrench,
  Users,
  Building2,
  Upload,
  AlertCircle,
  Trash2,
  Package,
  Truck,
  AlertTriangle,
} from "lucide-react";
import {
  cn,
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatCurrency,
  INVOICE_STATUS_LABELS,
} from "@/lib/utils";
import Link from "next/link";
import { AIChat } from "@/components/ai-chat";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  PhotoUploadSection,
  PhotoItem,
  PhotoCategory,
  fileUploadsToPhotos,
} from "@/components/work-orders/photo-upload";
import { GPSCamera, type CapturedPhoto } from "@/components/gps-camera";
import {
  TaskEntryList,
  TaskEntry,
  BidEntryList,
  BidEntry,
} from "@/components/work-orders/task-bid-entries";
import { printWorkOrder } from "@/components/work-orders/print-report";

import { OverdueCountdown } from "@/components/work-orders/overdue-countdown";
import toast from "react-hot-toast";

type ZipFileInput = { name: string; blob: Blob };

function zipCrc32(bytes: Uint8Array) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function zipDateTime(date = new Date()) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

async function createStoredZip(files: ZipFileInput[]) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = zipDateTime();

  function record(size: number, write: (view: DataView) => void) {
    const bytes = new Uint8Array(size);
    write(new DataView(bytes.buffer));
    return bytes;
  }

  for (const file of files) {
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const nameBytes = encoder.encode(file.name);
    const crc = zipCrc32(data);
    const local = record(30, (view) => {
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(10, now.time, true);
      view.setUint16(12, now.dosDate, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, nameBytes.length, true);
    });
    chunks.push(local, nameBytes, data);
    const centralRecord = record(46, (view) => {
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(12, now.time, true);
      view.setUint16(14, now.dosDate, true);
      view.setUint32(16, crc, true);
      view.setUint32(20, data.length, true);
      view.setUint32(24, data.length, true);
      view.setUint16(28, nameBytes.length, true);
      view.setUint32(42, offset, true);
    });
    central.push(centralRecord, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }

  const centralOffset = offset;
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = record(22, (view) => {
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, files.length, true);
    view.setUint16(10, files.length, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralOffset, true);
  });

  const blobParts = [...chunks, ...central, end].map((chunk) => {
    const copy = new Uint8Array(chunk.byteLength);
    copy.set(chunk);
    return copy.buffer;
  });
  return new Blob(blobParts, { type: "application/zip" });
}

// Lazy load the image editor
const ImageEditor = lazy(() =>
  import("@/components/image-editor").then((m) => ({ default: m.ImageEditor }))
);

export default function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const {
    data: workOrder,
    isLoading,
    isError: workOrderLoadFailed,
    error: workOrderLoadError,
    refetch: refetchWorkOrder,
  } = useWorkOrder(id);
  const updateMutation = useUpdateWorkOrder(id);
  // Always pass address to get ALL work orders at the same property
  const { data: propertyHistoryData } = usePropertyHistory(
    workOrder?.propertyId || undefined,
    workOrder?.address || undefined
  );
  const logActivity = useLogActivity(id);
  const role = (session?.user as any)?.role;

  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [activeTaskChat, setActiveTaskChat] = useState<string | null>(null);
  const [expandedProjectScope, setExpandedProjectScope] = useState(false);

  // Local state for tasks, bids, and photos
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [bidPhotos, setBidPhotos] = useState<PhotoItem[]>([]);
  const [inspectionPhotos, setInspectionPhotos] = useState<PhotoItem[]>([]);
  const [customInspectionItems, setCustomInspectionItems] = useState<
    { label: string; description?: string; required: boolean; completed: boolean; photos: PhotoItem[]; expanded: boolean }[]
  >([]);
  const [showAddInspection, setShowAddInspection] = useState(false);
  const [newInspectionLabel, setNewInspectionLabel] = useState("");
  const [newInspectionDesc, setNewInspectionDesc] = useState("");
  const [editingInspectionIdx, setEditingInspectionIdx] = useState<number | null>(null);
  const [editInspectionLabel, setEditInspectionLabel] = useState("");
  const [editInspectionDesc, setEditInspectionDesc] = useState("");
  const [photoPopupPhotos, setPhotoPopupPhotos] = useState<any[]>([]);
  const [photoPopupTitle, setPhotoPopupTitle] = useState("");
  const [photoPopupOpen, setPhotoPopupOpen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [allPhotosModal, setAllPhotosModal] = useState<{ open: boolean; source: "tasks" | "bids" | "inspection" | "all" }>({ open: false, source: "tasks" });
  const initialLoadDone = useRef(false);
  const viewLogged = useRef(false);
  const [globalPhotos, setGlobalPhotos] = useState<PhotoItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [photoTabDownloadMode, setPhotoTabDownloadMode] = useState<"none" | "date" | "datetime" | "datetimeExif" | "custom">("datetime");
  const [photoTabCustomDateTime, setPhotoTabCustomDateTime] = useState("");
  const [photoTabDownloading, setPhotoTabDownloading] = useState(false);

  // Property front photo state
  const [propertyFrontPhotos, setPropertyFrontPhotos] = useState<any[]>([]);
  const [propertyFrontViewerOpen, setPropertyFrontViewerOpen] = useState(false);
  const [uploadingFrontPhoto, setUploadingFrontPhoto] = useState(false);
  const frontPhotoInputRef = useRef<HTMLInputElement>(null);

  // GPS Camera state
  const [gpsCameraOpen, setGpsCameraOpen] = useState(false);
  const [gpsCameraCategory, setGpsCameraCategory] = useState<PhotoCategory>("BEFORE");
  const [gpsCameraTarget, setGpsCameraTarget] = useState<"global" | "task" | "bid" | "inspection">("global");
  const [gpsCameraTaskId, setGpsCameraTaskId] = useState<string | null>(null);
  const [gpsCameraBidId, setGpsCameraBidId] = useState<string | null>(null);
  const [gpsCameraInspectionId, setGpsCameraInspectionId] = useState<string | null>(null);
  const [gpsCameraMultiCapture, setGpsCameraMultiCapture] = useState(true);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editorPhoto, setEditorPhoto] = useState<{ url: string; name: string; category?: PhotoCategory; source?: "global" | "task" | "bid" | "inspection"; sourceId?: string } | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Invoice line items state
  interface InvoiceItem {
    id: string;
    taskName: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    total: number;
  }
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const handleEditInvoice = (inv: any) => {
    setEditingInvoiceId(inv.id);
    setInvoiceItems(
      (inv.items || []).map((item: any) => {
        return {
          id: item.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          taskName: item.taskName || "",
          description: item.description || "",
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          discountPercent: item.discountPercent || 0,
          total: item.amount || (item.quantity * item.unitPrice) * (1 - (item.discountPercent || 0) / 100),
        };
      })
    );
    setInvoiceNotes(inv.notes || "");
    toast.success("Invoice loaded for editing");
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete invoice");
      toast.success("Invoice deleted successfully");
      refetchWorkOrder();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePrintInvoice = (inv: any) => {
    const printContent = document.createElement('div');
    printContent.className = 'p-8 bg-white text-black font-sans';
    
    const itemsHtml = (inv.items || []).map((item: any) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px 0;">
          <div style="font-weight: bold;">${item.taskName || item.description || ''}</div>
        </td>
        <td style="text-align: right;">${item.quantity}</td>
        <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="text-align: right;">${item.discountPercent > 0 ? item.discountPercent + '%' : '—'}</td>
        <td style="text-align: right; font-weight: bold;">${formatCurrency(item.amount)}</td>
      </tr>
    `).join('');

    printContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">INVOICE</h1>
          <p style="color: #666; margin: 0;">#${inv.invoiceNumber}</p>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: 18px; margin: 0;">PreservationPro</h2>
          <p style="color: #666; margin: 0;">Date: ${formatDate(inv.createdAt)}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 40px;">
        <h3 style="font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 8px;">Bill To:</h3>
        <p style="font-weight: bold; margin: 0;">${inv.client?.name || 'Client'}</p>
        <p style="color: #666; margin: 0;">${inv.client?.email || ''}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <thead>
          <tr style="border-bottom: 2px solid #333; text-align: left; font-size: 12px; text-transform: uppercase; color: #666;">
            <th style="padding-bottom: 10px;">Item / Service</th>
            <th style="padding-bottom: 10px; text-align: right;">Qty</th>
            <th style="padding-bottom: 10px; text-align: right;">Rate</th>
            <th style="padding-bottom: 10px; text-align: right;">Disc</th>
            <th style="padding-bottom: 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 250px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Subtotal:</span>
            <span>${formatCurrency(inv.subtotal)}</span>
          </div>
          ${(inv.subtotal - (inv.noCharge ? 0 : inv.total) + (inv.tax || 0)) > 0.01 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Discount:</span>
              <span style="color: #d97706;">-${formatCurrency(inv.subtotal - (inv.noCharge ? 0 : inv.total) + (inv.tax || 0))}</span>
            </div>
          ` : ''}
          ${inv.tax > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Tax:</span>
              <span>${formatCurrency(inv.tax)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; border-top: 2px solid #333; padding-top: 8px; font-weight: bold; font-size: 18px;">
            <span>Total:</span>
            <span>${inv.noCharge ? 'NO CHARGE' : formatCurrency(inv.total)}</span>
          </div>
        </div>
      </div>
      
      ${inv.notes ? `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
          <h4 style="font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 8px;">Notes:</h4>
          <p style="font-size: 14px; color: #444; margin: 0;">${inv.notes}</p>
        </div>
      ` : ''}
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Invoice</title></head><body>');
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const cancelEditInvoice = () => {
    setEditingInvoiceId(null);
    setInvoiceItems([]);
    setInvoiceNotes("");
  };

  const addInvoiceItem = () => {
    setInvoiceItems((prev) => [
      ...prev,
      {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        taskName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        total: 0,
      },
    ]);
  };

  const removeInvoiceItem = (id: string) => {
    setInvoiceItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setInvoiceItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Recalculate total: qty * price * (1 - discount/100)
        const qty = Number(updated.quantity) || 0;
        const price = Number(updated.unitPrice) || 0;
        const disc = Number(updated.discountPercent) || 0;
        updated.total = qty * price * (1 - disc / 100);
        return updated;
      })
    );
  };

  // Invoice summary calculations
  const invoiceSubtotal = invoiceItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const invoiceTotalDiscount = invoiceItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discountPercent) || 0;
    return sum + (qty * price * disc) / 100;
  }, 0);
  const invoiceGrandTotal = invoiceSubtotal - invoiceTotalDiscount;

  async function handleSaveInvoice() {
    if (invoiceItems.length === 0) {
      toast.error("Add at least one invoice item");
      return;
    }
    const hasEmpty = invoiceItems.some((item) => !item.taskName.trim());
    if (hasEmpty) {
      toast.error("All items need a task name");
      return;
    }
    setSavingInvoice(true);
    try {
      const url = editingInvoiceId ? `/api/invoices/${editingInvoiceId}` : "/api/invoices";
      const method = editingInvoiceId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId: workOrder.id,
          clientId: workOrder.createdById || workOrder.coordinatorId,
          items: invoiceItems.map((item) => ({
            taskName: item.taskName,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
          })),
          notes: invoiceNotes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save invoice");
      }
      toast.success(editingInvoiceId ? "Invoice updated successfully" : "Invoice saved successfully");
      setInvoiceItems([]);
      setInvoiceNotes("");
      setEditingInvoiceId(null);
      refetchWorkOrder(); // Refresh to see updated invoice
    } catch (err: any) {
      toast.error(err.message || "Failed to save invoice");
    } finally {
      setSavingInvoice(false);
    }
  }

  const router = useRouter();
  const createMutation = useCreateWorkOrder();

  // Initialize photos from existing work order files (exclude inspection photos)
  useEffect(() => {
    if (workOrder?.files && globalPhotos.length === 0) {
      const existing = fileUploadsToPhotos(workOrder.files).filter(
        (p) => !["BID", "INSPECTION", "PROPERTY_FRONT"].includes(p.category)
      );
      if (existing.length > 0) {
        setGlobalPhotos(existing);
      }
    }
  }, [workOrder]);

  // Initialize inspection photos from saved work order files.
  useEffect(() => {
    if (workOrder?.files && inspectionPhotos.length === 0) {
      const existing = fileUploadsToPhotos(workOrder.files).filter((p) => p.category === "INSPECTION");
      if (existing.length > 0) {
        setInspectionPhotos(existing);
      }
    }
  }, [workOrder]);

  // Fetch property front photos
  useEffect(() => {
    if (workOrder?.propertyFrontPhotos) {
      setPropertyFrontPhotos(workOrder.propertyFrontPhotos);
      return;
    }

    if (workOrder?.propertyId) {
      fetch(`/api/properties/${workOrder.propertyId}/front-photo`)
        .then((r) => r.json())
        .then((data) => {
          if (data.photos) setPropertyFrontPhotos(data.photos);
        })
        .catch(() => {});
    }
  }, [workOrder?.propertyId, workOrder?.propertyFrontPhotos]);

  // Upload property front photo handler
  async function handleFrontPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!workOrder?.propertyId) {
      toast.error("Property link is missing for this work order");
      return;
    }
    setUploadingFrontPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "FRONT");
      const res = await fetch(`/api/properties/${workOrder.propertyId}/front-photo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPropertyFrontPhotos([data]);
      toast.success("Property front photo uploaded");
    } catch {
      toast.error("Failed to upload property front photo");
    }
    setUploadingFrontPhoto(false);
    // Reset input
    if (frontPhotoInputRef.current) frontPhotoInputRef.current.value = "";
  }

  // Delete property front photo
  async function handleDeleteFrontPhoto(photoId: string) {
    if (!workOrder?.propertyId) return;
    try {
      await fetch(`/api/properties/${workOrder.propertyId}/front-photo?photoId=${photoId}`, {
        method: "DELETE",
      });
      setPropertyFrontPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Property front photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  }

  // Upload handler — uploads a file to the server and returns permanent URL
  async function handlePhotoUpload(file: File, category: string): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    const res = await fetch(`/api/work-orders/${id}/files`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Upload failed");
    }

    const data = await res.json();
    return { url: data.path, id: data.id };
  }

  // Delete handler — removes a file from the server
  async function handlePhotoDelete(photoId: string) {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    // Only delete from server if it's a persisted file (not a blob)
    if (!photoId.startsWith("temp-") && !photoId.startsWith("gps-")) {
      try {
        await fetch(`/api/work-orders/${id}/files?fileId=${photoId}`, {
          method: "DELETE",
        });
      } catch {
        // Best effort
      }
    }
    // Remove from local state
    setGlobalPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setBidPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setInspectionPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setTasks((prev) => prev.map((t) => ({ ...t, photos: t.photos.filter((p) => p.id !== photoId) })));
    setBids((prev) => prev.map((b) => ({ ...b, photos: (b.photos || []).filter((p) => p.id !== photoId) })));
    setCustomInspectionItems((prev) => prev.map((item) => ({ ...item, photos: (item.photos || []).filter((p) => p.id !== photoId) })));
    toast.success("Photo deleted");
  }

  // GPS Camera capture handler
  function handleGPSCapture(photo: CapturedPhoto) {
    const tempId = `gps-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const baseName = `gps-${gpsCameraCategory.toLowerCase()}-${Date.now()}.jpg`;
    const photoName =
      gpsCameraTarget === "inspection" && gpsCameraInspectionId?.startsWith("compliance-")
        ? `${gpsCameraInspectionId}-${baseName}`
        : baseName;
    const photoItem: PhotoItem = {
      id: tempId,
      url: photo.url,
      name: photoName,
      size: photo.blob.size,
      category: gpsCameraCategory,
      timestamp: photo.timestamp.toISOString(),
      persisted: false,
    };

    const addInspectionPhoto = (item: PhotoItem) => {
      const customMatch = gpsCameraInspectionId?.match(/^custom-(\d+)$/);
      if (customMatch) {
        const index = parseInt(customMatch[1], 10);
        setCustomInspectionItems((prev) =>
          prev.map((ci, ciIdx) =>
            ciIdx === index ? { ...ci, photos: [...(ci.photos || []), item] } : ci
          )
        );
        return;
      }

      setInspectionPhotos((prev) => [...prev, item]);
    };

    const replaceInspectionPhoto = (item: PhotoItem) => {
      const customMatch = gpsCameraInspectionId?.match(/^custom-(\d+)$/);
      if (customMatch) {
        const index = parseInt(customMatch[1], 10);
        setCustomInspectionItems((prev) =>
          prev.map((ci, ciIdx) =>
            ciIdx === index
              ? { ...ci, photos: (ci.photos || []).map((p) => (p.id === tempId ? item : p)) }
              : ci
          )
        );
        return;
      }

      setInspectionPhotos((prev) => prev.map((p) => (p.id === tempId ? item : p)));
    };

    // Upload in background
    const file = new File([photo.blob], photoName, { type: "image/jpeg" });
    handlePhotoUpload(file, gpsCameraCategory).then((result) => {
      const persistedPhoto: PhotoItem = {
        ...photoItem,
        id: result.id,
        url: result.url,
        persisted: true,
      };

      if (gpsCameraTarget === "global") {
        setGlobalPhotos((prev) => prev.map((p) => (p.id === tempId ? persistedPhoto : p)));
      } else if (gpsCameraTarget === "task" && gpsCameraTaskId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === gpsCameraTaskId
              ? { ...t, photos: t.photos.map((p) => (p.id === tempId ? persistedPhoto : p)) }
              : t
          )
        );
      } else if (gpsCameraTarget === "bid" && gpsCameraBidId) {
        setBids((prev) =>
          prev.map((b) =>
            b.id === gpsCameraBidId
              ? { ...b, photos: (b.photos || []).map((p) => (p.id === tempId ? persistedPhoto : p)) }
              : b
          )
        );
      } else if (gpsCameraTarget === "inspection") {
        replaceInspectionPhoto(persistedPhoto);
      }
    }).catch((err) => console.error("GPS photo upload failed:", err));

    // Add to appropriate photo list
    if (gpsCameraTarget === "global") {
      setGlobalPhotos((prev) => [...prev, photoItem]);
    } else if (gpsCameraTarget === "task" && gpsCameraTaskId) {
      setTasks((prev) => prev.map((t) => t.id === gpsCameraTaskId ? { ...t, photos: [...t.photos, photoItem] } : t));
    } else if (gpsCameraTarget === "bid" && gpsCameraBidId) {
      setBids((prev) => prev.map((b) => b.id === gpsCameraBidId ? { ...b, photos: [...(b.photos || []), photoItem] } : b));
    } else if (gpsCameraTarget === "inspection") {
      addInspectionPhoto(photoItem);
    }

    // In multi-capture mode, keep camera open; in single mode, close it
    if (!gpsCameraMultiCapture) {
      setGpsCameraOpen(false);
    }
    toast.success("Photo captured with GPS");
  }

  function openGPSCamera(
    target: "global" | "task" | "bid" | "inspection",
    category: PhotoCategory = "BEFORE",
    taskId?: string,
    bidId?: string,
    inspectionId?: string
  ) {
    setGpsCameraTarget(target);
    setGpsCameraCategory(category);
    setGpsCameraTaskId(taskId || null);
    setGpsCameraBidId(bidId || null);
    setGpsCameraInspectionId(inspectionId || null);
    setGpsCameraOpen(true);
  }

  // Initialize tasks from workOrder data
  useEffect(() => {
    if (workOrder?.tasks && tasks.length === 0) {
      setTasks(
        (workOrder.tasks as any[]).map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          completed: t.completed,
          completedAt: t.completedAt,
          photos: (t.photos || []).map((p: any) => ({
            id: p.id || `task-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url: p.url || p.path,
            name: p.name || p.originalName || "photo.jpg",
            size: p.size || 0,
            category: p.category || "DURING",
            timestamp: p.timestamp || p.createdAt || new Date().toISOString(),
            persisted: true,
          })),
          expanded: false,
        }))
      );
    }
  }, [workOrder]);

  // Initialize bids from workOrder metadata
  useEffect(() => {
    if (workOrder?.metadata?.bids && bids.length === 0) {
      setBids(
        (workOrder.metadata.bids as any[]).map((b: any) => ({
          id: b.id,
          title: b.title,
          amount: b.amount,
          description: b.description,
          status: b.status || "PENDING",
          photos: (b.photos || []).map((p: any) => ({
            id: p.id || `bid-photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url: p.url || p.path,
            name: p.name || p.originalName || "photo.jpg",
            size: p.size || 0,
            category: p.category || "BID",
            timestamp: p.timestamp || p.createdAt || new Date().toISOString(),
            persisted: true,
          })),
          expanded: false,
        }))
      );
    }
  }, [workOrder]);

  // Inspection items are intentionally user-added only on this page.

  // Log "viewed" activity once
  useEffect(() => {
    if (workOrder && !viewLogged.current) {
      viewLogged.current = true;
      logActivity.mutate({ action: "WORK_ORDER_VIEWED", details: `Viewed work order "${workOrder.title}"` });
    }
  }, [workOrder]);

  // Auto-save tasks and bids to work order
  useEffect(() => {
    // Skip the first render (initial load from DB)
    if (!initialLoadDone.current) {
      if (workOrder) initialLoadDone.current = true;
      return;
    }
    if (!workOrder) return;
    if (tasks.length === 0 && bids.length === 0 && customInspectionItems.length === 0) return;

    const timeout = setTimeout(() => {
      updateMutation.mutate({
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          completed: t.completed,
          completedAt: t.completedAt,
          photos: t.photos.map((p) => ({
            id: p.id,
            url: p.url,
            name: p.name,
            size: p.size,
            category: p.category,
            timestamp: p.timestamp,
          })),
        })),
        metadata: {
          ...(workOrder?.metadata || {}),
          bids: bids.map((b) => ({
            id: b.id,
            title: b.title,
            amount: b.amount,
            description: b.description,
            status: b.status,
            photos: (b.photos || []).map((p) => ({
              id: p.id,
              url: p.url,
              name: p.name,
              size: p.size,
              category: p.category,
              timestamp: p.timestamp,
            })),
          })),
          inspectionItems: customInspectionItems.map((item) => ({
            label: item.label,
            description: item.description,
            required: item.required,
            completed: item.completed,
            photos: (item.photos || []).map((p) => ({
              id: p.id,
              url: p.url,
              name: p.name,
              size: p.size,
              category: p.category,
              timestamp: p.timestamp,
            })),
          })),
        },
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [tasks, bids, customInspectionItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-6 w-6 text-cyan-500 animate-spin" />
          <p className="text-sm text-text-muted">Loading work order...</p>
        </div>
      </div>
    );
  }

  if (workOrderLoadFailed) {
    return (
      <div className="p-8">
        <Card className="mx-auto max-w-xl border-red-200 bg-red-50/60">
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Work order could not load
            </h2>
            <p className="mt-2 text-sm text-text-dim">
              The order is still in the database, but the page could not read it right now.
            </p>
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-text-muted">
              {workOrderLoadError instanceof Error
                ? workOrderLoadError.message
                : "Unknown load error"}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button type="button" onClick={() => refetchWorkOrder()}>
                Retry
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/work-orders")}
              >
                Back to Work Orders
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-8">
        <Card className="mx-auto max-w-xl">
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-text-secondary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Work order not found
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              No work order was returned for ID {id}.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => router.push("/dashboard/work-orders")}
            >
              Back to Work Orders
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const invoiceStatusColors: Record<string, string> = {
    DRAFT: "bg-surface-hover text-text-muted",
    SENT: "bg-blue-100 text-blue-700",
    PAID: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-surface-hover text-text-secondary",
  };

  const canEdit = ["ADMIN", "COORDINATOR", "PROCESSOR"].includes(role);
  const canAssign = ["ADMIN", "COORDINATOR"].includes(role);

  async function handleStatusChange() {
    if (!newStatus) return;
    try {
      await updateMutation.mutateAsync({ status: newStatus });
      toast.success("Status updated");
      setEditingStatus(false);
    } catch {
      toast.error("Failed to update status");
    }
  }

  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const totalBids = bids.reduce((s, b) => s + b.amount, 0);
  const approvedBids = bids
    .filter((b) => b.status === "APPROVED")
    .reduce((s, b) => s + b.amount, 0);

  const allPhotos = [
    ...globalPhotos,
    ...bidPhotos,
    ...inspectionPhotos,
    ...tasks.flatMap((t) => t.photos),
    ...bids.flatMap((b) => b.photos || []),
    ...customInspectionItems.flatMap((item) => item.photos || []),
  ];
  const beforePhotos = allPhotos.filter((p) => p.category === "BEFORE");
  const duringPhotos = allPhotos.filter((p) => p.category === "DURING");
  const afterPhotos = allPhotos.filter((p) => p.category === "AFTER");
  const bidPhotoItems = allPhotos.filter((p) => p.category === "BID");
  const inspectionPhotoItems = allPhotos.filter((p) => p.category === "INSPECTION");
  const taskPhotoCount = tasks.reduce((sum, task) => sum + (task.photos?.length || 0), 0);
  const bidItemPhotoCount = bids.reduce((sum, bid) => sum + (bid.photos?.length || 0), 0);
  const inspectionItemPhotoCount =
    customInspectionItems.reduce((sum, item) => sum + (item.photos?.length || 0), 0);
  const itemPhotoSections = [
    ...tasks
      .filter((task) => task.photos?.length > 0)
      .map((task) => ({ type: "Task", label: task.title, photos: task.photos || [] })),
    ...bids
      .filter((bid) => bid.photos?.length > 0)
      .map((bid) => ({ type: "Bid", label: bid.title, photos: bid.photos || [] })),
    ...customInspectionItems
      .filter((item) => item.photos?.length > 0)
      .map((item) => ({ type: "Inspection", label: item.label, photos: item.photos || [] })),
  ];
  const itemPhotoCount = taskPhotoCount + bidItemPhotoCount + inspectionItemPhotoCount;

  const photoTabEntries = itemPhotoSections.flatMap((section) =>
    section.photos.map((photo: any) => ({ photo, section }))
  );

  function safePhotoFileName(value: string) {
    return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "photo";
  }

  function photoStampDate(photo: any, customValue?: string) {
    const raw = customValue || photo.timestamp || photo.createdAt || photo.updatedAt || photo.date;
    const parsed = raw ? new Date(raw) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function photoStampText(photo: any, mode: typeof photoTabDownloadMode, customValue?: string) {
    const date = photoStampDate(photo, mode === "custom" ? customValue : undefined);
    if (mode === "date") return date.toLocaleDateString();
    if (mode === "datetime" || mode === "custom") return date.toLocaleString();
    const exifParts = [
      photo.category ? `Category: ${photo.category}` : null,
      photo.latitude && photo.longitude ? `GPS: ${photo.latitude}, ${photo.longitude}` : null,
      photo.camera ? `Camera: ${photo.camera}` : null,
      photo.uploader?.name ? `Uploader: ${photo.uploader.name}` : null,
    ].filter(Boolean);
    return `${date.toLocaleString()}${exifParts.length ? ` | ${exifParts.join(" | ")}` : " | EXIF data unavailable"}`;
  }

  async function getPhotoTabDownloadFile(photo: any, sectionLabel: string): Promise<ZipFileInput | null> {
    const src = photo.url || photo.path;
    if (!src) return null;
    const baseName = safePhotoFileName(`${sectionLabel}-${photo.name || photo.originalName || "photo"}`);
    const getOriginal = async () => {
      const response = await fetch(src, { cache: "no-store" });
      if (!response.ok) throw new Error("Photo fetch failed");
      return { name: `${baseName}.jpg`, blob: await response.blob() };
    };
    if (photoTabDownloadMode === "none") {
      return getOriginal();
    }
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.drawImage(img, 0, 0);
      const fontSize = Math.max(18, Math.floor(canvas.width / 42));
      const pad = Math.max(14, Math.floor(fontSize * 0.75));
      const lineHeight = Math.floor(fontSize * 1.35);
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
      ctx.fillRect(0, canvas.height - lineHeight - pad, canvas.width, lineHeight + pad);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(photoStampText(photo, photoTabDownloadMode, photoTabCustomDateTime), pad, canvas.height - pad);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Photo export failed");
      return { name: `${baseName}-${photoTabDownloadMode}.jpg`, blob };
    } catch {
      return getOriginal();
    }
  }

  async function downloadPhotoFromTab(photo: any, sectionLabel: string) {
    const file = await getPhotoTabDownloadFile(photo, sectionLabel);
    if (!file) return;
    const href = URL.createObjectURL(file.blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  async function downloadAllPhotoTabPhotos() {
    if (photoTabEntries.length === 0) return;
    setPhotoTabDownloading(true);
    try {
      const files: ZipFileInput[] = [];
      for (const entry of photoTabEntries) {
        const file = await getPhotoTabDownloadFile(entry.photo, entry.section.label);
        if (file) files.push(file);
      }
      if (files.length > 0) {
        const zip = await createStoredZip(files);
        const href = URL.createObjectURL(zip);
        const link = document.createElement("a");
        link.href = href;
        link.download = `work-order-photos-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(href);
      }
    } finally {
      setPhotoTabDownloading(false);
    }
  }

  const complianceItems = getComplianceItems(
    workOrder.serviceType,
    workOrder,
    tasks,
    allPhotos
  );

  const tabs: { id: string; label: string; icon: any; count?: number }[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "tasks", label: "Tasks", icon: CheckCircle2, count: totalTasks },
    { id: "bids", label: "Bids", icon: DollarSign, count: bids.length },
    { id: "inspection", label: "Inspection", icon: Shield },
    { id: "photos", label: "Photos", icon: Camera, count: itemPhotoCount },
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "history", label: "Property History", icon: Calendar, count: (propertyHistoryData?.workOrders?.length || 0) },
    { id: "messages", label: "Messages", icon: MessageSquare, count: workOrder._count?.threads || 0 },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-surface/60 border border-border-subtle backdrop-blur-xl p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                WO-{workOrder.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight leading-none">
                {workOrder.title}
              </h1>
              <Badge
                className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-lg", STATUS_COLORS[workOrder.status])}
              >
                {STATUS_LABELS[workOrder.status]}
              </Badge>
              <OverdueCountdown
                dueDate={workOrder.dueDate}
                status={workOrder.status}
                size="md"
                showIcon
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-text-secondary">
              <span className="flex items-center gap-2 group transition-colors hover:text-cyan-400">
                <MapPin className="h-4 w-4 text-cyan-500/70" />
                <span className="truncate max-w-[250px]">
                  {workOrder.address}{workOrder.city && `, ${workOrder.city}`}{workOrder.state && `, ${workOrder.state}`}
                </span>
              </span>
              <span className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-hover text-[11px] font-bold uppercase tracking-wider text-text-muted border border-border-subtle">
                <Activity className="h-3.5 w-3.5 text-text-muted" />
                {SERVICE_TYPE_LABELS[workOrder.serviceType]}
              </span>
              <span className="flex items-center gap-2 group transition-colors hover:text-violet-400">
                <Calendar className="h-4 w-4 text-violet-500/70" />
                {workOrder.dueDate ? formatDate(workOrder.dueDate) : "No due date"}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-border-subtle pt-6">
              {workOrder.contractor && (
                <div className="flex items-center gap-2.5 bg-surface-hover px-3 py-1.5 rounded-2xl border border-border-subtle">
                  <Avatar name={workOrder.contractor.name} src={workOrder.contractor.image} size="xs" />
                  <div className="text-[10px]">
                    <p className="text-text-muted font-bold uppercase tracking-tighter leading-none mb-0.5">Contractor</p>
                    <p className="text-text-primary font-semibold">{workOrder.contractor.name}</p>
                  </div>
                </div>
              )}
              {workOrder.coordinator && (
                <div className="flex items-center gap-2.5 bg-surface-hover px-3 py-1.5 rounded-2xl border border-border-subtle">
                  <Avatar name={workOrder.coordinator.name} src={workOrder.coordinator.image} size="xs" />
                  <div className="text-[10px]">
                    <p className="text-text-muted font-bold uppercase tracking-tighter leading-none mb-0.5">Coordinator</p>
                    <p className="text-text-primary font-semibold">{workOrder.coordinator.name}</p>
                  </div>
                </div>
              )}
              {workOrder.createdBy && (
                <div className="flex items-center gap-2.5 bg-surface-hover px-3 py-1.5 rounded-2xl border border-border-subtle">
                  <Avatar name={workOrder.createdBy.name} src={workOrder.createdBy.image} size="xs" />
                  <div className="text-[10px]">
                    <p className="text-text-muted font-bold uppercase tracking-tighter leading-none mb-0.5">Client</p>
                    <p className="text-text-primary font-semibold">{workOrder.createdBy.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => setShowQuickView(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-hover text-text-primary hover:bg-surface-hover border border-border-medium transition-all text-xs font-bold uppercase tracking-wider"
            >
              <FileText className="h-3.5 w-3.5" />
              Quick View
            </button>
            <button
              onClick={() =>
                printWorkOrder({
                  workOrder,
                  tasks,
                  bids,
                  photos: allPhotos,
                  complianceItems,
                  invoices: workOrder.invoices || [],
                })
              }
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-hover text-text-primary hover:bg-surface-hover border border-border-medium transition-all text-xs font-bold uppercase tracking-wider"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 border border-cyan-400/20 shadow-lg shadow-cyan-500/10 transition-all text-xs font-bold uppercase tracking-wider"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await createMutation.mutateAsync({
                        title: `${workOrder.title} (Copy)`,
                        description: workOrder.description || "",
                        address: workOrder.address || "",
                        city: workOrder.city || "",
                        state: workOrder.state || "",
                        zipCode: workOrder.zipCode || "",
                        serviceType: workOrder.serviceType || "OTHER",
                        dueDate: workOrder.dueDate || "",
                        priority: workOrder.priority ?? 0,
                        lockCode: workOrder.lockCode || "",
                        gateCode: workOrder.gateCode || "",
                        keyCode: workOrder.keyCode || "",
                        specialInstructions: workOrder.specialInstructions || "",
                      });
                      toast.success("Work order duplicated");
                      router.push(`/dashboard/work-orders/${res.id}`);
                    } catch {
                      toast.error("Failed to duplicate work order");
                    }
                  }}
                  className="p-2.5 rounded-xl bg-surface-hover text-text-primary hover:bg-surface-hover border border-border-medium transition-all shadow-lg"
                  title="Duplicate Work Order"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress Summary Bar ──────────────────────────────────────────── */}
      {/* ── Progress Summary Bar ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-4 group hover:bg-surface-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Tasks</span>
            </div>
            <p className="text-lg font-black text-text-primary">
              {completedTasks}<span className="text-xs text-text-dim ml-1">/ {totalTasks}</span>
            </p>
          </div>
          <div className="h-2 bg-surface-hover rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
        </div>

        <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-4 group hover:bg-surface-hover transition-all">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Bids</span>
            </div>
            <p className="text-lg font-black text-text-primary">
              ${totalBids.toLocaleString()}
            </p>
          </div>
          {approvedBids > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">
                ${approvedBids.toLocaleString()} approved
              </p>
            </div>
          )}
        </div>

        <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-4 group hover:bg-surface-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Camera className="h-4 w-4 text-violet-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Gallery</span>
            </div>
            <p className="text-lg font-black text-text-primary">{allPhotos.length}</p>
          </div>
          <div className="flex gap-1 mt-2">
            {[
              { photos: beforePhotos, color: "bg-amber-500", label: "B" },
              { photos: duringPhotos, color: "bg-cyan-500", label: "D" },
              { photos: afterPhotos, color: "bg-emerald-500", label: "A" },
              { photos: bidPhotoItems, color: "bg-rose-500", label: "$" },
              { photos: inspectionPhotoItems, color: "bg-violet-500", label: "I" },
            ].map((s) => (
              <div
                key={s.label}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  s.photos.length > 0 ? s.color + " shadow-[0_0_8px_" + s.color.replace('bg-', 'rgba(') + ",0.4)]" : "bg-surface-hover"
                }`}
                title={`${s.photos.length} ${s.label} photos`}
              />
            ))}
          </div>
        </div>

        <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-4 group hover:bg-surface-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Compliance</span>
            </div>
            <p className="text-lg font-black text-text-primary">
              {complianceItems.filter((c) => c.completed).length}<span className="text-xs text-text-dim ml-1">/ {complianceItems.length}</span>
            </p>
          </div>
          <div className="h-2 bg-surface-hover rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
              style={{
                width: `${
                  complianceItems.length > 0
                    ? (complianceItems.filter((c) => c.completed).length /
                        complianceItems.length) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface/60 backdrop-blur-xl rounded-2xl border border-border-subtle overflow-x-auto scrollbar-none sticky top-0 z-20 shadow-2xl flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 whitespace-nowrap group relative flex-1 min-w-max justify-center",
              activeTab === tab.id
                ? "text-cyan-400"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            {activeTab === tab.id && (
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 rounded-lg border border-cyan-500/30 shadow-[0_4px_15px_rgba(6,182,212,0.1)]" />
            )}
            <tab.icon className={cn(
              "h-3 w-3 relative z-10 transition-transform duration-300",
              activeTab === tab.id ? "scale-110" : "group-hover:scale-110"
            )} />
            <span className="text-[8px] font-black uppercase tracking-[0.15em] relative z-10">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1 py-0.5 rounded text-[7px] font-black relative z-10 transition-all",
                  activeTab === tab.id
                    ? "bg-cyan-500/30 text-cyan-200 shadow-inner ring-1 ring-cyan-500/30"
                    : "bg-surface-hover text-text-dim group-hover:text-text-secondary group-hover:bg-surface-hover"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Current Status + Property Front Photo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative overflow-hidden flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border border-amber-500/20 bg-surface/60 backdrop-blur-xl shadow-xl">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Activity className="h-16 w-16 text-amber-400" />
                </div>
                <div className="h-14 w-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                  <Activity className="h-7 w-7 text-amber-400" />
                </div>
                <div className="text-center relative z-10">
                  <p className="text-sm font-black text-text-primary uppercase tracking-widest mb-2">Current Status</p>
                  {editingStatus ? (
                    <div className="space-y-2 min-w-[200px]">
                      <Select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        options={Object.entries(STATUS_LABELS).map(([val, label]) => ({ value: val, label }))}
                        className="bg-surface-hover border-border-medium text-text-primary text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleStatusChange}
                          disabled={updateMutation.isPending}
                          className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                        >
                          {updateMutation.isPending ? "Saving..." : "Apply"}
                        </button>
                        <button
                          onClick={() => setEditingStatus(false)}
                          className="px-3 py-1.5 rounded-lg bg-surface-hover text-white text-[10px] font-black uppercase tracking-widest hover:bg-surface-hover transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Badge
                        className={cn("text-xs px-5 py-1.5 uppercase tracking-[0.15em] shadow-lg shadow-black/40", STATUS_COLORS[workOrder.status])}
                      >
                        {STATUS_LABELS[workOrder.status]}
                      </Badge>
                      {canEdit && (
                        <button
                          onClick={() => {
                            setNewStatus(workOrder.status);
                            setEditingStatus(true);
                          }}
                          className="mt-2 text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-all"
                        >
                          Update State
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => frontPhotoInputRef.current?.click()}
                disabled={uploadingFrontPhoto}
                className="relative overflow-hidden group flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border border-sky-500/20 bg-surface/60 backdrop-blur-xl hover:border-sky-500/40 hover:bg-sky-500/[0.08] transition-all shadow-xl disabled:opacity-50"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building2 className="h-16 w-16 text-sky-400" />
                </div>
                <div className="h-14 w-14 rounded-2xl bg-sky-500/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all">
                  {uploadingFrontPhoto ? (
                    <Loader2 className="h-7 w-7 text-sky-400 animate-spin" />
                  ) : (
                    <Building2 className="h-7 w-7 text-sky-400" />
                  )}
                </div>
                <div className="text-center relative z-10">
                  <p className="text-sm font-black text-text-primary uppercase tracking-widest">Property Front</p>
                  <p className="text-[10px] text-sky-500/70 font-bold mt-1">GLOBAL PROPERTY ASSET</p>
                </div>
              </button>
              <input
                ref={frontPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleFrontPhotoUpload}
                className="hidden"
              />
            </div>

            {/* Property Front Photos Display */}
            {propertyFrontPhotos.length > 0 && (
              <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden shadow-2xl">
                <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Main Property Photo</h3>
                      <p className="text-[9px] font-bold text-text-muted">GLOBAL ASSET • SHARED</p>
                    </div>
                  </div>
                  <button
                    onClick={() => frontPhotoInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-surface-hover text-[10px] font-bold text-sky-400 hover:bg-surface-hover border border-border-subtle transition-all uppercase tracking-tighter"
                  >
                    Replace Asset
                  </button>
                </div>
                <div className="p-4">
                  {propertyFrontPhotos.slice(0, 1).map((photo: any) => (
                    <div
                      key={photo.id}
                      onClick={() => setPropertyFrontViewerOpen(true)}
                      className="relative group rounded-2xl overflow-hidden aspect-[16/9] bg-surface-hover border border-border-subtle hover:border-sky-500/40 transition-all cursor-pointer shadow-inner"
                    >
                      <img
                        src={photo.path}
                        alt={photo.originalName || "Property Front"}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-surface-hover backdrop-blur-md border border-border-medium flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all">
                          <ZoomIn className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <span className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-sky-500 text-white shadow-lg uppercase tracking-[0.1em]">
                          Verified Front
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFrontPhoto(photo.id);
                        }}
                        className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-rose-500/90 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-rose-500 shadow-lg scale-75 group-hover:scale-100"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {workOrder.description && (
              <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Project Scope</h3>
                  <button
                    onClick={() => setExpandedProjectScope(!expandedProjectScope)}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-tighter transition-all"
                  >
                    {expandedProjectScope ? "Collapse" : "Expand"}
                  </button>
                </div>
                <div className={`p-4 rounded-xl bg-surface-hover border border-border-subtle overflow-y-auto scrollbar-none transition-all duration-300 ${expandedProjectScope ? "max-h-none" : "h-[240px]"}`}>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed italic">
                    {workOrder.description}
                  </p>
                </div>
              </div>
            )}

            {/* Recent Tasks Preview */}
            {tasks.length > 0 && (
              <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden shadow-xl group">
                <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-hover">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Task Snapshot</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-tighter"
                  >
                    Manage Tasks →
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-hover border border-border-subtle hover:border-border-medium hover:bg-surface-hover transition-all group/item"
                    >
                      <div className="relative flex-shrink-0">
                        {task.completed ? (
                          <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-border-medium group-hover/item:border-cyan-500/50 transition-colors" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium transition-colors",
                          task.completed
                            ? "line-through text-text-muted"
                            : "text-text-primary group-hover/item:text-white"
                        )}
                      >
                        {task.title}
                      </span>
                      {task.description && (
                        <span className="text-[10px] text-text-muted italic line-clamp-1 group-hover/item:line-clamp-none transition-all ml-1">
                          — {task.description}
                        </span>
                      )}
                      {task.photos.length > 0 && (
                        <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-hover border border-border-subtle">
                          <Camera className="h-3 w-3 text-text-muted" />
                          <span className="text-[9px] font-black text-text-secondary">{task.photos.length}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {tasks.length > 5 && (
                    <div className="pt-2 text-center">
                      <p className="text-[10px] font-black text-text-dim uppercase tracking-widest">
                        +{tasks.length - 5} Supplemental Tasks
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity history */}
            <div className="bg-surface/40 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">History & Activity</h3>
                {workOrder.history?.length > 5 && (
                  <button
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-tighter"
                  >
                    {showAllHistory ? "Show less" : `View all (${workOrder.history.length})`}
                  </button>
                )}
              </div>
              <div className="p-5">
                {workOrder.history?.length > 0 ? (
                  <div className="space-y-4">
                    {(showAllHistory ? workOrder.history : workOrder.history.slice(0, 5))
                      .filter((entry: any) => {
                        const d = (entry.details || "").toLowerCase();
                        if (d.startsWith("updated task") && d.includes("metadata")) return false;
                        if (d === "viewed work order" || d.startsWith("work order viewed")) return false;
                        if (d.startsWith("auto-saved") || d === "updated work order") return false;
                        return true;
                      })
                      .map((entry: any) => (
                        <div key={entry.id} className="flex gap-4 group relative">
                          <div className="absolute left-[7px] top-6 bottom-0 w-px bg-surface-hover group-last:hidden" />
                          <div className="h-4 w-4 rounded-full bg-surface border-2 border-border-medium flex-shrink-0 mt-1 flex items-center justify-center z-10">
                            <div className="h-1 w-1 rounded-full bg-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0 pb-2">
                            <p className="text-sm text-text-secondary leading-snug">{entry.details}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-text-muted uppercase">{entry.user?.name}</span>
                              <span className="text-[10px] text-text-dim">•</span>
                              <span className="text-[10px] text-text-dim">{formatDateTime(entry.createdAt)}</span>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/work-orders/${id}/activity?entryId=${entry.id}`, { method: "DELETE" });
                                toast.success("Activity removed");
                              } catch { toast.error("Failed to remove"); }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/10 text-text-dim hover:text-rose-400 transition-all flex-shrink-0 self-start"
                            title="Remove this entry"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Activity className="h-8 w-8 text-slate-800 mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-text-dim italic">No significant activity recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Details */}
            <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-border-subtle bg-surface-hover">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Asset Details</h3>
              </div>
              <div className="p-5 space-y-5">
                {[
                  {
                    icon: Calendar,
                    label: "Target Date",
                    value: workOrder.dueDate ? formatDate(workOrder.dueDate) : "Undated",
                    color: "text-amber-400",
                    bg: "bg-amber-500/10"
                  },
                  workOrder.lockCode && {
                    icon: Lock,
                    label: "Access: Lock",
                    value: workOrder.lockCode,
                    mono: true,
                    color: "text-cyan-400",
                    bg: "bg-cyan-500/10"
                  },
                  workOrder.gateCode && {
                    icon: Key,
                    label: "Access: Gate",
                    value: workOrder.gateCode,
                    mono: true,
                    color: "text-violet-400",
                    bg: "bg-violet-500/10"
                  },
                  workOrder.keyCode && {
                    icon: Key,
                    label: "Access: Key",
                    value: workOrder.keyCode,
                    mono: true,
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10"
                  },
                ]
                  .filter(Boolean)
                  .map((item: any) => (
                    <div key={item.label} className="flex items-center gap-4 group">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border border-border-subtle transition-all group-hover:scale-110", item.bg)}>
                        <item.icon className={cn("h-4 w-4", item.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-0.5">
                          {item.label}
                        </p>
                        <p className={cn(
                          "text-sm font-bold text-text-primary",
                          item.mono && "font-mono tracking-wider"
                        )}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}

                {workOrder.specialInstructions && (
                  <div className="pt-5 border-t border-border-subtle group">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">
                      Special Instructions
                    </p>
                    <div className="p-3 rounded-xl bg-surface-hover border border-border-subtle group-hover:border-border-medium transition-all">
                      <p className="text-xs text-text-secondary leading-relaxed italic">
                        "{workOrder.specialInstructions.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\n\s*\n/g, "\n").trim()}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coordinator */}
            {workOrder.coordinator && (
              <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-5 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield className="h-12 w-12 text-cyan-400" />
                </div>
                <div className="flex items-center gap-4 mb-5 relative z-10">
                  <div className="relative">
                    <Avatar
                      name={workOrder.coordinator.name}
                      src={workOrder.coordinator.image}
                      size="lg"
                      className="ring-2 ring-cyan-500/20"
                    />
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-border-subtle rounded-full shadow-lg shadow-emerald-500/20" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-text-primary tracking-tight">
                      {workOrder.coordinator.name}
                    </h4>
                    <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">Lead Coordinator</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  {workOrder.coordinator.phone && (
                    <a
                      href={`tel:${workOrder.coordinator.phone}`}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-hover border border-border-subtle hover:bg-surface-hover hover:border-border-medium transition-all text-text-secondary"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Call</span>
                    </a>
                  )}
                  {workOrder.coordinator.email && (
                    <a
                      href={`mailto:${workOrder.coordinator.email}`}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-hover border border-border-subtle hover:bg-surface-hover hover:border-border-medium transition-all text-text-secondary"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Email</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-1.5 shadow-xl">
              <div className="flex flex-col">
                <button
                  onClick={() => setActiveTab("messages")}
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-hover group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageSquare className="h-4 w-4 text-cyan-400" />
                    </div>
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-text-dim">{workOrder._count?.threads || 0}</span>
                    <ChevronRight className="h-3 w-3 text-text-dim" />
                  </div>
                </button>
                <Link
                  href="/dashboard/invoices"
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-hover group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Receipt className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Invoices</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-text-dim">{workOrder._count?.invoices || 0}</span>
                    <ChevronRight className="h-3 w-3 text-text-dim" />
                  </div>
                </Link>
                <button
                  onClick={() =>
                    printWorkOrder({
                      workOrder,
                      tasks,
                      bids,
                      photos: allPhotos,
                      complianceItems,
                      invoices: workOrder.invoices || [],
                    })
                  }
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-hover group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Printer className="h-4 w-4 text-violet-400" />
                    </div>
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Report</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-text-dim" />
                </button>
              </div>
            </div>

            {/* AI Assistant - Floating */}
            <div className="relative group">
              {showAIChat ? (
                <div className="bg-surface/95 backdrop-blur-2xl rounded-[2rem] border border-border-medium shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-text-primary uppercase tracking-widest leading-none">Aura Intelligence</h4>
                        <p className="text-[8px] font-bold text-cyan-500/70 uppercase tracking-tighter mt-1">Operational Support System</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAIChat(false)}
                      className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-white transition-all active:scale-95"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative z-10">
                    <AIChat
                      embedded
                      context={{
                        type: "work_order",
                        id: workOrder.id,
                        title: workOrder.title,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAIChat(true)}
                  className="w-full bg-gradient-to-br from-[#1e1b4b] to-[#16162a] backdrop-blur-md rounded-2xl border border-border-subtle p-5 shadow-xl hover:border-cyan-500/40 hover:shadow-cyan-500/10 transition-all text-left relative overflow-hidden group/ai"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/ai:opacity-30 transition-all group-hover/ai:scale-110">
                    <Sparkles className="h-16 w-16 text-cyan-400" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-lg">
                        <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-text-primary tracking-tight">Need Assistance?</h4>
                        <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest">Aura v2.4 Active</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed max-w-[180px]">
                      Ask questions about this work order, compliance, or logistics.
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Tasks</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-hover text-text-muted">
                {completedTasks}/{totalTasks}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openGPSCamera("global", "BEFORE")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-medium border border-emerald-500/20"
              >
                <MapPin className="h-3.5 w-3.5" />
                GPS Camera
              </button>
              {tasks.some((t) => t.photos?.length > 0) && (
                <button
                  onClick={() => setAllPhotosModal({ open: true, source: "tasks" })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-xs font-medium border border-cyan-500/20"
                >
                  <Camera className="h-3.5 w-3.5" />
                  View All Photos
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-[10px]">
                    {tasks.reduce((s, t) => s + (t.photos?.length || 0), 0)}
                  </span>
                </button>
              )}
            </div>
          </div>
          <Card padding={false}>
            <TaskEntryList
              tasks={tasks}
              onTasksChange={setTasks}
              serviceType={workOrder.serviceType}
              onUpload={handlePhotoUpload}
              onOpenCamera={(category, taskId) => openGPSCamera("task", category as PhotoCategory, taskId)}
            />
          </Card>
        </div>
      )}

      {activeTab === "bids" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-semibold text-text-primary">Bids</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-hover text-text-muted">
                {bids.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {bids.some((b) => b.photos?.length > 0) && (
                <button
                  onClick={() => setAllPhotosModal({ open: true, source: "bids" })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors text-xs font-medium border border-violet-500/20"
                >
                  <Camera className="h-3.5 w-3.5" />
                  View All Photos
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-[10px]">
                    {bids.reduce((s, b) => s + (b.photos?.length || 0), 0)}
                  </span>
                </button>
              )}
            </div>
          </div>
          <Card padding={false}>
            <div className="p-4">
              <BidEntryList bids={bids} onBidsChange={setBids} onUpload={handlePhotoUpload} onOpenCamera={(category, bidId) => openGPSCamera("bid", category as PhotoCategory, undefined, bidId)} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "inspection" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <Shield className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Compliance Protocol</h3>
                <p className="text-[10px] font-bold text-text-muted">
                  {complianceItems.filter(c => c.completed).length} of {complianceItems.length} safety checks passed
                </p>
              </div>
            </div>
            {complianceItems.length > 0 && (
              <div className="text-right">
                <span className="text-lg font-black text-violet-400 leading-none">
                  {Math.round((complianceItems.filter(c => c.completed).length / complianceItems.length) * 100)}%
                </span>
                <p className="text-[9px] font-black text-text-dim uppercase tracking-tighter">Safety Score</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System/Auto Inspection Items */}
            {complianceItems.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border transition-all duration-300 p-5",
                  item.completed
                    ? "bg-emerald-500/[0.04] border-emerald-500/20 shadow-[0_4px_20px_-10px_rgba(16,185,129,0.1)]"
                    : "bg-surface/60 backdrop-blur-md border-border-subtle"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-1 h-5 w-5 rounded-full flex items-center justify-center border-2 transition-colors",
                      item.completed ? "bg-emerald-500 border-emerald-500" : "border-border-medium"
                    )}>
                      {item.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <h4 className={cn("text-sm font-bold", item.completed ? "text-text-secondary" : "text-text-primary")}>
                        {item.label}
                      </h4>
                      {item.description && <p className="text-[11px] text-text-muted mt-1 italic line-clamp-1 group-hover:line-clamp-none transition-all">{item.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.completed ? (
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 uppercase tracking-widest border border-emerald-500/20">Verified</span>
                    ) : (
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 uppercase tracking-widest border border-rose-500/20">Required</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Custom Inspection Items */}
          <div className="space-y-4 pt-6 border-t border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-cyan-400" />
              </div>
              <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Field Exceptions & Add-ons</h4>
            </div>

            <div className="space-y-3">
              {customInspectionItems.map((item, i) => (
                <div
                  key={`custom-${i}`}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border transition-all duration-300",
                    item.completed
                      ? "bg-emerald-500/[0.04] border-emerald-500/20 shadow-[0_4px_20px_-10px_rgba(16,185,129,0.1)]"
                      : "bg-surface/60 backdrop-blur-md border-border-subtle hover:border-border-subtle"
                  )}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <button
                      onClick={() => {
                        setCustomInspectionItems((prev) =>
                          prev.map((ci, ciIdx) =>
                            ciIdx === i ? { ...ci, completed: !ci.completed } : ci
                          )
                        );
                      }}
                      className="relative flex-shrink-0"
                    >
                      {item.completed ? (
                        <div className="h-6 w-6 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-lg border-2 border-border-medium hover:border-cyan-500/50 flex items-center justify-center transition-all">
                          <div className="h-2 w-2 rounded-sm bg-surface-hover opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingInspectionIdx === i ? (
                        <div className="space-y-3 py-1">
                          <input
                            type="text"
                            value={editInspectionLabel}
                            onChange={(e) => setEditInspectionLabel(e.target.value)}
                            className="w-full px-4 py-2 bg-surface-hover border border-border-medium rounded-xl text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editInspectionDesc}
                            onChange={(e) => setEditInspectionDesc(e.target.value)}
                            placeholder="Additional instructions..."
                            className="w-full px-4 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-secondary focus:border-cyan-500/50 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (!editInspectionLabel.trim()) return;
                                setCustomInspectionItems((prev) =>
                                  prev.map((ci, ciIdx) =>
                                    ciIdx === i ? { ...ci, label: editInspectionLabel.trim(), description: editInspectionDesc.trim() || undefined } : ci
                                  )
                                );
                                setEditingInspectionIdx(null);
                              }}
                              className="px-4 py-1.5 rounded-lg bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-colors"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingInspectionIdx(null)} className="px-4 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] font-black uppercase tracking-widest">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h4 className={cn("text-sm font-bold", item.completed ? "text-text-secondary" : "text-text-primary")}>{item.label}</h4>
                          {item.description && <p className="text-[11px] text-text-muted mt-1 italic line-clamp-1 group-hover:line-clamp-none transition-all">{item.description}</p>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-surface-hover border border-border-subtle rounded-xl p-1 gap-1">
                        <button
                          onClick={() => {
                            setCustomInspectionItems((prev) =>
                              prev.map((ci, ciIdx) => ciIdx === i ? { ...ci, expanded: !ci.expanded } : ci)
                            );
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            item.expanded ? "bg-cyan-500 text-white shadow-lg" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                          )}
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                        <div className="w-px h-4 bg-surface-hover mx-0.5" />
                        <button
                          onClick={() => {
                            setEditingInspectionIdx(i);
                            setEditInspectionLabel(item.label);
                            setEditInspectionDesc(item.description || "");
                          }}
                          className="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setCustomInspectionItems((prev) => prev.filter((_, ciIdx) => ciIdx !== i));
                          }}
                          className="p-2 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setCustomInspectionItems((prev) =>
                            prev.map((ci, ciIdx) => ciIdx === i ? { ...ci, expanded: !ci.expanded } : ci)
                          );
                        }}
                        className="p-2 rounded-xl text-text-dim hover:text-text-secondary transition-all ml-1"
                      >
                        {item.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {item.expanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-border-subtle bg-surface-hover">
                      <PhotoUploadSection
                        photos={item.photos}
                        onPhotosChange={(photos) => {
                          setCustomInspectionItems((prev) =>
                            prev.map((ci, ciIdx) => ciIdx === i ? { ...ci, photos } : ci)
                          );
                        }}
                        onUpload={handlePhotoUpload}
                        onOpenCamera={(category) => openGPSCamera("inspection", category as PhotoCategory, undefined, undefined, `custom-${i}`)}
                        title={`${item.label} Evidence`}
                        singleBucket
                        singleBucketCategory="INSPECTION"
                        showCategories={["INSPECTION"]}
                        compact
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showAddInspection ? (
              <div className="p-6 rounded-3xl border border-border-medium bg-surface/60 backdrop-blur-xl shadow-2xl space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-cyan-400" />
                  </div>
                  <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">New Inspection Target</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Item Label</label>
                    <input
                      type="text"
                      value={newInspectionLabel}
                      onChange={(e) => setNewInspectionLabel(e.target.value)}
                      placeholder="e.g., Attic Mold Assessment"
                      className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-1.5 block">Assessment Directions</label>
                    <textarea
                      value={newInspectionDesc}
                      onChange={(e) => setNewInspectionDesc(e.target.value)}
                      placeholder="Describe what needs to be inspected or documented..."
                      rows={3}
                      className="w-full px-4 py-3 bg-surface-hover border border-border-subtle rounded-2xl text-xs text-text-secondary focus:border-cyan-500/50 focus:outline-none resize-none shadow-inner"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!newInspectionLabel.trim()) return;
                      setCustomInspectionItems((prev) => [
                        ...prev,
                        {
                          label: newInspectionLabel.trim(),
                          description: newInspectionDesc.trim() || undefined,
                          required: false,
                          completed: false,
                          photos: [],
                          expanded: false,
                        },
                      ]);
                      setNewInspectionLabel("");
                      setNewInspectionDesc("");
                      setShowAddInspection(false);
                    }}
                    disabled={!newInspectionLabel.trim()}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20"
                  >
                    Add Inspection Item
                  </button>
                  <button
                    onClick={() => {
                      setShowAddInspection(false);
                      setNewInspectionLabel("");
                      setNewInspectionDesc("");
                    }}
                    className="px-6 py-3 rounded-2xl bg-surface-hover text-white text-xs font-black uppercase tracking-widest hover:bg-surface-hover transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddInspection(true)}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-border-subtle bg-surface-hover text-text-muted hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/[0.02] transition-all group"
              >
                <div className="h-8 w-8 rounded-xl bg-surface-hover group-hover:bg-cyan-500/10 flex items-center justify-center transition-all">
                  <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest">Add Custom Inspection Point</span>
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === "photos" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <Camera className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Asset Repository</h3>
                <p className="text-[10px] font-bold text-text-muted">{itemPhotoCount} documented visuals</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-surface/60 backdrop-blur-md border border-border-subtle rounded-2xl p-1 gap-2">
                <select
                  value={photoTabDownloadMode}
                  onChange={(e) => setPhotoTabDownloadMode(e.target.value as typeof photoTabDownloadMode)}
                  className="bg-transparent px-3 py-1.5 text-xs text-text-secondary outline-none font-bold"
                >
                  <option value="datetime">Timestamped</option>
                  <option value="date">Date Only</option>
                  <option value="datetimeExif">Full Metadata</option>
                  <option value="custom">Manual Stamp</option>
                  <option value="none">Raw Original</option>
                </select>
                {photoTabDownloadMode === "custom" && (
                  <input
                    type="datetime-local"
                    value={photoTabCustomDateTime}
                    onChange={(e) => setPhotoTabCustomDateTime(e.target.value)}
                    className="bg-surface-hover border border-border-medium rounded-xl px-3 py-1.5 text-xs text-cyan-400 outline-none"
                  />
                )}
              </div>
              
              <button
                onClick={downloadAllPhotoTabPhotos}
                disabled={itemPhotoCount === 0 || photoTabDownloading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40"
              >
                {photoTabDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Archive All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {itemPhotoSections.length === 0 ? (
              <div className="py-24 border-2 border-dashed border-border-subtle rounded-[40px] text-center">
                <div className="h-20 w-20 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-6">
                  <Camera className="h-10 w-10 text-slate-800 opacity-20" />
                </div>
                <h4 className="text-text-secondary font-black uppercase tracking-widest mb-1">Visual Void</h4>
                <p className="text-sm text-text-dim font-medium">No operational photos have been captured yet.</p>
              </div>
            ) : (
              itemPhotoSections.map((section, idx) => (
                <div key={`${section.type}-${section.label}-${idx}`} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-surface-hover text-text-muted border border-border-subtle uppercase tracking-widest">
                        {section.type}
                      </span>
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-widest">{section.label}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-text-dim">{section.photos.length} item{section.photos.length !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {section.photos.map((photo: any, photoIdx: number) => (
                      <button
                        key={photo.id || `${idx}-${photoIdx}`}
                        type="button"
                        onClick={() => setAllPhotosModal({ open: true, source: "all" })}
                        className="group relative aspect-square overflow-hidden rounded-2xl border border-border-subtle bg-surface hover:border-cyan-500/50 transition-all shadow-lg"
                      >
                        <img
                          src={photo.url || photo.path}
                          alt={photo.name || "Documentation"}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                          <p className="text-[8px] font-black text-white uppercase tracking-tighter truncate">
                            {photo.name?.split('-').pop() || 'VISUAL'}
                          </p>
                          {photo.category && (
                            <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest mt-0.5">
                              {photo.category}
                            </span>
                          )}
                        </div>
                        {photo.category && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-border-subtle">
                            <span className="text-[7px] font-black text-white uppercase tracking-widest">
                              {photo.category}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => setAllPhotosModal({ open: true, source: "all" })}
                      className="aspect-square rounded-2xl border-2 border-dashed border-border-subtle flex flex-col items-center justify-center gap-2 hover:bg-surface-hover hover:border-border-medium transition-all text-text-dim hover:text-text-muted"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Expand</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Receipt className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Invoice Generator</h3>
                <p className="text-[10px] font-bold text-text-muted">
                  Create invoices from work order tasks
                </p>
              </div>
            </div>
          </div>

          {/* Existing Invoices — Flat Inline View */}
          {workOrder.invoices && workOrder.invoices.length > 0 && (
            <div className="space-y-6">
              {workOrder.invoices.map((inv: any) => {
                const items = inv.items || [];
                return (
                  <div key={inv.id} className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle overflow-hidden shadow-xl">
                    {/* Invoice Header Row */}
                    <div className="px-5 py-4 border-b border-border-subtle bg-surface-hover flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Receipt className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-text-primary">{inv.invoiceNumber}</h4>
                            <Badge className={cn("text-[8px] px-1.5 py-0.5", invoiceStatusColors[inv.status] || "bg-surface-hover text-text-muted")}>
                              {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                            </Badge>
                            {inv.noCharge && (
                              <Badge className="bg-yellow-100 text-yellow-700 text-[8px] px-1.5 py-0.5">No Charge</Badge>
                            )}
                          </div>
                          <p className="text-[9px] text-text-dim mt-0.5">
                            {items.length} item{items.length !== 1 ? "s" : ""} • Created {formatDateTime(inv.createdAt)}
                            {inv.dueDate && <> • Due {formatDate(inv.dueDate)}</>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditInvoice(inv)}
                          className="px-3 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] font-bold uppercase tracking-wider border border-border-medium flex items-center gap-1.5 hover:text-text-primary transition-all"
                        >
                          <Wrench className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handlePrintInvoice(inv)}
                          className="px-3 py-1.5 rounded-lg bg-surface-hover text-text-secondary text-[10px] font-bold uppercase tracking-wider border border-border-medium flex items-center gap-1.5 hover:text-text-primary transition-all"
                        >
                          <Printer className="h-3 w-3" />
                          Print
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20 flex items-center gap-1.5 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                        {inv.status === "DRAFT" && (
                          <button onClick={() => toast.success("Invoice marked as Sent")} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 transition-all">
                            <Send className="h-3 w-3" />
                            Send
                          </button>
                        )}
                        {inv.status === "SENT" && (
                          <button onClick={() => toast.success("Invoice marked as Paid")} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:opacity-90 transition-all">
                            <CheckCircle2 className="h-3 w-3" />
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border-subtle bg-surface-hover/50">
                            <th className="text-left px-5 py-3 text-[9px] font-bold text-text-dim uppercase tracking-wider">Task</th>
                            <th className="text-right px-4 py-3 text-[9px] font-bold text-text-dim uppercase tracking-wider">Qty</th>
                            <th className="text-right px-4 py-3 text-[9px] font-bold text-text-dim uppercase tracking-wider">Price</th>
                            <th className="text-right px-4 py-3 text-[9px] font-bold text-text-dim uppercase tracking-wider">Discount</th>
                            
                            <th className="text-right px-5 py-3 text-[9px] font-bold text-text-dim uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {items.map((item: any, idx: number) => (
                            <tr key={item.id || idx} className="hover:bg-surface-hover/30 transition-colors">
                              <td className="px-5 py-3 text-sm font-medium text-text-primary">
                                {item.taskName || item.description || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-text-muted text-right tabular-nums">{item.quantity ?? "—"}</td>
                              <td className="px-4 py-3 text-sm text-text-muted text-right tabular-nums">{formatCurrency(item.unitPrice || 0)}</td>
                              <td className="px-4 py-3 text-sm text-text-muted text-right tabular-nums">
                                {item.discountPercent ? `${item.discountPercent}%` : "—"}
                              </td>

                              <td className="px-5 py-3 text-sm font-bold text-text-primary text-right tabular-nums">
                                {formatCurrency(item.amount || (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discountPercent || 0) / 100))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border-subtle">
                            <td colSpan={4} className="px-5 py-3 text-[10px] text-text-muted text-right font-bold uppercase tracking-wider">Subtotal</td>
                            <td className="px-5 py-3 text-sm font-bold text-text-primary text-right tabular-nums">{formatCurrency(inv.subtotal || 0)}</td>
                          </tr>
                          {(inv.subtotal - (inv.noCharge ? 0 : inv.total) + (inv.tax || 0)) > 0.01 && (
                            <tr>
                              <td colSpan={4} className="px-5 py-2 text-[10px] text-text-muted text-right font-bold uppercase tracking-wider">Discount</td>
                              <td className="px-5 py-2 text-sm text-amber-500 text-right tabular-nums">
                                -{formatCurrency(inv.subtotal - (inv.noCharge ? 0 : inv.total) + (inv.tax || 0))}
                              </td>
                            </tr>
                          )}
                          {inv.tax > 0 && (
                            <tr>
                              <td colSpan={4} className="px-5 py-2 text-[10px] text-text-muted text-right font-bold uppercase tracking-wider">Tax</td>
                              <td className="px-5 py-2 text-sm text-text-primary text-right tabular-nums">{formatCurrency(inv.tax)}</td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-border-medium bg-surface-hover/30">
                            <td colSpan={4} className="px-5 py-4 text-sm font-black text-text-primary text-right uppercase tracking-wider">Total</td>
                            <td className="px-5 py-4 text-lg font-black text-emerald-500 text-right tabular-nums">
                              {inv.noCharge ? "No Charge" : formatCurrency(inv.total || 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Notes */}
                    {inv.notes && (
                      <div className="px-5 py-3 border-t border-border-subtle bg-surface-hover/20">
                        <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-xs text-text-secondary">{inv.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-border-subtle p-5 shadow-xl">
            {/* Invoice Header */}
            <div className="mb-6 pb-6 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted mb-3">
                  {editingInvoiceId ? "Edit Invoice" : "Invoice Details"}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Invoice Number</p>
                  <p className="text-sm font-black text-text-primary">INV-{workOrder.id.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Work Order</p>
                  <p className="text-sm font-black text-text-primary">{workOrder.title}</p>
                </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted mb-4">Invoice Line Items</h4>
              
              {/* Header for Row-based Layout */}
              {invoiceItems.length > 0 && (
                <div className="hidden lg:grid grid-cols-[2fr_80px_100px_80px_100px_40px] gap-3 px-4 py-2 text-[8px] font-bold text-text-dim uppercase tracking-wider border-b border-border-subtle mb-2">
                  <div>Task Name</div>
                  <div className="text-right">Qty</div>
                  <div className="text-right">Unit Price</div>
                  <div className="text-right">Disc %</div>
                  <div className="text-right">Total</div>
                  <div className="text-center"></div>
                </div>
              )}

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {invoiceItems.length === 0 ? (
                  <div className="py-8 border-2 border-dashed border-border-subtle rounded-xl text-center">
                    <p className="text-sm text-text-dim font-medium">No invoice items yet. Click &quot;Add Invoice&quot; below to start.</p>
                  </div>
                ) : (
                  invoiceItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 lg:grid-cols-[2fr_80px_100px_80px_100px_40px] gap-3 items-start p-4 lg:p-2 bg-surface-hover/50 rounded-xl border border-border-subtle hover:border-border-medium transition-all group">
                      {/* Task Name */}
                      <div className="lg:contents">
                        <label className="lg:hidden text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Task Name</label>
                        <input
                          type="text"
                          value={item.taskName}
                          onChange={(e) => updateInvoiceItem(item.id, "taskName", e.target.value)}
                          placeholder="Task Name"
                          className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-sm text-text-primary font-black outline-none focus:border-cyan-500/50 placeholder:text-text-dim"
                        />
                      </div>
                      
                      {/* Quantity */}
                      <div className="lg:contents text-right">
                        <label className="lg:hidden text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          min={0}
                          className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-xs text-text-primary text-right outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="lg:contents text-right">
                        <label className="lg:hidden text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Unit Price</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateInvoiceItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                          min={0}
                          step={0.01}
                          className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-xs text-text-primary text-right outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      {/* Discount % */}
                      <div className="lg:contents text-right">
                        <label className="lg:hidden text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Discount %</label>
                        <input
                          type="number"
                          value={item.discountPercent}
                          onChange={(e) => updateInvoiceItem(item.id, "discountPercent", parseFloat(e.target.value) || 0)}
                          min={0}
                          max={100}
                          step={0.01}
                          className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-xs text-text-primary text-right outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      {/* Total */}
                      <div className="lg:contents text-right">
                        <label className="lg:hidden text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Total</label>
                        <div className="w-full bg-surface-hover border border-border-medium rounded-lg px-2 py-1.5 text-xs text-text-primary font-bold text-right">
                          ${item.total.toFixed(2)}
                        </div>
                      </div>

                      {/* Delete */}
                      <div className="lg:contents text-center">
                        <button
                          onClick={() => removeInvoiceItem(item.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100"
                          title="Remove item"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Invoice Button */}
            <div className="mb-6 pb-6 border-b border-border-subtle">
              <button
                onClick={addInvoiceItem}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all text-[10px] font-black uppercase tracking-widest border border-cyan-500/20"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Line Item
              </button>
            </div>

            {/* Notes */}
            <div className="mb-6 pb-6 border-b border-border-subtle">
              <label className="text-[8px] font-bold text-text-dim uppercase tracking-wider mb-1 block">Notes (optional)</label>
              <textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Add any notes for this invoice..."
                rows={2}
                className="w-full bg-surface-hover border border-border-medium rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-cyan-500/50 placeholder:text-text-dim resize-none"
              />
            </div>

            {/* Summary */}
            <div className="space-y-2 pt-4 border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted font-bold uppercase tracking-wider">Subtotal</p>
                <p className="text-lg font-black text-text-primary">${invoiceSubtotal.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted font-bold uppercase tracking-wider">Total Discount</p>
                <p className="text-lg font-black text-amber-400">-${invoiceTotalDiscount.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                <p className="text-sm font-black text-text-primary uppercase tracking-wider">Invoice Total</p>
                <p className="text-2xl font-black text-cyan-400">${invoiceGrandTotal.toFixed(2)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-border-subtle">
              {editingInvoiceId && (
                <button
                  onClick={cancelEditInvoice}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-hover text-text-secondary hover:bg-surface-hover text-[10px] font-black uppercase tracking-widest border border-border-medium transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel Edit
                </button>
              )}
              <button
                onClick={handleSaveInvoice}
                disabled={savingInvoice || invoiceItems.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingInvoice ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {savingInvoice ? "Saving..." : (editingInvoiceId ? "Update Invoice" : "Save Invoice")}
              </button>
              {!editingInvoiceId && (
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-hover text-text-secondary hover:bg-surface-hover text-[10px] font-black uppercase tracking-widest border border-border-medium transition-all">
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <PropertyHistoryTab
          workOrders={propertyHistoryData?.workOrders || []}
          currentWorkOrderId={id}
          onOpenPhotos={(photos, title) => {
            setPhotoPopupPhotos(photos);
            setPhotoPopupTitle(title);
            setPhotoPopupOpen(true);
          }}
        />
      )}

      {activeTab === "messages" && (
        <WorkOrderMessagesTab
          workOrderId={id}
          workOrderTitle={workOrder.title}
        />
      )}

      {/* All Photos Modal (Tasks / Bids / Inspection) */}
      {allPhotosModal.open && createPortal(
        <AllPhotosModal
          source={allPhotosModal.source}
          tasks={tasks}
          bids={bids}
          inspectionPhotos={[]}
          complianceItems={[]}
          customInspectionItems={customInspectionItems}
          onClose={() => setAllPhotosModal({ open: false, source: "tasks" })}
          onEditPhoto={(url, name, category, source, sourceId) => setEditorPhoto({ url, name, category, source, sourceId })}
          onDeletePhoto={handlePhotoDelete}
        />,
        document.body
      )}

      {/* Photo Popup Modal */}
      {photoPopupOpen && createPortal(
        <PhotoPopupModal
          photos={photoPopupPhotos}
          title={photoPopupTitle}
          onClose={() => setPhotoPopupOpen(false)}
          onEditPhoto={(url, name) => setEditorPhoto({ url, name, source: "global" })}
          onDeletePhoto={handlePhotoDelete}
        />,
        document.body
      )}

      {propertyFrontViewerOpen && propertyFrontPhotos[0] && createPortal(
        <PhotoLightbox
          photo={propertyFrontPhotos[0]}
          photos={propertyFrontPhotos.slice(0, 1)}
          selectedIndex={0}
          onClose={() => setPropertyFrontViewerOpen(false)}
        />,
        document.body
      )}

      {/* Quick View Modal */}
      {showQuickView && workOrder && createPortal(
        <WorkOrderQuickViewModal
          workOrder={workOrder}
          tasks={tasks}
          bids={bids}
          allPhotos={allPhotos}
          complianceItems={complianceItems}
          onClose={() => setShowQuickView(false)}
        />,
        document.body
      )}

      {/* Edit Work Order Modal */}
      {showEdit && workOrder && (
        <EditWorkOrderModal
          workOrder={workOrder}
          onClose={() => setShowEdit(false)}
          updateMutation={updateMutation}
        />
      )}

      {/* GPS Camera Modal */}
      {gpsCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center">
          <div className="w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">
                  GPS Camera — {gpsCameraCategory.charAt(0) + gpsCameraCategory.slice(1).toLowerCase()} Photo
                </span>
              </div>
              <button
                onClick={() => setGpsCameraOpen(false)}
                className="p-1.5 rounded-lg bg-surface-hover text-white hover:bg-surface-hover transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <GPSCamera
              onCapture={handleGPSCapture}
              onClose={() => setGpsCameraOpen(false)}
              multiCapture={gpsCameraMultiCapture}
              categoryLabel={gpsCameraCategory.charAt(0) + gpsCameraCategory.slice(1).toLowerCase()}
            />
          </div>
        </div>
      )}

      {/* Image Editor Modal — portaled to body to escape overflow/clipping */}
      {editorPhoto && createPortal(
        <Suspense fallback={
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
            <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
          </div>
        }>
          <ImageEditor
            imageUrl={editorPhoto.url}
            imageName={editorPhoto.name}
            onClose={() => setEditorPhoto(null)}
            onSave={async (blob: Blob) => {
              // Create a new file from the edited image
              const editedName = editorPhoto.name.replace(/\.[^.]+$/, "") + "-edited.png";
              const file = new File([blob], editedName, { type: "image/png" });
              try {
                const src = editorPhoto.source || "global";
                const srcId = editorPhoto.sourceId;
                const editedCategory =
                  editorPhoto.category ||
                  (src === "bid" ? "BID" : src === "inspection" ? "INSPECTION" : "AFTER");
                const result = await handlePhotoUpload(file, editedCategory);
                const newPhoto: PhotoItem = {
                  id: result.id,
                  url: result.url,
                  name: editedName,
                  size: blob.size,
                  category: editedCategory,
                  timestamp: new Date().toISOString(),
                  persisted: true,
                };
                // Route edited copy back to the correct bucket
                if (src === "task" && srcId) {
                  setTasks((prev) => prev.map((t) => t.id === srcId ? { ...t, photos: [...t.photos, newPhoto] } : t));
                } else if (src === "bid" && srcId) {
                  setBids((prev) => prev.map((b) => b.id === srcId ? { ...b, photos: [...(b.photos || []), newPhoto] } : b));
                } else if (src === "inspection") {
                  const customMatch = srcId?.match(/^custom-(\d+)$/);
                  if (customMatch) {
                    const index = parseInt(customMatch[1], 10);
                    setCustomInspectionItems((prev) =>
                      prev.map((item, itemIdx) =>
                        itemIdx === index ? { ...item, photos: [...(item.photos || []), newPhoto] } : item
                      )
                    );
                  } else {
                    setInspectionPhotos((prev) => [...prev, newPhoto]);
                  }
                } else {
                  setGlobalPhotos((prev) => [...prev, newPhoto]);
                }
                toast.success("Edited photo saved as new copy");
                setEditorPhoto(null);
              } catch (err) {
                toast.error("Failed to save edited photo");
              }
            }}
          />
        </Suspense>,
        document.body
      )}


    </div>
  );
}

// ─── Work Order Quick View Modal ──────────────────────────────────────────────

function WorkOrderQuickViewModal({
  workOrder,
  tasks,
  bids,
  allPhotos,
  complianceItems,
  onClose,
}: {
  workOrder: any;
  tasks: TaskEntry[];
  bids: BidEntry[];
  allPhotos: PhotoItem[];
  complianceItems: { label: string; description?: string; required: boolean; completed: boolean }[];
  onClose: () => void;
}) {
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalBids = bids.reduce((s, b) => s + b.amount, 0);
  const approvedBids = bids.filter((b) => b.status === "APPROVED").reduce((s, b) => s + b.amount, 0);
  const beforePhotos = allPhotos.filter((p) => p.category === "BEFORE");
  const duringPhotos = allPhotos.filter((p) => p.category === "DURING");
  const afterPhotos = allPhotos.filter((p) => p.category === "AFTER");

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 2147483600 }}>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-surface-hover flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <FileText className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20 uppercase tracking-widest">
                  WO-{workOrder.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}
                </span>
                <Badge className={cn("text-[9px] px-2 py-0.5", STATUS_COLORS[workOrder.status])}>
                  {STATUS_LABELS[workOrder.status]}
                </Badge>
              </div>
              <h2 className="text-lg font-black text-text-primary mt-1">{workOrder.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: MapPin, label: "Address", value: `${workOrder.address}${workOrder.city ? `, ${workOrder.city}` : ""}${workOrder.state ? `, ${workOrder.state}` : ""}` },
              { icon: Activity, label: "Service", value: SERVICE_TYPE_LABELS[workOrder.serviceType] },
              { icon: Calendar, label: "Due Date", value: workOrder.dueDate ? formatDate(workOrder.dueDate) : "No due date" },
              { icon: User, label: "Contractor", value: workOrder.contractor?.name || "Unassigned" },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface-hover border border-border-subtle">
                <div className="flex items-center gap-2 mb-1.5">
                  <item.icon className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest">{item.label}</span>
                </div>
                <p className="text-xs font-bold text-text-primary truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20">
              <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-1">Tasks</p>
              <p className="text-xl font-black text-text-primary">{completedTasks}<span className="text-xs text-text-dim">/{tasks.length}</span></p>
              <div className="h-1.5 bg-surface-hover rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
              <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Bids</p>
              <p className="text-xl font-black text-text-primary">${totalBids.toLocaleString()}</p>
              {approvedBids > 0 && <p className="text-[9px] text-emerald-400 font-bold mt-1">${approvedBids.toLocaleString()} approved</p>}
            </div>
            <div className="p-4 rounded-xl bg-violet-500/[0.04] border border-violet-500/20">
              <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Photos</p>
              <p className="text-xl font-black text-text-primary">{allPhotos.length}</p>
              <p className="text-[9px] text-text-muted mt-1">{beforePhotos.length}B · {duringPhotos.length}D · {afterPhotos.length}A</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Compliance</p>
              <p className="text-xl font-black text-text-primary">{complianceItems.filter(c => c.completed).length}<span className="text-xs text-text-dim">/{complianceItems.length}</span></p>
              <div className="h-1.5 bg-surface-hover rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${complianceItems.length > 0 ? (complianceItems.filter(c => c.completed).length / complianceItems.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>

          {/* Personnel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workOrder.coordinator && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border-subtle">
                <Avatar name={workOrder.coordinator.name} src={workOrder.coordinator.image} size="sm" />
                <div>
                  <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Coordinator</p>
                  <p className="text-xs font-bold text-text-primary">{workOrder.coordinator.name}</p>
                </div>
              </div>
            )}
            {workOrder.contractor && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border-subtle">
                <Avatar name={workOrder.contractor.name} src={workOrder.contractor.image} size="sm" />
                <div>
                  <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Contractor</p>
                  <p className="text-xs font-bold text-text-primary">{workOrder.contractor.name}</p>
                </div>
              </div>
            )}
            {workOrder.createdBy && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover border border-border-subtle">
                <Avatar name={workOrder.createdBy.name} src={workOrder.createdBy.image} size="sm" />
                <div>
                  <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">Client</p>
                  <p className="text-xs font-bold text-text-primary">{workOrder.createdBy.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {workOrder.description && (
            <div className="p-4 rounded-xl bg-surface-hover border border-border-subtle">
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest mb-2">Project Scope</p>
              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{workOrder.description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()}</p>
            </div>
          )}

          {/* Access Codes */}
          {(workOrder.lockCode || workOrder.gateCode || workOrder.keyCode) && (
            <div className="grid grid-cols-3 gap-3">
              {workOrder.lockCode && (
                <div className="p-3 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20">
                  <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest mb-1">Lock Code</p>
                  <p className="text-sm font-mono font-bold text-text-primary">{workOrder.lockCode}</p>
                </div>
              )}
              {workOrder.gateCode && (
                <div className="p-3 rounded-xl bg-violet-500/[0.04] border border-violet-500/20">
                  <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mb-1">Gate Code</p>
                  <p className="text-sm font-mono font-bold text-text-primary">{workOrder.gateCode}</p>
                </div>
              )}
              {workOrder.keyCode && (
                <div className="p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Key Code</p>
                  <p className="text-sm font-mono font-bold text-text-primary">{workOrder.keyCode}</p>
                </div>
              )}
            </div>
          )}

          {/* Tasks List */}
          {tasks.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Tasks ({completedTasks}/{tasks.length})</h4>
              <div className="space-y-1.5">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-hover border border-border-subtle">
                    {task.completed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-border-medium flex-shrink-0" />
                    )}
                    <span className={cn("text-xs", task.completed ? "text-text-muted line-through" : "text-text-secondary")}>
                      {task.title}
                    </span>
                    {task.photos.length > 0 && (
                      <span className="ml-auto text-[9px] text-text-dim">{task.photos.length}📷</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bids List */}
          {bids.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Bids ({bids.length})</h4>
              <div className="space-y-1.5">
                {bids.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover border border-border-subtle">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                      <div>
                        <p className="text-xs font-bold text-text-primary">{bid.title}</p>
                        {bid.description && <p className="text-[10px] text-text-muted truncate max-w-[200px]">{bid.description}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-amber-400">${bid.amount.toLocaleString()}</p>
                      <span className={cn("text-[8px] font-bold uppercase tracking-widest", bid.status === "APPROVED" ? "text-emerald-400" : bid.status === "REJECTED" ? "text-rose-400" : "text-text-muted")}>
                        {bid.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Checklist */}
          {complianceItems.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Compliance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {complianceItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-hover border border-border-subtle">
                    <div className={cn("h-4 w-4 rounded-full flex items-center justify-center border", item.completed ? "bg-emerald-500 border-emerald-500" : "border-border-medium")}>
                      {item.completed && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className={cn("text-xs", item.completed ? "text-text-muted" : "text-text-secondary")}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {workOrder.specialInstructions && (
            <div className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
              <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-2">Special Instructions</p>
              <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed italic">
                &quot;{workOrder.specialInstructions.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()}&quot;
              </p>
            </div>
          )}

          {/* Invoices */}
          {workOrder.invoices && workOrder.invoices.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Invoices ({workOrder.invoices.length})</h4>
              <div className="space-y-1.5">
                {workOrder.invoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-hover border border-border-subtle">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-text-primary">{inv.invoiceNumber}</p>
                        <p className="text-[10px] text-text-muted">{inv.items?.length || 0} items</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-400">${(inv.total || 0).toFixed(2)}</p>
                      <span className="text-[8px] font-bold text-text-muted uppercase">{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-subtle bg-surface-hover flex justify-between items-center flex-shrink-0">
          <p className="text-[10px] text-text-dim">Created {formatDateTime(workOrder.createdAt)}</p>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/work-orders/${workOrder.id}`}
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-widest border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
            >
              Open Full Page
            </Link>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Work Order Messages Tab ─────────────────────────────────────────────────

function WorkOrderMessagesTab({
  workOrderId,
  workOrderTitle,
}: {
  workOrderId: string;
  workOrderTitle: string;
}) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const qc = useQueryClient();
  const { data: channelsData } = useChatChannels();
  const createChannel = useCreateChatChannel();
  const [newMessage, setNewMessage] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find the chat channel specifically for this work order
  const channels = channelsData?.channels || [];
  const workOrderChannel = channels.find(
    (c: any) =>
      c.type === "WORK_ORDERS" &&
      (c.name?.includes(workOrderId) ||
        c.description?.includes(workOrderId) ||
        c.name?.toLowerCase().includes(workOrderId.slice(-8).toLowerCase()))
  );

  // Auto-create a WORK_ORDERS channel if none exists
  useEffect(() => {
    if (channelsData && !workOrderChannel && !creatingChannel) {
      setCreatingChannel(true);
      const shortId = workOrderId.slice(-8).toUpperCase();
      createChannel.mutate(
        {
          name: `WO-${shortId}`,
          description: `Work order channel for ${workOrderTitle} (${workOrderId})`,
          type: "WORK_ORDERS",
        },
        {
          onSuccess: () => setCreatingChannel(false),
          onError: () => setCreatingChannel(false),
        }
      );
    }
  }, [channelsData, workOrderChannel, creatingChannel, workOrderId, workOrderTitle, createChannel]);

  // Fetch messages for this specific channel only
  const channelId = workOrderChannel?.id || "";
  const { data: messagesData, isLoading } = useChatMessages(channelId);
  const channelMessages = messagesData?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !channelId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setNewMessage("");
      qc.invalidateQueries({ queryKey: ["chat-messages", channelId] });
      qc.invalidateQueries({ queryKey: ["chat-channels"] });
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-surface/60 backdrop-blur-xl rounded-3xl border border-border-subtle overflow-hidden shadow-2xl flex flex-col h-[600px]">
      {/* Channel header */}
      <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-hover">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <MessageSquare className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">{workOrderChannel?.name || `WO-${workOrderId.slice(-8).toUpperCase()}`}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">
                {channelMessages.length} Operational Message{channelMessages.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        <Link
          href={`/dashboard/chat`}
          className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all text-[10px] font-black uppercase tracking-widest border border-cyan-500/20 shadow-lg shadow-cyan-500/5"
        >
          <MessageSquare className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
          Full Channel
        </Link>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/[0.06] scrollbar-track-transparent">
        {isLoading || creatingChannel ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mb-3" />
            <p className="text-xs font-black text-text-muted uppercase tracking-widest">
              {creatingChannel ? "Creating channel..." : "Synchronizing..."}
            </p>
          </div>
        ) : channelMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <div className="h-20 w-20 bg-surface-hover rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-text-muted" />
            </div>
            <p className="text-sm font-black text-text-muted uppercase tracking-widest">No Communication Found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {channelMessages.map((msg: any, idx: number) => {
              const isOwn = msg.authorId === userId;
              const prevMsg = channelMessages[idx - 1];
              const showAvatar = !isOwn && (!prevMsg || prevMsg.authorId !== msg.authorId);
              
              return (
                <div key={msg.id} className={cn("flex gap-3", isOwn ? "flex-row-reverse" : "flex-row")}>
                  {!isOwn && (
                    <div className="w-8 flex-shrink-0 flex items-end">
                      {showAvatar ? (
                        <Avatar src={msg.author?.image} name={msg.author?.name} size="sm" className="ring-2 ring-white/[0.05] border border-border-medium" />
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  )}
                  <div className={cn("max-w-[80%] space-y-1", isOwn ? "items-end" : "items-start")}>
                    {showAvatar && (
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1 mb-1">{msg.author?.name}</p>
                    )}
                    <div
                      className={cn(
                        "px-4 py-3 rounded-2xl text-sm shadow-xl transition-all hover:scale-[1.01]",
                        isOwn
                          ? "bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-tr-sm border border-cyan-400/20"
                          : "bg-surface-hover backdrop-blur-md text-text-primary rounded-tl-sm border border-border-subtle"
                      )}
                    >
                      <p className="leading-relaxed font-medium">{msg.content}</p>
                    </div>
                    <p className={cn("text-[9px] font-black text-text-dim uppercase tracking-tighter mt-1 px-1", isOwn ? "text-right" : "text-left")}>
                      {formatRelativeTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input section */}
      <div className="p-6 bg-surface-hover border-t border-border-subtle">
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <div className="flex-1 relative group">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Transmit message to field staff..."
              rows={1}
              className="w-full px-5 py-4 bg-surface/60 border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:bg-surface-hover transition-all resize-none shadow-inner"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <div className="absolute inset-0 rounded-2xl border border-cyan-500/20 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity" />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || !channelId || sending}
            className="h-[52px] w-[52px] rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Property History Tab ─────────────────────────────────────────────────────

function PropertyHistoryTab({
  workOrders,
  currentWorkOrderId,
  onOpenPhotos,
}: {
  workOrders: any[];
  currentWorkOrderId: string;
  onOpenPhotos: (photos: any[], title: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [bidSearch, setBidSearch] = useState("");

  if (workOrders.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-text-dim mx-auto mb-3" />
          <p className="text-text-secondary font-medium">No property history</p>
          <p className="text-sm text-text-dim mt-1">No other work orders found for this property</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assets", value: workOrders.length, icon: FileText, color: "text-text-secondary", bg: "bg-surface-hover" },
          { label: "Resolved", value: workOrders.filter((wo: any) => wo.status === "COMPLETED" || wo.status === "CLOSED").length, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Visual Documentation", value: workOrders.reduce((sum: number, wo: any) => sum + (wo.files?.length || 0), 0), icon: Camera, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          { 
            label: "Total Valuation", 
            value: `$${workOrders.reduce((sum: number, wo: any) => {
              const bids = (wo.metadata?.bids as any[]) || [];
              return sum + bids.reduce((s: number, b: any) => s + (b.amount || 0), 0);
            }, 0).toLocaleString()}`, 
            icon: DollarSign, 
            color: "text-amber-400", 
            bg: "bg-amber-500/10" 
          }
        ].map((stat, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl bg-surface/60 backdrop-blur-md border border-border-subtle p-5 transition-all hover:border-border-subtle">
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{stat.label}</p>
            <p className={cn("text-xl font-black mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Historical Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Operational Timeline</h4>
        </div>

        <div className="space-y-3">
          {workOrders.map((wo: any) => {
            const isCurrent = wo.id === currentWorkOrderId;
            const isExpanded = expandedId === wo.id;
            const tasks = (wo.tasks as any[]) || [];
            const completedTasks = tasks.filter((t: any) => t.completed).length;
            const files = wo.files || [];
            const bids = (wo.metadata?.bids as any[]) || [];
            const totalBidAmount = bids.reduce((s: number, b: any) => s + (b.amount || 0), 0);
            const woNumber = wo.id.slice(-8).toUpperCase();

            return (
              <div 
                key={wo.id} 
                className={cn(
                  "group overflow-hidden rounded-2xl border transition-all duration-300",
                  isCurrent 
                    ? "bg-cyan-500/[0.03] border-cyan-500/30 shadow-[0_0_20px_-5px_rgba(6,182,212,0.1)]" 
                    : "bg-surface/60 backdrop-blur-md border-border-subtle hover:border-border-subtle"
                )}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : wo.id)}
                  className="w-full flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5 text-left"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center border transition-colors",
                      wo.status === "COMPLETED" || wo.status === "CLOSED" 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                        : wo.status === "IN_PROGRESS" 
                          ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 animate-pulse" 
                          : "bg-slate-500/10 border-slate-500/20 text-text-secondary"
                    )}>
                      {wo.status === "COMPLETED" || wo.status === "CLOSED" ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-tighter">#{woNumber}</span>
                        <h4 className="text-sm font-bold text-text-primary truncate">{wo.title}</h4>
                        {isCurrent && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">Active</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">{SERVICE_TYPE_LABELS[wo.serviceType]}</span>
                        <span className="h-1 w-1 rounded-full bg-surface-hover" />
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter truncate max-w-[200px]">{wo.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-4 sm:pt-0 border-t sm:border-0 border-border-subtle">
                    <div className="flex items-center gap-4">
                      {tasks.length > 0 && (
                        <div className="text-center">
                          <p className="text-[9px] font-black text-text-dim uppercase tracking-widest leading-none mb-1">Tasks</p>
                          <p className="text-xs font-bold text-text-secondary">{completedTasks}/{tasks.length}</p>
                        </div>
                      )}
                      {totalBidAmount > 0 && (
                        <div className="text-center">
                          <p className="text-[9px] font-black text-text-dim uppercase tracking-widest leading-none mb-1">Value</p>
                          <p className="text-xs font-bold text-amber-400">${totalBidAmount.toLocaleString()}</p>
                        </div>
                      )}
                      {files.length > 0 && (
                        <div className="text-center">
                          <p className="text-[9px] font-black text-text-dim uppercase tracking-widest leading-none mb-1">Visuals</p>
                          <p className="text-xs font-bold text-cyan-400">{files.length}</p>
                        </div>
                      )}
                    </div>
                    <div className={cn("p-2 rounded-xl bg-surface-hover transition-transform", isExpanded && "rotate-180")}>
                      <ChevronDown className="h-4 w-4 text-text-muted" />
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 space-y-6 bg-surface-hover border-t border-border-subtle">
                    {/* Enhanced Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">Protocol</p>
                        <p className="text-sm font-bold text-text-primary">{SERVICE_TYPE_LABELS[wo.serviceType]}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">Initiated</p>
                        <p className="text-sm font-bold text-text-primary">{formatDate(wo.createdAt)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-text-dim uppercase tracking-widest">Resolved</p>
                        <p className="text-sm font-bold text-emerald-400">{wo.completedAt ? formatDate(wo.completedAt) : "Ongoing"}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        {!isCurrent && (
                          <Link
                            href={`/dashboard/work-orders/${wo.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Access Full Report →
                          </Link>
                        )}
                      </div>
                    </div>

                    {wo.description && (
                      <div className="p-4 rounded-2xl bg-surface-hover border border-border-subtle">
                        <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">Scope Summary</p>
                        <p className="text-sm text-text-secondary leading-relaxed italic">{wo.description}</p>
                      </div>
                    )}

                    {/* Compact Section for Tasks/Bids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {tasks.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Task Execution</h5>
                            <span className="text-[10px] font-bold text-emerald-400">{Math.round((completedTasks/tasks.length)*100)}% Match</span>
                          </div>
                          <div className="space-y-1.5 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.06]">
                            {tasks.map((task: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-hover border border-border-subtle">
                                {task.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <div className="h-3.5 w-3.5 rounded-full border border-border-medium" />}
                                <span className={cn("text-xs font-medium", task.completed ? "text-text-muted line-through" : "text-text-secondary")}>{task.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {files.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Captured Assets ({files.length})</h5>
                          <div className="grid grid-cols-4 gap-2">
                            {files.filter((f: any) => f.mimeType?.startsWith("image/")).slice(0, 8).map((f: any) => (
                              <div key={f.id} className="aspect-square rounded-xl overflow-hidden bg-surface border border-border-medium shadow-lg group/img">
                                <img src={f.path} alt="Historical Documentation" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── All Photos Modal ────────────────────────────────────────────────────────

function AllPhotosModal({
  source,
  tasks,
  bids,
  inspectionPhotos,
  complianceItems,
  customInspectionItems,
  onClose,
  onEditPhoto,
  onDeletePhoto,
}: {
  source: "tasks" | "bids" | "inspection" | "all";
  tasks: any[];
  bids: any[];
  inspectionPhotos: any[];
  complianceItems: any[];
  customInspectionItems: any[];
  onClose: () => void;
  onEditPhoto?: (url: string, name: string, category?: PhotoCategory, source?: "global" | "task" | "bid" | "inspection", sourceId?: string) => void;
  onDeletePhoto?: (id: string) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [downloadMode, setDownloadMode] = useState<"none" | "date" | "datetime" | "datetimeExif" | "custom">("datetime");
  const [customDownloadDateTime, setCustomDownloadDateTime] = useState("");
  const [downloadingPhotos, setDownloadingPhotos] = useState(false);

  // Track which task/bid each photo belongs to
  const photoSourceMap = useRef(new Map<string, { source: "task" | "bid" | "inspection"; sourceId?: string }>());

  // Collect photos based on source
  let sections: { label: string; photos: any[] }[] = [];

  if (source === "tasks" || source === "all") {
    sections = tasks
      .filter((t) => t.photos?.length > 0)
      .map((t) => {
        t.photos.forEach((p: any) => photoSourceMap.current.set(p.id, { source: "task", sourceId: t.id }));
        return { label: t.title, photos: t.photos };
      });
  }

  if (source === "bids" || source === "all") {
    const bidSections = bids
      .filter((b) => b.photos?.length > 0)
      .map((b) => {
        b.photos.forEach((p: any) => photoSourceMap.current.set(p.id, { source: "bid", sourceId: b.id }));
        return { label: `${b.title} - $${b.amount.toLocaleString()}`, photos: b.photos };
      });
    sections = source === "all" ? [...sections, ...bidSections] : bidSections;
  }

  if (source === "inspection" || source === "all") {
    const inspectionSections: { label: string; photos: any[] }[] = [];
    inspectionPhotos.forEach((p: any) => {
      const match = p.name?.match(/^compliance-(\d+)-/);
      if (match) {
        const idx = parseInt(match[1]);
        const label = complianceItems[idx]?.label || `Compliance ${idx + 1}`;
        const existing = inspectionSections.find((s) => s.label === label);
        if (existing) existing.photos.push(p);
        else inspectionSections.push({ label, photos: [p] });
      }
    });
    inspectionPhotos.forEach((p: any) => {
      const match = p.name?.match(/^(compliance-\d+)-/);
      photoSourceMap.current.set(p.id, { source: "inspection", sourceId: match?.[1] });
    });
    customInspectionItems.forEach((item: any, i: number) => {
      if (item.photos?.length > 0) {
        item.photos.forEach((p: any) => photoSourceMap.current.set(p.id, { source: "inspection", sourceId: `custom-${i}` }));
        inspectionSections.push({ label: item.label, photos: item.photos });
      }
    });
    if (inspectionSections.length === 0 && inspectionPhotos.length > 0) {
      inspectionSections.push({ label: "Inspection Photos", photos: inspectionPhotos });
    }
    sections = source === "all" ? [...sections, ...inspectionSections] : inspectionSections;
  }
  const allPhotos = sections.flatMap((s) => s.photos);
  const totalPhotos = allPhotos.length;

  // Category filter for task/bid/inspection photo sets
  const categories =
    source === "tasks"
      ? ["ALL", "BEFORE", "DURING", "AFTER"]
      : source === "all"
      ? ["ALL", "BEFORE", "DURING", "AFTER", "BID", "INSPECTION"]
      : ["ALL"];
  const filteredSections =
    filter === "ALL"
      ? sections
      : sections
          .map((s) => ({
            ...s,
            photos: s.photos.filter((p: any) => p.category === filter),
          }))
          .filter((s) => s.photos.length > 0);

  const filteredTotal = filteredSections.reduce((s, sec) => s + sec.photos.length, 0);
  const activeLightboxSection =
    selectedSectionIndex !== null ? filteredSections[selectedSectionIndex] : null;
  const activeLightboxPhotos = activeLightboxSection?.photos || [];
  const selectedPhoto = selectedIndex !== null ? activeLightboxPhotos[selectedIndex] : null;
  const allVisiblePhotoEntries = filteredSections.flatMap((section, sectionIndex) =>
    section.photos.map((photo: any, photoIndex: number) => ({ photo, section, sectionIndex, photoIndex }))
  );
  const getPhotoKey = (photo: any, fallback: string) => String(photo.id || photo.url || photo.path || fallback);
  const selectedEntries = allVisiblePhotoEntries.filter((entry) =>
    selectedPhotoIds.has(getPhotoKey(entry.photo, `${entry.sectionIndex}-${entry.photoIndex}`))
  );

  function togglePhotoSelection(photo: any, fallback: string) {
    const key = getPhotoKey(photo, fallback);
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function safeFileName(value: string) {
    return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "photo";
  }

  function getPhotoDate(photo: any) {
    const raw = downloadMode === "custom" ? customDownloadDateTime : photo.timestamp || photo.createdAt || photo.updatedAt || photo.date;
    const parsed = raw ? new Date(raw) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function getStampText(photo: any, mode: typeof downloadMode) {
    const date = getPhotoDate(photo);
    if (mode === "date") return date.toLocaleDateString();
    if (mode === "datetime" || mode === "custom") return date.toLocaleString();
    const exifParts = [
      photo.category ? `Category: ${photo.category}` : null,
      photo.latitude && photo.longitude ? `GPS: ${photo.latitude}, ${photo.longitude}` : null,
      photo.camera ? `Camera: ${photo.camera}` : null,
      photo.uploader?.name ? `Uploader: ${photo.uploader.name}` : null,
    ].filter(Boolean);
    return `${date.toLocaleString()}${exifParts.length ? ` | ${exifParts.join(" | ")}` : " | EXIF data unavailable"}`;
  }

  async function loadDownloadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function clickDownload(href: string, fileName: string) {
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function getOriginalFile(src: string, fileName: string): Promise<ZipFileInput> {
    const response = await fetch(src, { cache: "no-store" });
    if (!response.ok) throw new Error("Photo fetch failed");
    return { name: fileName, blob: await response.blob() };
  }

  async function getDownloadFile(photo: any, sectionLabel: string, mode: typeof downloadMode): Promise<ZipFileInput | null> {
    const src = photo.url || photo.path;
    const baseName = safeFileName(`${sectionLabel}-${photo.name || photo.originalName || "photo"}`);
    if (!src) return null;

    if (mode === "none") {
      return getOriginalFile(src, `${baseName}.jpg`);
    }

    try {
      const img = await loadDownloadImage(src);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.drawImage(img, 0, 0);
      const text = getStampText(photo, mode);
      const fontSize = Math.max(18, Math.floor(canvas.width / 42));
      const pad = Math.max(14, Math.floor(fontSize * 0.75));
      const lineHeight = Math.floor(fontSize * 1.35);
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
      ctx.fillRect(0, canvas.height - lineHeight - pad, canvas.width, lineHeight + pad);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, pad, canvas.height - pad);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Photo export failed");
      return { name: `${baseName}-${mode}.jpg`, blob };
    } catch {
      return getOriginalFile(src, `${baseName}.jpg`);
    }
  }

  async function downloadPhoto(photo: any, sectionLabel: string, mode: typeof downloadMode) {
    const file = await getDownloadFile(photo, sectionLabel, mode);
    if (!file) return;
    const href = URL.createObjectURL(file.blob);
    clickDownload(href, file.name);
    URL.revokeObjectURL(href);
  }

  async function downloadEntries(entries: typeof allVisiblePhotoEntries) {
    if (entries.length === 0) return;
    setDownloadingPhotos(true);
    try {
      const files: ZipFileInput[] = [];
      for (const entry of entries) {
        const file = await getDownloadFile(entry.photo, entry.section.label, downloadMode);
        if (file) files.push(file);
      }
      if (files.length > 0) {
        const zip = await createStoredZip(files);
        const href = URL.createObjectURL(zip);
        clickDownload(href, `${source}-photos-${new Date().toISOString().slice(0, 10)}.zip`);
        URL.revokeObjectURL(href);
      }
    } finally {
      setDownloadingPhotos(false);
    }
  }

  const goPrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
  }, [selectedIndex]);

  const goNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < activeLightboxPhotos.length - 1) setSelectedIndex(selectedIndex + 1);
  }, [selectedIndex, activeLightboxPhotos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") setSelectedIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, goPrev, goNext]);

  const titleMap = {
    tasks: "All Task Photos",
    bids: "All Bid Photos",
    inspection: "All Inspection Photos",
    all: "All Photos",
  };
  const colorMap = {
    tasks: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
    bids: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
    inspection: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
    all: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20" },
  };
  const colors = colorMap[source];

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 2147483600 }}>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[90vh] mx-4 bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-3 px-6 py-4 border-b border-border-subtle flex-shrink-0 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colors.bg)}>
              <Camera className={cn("h-5 w-5", colors.text)} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">{titleMap[source]}</h2>
              <p className="text-xs text-text-muted">
                {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""} across {sections.length} item{sections.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(source === "tasks" || source === "all") && (
              <div className="flex items-center gap-1 mr-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all",
                      filter === cat
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : "bg-surface-hover text-text-muted border-border-subtle hover:bg-surface-hover"
                    )}
                  >
                    {cat === "ALL" ? "All" : cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            )}
            <select
              value={downloadMode}
              onChange={(e) => setDownloadMode(e.target.value as typeof downloadMode)}
              className="h-8 rounded-lg border border-border-subtle bg-surface-hover px-2 text-xs text-text-primary outline-none"
              title="Download stamp option"
            >
              <option value="datetime">With date & time stamp</option>
              <option value="date">With date only stamp</option>
              <option value="datetimeExif">With date, time & EXIF data</option>
              <option value="custom">Custom date & time stamp</option>
              <option value="none">Without date/time stamp</option>
            </select>
            {downloadMode === "custom" && (
              <input
                type="datetime-local"
                value={customDownloadDateTime}
                onChange={(e) => setCustomDownloadDateTime(e.target.value)}
                className="h-8 rounded-lg border border-border-subtle bg-surface-hover px-2 text-xs text-text-primary outline-none"
                title="Custom stamp date and time"
              />
            )}
            <button
              onClick={() => {
                setSelectionMode((prev) => !prev);
                setSelectedPhotoIds(new Set());
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                selectionMode
                  ? `${colors.bg} ${colors.text} ${colors.border}`
                  : "border-border-subtle bg-surface-hover text-text-secondary hover:bg-surface-hover"
              )}
            >
              Select photos
            </button>
            <button
              onClick={() => downloadEntries(selectedEntries)}
              disabled={selectedEntries.length === 0 || downloadingPhotos}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-hover px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Download selected
            </button>
            <button
              onClick={() => downloadEntries(allVisiblePhotoEntries)}
              disabled={allVisiblePhotoEntries.length === 0 || downloadingPhotos}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-hover px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Download all photos
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Photo sections */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {filteredSections.length === 0 ? (
            <div className="text-center py-16">
              <Camera className="h-12 w-12 text-text-dim mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No photos found</p>
              <p className="text-sm text-text-dim mt-1">
                {filter !== "ALL" ? `No ${filter.toLowerCase()} photos in ${source}` : `No photos uploaded for ${source} yet`}
              </p>
            </div>
          ) : (
            filteredSections.map((section, idx) => (
              <div key={idx}>
                {/* Section label */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("h-6 w-6 rounded-md flex items-center justify-center text-[11px] font-bold", colors.bg, colors.text)}>
                    {idx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSectionIndex(idx);
                      setSelectedIndex(0);
                    }}
                    className="text-left text-sm font-semibold text-text-primary hover:text-white transition-colors"
                    title="Open this item photo set"
                  >
                    {section.label}
                  </button>
                  <span className="text-[10px] text-text-muted">
                    {section.photos.length} photo{section.photos.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Photo grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {section.photos.map((photo: any, pIdx: number) => (
                    <button
                      key={photo.id || pIdx}
                      type="button"
                      onClick={() => {
                        if (selectionMode) {
                          togglePhotoSelection(photo, `${idx}-${pIdx}`);
                          return;
                        }
                        setSelectedSectionIndex(idx);
                        setSelectedIndex(pIdx);
                      }}
                      className="relative group rounded-xl overflow-hidden aspect-square bg-surface-hover border border-border-subtle hover:border-border-subtle transition-all"
                    >
                      <img
                        src={photo.url || photo.path}
                        alt={photo.name || photo.originalName || "Photo"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {selectionMode && (
                        <div
                          className={cn(
                            "absolute right-1.5 top-1.5 h-5 w-5 rounded-md border flex items-center justify-center text-[10px] font-bold",
                            selectedPhotoIds.has(getPhotoKey(photo, `${idx}-${pIdx}`))
                              ? "border-cyan-400 bg-cyan-500 text-white"
                              : "border-white/50 bg-black/50 text-transparent"
                          )}
                        >
                          ok
                        </div>
                      )}
                      {photo.category && (
                        <div className="absolute top-1.5 left-1.5">
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded",
                              photo.category === "BEFORE" && "bg-amber-500/80 text-white",
                              photo.category === "DURING" && "bg-cyan-500/80 text-white",
                              photo.category === "AFTER" && "bg-emerald-500/80 text-white",
                              photo.category === "BID" && "bg-rose-500/80 text-white",
                              photo.category === "INSPECTION" && "bg-violet-500/80 text-white"
                            )}
                          >
                            {photo.category}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border-subtle bg-surface-hover flex-shrink-0">
          <span className="text-xs text-text-muted">
            Showing {filteredTotal} of {totalPhotos} photos
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Lightbox for selected photo */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={activeLightboxPhotos}
          selectedIndex={selectedIndex!}
          onPrev={goPrev}
          onNext={goNext}
          onClose={() => setSelectedIndex(null)}
          onEditPhoto={(url, name, category, src, srcId) => {
            if (!onEditPhoto) return;
            const srcInfo = photoSourceMap.current.get(selectedPhoto.id);
            const fallbackSource = source === "tasks" ? "task" : source === "bids" ? "bid" : "inspection";
            onEditPhoto(
              url,
              name,
              category,
              srcInfo?.source || fallbackSource,
              srcInfo?.sourceId
            );
          }}
          onDeletePhoto={(id) => {
            if (onDeletePhoto) {
              onDeletePhoto(id);
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Photo Popup Modal ───────────────────────────────────────────────────────

function PhotoPopupModal({
  photos,
  title,
  onClose,
  onEditPhoto,
  onDeletePhoto,
}: {
  photos: any[];
  title: string;
  onClose: () => void;
  onEditPhoto?: (url: string, name: string, category?: PhotoCategory, source?: "global" | "task" | "bid" | "inspection", sourceId?: string) => void;
  onDeletePhoto?: (id: string) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  const goPrev = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
  }, [selectedIndex]);

  const goNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) setSelectedIndex(selectedIndex + 1);
  }, [selectedIndex, photos.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") setSelectedIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, goPrev, goNext]);

  return (
    <>
      {/* Grid popup */}
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 2147483600 }}>
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />
        <div className="relative w-full max-w-4xl max-h-[85vh] mx-4 bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-text-primary">{title}</h2>
              <p className="text-xs text-text-muted mt-0.5">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Photo grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo: any, idx: number) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedIndex(idx)}
                  className="relative group rounded-xl overflow-hidden aspect-square bg-surface-hover border border-border-subtle hover:border-border-subtle transition-all"
                >
                  <img
                    src={photo.path || photo.url}
                    alt={photo.originalName || photo.name || "Photo"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-[10px] text-white truncate">
                      {photo.originalName || photo.name || "Photo"}
                    </p>
                    {photo.category && (
                      <span
                        className={cn(
                          "text-[9px] font-medium px-1 py-0.5 rounded mt-0.5 inline-block",
                          photo.category === "BEFORE"
                            ? "bg-amber-500/20 text-amber-300"
                            : photo.category === "DURING"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        )}
                      >
                        {photo.category}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for selected photo */}
      {selectedPhoto && (
        <PhotoLightbox
          photo={selectedPhoto}
          photos={photos}
          selectedIndex={selectedIndex!}
          onPrev={goPrev}
          onNext={goNext}
          onClose={() => setSelectedIndex(null)}
          onEditPhoto={onEditPhoto}
          onDeletePhoto={onDeletePhoto}
        />
      )}
    </>
  );
}

function PhotoLightbox({ photo, photos, selectedIndex, onPrev, onNext, onClose, onEditPhoto, onDeletePhoto }: {
  photo: any;
  photos?: any[];
  selectedIndex?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  onEditPhoto?: (url: string, name: string, category?: PhotoCategory, source?: "global" | "task" | "bid" | "inspection", sourceId?: string) => void;
  onDeletePhoto?: (id: string) => void;
}) {
  const [showExif, setShowExif] = useState(false);
  const [exifData, setExifData] = useState<any>(null);
  const [exifLoading, setExifLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  async function loadExif() {
    setExifLoading(true);
    try {
      const { readEXIF, reverseGeocode } = await import("@/lib/exif");
      const res = await fetch(photo.path || photo.url);
      const buffer = await res.arrayBuffer();
      const exif = readEXIF(buffer);
      if (exif.gps) {
        const addr = await reverseGeocode(exif.gps.latitude, exif.gps.longitude);
        exif.address = addr ?? undefined;
      }
      setExifData(exif);
    } catch (err) {
      console.warn("EXIF read failed:", err);
    }
    setExifLoading(false);
  }

  async function downloadOriginal() {
    setDownloading(true);
    try {
      const response = await fetch(photo.path || photo.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.originalName || photo.name || "photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
    setDownloading(false);
  }

  async function downloadWithTimestamp() {
    if (!imgRef.current) return;
    setDownloading(true);
    try {
      const { generatePhotoWithOverlay, DEFAULT_OVERLAY_OPTIONS } = await import("@/lib/exif");
      const canvas = generatePhotoWithOverlay(
        imgRef.current,
        {
          dateTime: exifData?.dateTime ? new Date(exifData.dateTime.replace(/(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")) : photo.createdAt ? new Date(photo.createdAt) : new Date(),
          gps: exifData?.gps || undefined,
          address: exifData?.address || undefined,
        },
        DEFAULT_OVERLAY_OPTIONS
      );
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (photo.originalName?.replace(/\.[^.]+$/, "") || "photo") + "-timestamped.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download with overlay failed:", err);
      downloadOriginal(); // Fallback
    }
    setDownloading(false);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      style={{ zIndex: 2147483647 }}
      onClick={onClose}
    >
      <div className="relative flex h-full w-full max-w-6xl gap-4 items-center justify-center overflow-hidden">
        {/* Prev button */}
        {onPrev && selectedIndex !== undefined && selectedIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface-hover text-white hover:bg-surface-hover transition-colors z-10"
            title="Previous (←)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div 
          className="flex-1 flex items-center justify-center min-h-0 min-w-0"
          onClick={(e) => {
            if (zoom > 1) {
              setZoom(1);
            }
          }}
        >
          <img
            ref={imgRef}
            src={photo.path || photo.url}
            alt={photo.originalName || photo.name || "Photo"}
            className={cn(
              "rounded-xl object-contain transition-all duration-300 shadow-2xl",
              zoom === 1 ? "max-w-[calc(100vw-96px)] max-h-[calc(100vh-140px)] cursor-zoom-in" : "max-w-none max-h-none cursor-zoom-out"
            )}
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
            crossOrigin="anonymous"
            onClick={(e) => {
              e.stopPropagation();
              if (zoom === 1) setZoom(2);
              else if (zoom === 2) setZoom(3);
              else setZoom(1);
            }}
          />
        </div>

        {/* Next button */}
        {onNext && photos && selectedIndex !== undefined && selectedIndex < photos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface-hover text-white hover:bg-surface-hover transition-colors z-10"
            title="Next (→)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
        {/* Zoom controls */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-border-subtle z-50">
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(Math.max(1, zoom - 0.5)); }}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-white transition-all disabled:opacity-30"
            disabled={zoom <= 1}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="text-[10px] font-black text-white w-10 text-center uppercase tracking-widest">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(Math.min(4, zoom + 0.5)); }}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-white transition-all disabled:opacity-30"
            disabled={zoom >= 4}
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-surface-hover mx-1" />
          <button
            onClick={(e) => { e.stopPropagation(); setZoom(1); }}
            className="px-2 py-1 rounded-lg hover:bg-surface-hover text-[10px] font-bold text-cyan-400 uppercase tracking-tighter"
          >
            Reset
          </button>
        </div>

        {/* Top-right buttons */}
        <div className="absolute top-4 right-4 flex gap-2 z-50">
          <button
            onClick={(e) => { e.stopPropagation(); downloadOriginal(); }}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all text-xs font-bold disabled:opacity-40 shadow-lg shadow-cyan-500/5"
            title="Download original"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline uppercase tracking-wider">Original</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); downloadWithTimestamp(); }}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 transition-all text-xs font-bold disabled:opacity-40 shadow-lg shadow-violet-500/5"
            title="Download with timestamp overlay"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden lg:inline uppercase tracking-wider">Timestamp</span>
          </button>
          
          <div className="w-px h-8 bg-surface-hover mx-1" />

          {onEditPhoto && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditPhoto(photo.path || photo.url, photo.originalName || photo.name || "photo.jpg"); }}
              className="p-2.5 rounded-xl bg-surface-hover text-white hover:bg-surface-hover border border-border-medium transition-all shadow-lg"
              title="Edit in editor"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              if (confirm("Are you sure you want to delete this photo?")) {
                onDeletePhoto?.(photo.id);
                onClose();
              }
            }}
            className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all shadow-lg"
            title="Delete photo"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setShowExif(!showExif); if (!exifData) loadExif(); }}
            className={cn("p-2.5 rounded-xl border transition-all shadow-lg", showExif ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-surface-hover text-white hover:bg-surface-hover border-border-medium")}
            title="Photo information"
          >
            <Info className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-surface-hover text-white hover:bg-surface-hover border border-border-medium transition-all shadow-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-white">
              {photo.originalName || photo.name || "Photo"}
            </p>
            {photo.createdAt && (
              <p className="text-xs text-text-secondary mt-0.5">
                {formatDateTime(photo.createdAt)}
              </p>
            )}
          </div>
          {photos && selectedIndex !== undefined && (
            <span className="text-xs text-text-secondary bg-black/40 px-2 py-1 rounded-lg">
              {selectedIndex + 1} / {photos.length}
            </span>
          )}
        </div>

        {/* EXIF side panel */}
        {showExif && (
          <div className="w-72 flex-shrink-0 bg-surface border border-border-subtle rounded-xl overflow-hidden self-start max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-text-primary">Photo Information</h3>
            </div>
            <div className="p-4 space-y-4">
              {exifLoading ? (
                <div className="text-center py-4"><Loader2 className="h-5 w-5 text-cyan-400 animate-spin mx-auto" /></div>
              ) : exifData ? (
                <>
                  {exifData.dateTime && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-1">Date/Time (EXIF)</p>
                      <p className="text-xs text-text-secondary font-mono">{exifData.dateTime}</p>
                    </div>
                  )}
                  {exifData.gps && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-1">GPS Location</p>
                      <p className="text-xs text-text-secondary font-mono">{exifData.gps.latitude.toFixed(6)}, {exifData.gps.longitude.toFixed(6)}</p>
                      {exifData.gps.altitude !== undefined && <p className="text-xs text-text-secondary">Alt: {exifData.gps.altitude.toFixed(1)}m</p>}
                      {exifData.address && <p className="text-xs text-text-secondary mt-1">{exifData.address}</p>}
                      <a href={`https://www.google.com/maps?q=${exifData.gps.latitude},${exifData.gps.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-cyan-400 hover:text-cyan-300 mt-1 inline-block" onClick={(e) => e.stopPropagation()}>Open in Maps →</a>
                    </div>
                  )}
                  {exifData.make && (
                    <div>
                      <p className="text-[10px] text-text-muted mb-1">Camera</p>
                      <p className="text-xs text-text-secondary">{exifData.make} {exifData.model || ""}</p>
                    </div>
                  )}
                  {!exifData.gps && !exifData.dateTime && (
                    <p className="text-xs text-text-muted text-center py-4">No EXIF data found</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-text-muted text-center py-4">Click to load EXIF data</p>
              )}

              {/* Download options */}
              <div className="pt-3 border-t border-border-subtle space-y-2">
                <button
                  onClick={(e) => { e.stopPropagation(); downloadOriginal(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover border border-border-subtle hover:bg-surface-hover transition-colors text-left"
                >
                  <Download className="h-3.5 w-3.5 text-text-secondary" />
                  <span className="text-xs text-text-secondary">Download Original</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadWithTimestamp(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors text-left"
                >
                  <Clock className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-xs text-cyan-300">Download with Timestamp</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Work Order Modal ───────────────────────────────────────────────────

const SERVICE_OPTIONS = [
  { value: "GRASS_CUT", label: "Grass Cut" },
  { value: "DEBRIS_REMOVAL", label: "Debris Removal" },
  { value: "WINTERIZATION", label: "Winterization" },
  { value: "BOARD_UP", label: "Board-Up" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "MOLD_REMEDIATION", label: "Mold Remediation" },
  { value: "OTHER", label: "Other (Custom)" },
];

function EditWorkOrderModal({
  workOrder,
  onClose,
  updateMutation,
}: {
  workOrder: any;
  onClose: () => void;
  updateMutation: any;
}) {
  const [form, setForm] = useState({
    title: workOrder.title || "",
    description: workOrder.description || "",
    address: workOrder.address || "",
    city: workOrder.city || "",
    state: workOrder.state || "",
    zipCode: workOrder.zipCode || "",
    serviceType: SERVICE_OPTIONS.some((o) => o.value === workOrder.serviceType)
      ? workOrder.serviceType
      : "OTHER",
    customServiceType: SERVICE_OPTIONS.some(
      (o) => o.value === workOrder.serviceType
    )
      ? ""
      : workOrder.serviceType || "",
    dueDate: workOrder.dueDate
      ? new Date(workOrder.dueDate).toISOString().split("T")[0]
      : "",
    priority: String(workOrder.priority ?? 0),
    lockCode: workOrder.lockCode || "",
    gateCode: workOrder.gateCode || "",
    keyCode: workOrder.keyCode || "",
    specialInstructions: workOrder.specialInstructions || "",
  });

  const showCustom = form.serviceType === "OTHER";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.address.trim()) {
      toast.error("Title and address are required");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || null,
        address: form.address.trim(),
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zipCode: form.zipCode.trim() || null,
        serviceType: showCustom
          ? form.customServiceType.trim().toUpperCase().replace(/\s+/g, "_")
          : form.serviceType,
        dueDate: form.dueDate || null,
        priority: parseInt(form.priority) || 0,
        lockCode: form.lockCode.trim() || null,
        gateCode: form.gateCode.trim() || null,
        keyCode: form.keyCode.trim() || null,
        specialInstructions: form.specialInstructions.trim() || null,
      });
      toast.success("Work order updated");
      onClose();
    } catch {
      toast.error("Failed to update work order");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-all duration-500 animate-in fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-surface/95 backdrop-blur-2xl border border-border-medium rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-border-subtle relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(6,182,212,0.2)]">
              <Pencil className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary tracking-tight">Modify Protocols</h2>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">Refining Work Order Assets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl hover:bg-surface-hover text-text-muted hover:text-white transition-all group active:scale-95"
          >
            <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSave}
          className="flex-1 overflow-y-auto px-10 py-8 space-y-10 custom-scrollbar relative z-10"
        >
          {/* Basic Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Operational Core</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Asset Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Scope Documentation</label>
                <div className="rounded-2xl border border-border-subtle bg-surface-hover overflow-hidden focus-within:border-cyan-500/50 transition-all shadow-inner">
                  <RichTextEditor
                    value={form.description}
                    onChange={(val) => setForm({ ...form, description: val })}
                    placeholder="Describe the work to be done..."
                    minHeight={150}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Service Protocol</label>
                  <div className="relative group">
                    <select
                      value={form.serviceType}
                      onChange={(e) => setForm({ ...form, serviceType: e.target.value, customServiceType: "" })}
                      className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner appearance-none"
                    >
                      {SERVICE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none transition-transform group-hover:scale-110" />
                  </div>
                </div>

                {showCustom && (
                  <div className="space-y-2 animate-in slide-in-from-left-4 duration-300">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Custom Designation</label>
                    <input
                      type="text"
                      value={form.customServiceType}
                      onChange={(e) => setForm({ ...form, customServiceType: e.target.value })}
                      placeholder="e.g., Pressure Washing"
                      className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 focus:outline-none transition-all shadow-inner"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-t border-border-subtle pt-10">
              <div className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
              <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Geospatial Data</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Site Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-dim focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 focus:outline-none transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary focus:border-violet-500/50 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary focus:border-violet-500/50 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">ZIP Code</label>
                  <input
                    type="text"
                    value={form.zipCode}
                    onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                    className="w-full px-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-sm text-text-primary focus:border-violet-500/50 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling & Access */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-t border-border-subtle pt-10">
              <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Protocol Timing & Access</h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Operational Deadline</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 focus:outline-none transition-all shadow-inner [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Urgency Tier</label>
                  <div className="relative group">
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full px-5 py-4 bg-surface-hover border border-border-subtle rounded-2xl text-sm text-text-primary focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 focus:outline-none transition-all shadow-inner appearance-none"
                    >
                      <option value="0">Standard Priority</option>
                      <option value="1">High Priority</option>
                      <option value="2">Critical / Urgent</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none transition-transform group-hover:scale-110" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Lock Sequence", key: "lockCode", icon: Lock },
                  { label: "Gate Sequence", key: "gateCode", icon: Key },
                  { label: "Key Designation", key: "keyCode", icon: Shield },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">{field.label}</label>
                    <div className="relative group">
                      <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim group-focus-within:text-amber-400 transition-colors" />
                      <input
                        type="text"
                        value={(form as any)[field.key]}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        placeholder="N/A"
                        className="w-full pl-11 pr-4 py-3.5 bg-surface-hover border border-border-subtle rounded-xl text-xs text-text-primary focus:border-amber-500/50 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-dim uppercase tracking-widest ml-1">Directive Override</label>
                <RichTextEditor
                  value={form.specialInstructions}
                  onChange={(val) => setForm({ ...form, specialInstructions: val })}
                  placeholder="Additional logistical requirements..."
                  minHeight={150}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-border-subtle bg-surface-hover flex justify-end gap-4 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-4 rounded-2xl bg-surface-hover text-text-secondary text-[10px] font-black uppercase tracking-widest border border-border-subtle hover:bg-surface-hover hover:text-white transition-all active:scale-95"
          >
            Abort Changes
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-[0_8px_25px_-5px_rgba(6,182,212,0.4)] hover:shadow-[0_12px_30px_-5px_rgba(6,182,212,0.5)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-3"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Commit Updates
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task-Level Chat Component ────────────────────────────────────────────────

function TaskChat({
  workOrderId,
  taskId,
}: {
  workOrderId: string;
  taskId: string;
}) {
  const { data: session } = useSession();
  const { data: taskThread } = useTaskMessages(workOrderId, taskId);
  const sendMessage = useSendTaskMessage(workOrderId, taskId);
  const [msg, setMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = (session?.user as any)?.id;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [taskThread?.messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    try {
      await sendMessage.mutateAsync({ content: msg.trim() });
      setMsg("");
    } catch {
      toast.error("Failed to send message");
    }
  }

  const messages = taskThread?.messages || [];

  return (
    <div className="ml-8 mt-2 mb-4 border border-border-subtle rounded-xl overflow-hidden bg-background">
      <div className="px-4 py-2 bg-surface-hover border-b border-border-subtle flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-xs font-medium text-text-muted">Task Chat</span>
      </div>

      <div className="max-h-48 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-xs text-text-dim text-center py-2">
            No messages for this task yet.
          </p>
        ) : (
          messages.map((m: any) => (
            <div
              key={m.id}
              className={`flex gap-2 ${
                m.authorId === userId ? "flex-row-reverse" : ""
              }`}
            >
              <Avatar name={m.author?.name} src={m.author?.image} size="sm" />
              <div
                className={`max-w-[70%] px-3 py-1.5 rounded-xl text-xs ${
                  m.authorId === userId
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-sm"
                    : "bg-surface-hover text-text-primary rounded-tl-sm"
                }`}
              >
                <p>{m.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 p-2 border-t border-border-subtle"
      >
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Message about this task..."
          className="flex-1 px-3 py-1.5 bg-surface-hover border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!msg.trim() || sendMessage.isPending}
          className="p-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          <Send className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}

// ─── Compliance Items ─────────────────────────────────────────────────────────

function getComplianceItems(
  serviceType: string,
  workOrder: any,
  tasks: any[],
  allPhotos: PhotoItem[]
): {
  label: string;
  description?: string;
  required: boolean;
  completed: boolean;
}[] {
  const base = [
    {
      label: "Before photos uploaded",
      description: "Photos taken before starting work",
      required: true,
      completed:
        workOrder.files?.some((f: any) => f.category === "BEFORE") ||
        allPhotos.some((p) => p.category === "BEFORE"),
    },
    {
      label: "During photos uploaded",
      description: "Photos taken during work progress",
      required: true,
      completed:
        workOrder.files?.some((f: any) => f.category === "DURING") ||
        allPhotos.some((p) => p.category === "DURING"),
    },
    {
      label: "After photos uploaded",
      description: "Photos taken after work completion",
      required: true,
      completed:
        workOrder.files?.some((f: any) => f.category === "AFTER") ||
        allPhotos.some((p) => p.category === "AFTER"),
    },
    {
      label: "All tasks completed",
      description: "Every task item checked off",
      required: true,
      completed:
        tasks.length > 0 && tasks.every((t: any) => t.completed),
    },
    {
      label: "Property secured",
      description: "All doors and windows locked",
      required: true,
      completed: false,
    },
    {
      label: "Access codes documented",
      description: "Lock/gate/key codes recorded",
      required: true,
      completed: !!(
        workOrder.lockCode ||
        workOrder.gateCode ||
        workOrder.keyCode
      ),
    },
  ];

  const serviceSpecific: Record<string, typeof base> = {
    WINTERIZATION: [
      {
        label: "Lock change completed",
        description: "New lock installed with photos before/during/after",
        required: true,
        completed: false,
      },
      {
        label: "Key code inside lockbox",
        description: "Key code placed inside the lockbox",
        required: true,
        completed: false,
      },
      {
        label: "Lockbox code documented",
        description: "Lockbox combination recorded",
        required: true,
        completed: !!workOrder.lockCode,
      },
    ],
    BOARD_UP: [
      {
        label: "Board-up materials documented",
        description: "All materials used recorded for billing",
        required: true,
        completed: false,
      },
      {
        label: "Entry points secured",
        description: "All windows and doors boarded",
        required: true,
        completed: false,
      },
    ],
    MOLD_REMEDIATION: [
      {
        label: "Pre-remediation testing",
        description: "Air quality test before work",
        required: true,
        completed: false,
      },
      {
        label: "Post-remediation testing",
        description: "Air quality test after work",
        required: true,
        completed: false,
      },
    ],
  };

  return [...base, ...(serviceSpecific[serviceType] || [])];
}
