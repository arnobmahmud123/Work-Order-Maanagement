"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { WorkOrderFilters } from "@/types";

async function readApiError(res: Response, fallback: string) {
  let message = fallback;
  try {
    const data = await res.json();
    if (typeof data?.error === "string" && data.error.trim()) {
      message = data.error;
    } else if (typeof data?.message === "string" && data.message.trim()) {
      message = data.message;
    }
  } catch {
    // Some endpoints return empty/non-JSON error bodies.
  }
  return new Error(`${message} (${res.status})`);
}

// ─── Unread Counts (for sidebar badges) ─────────────────────────────────────

export function useUnreadCounts() {
  return useQuery({
    queryKey: ["unread-counts"],
    queryFn: async () => {
      const res = await fetch("/api/unread-counts");
      if (!res.ok) return { chat: 0, email: 0, notifications: 0 };
      return res.json();
    },
    refetchInterval: 15000, // Poll every 15s
    staleTime: 5000,
  });
}

// ─── Work Orders ─────────────────────────────────────────────────────────────

export function useWorkOrders(filters?: WorkOrderFilters) {
  const params = new URLSearchParams();
  if (filters?.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    if (statuses.length > 0) {
      params.set("status", statuses.join(","));
    }
  }
  if (filters?.serviceType) params.set("serviceType", filters.serviceType);
  if (filters?.contractorId) params.set("contractorId", filters.contractorId);
  if (filters?.search) params.set("search", filters.search);

  return useQuery({
    queryKey: ["work-orders", filters],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders?${params.toString()}`);
      if (!res.ok) throw await readApiError(res, "Failed to fetch work orders");
      return res.json();
    },
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: ["work-order", id],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders/${id}`);
      if (!res.ok) throw await readApiError(res, "Failed to fetch work order");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create work order");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-orders"] }),
  });
}

export function useUpdateWorkOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update work order");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["work-order", id] });
    },
  });
}

// ─── Property History ────────────────────────────────────────────────────────

export function usePropertyHistory(propertyId?: string, address?: string) {
  const params = new URLSearchParams();
  if (propertyId) params.set("propertyId", propertyId);
  if (address) params.set("address", address);

  return useQuery({
    queryKey: ["property-history", propertyId, address],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders/property-history?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch property history");
      return res.json();
    },
    enabled: !!(propertyId || address),
  });
}

// ─── Activity Logging ────────────────────────────────────────────────────────

export function useLogActivity(workOrderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { action: string; details: string }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to log activity");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-order", workOrderId] });
    },
  });
}

// ─── Messages ────────────────────────────────────────────────────────────────

export function useThreads() {
  return useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const res = await fetch("/api/messages/threads");
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
  });
}

export function useThread(threadId: string) {
  return useQuery({
    queryKey: ["thread", threadId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/threads/${threadId}`);
      if (!res.ok) throw new Error("Failed to fetch thread");
      return res.json();
    },
    enabled: !!threadId,
  });
}

export function useSendMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { content: string; type?: string; visibility?: string; parentId?: string }) => {
      const res = await fetch(`/api/messages/threads/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thread", threadId] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error("Failed to fetch invoice");
      return res.json();
    },
    enabled: !!id,
  });
}

// ─── Support Tickets ─────────────────────────────────────────────────────────

export function useTickets() {
  return useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const res = await fetch("/api/support");
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const res = await fetch(`/api/support/${id}`);
      if (!res.ok) throw new Error("Failed to fetch ticket");
      return res.json();
    },
    enabled: !!id,
  });
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });
}

export function useLiveStats() {
  return useQuery({
    queryKey: ["live-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/live-stats");
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });
}

// ─── Message Attachments (Image Upload) ──────────────────────────────────────

export function useUploadMessageAttachment() {
  return useMutation({
    mutationFn: async ({ file, messageId }: { file: File; messageId?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (messageId) formData.append("messageId", messageId);

      const res = await fetch("/api/messages/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload file");
      return res.json();
    },
  });
}

// ─── Message Templates ───────────────────────────────────────────────────────

export function useMessageTemplates() {
  return useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const res = await fetch("/api/messages/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });
}

// ─── All Messages (Single Page View) ─────────────────────────────────────────

export function useAllMessages(filters?: {
  workOrderId?: string;
  userId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.workOrderId) params.set("workOrderId", filters.workOrderId);
  if (filters?.userId) params.set("userId", filters.userId);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);

  return useQuery({
    queryKey: ["all-messages", filters],
    queryFn: async () => {
      const res = await fetch(`/api/messages/all?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });
}

// ─── Task-Level Messages ─────────────────────────────────────────────────────

export function useTaskMessages(workOrderId: string, taskId: string) {
  return useQuery({
    queryKey: ["task-messages", workOrderId, taskId],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders/${workOrderId}/tasks/${taskId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch task messages");
      return res.json();
    },
    enabled: !!workOrderId && !!taskId,
  });
}

export function useSendTaskMessage(workOrderId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { content: string; type?: string }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/tasks/${taskId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send task message");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-messages", workOrderId, taskId] });
      qc.invalidateQueries({ queryKey: ["work-order", workOrderId] });
    },
  });
}

// ─── Notifications ───────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark notification read");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ─── Logistics ───────────────────────────────────────────────────────────────

export function useLogistics(view?: string) {
  const params = view ? `?view=${view}` : "";
  return useQuery({
    queryKey: ["logistics", view],
    queryFn: async () => {
      const res = await fetch(`/api/logistics${params}`);
      if (!res.ok) throw new Error("Failed to fetch logistics data");
      return res.json();
    },
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      supplierId: string;
      items: { materialId: string; quantity: number }[];
      notes?: string;
    }) => {
      const res = await fetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-order", ...data }),
      });
      if (!res.ok) throw new Error("Failed to create order");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logistics"] }),
  });
}

// ─── Training ────────────────────────────────────────────────────────────────

export function useTrainingCourses(category?: string) {
  const params = category ? `?category=${category}` : "";
  return useQuery({
    queryKey: ["training-courses", category],
    queryFn: async () => {
      const res = await fetch(`/api/training${params}`);
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });
}

export function useTrainingCourse(courseId: string) {
  return useQuery({
    queryKey: ["training-course", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/training?courseId=${courseId}`);
      if (!res.ok) throw new Error("Failed to fetch course");
      return res.json();
    },
    enabled: !!courseId,
  });
}

export function useUpdateModuleProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { moduleId: string; completed: boolean }) => {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update progress");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-courses"] });
      qc.invalidateQueries({ queryKey: ["training-course"] });
    },
  });
}

// ─── Assets ──────────────────────────────────────────────────────────────────

export function useAssets(filters?: {
  search?: string;
  city?: string;
  state?: string;
  sortBy?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.city) params.set("city", filters.city);
  if (filters?.state) params.set("state", filters.state);
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);

  return useQuery({
    queryKey: ["assets", filters],
    queryFn: async () => {
      const res = await fetch(`/api/assets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch assets");
      return res.json();
    },
  });
}

// ─── Accounting ──────────────────────────────────────────────────────────────

export function useAccounting(period?: string) {
  const params = period ? `?period=${period}` : "";
  return useQuery({
    queryKey: ["accounting", period],
    queryFn: async () => {
      const res = await fetch(`/api/accounting${params}`);
      if (!res.ok) throw new Error("Failed to fetch accounting data");
      return res.json();
    },
  });
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

export function useVendors(filters?: {
  search?: string;
  serviceType?: string;
  area?: string;
  minRating?: number;
  sortBy?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.serviceType) params.set("serviceType", filters.serviceType);
  if (filters?.area) params.set("area", filters.area);
  if (filters?.minRating) params.set("minRating", filters.minRating.toString());
  if (filters?.sortBy) params.set("sortBy", filters.sortBy);

  return useQuery({
    queryKey: ["vendors", filters],
    queryFn: async () => {
      const res = await fetch(`/api/vendors?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${id}`);
      if (!res.ok) throw new Error("Failed to fetch vendor");
      return res.json();
    },
    enabled: !!id,
  });
}

// ─── Coordinators ────────────────────────────────────────────────────────────

export function useCoordinators(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return useQuery({
    queryKey: ["coordinators", search],
    queryFn: async () => {
      const res = await fetch(`/api/coordinators${params}`);
      if (!res.ok) throw new Error("Failed to fetch coordinators");
      return res.json();
    },
  });
}

// ─── Dashboard Metrics ───────────────────────────────────────────────────────

export function useDashboardMetrics(userId?: string, period?: string) {
  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  if (period) params.set("period", period);

  return useQuery({
    queryKey: ["dashboard-metrics", userId, period],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/metrics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
  });
}

export function useTeamPerformance(role?: string) {
  const params = role ? `?role=${role}` : "";
  return useQuery({
    queryKey: ["team-performance", role],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/team${params}`);
      if (!res.ok) throw new Error("Failed to fetch team performance");
      return res.json();
    },
  });
}

// ─── Email ───────────────────────────────────────────────────────────────────

export function useEmails(folder?: string, search?: string, label?: string) {
  const params = new URLSearchParams();
  if (folder) params.set("folder", folder);
  if (search) params.set("search", search);
  if (label) params.set("label", label);

  return useQuery({
    queryKey: ["emails", folder, search, label],
    queryFn: async () => {
      const res = await fetch(`/api/email?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch emails");
      return res.json();
    },
  });
}

export function useEmail(id: string) {
  return useQuery({
    queryKey: ["email", id],
    queryFn: async () => {
      const res = await fetch(`/api/email/${id}`);
      if (!res.ok) throw new Error("Failed to fetch email");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useSendEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      to: string[];
      cc?: string[];
      subject: string;
      body: string;
      workOrderId?: string;
      priority?: string;
      labels?: string[];
    }) => {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send email");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });
}

export function useUpdateEmail(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { read?: boolean; starred?: boolean; labels?: string[]; archived?: boolean; trashed?: boolean }) => {
      const res = await fetch(`/api/email/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update email");
      return res.json();
    },
    onMutate: async (data) => {
      // Optimistic update: immediately update the email in all cached queries
      await qc.cancelQueries({ queryKey: ["emails"] });
      const queries = qc.getQueriesData({ queryKey: ["emails"] });
      for (const [queryKey, queryData] of queries) {
        if (queryData && typeof queryData === "object" && "emails" in (queryData as any)) {
          qc.setQueryData(queryKey, (old: any) => ({
            ...old,
            emails: old.emails.map((e: any) =>
              e.id === id ? { ...e, ...data } : e
            ),
          }));
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] });
      qc.invalidateQueries({ queryKey: ["email", id] });
    },
  });
}

export function useEmailScorecard(period?: string) {
  return useQuery({
    queryKey: ["email-scorecard", period],
    queryFn: async () => {
      const params = period ? `?period=${period}` : "";
      const res = await fetch(`/api/email/scorecard${params}`);
      if (!res.ok) throw new Error("Failed to fetch scorecard");
      return res.json();
    },
  });
}

// ─── AI Chat ─────────────────────────────────────────────────────────────────

export function useAIChat() {
  return useMutation({
    mutationFn: async (data: {
      message: string;
      context?: { type: string; id?: string };
      conversationHistory?: { role: string; content: string }[];
    }) => {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to get AI response");
      return res.json();
    },
  });
}

export function useAIAutoMessage() {
  return useMutation({
    mutationFn: async (data: {
      workOrderId: string;
      messageType?: string;
    }) => {
      const res = await fetch("/api/ai/auto-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to generate auto message");
      return res.json();
    },
  });
}

export function useAIAutoBid() {
  return useMutation({
    mutationFn: async (data: {
      serviceType: string;
      address: string;
      city?: string;
      state?: string;
      notes: string;
      estimatedLaborHours?: number;
      estimatedMaterials?: string;
      estimatedCost?: number;
      reason?: string;
    }) => {
      const res = await fetch("/api/ai/auto-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to generate bid");
      return res.json();
    },
  });
}

export function useAIImageSearch(query: string, category?: string) {
  return useQuery({
    queryKey: ["ai-image-search", query, category],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query });
      if (category) params.set("category", category);
      const res = await fetch(`/api/ai/image-search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to search images");
      return res.json();
    },
    enabled: !!query,
  });
}

export function useAIContractorFinder(
  serviceType?: string,
  location?: string,
  radius?: number
) {
  return useQuery({
    queryKey: ["ai-contractor-finder", serviceType, location, radius],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (serviceType) params.set("serviceType", serviceType);
      if (location) params.set("location", location);
      if (radius) params.set("radius", String(radius));
      const res = await fetch(`/api/ai/contractor-finder?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to find contractors");
      return res.json();
    },
    enabled: !!serviceType || !!location,
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export function useUsers(role?: string) {
  const params = role ? `?role=${role}` : "";
  return useQuery({
    queryKey: ["users", role],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });
}

// ─── Notification Preferences ────────────────────────────────────────────────

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/preferences");
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-preferences"] }),
  });
}

// ─── Inspectors ──────────────────────────────────────────────────────────────

export function useInspectors(filters?: {
  specialty?: string;
  availability?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.specialty) params.set("specialty", filters.specialty);
  if (filters?.availability) params.set("availability", filters.availability);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.lat) params.set("lat", filters.lat.toString());
  if (filters?.lng) params.set("lng", filters.lng.toString());
  if (filters?.radius) params.set("radius", filters.radius.toString());

  return useQuery({
    queryKey: ["inspectors", filters],
    queryFn: async () => {
      const res = await fetch(`/api/inspectors?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch inspectors");
      return res.json();
    },
  });
}

export function useInspector(id: string) {
  return useQuery({
    queryKey: ["inspector", id],
    queryFn: async () => {
      const res = await fetch(`/api/inspectors/${id}`);
      if (!res.ok) throw new Error("Failed to fetch inspector");
      return res.json();
    },
    enabled: !!id,
  });
}

// ─── Calls ───────────────────────────────────────────────────────────────────

export function useCalls(filters?: { status?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.page) params.set("page", filters.page.toString());

  return useQuery({
    queryKey: ["calls", filters],
    queryFn: async () => {
      const res = await fetch(`/api/calls?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch calls");
      return res.json();
    },
  });
}

export function useCall(id: string) {
  return useQuery({
    queryKey: ["call", id],
    queryFn: async () => {
      const res = await fetch(`/api/calls/${id}`);
      if (!res.ok) throw new Error("Failed to fetch call");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useInitiateCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      recipientPhone: string;
      recipientName?: string;
      recipientId?: string;
      inspectorId?: string;
      voiceProfileId?: string;
      purpose?: string;
    }) => {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to initiate call");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calls"] }),
  });
}

// ─── Voice Profiles ──────────────────────────────────────────────────────────

export function useVoiceProfiles() {
  return useQuery({
    queryKey: ["voice-profiles"],
    queryFn: async () => {
      const res = await fetch("/api/voice-profiles");
      if (!res.ok) throw new Error("Failed to fetch voice profiles");
      return res.json();
    },
  });
}

export function useCreateVoiceProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      voiceId?: string;
      stability?: number;
      clarity?: number;
      style?: number;
    }) => {
      const res = await fetch("/api/voice-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create voice profile");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["voice-profiles"] }),
  });
}

// ─── Scheduled Calls ─────────────────────────────────────────────────────────

export function useScheduledCalls(status?: string) {
  const params = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: ["scheduled-calls", status],
    queryFn: async () => {
      const res = await fetch(`/api/calls/scheduled${params}`);
      if (!res.ok) throw new Error("Failed to fetch scheduled calls");
      return res.json();
    },
  });
}

export function useCreateScheduledCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      recipientPhone: string;
      recipientName?: string;
      recipientId?: string;
      purpose?: string;
      scheduledAt: string;
      reminderBefore?: number;
      voiceProfileId?: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/calls/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to schedule call");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-calls"] }),
  });
}

export function useUpdateScheduledCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; status?: string; notes?: string }) => {
      const res = await fetch("/api/calls/scheduled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update scheduled call");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-calls"] }),
  });
}

export function useCancelScheduledCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calls/scheduled?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel call");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-calls"] }),
  });
}

// ─── Chat Channels ───────────────────────────────────────────────────────────

export function useChatChannels() {
  return useQuery({
    queryKey: ["chat-channels"],
    queryFn: async () => {
      const res = await fetch("/api/chat/channels");
      if (!res.ok) throw new Error("Failed to fetch channels");
      return res.json();
    },
    refetchInterval: 30000, // Poll every 30s (was 15s)
    staleTime: 10000, // Consider data fresh for 10s
  });
}

export function useChatChannel(id: string) {
  return useQuery({
    queryKey: ["chat-channel", id],
    queryFn: async () => {
      const res = await fetch(`/api/chat/channels/${id}`);
      if (!res.ok) throw new Error("Failed to fetch channel");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateChatChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      type?: string;
      memberIds?: string[];
    }) => {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create channel");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-channels"] }),
  });
}

export function useChatMessages(channelId: string, search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  return useQuery({
    queryKey: ["chat-messages", channelId, search],
    queryFn: async () => {
      const res = await fetch(`/api/chat/channels/${channelId}/messages${params}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!channelId,
    refetchInterval: search ? false : 8000, // Poll every 8s (was 5s)
    staleTime: 5000, // Consider data fresh for 5s
  });
}

export function useSendChatMessage(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      content: string;
      type?: string;
      parentId?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      fileMime?: string;
    }) => {
      const res = await fetch(`/api/chat/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages", channelId] });
      qc.invalidateQueries({ queryKey: ["chat-channels"] });
      qc.invalidateQueries({ queryKey: ["unread-counts"] });
    },
  });
}

export function useToggleReaction(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { messageId: string; emoji: string }) => {
      const res = await fetch(`/api/chat/channels/${channelId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to toggle reaction");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages", channelId] });
    },
  });
}

export function useMarkChannelRead(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/chat/channels/${channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markRead: true }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-channels"] });
      qc.invalidateQueries({ queryKey: ["unread-counts"] });
    },
  });
}

export function useEditChatMessage(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { messageId: string; content: string }) => {
      const res = await fetch(`/api/chat/messages/${data.messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: data.content }),
      });
      if (!res.ok) throw new Error("Failed to edit message");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages", channelId] });
    },
  });
}

export function useDeleteChatMessage(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete message");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-messages", channelId] });
    },
  });
}
