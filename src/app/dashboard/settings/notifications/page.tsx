"use client";

import { useState, useEffect } from "react";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/use-data";
import { Card, CardHeader, CardTitle, Button } from "@/components/ui";
import {
  Bell,
  MessageSquare,
  ClipboardList,
  Clock,
  Receipt,
  LifeBuoy,
  Sparkles,
  Moon,
  Save,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const NOTIFICATION_TYPES = [
  {
    key: "messages",
    label: "Messages",
    desc: "New messages and thread replies",
    icon: MessageSquare,
    color: "text-blue-600 bg-blue-50",
  },
  {
    key: "workOrderStatus",
    label: "Work Order Status",
    desc: "Status changes on work orders",
    icon: ClipboardList,
    color: "text-cyan-400 bg-cyan-500/[0.06]",
  },
  {
    key: "dueOverdue",
    label: "Due & Overdue",
    desc: "Upcoming due dates and overdue items",
    icon: Clock,
    color: "text-orange-600 bg-orange-50",
  },
  {
    key: "invoices",
    label: "Invoices",
    desc: "Invoice creation, payment, and reminders",
    icon: Receipt,
    color: "text-amber-600 bg-amber-50",
  },
  {
    key: "support",
    label: "Support Tickets",
    desc: "Ticket updates and replies",
    icon: LifeBuoy,
    color: "text-red-600 bg-red-50",
  },
  {
    key: "ai",
    label: "AI Notifications",
    desc: "AI suggestions and automated actions",
    icon: Sparkles,
    color: "text-purple-600 bg-purple-50",
  },
];

const CHANNELS = [
  { key: "InApp", label: "In-App", desc: "Show in notification center" },
  { key: "Email", label: "Email", desc: "Send email notification" },
  { key: "Sms", label: "SMS", desc: "Text message notification" },
];

export default function NotificationSettingsPage() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prefs) {
      setForm(prefs);
    }
  }, [prefs]);

  function toggle(type: string, channel: string) {
    const key = `${type}${channel}`;
    setForm((prev: any) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function updateQuietHours(field: string, value: any) {
    setForm((prev: any) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    try {
      await updatePrefs.mutateAsync(form);
      setSaved(true);
      toast.success("Notification preferences saved");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to save preferences");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notification Settings</h1>
          <p className="text-text-muted mt-1">Loading preferences...</p>
        </div>
        <Card>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-surface-hover rounded-lg" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notification Settings</h1>
          <p className="text-text-muted mt-1">
            Choose how and when you receive notifications
          </p>
        </div>
        <Button onClick={handleSave} loading={updatePrefs.isPending}>
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved" : "Save Changes"}
        </Button>
      </div>

      {/* Notification Types Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-text-muted" />
            Notification Types
          </CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left py-3 pr-4 text-sm font-medium text-text-muted">Type</th>
                {CHANNELS.map((ch) => (
                  <th key={ch.key} className="text-center py-3 px-4 text-sm font-medium text-text-muted">
                    <div>{ch.label}</div>
                    <div className="text-xs font-normal text-text-muted">{ch.desc}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {NOTIFICATION_TYPES.map((type) => (
                <tr key={type.key} className="hover:bg-surface-hover">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", type.color)}>
                        <type.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{type.label}</p>
                        <p className="text-xs text-text-muted">{type.desc}</p>
                      </div>
                    </div>
                  </td>
                  {CHANNELS.map((ch) => {
                    const key = `${type.key}${ch.key}`;
                    const checked = form[key] ?? false;
                    return (
                      <td key={ch.key} className="text-center py-4 px-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(type.key, ch.key)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-surface-hover peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-hover after:border-border-medium after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r from-cyan-500 to-blue-600" />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-text-muted" />
            Quiet Hours
          </CardTitle>
        </CardHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
            <div>
              <p className="text-sm font-medium text-text-primary">Enable Quiet Hours</p>
              <p className="text-xs text-text-muted">
                Suppress all notifications during quiet hours
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.quietHoursEnabled ?? false}
                onChange={(e) => updateQuietHours("quietHoursEnabled", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-hover peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-hover after:border-border-medium after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r from-cyan-500 to-blue-600" />
            </label>
          </div>

          {form.quietHoursEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface-hover rounded-lg">
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Start Time</label>
                <input
                  type="time"
                  value={form.quietHoursStart || "22:00"}
                  onChange={(e) => updateQuietHours("quietHoursStart", e.target.value)}
                  className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">End Time</label>
                <input
                  type="time"
                  value={form.quietHoursEnd || "07:00"}
                  onChange={(e) => updateQuietHours("quietHoursEnd", e.target.value)}
                  className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dim mb-1">Timezone</label>
                <select
                  value={form.quietHoursTimezone || "America/New_York"}
                  onChange={(e) => updateQuietHours("quietHoursTimezone", e.target.value)}
                  className="block w-full rounded-lg border border-border-medium px-3 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                >
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                  <option value="America/Anchorage">Alaska (AKT)</option>
                  <option value="Pacific/Honolulu">Hawaii (HT)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
