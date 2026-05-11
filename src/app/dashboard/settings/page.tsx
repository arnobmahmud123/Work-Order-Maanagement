"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, Button, Input, Badge, Avatar } from "@/components/ui";
import { User, Shield, Bell, Key, ChevronRight, Save, X, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const role = (session?.user as any)?.role;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    image: "",
  });

  useEffect(() => {
    if (session?.user) {
      setForm({
        name: session.user.name || "",
        email: session.user.email || "",
        phone: (session.user as any).phone || "",
        company: (session.user as any).company || "",
        image: session.user.image || "",
      });
    }
  }, [session]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update profile");
        return;
      }
      toast.success("Profile updated successfully!");
      setEditing(false);
      await updateSession({ ...session, user: { ...session?.user, ...data.user } });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (session?.user) {
      setForm({
        name: session.user.name || "",
        email: session.user.email || "",
        phone: (session.user as any).phone || "",
        company: (session.user as any).company || "",
        image: session.user.image || "",
      });
    }
    setEditing(false);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-text-secondary" />
              Profile
            </CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit Profile
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} loading={saving}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar
                src={editing ? form.image : session?.user?.image}
                name={session?.user?.name}
                size="lg"
              />
              {editing && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="h-5 w-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("file", file);
                      try {
                        const res = await fetch("/api/upload", { method: "POST", body: formData });
                        const data = await res.json();
                        if (res.ok && data.url) {
                          setForm({ ...form, image: data.url });
                          toast.success("Image uploaded");
                        } else {
                          toast.error(data.error || "Upload failed");
                        }
                      } catch {
                        toast.error("Upload failed");
                      }
                    }}
                  />
                </label>
              )}
            </div>
            {editing && (
              <div className="flex-1 space-y-2">
                <Input
                  label="Profile Image URL"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                />
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-medium cursor-pointer hover:bg-cyan-500/20 transition-colors">
                    <Camera className="h-3.5 w-3.5" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append("file", file);
                        try {
                          const res = await fetch("/api/upload", { method: "POST", body: formData });
                          const data = await res.json();
                          if (res.ok && data.url) {
                            setForm({ ...form, image: data.url });
                            toast.success("Image uploaded");
                          } else {
                            toast.error(data.error || "Upload failed");
                          }
                        } catch {
                          toast.error("Upload failed");
                        }
                      }}
                    />
                  </label>
                  {form.image && (
                    <button
                      type="button"
                      onClick={() => { setForm({ ...form, image: "" }); toast.success("Profile photo removed"); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove Photo
                    </button>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  Upload a photo or enter a URL. Click the avatar to quick-upload.
                </p>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={!editing}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!editing}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              disabled={!editing}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              disabled={!editing}
              placeholder="Your company name"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Role:</span>
            <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{role}</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-text-secondary" />
            Security
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg border border-border-subtle">
            <div>
              <p className="text-sm font-medium text-text-primary">Password</p>
              <p className="text-xs text-text-muted">Last updated: Unknown</p>
            </div>
            <Button variant="outline" size="sm">Change Password</Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg border border-border-subtle">
            <div>
              <p className="text-sm font-medium text-text-primary">Two-Factor Authentication</p>
              <p className="text-xs text-text-muted">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm">Enable 2FA</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-text-secondary" />
            Notifications
          </CardTitle>
        </CardHeader>
        <div className="space-y-3">
          {[
            { label: "Work order updates", desc: "When a work order status changes" },
            { label: "New messages", desc: "When you receive a new message" },
            { label: "Invoice updates", desc: "When invoices are created or paid" },
            { label: "Support ticket replies", desc: "When someone replies to your ticket" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-surface-hover rounded-lg border border-border-subtle">
              <div>
                <p className="text-sm font-medium text-text-primary">{item.label}</p>
                <p className="text-xs text-text-muted">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>
          ))}
          <Link
            href="/dashboard/settings/notifications"
            className="flex items-center justify-between p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/10 hover:bg-cyan-500/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-sm font-medium text-cyan-300">Advanced Notification Settings</p>
                <p className="text-xs text-cyan-400/70">Channel preferences, quiet hours, and more</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-cyan-400/50" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
