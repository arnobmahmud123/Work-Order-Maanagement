"use client";

import { useUsers } from "@/hooks/use-data";
import { Button, Card, Badge, Avatar, Select, Modal, Input } from "@/components/ui";
import { Plus, Users, Shield, UserCheck, UserX, Edit, Trash2, Mail, Phone, Building2, X } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { useState } from "react";
import toast from "react-hot-toast";

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  COORDINATOR: "bg-blue-100 text-blue-700",
  PROCESSOR: "bg-cyan-100 text-cyan-700",
  CONTRACTOR: "bg-green-100 text-green-700",
  CLIENT: "bg-surface-hover text-text-dim",
};

export default function AdminUsersPage() {
  const { data: users, isLoading, refetch } = useUsers();
  const [roleFilter, setRoleFilter] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);

  const filtered = roleFilter
    ? users?.filter((u: any) => u.role === roleFilter)
    : users;

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("User updated");
      refetch();
    } catch {
      toast.error("Failed to update user");
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(isActive ? "User deactivated" : "User activated");
      refetch();
    } catch {
      toast.error("Failed to update user");
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("User deleted");
      refetch();
    } catch {
      toast.error("Failed to delete user");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users</h1>
          <p className="text-text-muted mt-1">Manage platform users and roles</p>
        </div>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="COORDINATOR">Coordinator</option>
              <option value="PROCESSOR">Processor</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="CLIENT">Client</option>
            </select>
            <span className="text-sm text-text-muted">
              {filtered?.length || 0} users
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading...</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filtered?.map((user: any) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 hover:bg-surface-hover transition-colors group"
              >
                <Avatar name={user.name} src={user.image} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {user.name}
                    </h3>
                    <Badge className={cn("text-[10px]", roleColors[user.role])}>
                      {user.role}
                    </Badge>
                    {!user.isActive && (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </span>
                    {user.phone && (
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {user.phone}
                      </span>
                    )}
                    {user.company && (
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {user.company}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-dim mt-0.5">
                    {user._count?.assignedWorkOrders || 0} work orders •{" "}
                    {user._count?.supportTickets || 0} tickets • Joined{" "}
                    {formatDate(user.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="px-2 py-1 border border-border-medium rounded text-xs bg-surface-hover text-text-primary focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="CLIENT">Client</option>
                    <option value="CONTRACTOR">Contractor</option>
                    <option value="COORDINATOR">Coordinator</option>
                    <option value="PROCESSOR">Processor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    onClick={() => setEditingUser(user)}
                    className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-text-muted hover:text-cyan-400 transition-colors"
                    title="Edit user"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(user.id, user.isActive)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      user.isActive
                        ? "text-green-400 hover:bg-green-500/10"
                        : "text-red-400 hover:bg-red-500/10"
                    )}
                    title={user.isActive ? "Deactivate" : "Activate"}
                  >
                    {user.isActive ? (
                      <UserCheck className="h-3.5 w-3.5" />
                    ) : (
                      <UserX className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    company: user.company || "",
    role: user.role || "CLIENT",
    isActive: user.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          role: form.role,
          isActive: form.isActive,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("User updated");
      onSaved();
    } catch {
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg mx-4 bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-bold text-text-primary">Edit User</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          {/* Avatar preview */}
          <div className="flex items-center gap-3 mb-2">
            <Avatar name={form.name} src={user.image} size="lg" />
            <div>
              <p className="text-sm font-semibold text-text-primary">{form.name || "User"}</p>
              <p className="text-xs text-text-muted">{form.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-text-muted mb-1 block">
                Full Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-text-muted mb-1 block">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block">
                Company
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Company name"
                className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-dim focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-text-muted mb-1 block">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 bg-surface-hover border border-border-subtle rounded-lg text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none"
              >
                <option value="CLIENT">Client</option>
                <option value="CONTRACTOR">Contractor</option>
                <option value="COORDINATOR">Coordinator</option>
                <option value="PROCESSOR">Processor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-muted mb-1 block">
                Status
              </label>
              <div className="flex items-center gap-3 h-[42px]">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    form.isActive ? "bg-emerald-500" : "bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      form.isActive ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
                <span className="text-sm text-text-secondary">
                  {form.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="pt-3 border-t border-border-subtle">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 rounded-lg bg-surface-hover">
                <p className="text-sm font-bold text-text-primary">
                  {user._count?.assignedWorkOrders || 0}
                </p>
                <p className="text-[10px] text-text-muted">Work Orders</p>
              </div>
              <div className="p-2 rounded-lg bg-surface-hover">
                <p className="text-sm font-bold text-text-primary">
                  {user._count?.supportTickets || 0}
                </p>
                <p className="text-[10px] text-text-muted">Tickets</p>
              </div>
              <div className="p-2 rounded-lg bg-surface-hover">
                <p className="text-sm font-bold text-text-primary">
                  {user._count?.messages || 0}
                </p>
                <p className="text-[10px] text-text-muted">Messages</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
