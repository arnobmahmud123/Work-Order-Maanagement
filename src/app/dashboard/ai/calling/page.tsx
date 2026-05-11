"use client";

import { useState, useEffect } from "react";
import {
  useCalls,
  useInitiateCall,
  useVoiceProfiles,
  useCreateVoiceProfile,
} from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, Button, Badge, Avatar, Modal } from "@/components/ui";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  Clock,
  FileText,
  User,
  Plus,
  Settings2,
  Radio,
  Waves,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { cn, formatRelativeTime, formatDateTime, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const CALL_STATUS_COLORS: Record<string, string> = {
  QUEUED: "bg-surface-hover text-text-dim",
  RINGING: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  FAILED: "bg-red-100 text-red-700",
  NO_ANSWER: "bg-orange-100 text-orange-700",
  BUSY: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-surface-hover text-text-muted",
};

const CALL_STATUS_ICONS: Record<string, any> = {
  QUEUED: Clock,
  RINGING: Phone,
  IN_PROGRESS: PhoneCall,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  NO_ANSWER: PhoneOff,
  BUSY: PhoneOff,
  CANCELLED: XCircle,
};

export default function AICallingPage() {
  const [tab, setTab] = useState<"calls" | "profiles" | "dialer">("calls");
  const [callStatusFilter, setCallStatusFilter] = useState("");
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callTimer, setCallTimer] = useState(0);

  const { data: callsData, isLoading: callsLoading } = useCalls(
    callStatusFilter ? { status: callStatusFilter } : undefined
  );
  const { data: profilesData, isLoading: profilesLoading } = useVoiceProfiles();

  const calls = callsData?.calls || [];
  const profiles = profilesData?.profiles || [];

  // Simulate call timer
  useEffect(() => {
    if (!activeCall || activeCall.status !== "IN_PROGRESS") return;
    const interval = setInterval(() => setCallTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  // Poll for call status updates
  useEffect(() => {
    if (!activeCall || activeCall.status === "COMPLETED" || activeCall.status === "FAILED") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls/${activeCall.id}`);
        if (res.ok) {
          const updated = await res.json();
          setActiveCall(updated);
          if (updated.status === "COMPLETED") {
            setCallTimer(updated.duration || 0);
            toast.success("Call completed");
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [activeCall?.id, activeCall?.status]);

  function formatTimer(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Calling</h1>
          <p className="text-text-muted mt-1">
            Make calls with coordinator voice cloning powered by AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border-medium overflow-hidden">
            {(["calls", "profiles", "dialer"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-2 text-sm font-medium capitalize",
                  tab === t
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                    : "bg-surface-hover text-text-dim hover:bg-surface-hover"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Call Banner */}
      {activeCall && activeCall.status !== "COMPLETED" && activeCall.status !== "FAILED" && (
        <Card className="border-green-200 bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                  <Phone className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-green-900">
                  {activeCall.status === "RINGING" ? "Calling..." : "In Progress"}
                </p>
                <p className="text-sm text-green-700">
                  {activeCall.recipientName || activeCall.recipientPhone}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-2xl font-mono font-bold text-green-900">
                {formatTimer(callTimer)}
              </div>
              {activeCall.voiceProfile && (
                <Badge className="bg-green-200 text-green-800">
                  🎙️ {activeCall.voiceProfile.name}
                </Badge>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  await fetch(`/api/calls/${activeCall.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "COMPLETED", endedAt: new Date().toISOString() }),
                  });
                  setActiveCall(null);
                  setCallTimer(0);
                }}
              >
                <PhoneOff className="h-4 w-4" />
                End Call
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Calls Tab */}
      {tab === "calls" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              value={callStatusFilter}
              onChange={(e) => setCallStatusFilter(e.target.value)}
              className="rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {Object.keys(CALL_STATUS_COLORS).map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <Card padding={false}>
            {callsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 text-text-muted animate-spin mx-auto" />
                <p className="text-sm text-text-muted mt-2">Loading calls...</p>
              </div>
            ) : calls.length === 0 ? (
              <div className="p-8 text-center">
                <Phone className="h-12 w-12 text-text-dim mx-auto mb-3" />
                <p className="font-medium text-text-primary">No calls yet</p>
                <p className="text-sm text-text-muted mt-1">
                  Use the dialer to make your first AI-powered call
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {calls.map((call: any) => {
                  const StatusIcon = CALL_STATUS_ICONS[call.status] || Phone;
                  return (
                    <div key={call.id} className="p-4 hover:bg-surface-hover">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", CALL_STATUS_COLORS[call.status])}>
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {call.recipientName || call.recipientPhone}
                            </p>
                            <p className="text-xs text-text-muted">
                              {call.initiator?.name} • {formatRelativeTime(call.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {call.voiceProfile && (
                            <Badge className="bg-purple-100 text-purple-700">
                              🎙️ {call.voiceProfile.name}
                            </Badge>
                          )}
                          <Badge className={CALL_STATUS_COLORS[call.status]}>
                            {call.status.replace("_", " ")}
                          </Badge>
                          {call.duration && (
                            <span className="text-xs text-text-muted">
                              {Math.floor(call.duration / 60)}m {call.duration % 60}s
                            </span>
                          )}
                        </div>
                      </div>
                      {call.transcription && (
                        <div className="mt-3 p-3 bg-surface-hover rounded-lg">
                          <p className="text-xs font-medium text-text-muted mb-1 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Transcription
                          </p>
                          <p className="text-sm text-text-dim">{call.transcription}</p>
                        </div>
                      )}
                      {call.summary && (
                        <div className="mt-2 p-3 bg-cyan-500/[0.06] rounded-lg">
                          <p className="text-xs font-medium text-indigo-500 mb-1">AI Summary</p>
                          <p className="text-sm text-cyan-400">{call.summary}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Voice Profiles Tab */}
      {tab === "profiles" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Voice profiles are cloned from coordinator voices using AI
            </p>
            <Button onClick={() => setShowNewProfile(true)}>
              <Plus className="h-4 w-4" />
              New Voice Profile
            </Button>
          </div>

          {profilesLoading ? (
            <Card>
              <div className="animate-pulse space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 bg-surface-hover rounded-lg" />
                ))}
              </div>
            </Card>
          ) : profiles.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Waves className="h-12 w-12 text-text-dim mx-auto mb-3" />
                <p className="font-medium text-text-primary">No voice profiles</p>
                <p className="text-sm text-text-muted mt-1 mb-4">
                  Create a voice profile to use AI-powered calling
                </p>
                <Button onClick={() => setShowNewProfile(true)}>
                  <Plus className="h-4 w-4" />
                  Create Voice Profile
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile: any) => (
                <Card key={profile.id}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Volume2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-primary">{profile.name}</h3>
                      <p className="text-sm text-text-muted">{profile.user?.name}</p>
                      {profile.description && (
                        <p className="text-xs text-text-muted mt-1">{profile.description}</p>
                      )}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">Stability</span>
                          <div className="w-32 h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${(profile.stability || 0) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">Clarity</span>
                          <div className="w-32 h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(profile.clarity || 0) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">Style</span>
                          <div className="w-32 h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(profile.style || 0) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge className="bg-purple-100 text-purple-700">
                          {profile._count?.callLogs || 0} calls
                        </Badge>
                        {profile.isActive && (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <NewVoiceProfileModal
            isOpen={showNewProfile}
            onClose={() => setShowNewProfile(false)}
          />
        </div>
      )}

      {/* Dialer Tab */}
      {tab === "dialer" && (
        <DialerTab
          profiles={profiles}
          activeCall={activeCall}
          setActiveCall={setActiveCall}
          setCallTimer={setCallTimer}
        />
      )}
    </div>
  );
}

function DialerTab({
  profiles,
  activeCall,
  setActiveCall,
  setCallTimer,
}: {
  profiles: any[];
  activeCall: any;
  setActiveCall: (call: any) => void;
  setCallTimer: (t: number) => void;
}) {
  const initiateCall = useInitiateCall();
  const [form, setForm] = useState({
    recipientPhone: "",
    recipientName: "",
    purpose: "",
    voiceProfileId: "",
  });

  async function handleCall(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recipientPhone) {
      toast.error("Phone number is required");
      return;
    }
    try {
      setCallTimer(0);
      const call = await initiateCall.mutateAsync({
        recipientPhone: form.recipientPhone,
        recipientName: form.recipientName || undefined,
        voiceProfileId: form.voiceProfileId || undefined,
        purpose: form.purpose || undefined,
      });
      setActiveCall(call);
      toast.success("Call initiated");
    } catch {
      toast.error("Failed to initiate call");
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-text-muted" />
            Make a Call
          </CardTitle>
        </CardHeader>

        <form onSubmit={handleCall} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">
              Voice Profile
            </label>
            <select
              value={form.voiceProfileId}
              onChange={(e) => setForm({ ...form, voiceProfileId: e.target.value })}
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value="">Default (System Voice)</option>
              {profiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  🎙️ {p.name} — {p.user?.name}
                </option>
              ))}
            </select>
            {form.voiceProfileId && (
              <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                AI will use the cloned coordinator voice for this call
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dim mb-1">
              Purpose
            </label>
            <input
              type="text"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="Schedule inspection, follow up on work order..."
              className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={initiateCall.isPending}
            disabled={!!activeCall && activeCall.status !== "COMPLETED" && activeCall.status !== "FAILED"}
          >
            <Phone className="h-5 w-5" />
            {activeCall && activeCall.status !== "COMPLETED" && activeCall.status !== "FAILED"
              ? "Call in Progress..."
              : "Start Call"}
          </Button>
        </form>
      </Card>

      {/* Mock Twilio/ElevenLabs Status */}
      <Card className="border-dashed">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <Radio className="h-4 w-4 text-green-500" />
          <span>
            <strong className="text-text-dim">Twilio</strong> — Mock integration active
          </span>
          <Badge className="bg-green-100 text-green-700 ml-auto">Connected</Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-text-muted mt-3">
          <Waves className="h-4 w-4 text-purple-500" />
          <span>
            <strong className="text-text-dim">ElevenLabs</strong> — Voice synthesis ready
          </span>
          <Badge className="bg-purple-100 text-purple-700 ml-auto">Ready</Badge>
        </div>
      </Card>
    </div>
  );
}

function NewVoiceProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const createProfile = useCreateVoiceProfile();
  const [form, setForm] = useState({
    name: "",
    description: "",
    stability: 0.5,
    clarity: 0.75,
    style: 0,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createProfile.mutateAsync(form);
      toast.success("Voice profile created");
      onClose();
      setForm({ name: "", description: "", stability: 0.5, clarity: 0.75, style: 0 });
    } catch {
      toast.error("Failed to create voice profile");
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Voice Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Profile Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Sarah's Voice"
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-dim mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of the voice..."
            rows={2}
            className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
          />
        </div>

        {[
          { key: "stability", label: "Stability", desc: "Higher = more consistent, lower = more expressive" },
          { key: "clarity", label: "Clarity", desc: "Higher = clearer pronunciation" },
          { key: "style", label: "Style", desc: "Higher = more stylized speaking" },
        ].map((param) => (
          <div key={param.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-text-dim">{param.label}</label>
              <span className="text-xs text-text-muted">
                {(form[param.key as keyof typeof form] as number).toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={form[param.key as keyof typeof form] as number}
              onChange={(e) => setForm({ ...form, [param.key]: parseFloat(e.target.value) })}
              className="w-full h-2 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-xs text-text-muted mt-1">{param.desc}</p>
          </div>
        ))}

        <p className="text-xs text-text-muted">
          🎙️ In production, this would upload a voice sample to ElevenLabs for cloning.
          This is a mock implementation.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createProfile.isPending}>
            Create Profile
          </Button>
        </div>
      </form>
    </Modal>
  );
}
