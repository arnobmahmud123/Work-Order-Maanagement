"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCreateWorkOrder } from "@/hooks/use-data";
import { Button, Input, Textarea, Select, Card, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Camera, Upload, X, Building2, BookOpen, ClipboardList, Check, Sparkles, MapPin, Calendar, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { WorkOrderTemplateSelector } from "@/components/work-orders/template-selector";
import { WorkOrderTemplate } from "@/lib/work-order-templates";

const serviceOptions = [
  { value: "GRASS_CUT", label: "Grass Cut" },
  { value: "DEBRIS_REMOVAL", label: "Debris Removal" },
  { value: "WINTERIZATION", label: "Winterization" },
  { value: "BOARD_UP", label: "Board-Up" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "MOLD_REMEDIATION", label: "Mold Remediation" },
  { value: "OTHER", label: "Other (Custom)" },
];

const priorityOptions = [
  { value: "0", label: "Low" },
  { value: "1", label: "Medium" },
  { value: "2", label: "High" },
  { value: "3", label: "Critical" },
];

export default function NewWorkOrderPage() {
  const router = useRouter();
  const createMutation = useCreateWorkOrder();

  const [form, setForm] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    serviceType: "GRASS_CUT",
    customServiceType: "",
    dueDate: "",
    priority: "1",
    lockCode: "",
    gateCode: "",
    keyCode: "",
    specialInstructions: "",
    tasks: [] as any[],
  });

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [propertyPhoto, setPropertyPhoto] = useState<string | null>(null);
  const [propertyPhotoFile, setPropertyPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const showCustomService = form.serviceType === "OTHER";

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    setPropertyPhotoFile(file);
    setPropertyPhoto(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (propertyPhoto) URL.revokeObjectURL(propertyPhoto);
    setPropertyPhoto(null);
    setPropertyPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function handleTemplateSelect(template: WorkOrderTemplate) {
    setForm(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      serviceType: template.serviceType,
      specialInstructions: template.specialInstructions || prev.specialInstructions,
      tasks: template.tasks.map((t, i) => ({
        id: `task-tpl-${Date.now()}-${i}`,
        title: t.title,
        description: t.description,
        completed: false,
        photos: [],
        expanded: false,
      })),
    }));
    setShowTemplateSelector(false);
    toast.success(`Template applied: ${template.title}`, {
      icon: '✨',
      style: {
        borderRadius: '12px',
        background: '#0a0a14',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)'
      }
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title || !form.address) {
      toast.error("Title and address are required");
      return;
    }

    if (showCustomService && !form.customServiceType.trim()) {
      toast.error("Please specify the service type");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("address", form.address);
      formData.append("city", form.city);
      formData.append("state", form.state);
      formData.append("zipCode", form.zipCode);
      formData.append("serviceType", form.serviceType);
      if (showCustomService) {
        formData.append("customServiceType", form.customServiceType);
      }
      formData.append("dueDate", form.dueDate);
      formData.append("priority", form.priority);
      formData.append("lockCode", form.lockCode);
      formData.append("gateCode", form.gateCode);
      formData.append("keyCode", form.keyCode);
      formData.append("specialInstructions", form.specialInstructions);
      formData.append("tasks", JSON.stringify(form.tasks));
      
      if (propertyPhotoFile) {
        formData.append("propertyPhoto", propertyPhotoFile);
      }

      await createMutation.mutateAsync(formData);
      toast.success("Work order created successfully");
      router.push("/dashboard/work-orders");
    } catch (err: any) {
      toast.error(err.message || "Failed to create work order");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header with Glass Gradient */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="purple" size="sm" className="bg-purple-500/10 text-purple-400 border-purple-500/20">New Record</Badge>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Inventory Management</span>
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">Create Work Order</h1>
          <p className="text-text-secondary mt-1.5 text-sm font-medium">Standardize your workflow with industry templates or create a custom job.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => setShowTemplateSelector(true)}
            className="group"
          >
            <Sparkles className="h-4 w-4 mr-2 text-cyan-400 group-hover:animate-pulse" />
            Browse Templates
          </Button>
          <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section: Basic Information */}
          <Card variant="glass" className="overflow-visible">
            <CardHeader>
              <div>
                <CardTitle size="sm" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-cyan-400" />
                  Basic Information
                </CardTitle>
                <CardDescription>Primary details and service classification</CardDescription>
              </div>
            </CardHeader>
            <div className="space-y-6 pt-2">
              <Input
                label="Job Title"
                placeholder="e.g., Initial Secure - 123 Main St"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="text-lg font-bold"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 ml-1">Service Classification</label>
                  <div className="relative">
                    <select
                      value={form.serviceType}
                      onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                      className="w-full bg-surface-hover border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary focus:border-cyan-500/50 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 appearance-none cursor-pointer"
                    >
                      {serviceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-surface">{opt.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {showCustomService && (
                  <Input
                    label="Custom Service Type"
                    placeholder="Specify the service..."
                    value={form.customServiceType}
                    onChange={(e) => setForm({ ...form, customServiceType: e.target.value })}
                    required
                  />
                )}

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 ml-1">Job Priority</label>
                  <div className="flex gap-2">
                    {priorityOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm({ ...form, priority: opt.value })}
                        className={cn(
                          "flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all",
                          form.priority === opt.value
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "bg-surface-hover border-border-subtle text-text-muted hover:text-text-secondary"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Textarea
                label="Public Description"
                placeholder="Provide a general overview of the work to be performed..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </Card>

          {/* Section: Location & Access */}
          <Card variant="glass">
            <CardHeader>
              <div>
                <CardTitle size="sm" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  Location & Access
                </CardTitle>
                <CardDescription>Address details and entry requirements</CardDescription>
              </div>
            </CardHeader>
            <div className="space-y-6 pt-2">
              <Input
                label="Site Address"
                placeholder="Full street address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <Input
                    label="City"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <Input
                  label="State"
                  placeholder="ST"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
                <Input
                  label="Zip"
                  placeholder="00000"
                  value={form.zipCode}
                  onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-border-subtle grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Lock Code"
                  placeholder="Key Box Code"
                  value={form.lockCode}
                  onChange={(e) => setForm({ ...form, lockCode: e.target.value })}
                  icon={<ClipboardList className="h-4 w-4" />}
                />
                <Input
                  label="Gate Code"
                  placeholder="Entry Code"
                  value={form.gateCode}
                  onChange={(e) => setForm({ ...form, gateCode: e.target.value })}
                  icon={<Building2 className="h-4 w-4" />}
                />
                <Input
                  label="Key Code"
                  placeholder="HUD / Key Code"
                  value={form.keyCode}
                  onChange={(e) => setForm({ ...form, keyCode: e.target.value })}
                  icon={<Check className="h-4 w-4" />}
                />
              </div>
            </div>
          </Card>

          {/* Section: Instructions */}
          <Card variant="glass">
            <CardHeader>
              <div>
                <CardTitle size="sm" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-400" />
                  Special Instructions
                </CardTitle>
                <CardDescription>Critical guidance for field technicians</CardDescription>
              </div>
            </CardHeader>
            <div className="pt-2">
              <Textarea
                placeholder="Add any specific requirements, safety warnings, or client-specific notes..."
                value={form.specialInstructions}
                onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
                rows={5}
                className="bg-surface-hover border-dashed"
              />
              <div className="mt-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                  These instructions will be highlighted to the contractor in the mobile app. Be clear about safety hazards or specific client lock set requirements.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Property Image Upload */}
          <Card variant="glass" className="overflow-hidden">
            <CardHeader>
              <CardTitle size="sm">Property Photo</CardTitle>
            </CardHeader>
            <div className="relative aspect-video rounded-xl overflow-hidden bg-surface border border-border-subtle group">
              {propertyPhoto ? (
                <>
                  <img src={propertyPhoto} alt="Preview" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="p-2.5 rounded-full bg-surface-hover hover:bg-surface-hover backdrop-blur-md text-white transition-all"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="p-2.5 rounded-full bg-rose-500/20 hover:bg-rose-500/40 backdrop-blur-md text-rose-400 transition-all"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-dim hover:text-text-secondary hover:bg-surface-hover transition-all"
                >
                  <div className="h-12 w-12 rounded-full bg-surface-hover border border-border-subtle flex items-center justify-center">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Upload Front View</p>
                    <p className="text-[10px] opacity-60 mt-0.5">JPG, PNG (max 5MB)</p>
                  </div>
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
          </Card>

          {/* Scheduling */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle size="sm" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-400" />
                Scheduling
              </CardTitle>
            </CardHeader>
            <div className="space-y-4 pt-2">
              <Input
                label="Target Due Date"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                required
              />
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-text-secondary font-medium leading-relaxed">
                  The system will automatically flag this order as overdue if not completed by 11:59 PM on this date.
                </p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              type="submit"
              variant="primary"
              className="w-full h-14 text-base shadow-cyan-500/20"
              isLoading={createMutation.isPending}
            >
              Initialize Work Order
              <ClipboardList className="ml-3 h-5 w-5" />
            </Button>
            <p className="text-center text-[10px] font-bold text-text-dim uppercase tracking-widest">
              Standard Processing: Ready in 2-3s
            </p>
          </div>
        </div>
      </form>

      {/* Template Selection Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowTemplateSelector(false)} />
          <Card variant="glass" className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in border-cyan-500/20 shadow-2xl shadow-cyan-500/10">
            <CardHeader className="border-b border-border-subtle pb-4">
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Templates</span>
                  </div>
                  <CardTitle>Partner Templates</CardTitle>
                  <CardDescription>Select a pre-configured workflow from our partners</CardDescription>
                </div>
                <button
                  onClick={() => setShowTemplateSelector(false)}
                  className="h-10 w-10 rounded-full hover:bg-surface-hover flex items-center justify-center transition-colors"
                >
                  <X className="h-6 w-6 text-text-muted" />
                </button>
              </div>
            </CardHeader>
            <div className="p-6 overflow-y-auto">
              <WorkOrderTemplateSelector onSelect={handleTemplateSelect} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
