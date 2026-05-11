"use client";

import { useState } from "react";
import {
  useScheduledCalls,
  useCreateScheduledCall,
  useUpdateScheduledCall,
  useCancelScheduledCall,
  useVoiceProfiles,
} from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, Button, Badge, Avatar, Modal } from "@/components/ui";
import {
  CalendarClock,
  Plus,
  Phone,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Loader2,
  Bell,
  Trash2,
  Play,
} from "lucide-react";
import { cn, formatRelativeTime, formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-surface-hover text-text-muted",
  MISSED: "bg-red-100 text-red-800",
};

const STATUS_ICONS: Record<string, any> = {
  SCHEDULED: CalendarClock,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  MISSED: AlertTriangle,
};

export default function CallSchedulePage() {
  const [showSchedule, setShowSchedule] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const { data, isLoading } = useScheduledCalls(statusFilter || undefined);
  const { data: profilesData } = useVoiceProfiles();
  const updateCall = useUpdateScheduledCall();
  const cancelCall = useCancelScheduledCall();

  const calls = data?.calls || [];
  const profiles = profilesData?.profiles || [];

  const now = new Date();
  const upcoming = calls.filter(
    (c: any) => c.status === "SCHEDULED" && new Date(c.scheduledAt) > now
  );
  const past = calls.filter(
    (c: any) => c.status !== "SCHEDULED" || new Date(c.scheduledAt) <= now
  );

  async function handleCancel(id: string) {
    try {
      await cancelCall.mutateAsync(id);
      toast.success("Call cancelled");
      setShowMenu(null);
    } catch {
      toast.error("Failed to cancel call");
    }
  }

  async function handleMarkComplete(id: string) {
    try {
      await updateCall.mutateAsync({ id, status: "COMPLETED" });
      toast.success("Call marked as completed");
      setShowMenu(null);
    } catch {
      toast.error("Failed to update call");
    }
  }

  async function handleMarkMissed(id: string) {
    try {
      await updateCall.mutateAsync({ id, status: "MISSED" });
      toast.success("Call marked as missed");
      setShowMenu(null);
    } catch {
      toast.error("Failed to update call");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Call Schedule</h1>
          <p className="text-text-muted mt-1">
            Schedule and manage your calls with automated reminders
          </p>
        </div>
        <Button onClick={() => setShowSchedule(true)}>
          <Plus className="h-4 w-4" />
          Schedule Call
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CalendarClock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{upcoming.length}</p>
              <p className="text-sm text-text-muted">Upcoming</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {calls.filter((c: any) => c.status === "COMPLETED").length}
              </p>
              <p className="text-sm text-text-muted">Completed</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {calls.filter((c: any) => c.status === "MISSED").length}
              </p>
              <p className="text-sm text-text-muted">Missed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
        >
          <option value="">All Calls</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="MISSED">Missed</option>
        </select>
      </div>

      {/* Call List */}
      {isLoading ? (
        <Card>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface-hover rounded-lg" />
            ))}
          </div>
        </Card>
      ) : calls.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <CalendarClock className="h-12 w-12 text-text-dim mx-auto mb-3" />
            <p className="font-medium text-text-primary">No scheduled calls</p>
            <p className="text-sm text-text-muted mt-1 mb-4">
              Schedule a call to get started with automated calling
            </p>
            <Button onClick={() => setShowSchedule(true)}>
              <Plus className="h-4 w-4" />
              Schedule Call
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                Upcoming Calls
              </h2>
              <div className="space-y-3">
                {upcoming.map((call: any) => (
                  <ScheduledCallCard
                    key={call.id}
                    call={call}
                    showMenu={showMenu}
                    setShowMenu={setShowMenu}
                    onCancel={handleCancel}
                    onComplete={handleMarkComplete}
                    onMissed={handleMarkMissed}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                Past Calls
              </h2>
              <div className="space-y-3">
                {past.map((call: any) => (
                  <ScheduledCallCard
                    key={call.id}
                    call={call}
                    showMenu={showMenu}
                    setShowMenu={setShowMenu}
                    onCancel={handleCancel}
                    onComplete={handleMarkComplete}
                    onMissed={handleMarkMissed}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Modal */}
      <ScheduleCallModal
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        profiles={profiles}
      />
    </div>
  );
}

function ScheduledCallCard({
  call,
  showMenu,
  setShowMenu,
  onCancel,
  onComplete,
  onMissed,
}: {
  call: any;
  showMenu: string | null;
  setShowMenu: (id: string | null) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
  onMissed: (id: string) => void;
}) {
  const StatusIcon = STATUS_ICONS[call.status] || CalendarClock;
  const isPast = new Date(call.scheduledAt) < new Date();
  const isSoon = !isPast && new Date(call.scheduledAt).getTime() - Date.now() < 3600000;

  return (
    <Card
      className={cn(
        "transition-all",
        isSoon && call.status === "SCHEDULED" && "border-amber-300 bg-amber-50/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("p-3 rounded-lg", STATUS_COLORS[call.status])}>
            <StatusIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-text-primary">
                {call.recipientName || call.recipientPhone}
              </p>
              <Badge className={STATUS_COLORS[call.status]}>
                {call.status}
              </Badge>
              {isSoon && call.status === "SCHEDULED" && (
                <Badge className="bg-amber-100 text-amber-800">
                  <Bell className="h-3 w-3 mr-1" />
                  Starting soon
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateTime(call.scheduledAt)}
              </span>
              {call.purpose && (
                <span className="text-text-muted">• {call.purpose}</span>
              )}
            </div>
            {call.reminderBefore > 0 && call.status === "SCHEDULED" && (
              <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                <Bell className="h-3 w-3" />
                Reminder {call.reminderBefore} min before
              </p>
            )}
            {call.notes && (
              <p className="text-xs text-text-muted mt-1">{call.notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">
            {formatRelativeTime(call.scheduledAt)}
          </span>
          {call.status === "SCHEDULED" && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(showMenu === call.id ? null : call.id)}
                className="p-1.5 rounded-lg hover:bg-surface-hover"
              >
                <MoreVertical className="h-4 w-4 text-text-muted" />
              </button>
              {showMenu === call.id && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-surface-hover rounded-lg shadow-lg border border-border-subtle py-1 z-10">
                  <button
                    onClick={() => onComplete(call.id)}
                    className="w-full text-left px-3 py-2 text-sm text-text-dim hover:bg-surface-hover flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Mark Completed
                  </button>
                  <button
                    onClick={() => onMissed(call.id)}
                    className="w-full text-left px-3 py-2 text-sm text-text-dim hover:bg-surface-hover flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Mark Missed
                  </button>
                  <button
                    onClick={() => onCancel(call.id)}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ScheduleCallModal({
  isOpen,
  onClose,
  profiles,
}: {
  isOpen: boolean;
  onClose: () => void;
  profiles: any[];
}) {
  const createCall = useCreateScheduledCall();
  const [form, setForm] = useState({
    recipientPhone: "",
    recipientName: "",
    purpose: "",
    scheduledDate: "",
    scheduledTime: "",
    reminderBefore: 15,
    voiceProfileId: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recipientPhone || !form.scheduledDate || !form.scheduledTime) {
      toast.error("Phone, date, and time are required");
      return;
    }

    const scheduledAt = new Date(`${form.scheduledDate}T${form.scheduledTime}`).toISOString();

    try {
      await createCall.mutateAsync({
        recipientPhone: form.recipientPhone,
        recipientName: form.recipientName || undefined,
        purpose: form.purpose || undefined,
        scheduledAt,
        reminderBefore: form.reminderBefore,
        voiceProfileId: form.voiceProfileId || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Call scheduled");
      onClose();
      setForm({
        recipientPhone: "",
        recipientName: "",
        purpose: "",
        scheduledDate: "",
        scheduledTime: "",
        reminderBefore: 15,
        voiceProfileId: "",
        notes: "",
      });
    } catch {
      toast.error("Failed to schedule call");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule a Call" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">
              Recipient Phone *
            </label>
            <input
              type="tel"
              required
              value={form.recipientPhone}
              onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">
              Recipient Name
            </label>
            <input
              type="text"
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              placeholder="John Doe"
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Purpose</label>
          <input
            type="text"
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            placeholder="Schedule inspection, follow up..."
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">Date *</label>
            <input
              type="date"
              required
              value={form.scheduledDate}
              onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">Time *</label>
            <input
              type="time"
              required
              value={form.scheduledTime}
              onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">
              Reminder Before
            </label>
            <select
              value={form.reminderBefore}
              onChange={(e) => setForm({ ...form, reminderBefore: Number(e.target.value) })}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">Voice Profile</label>
            <select
              value={form.voiceProfileId}
              onChange={(e) => setForm({ ...form, voiceProfileId: e.target.value })}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value="">Default Voice</option>
              {profiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  🎙️ {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any notes about this call..."
            rows={2}
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createCall.isPending}>
            <CalendarClock className="h-4 w-4" />
            Schedule Call
          </Button>
        </div>
      </form>
    </Modal>
  );
}
