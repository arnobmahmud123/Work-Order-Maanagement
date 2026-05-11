"use client";

import { useState } from "react";
import { useAIAutoBid } from "@/hooks/use-data";
import { Button, Card, CardHeader, CardTitle, Select, Badge } from "@/components/ui";
import {
  Sparkles,
  FileText,
  DollarSign,
  Clock,
  Wrench,
  Copy,
  Check,
  Calculator,
} from "lucide-react";
import { SERVICE_TYPE_LABELS, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AutoBidPage() {
  const autoBid = useAIAutoBid();
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    serviceType: "",
    address: "",
    city: "",
    state: "",
    notes: "",
    estimatedLaborHours: "",
    estimatedMaterials: "",
    estimatedCost: "",
    reason: "",
  });

  const [result, setResult] = useState<any>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.serviceType || !form.address || !form.notes) {
      toast.error("Service type, address, and notes are required");
      return;
    }

    try {
      const res = await autoBid.mutateAsync({
        serviceType: form.serviceType,
        address: form.address,
        city: form.city || undefined,
        state: form.state || undefined,
        notes: form.notes,
        estimatedLaborHours: form.estimatedLaborHours
          ? parseFloat(form.estimatedLaborHours)
          : undefined,
        estimatedMaterials: form.estimatedMaterials || undefined,
        estimatedCost: form.estimatedCost
          ? parseFloat(form.estimatedCost)
          : undefined,
        reason: form.reason || undefined,
      });
      setResult(res);
    } catch {
      toast.error("Failed to generate bid");
    }
  }

  function handleCopy() {
    if (result?.bid) {
      navigator.clipboard.writeText(result.bid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Bid copied to clipboard");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          <Sparkles className="inline h-6 w-6 mr-2 text-cyan-400" />
          AI Auto-Bid
        </h1>
        <p className="text-text-muted mt-1">
          Generate a polished bid proposal from minimal notes. Just describe the
          job — AI handles the rest.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input form */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Service Type *
              </label>
              <select
                value={form.serviceType}
                onChange={(e) =>
                  setForm({ ...form, serviceType: e.target.value })
                }
                className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
              >
                <option value="">Select service type</option>
                {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  placeholder="123 Main St"
                  className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) =>
                      setForm({ ...form, city: e.target.value })
                    }
                    placeholder="City"
                    className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value })
                    }
                    placeholder="ST"
                    className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Notes / Description *
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Describe the job in your own words. Even a few bullet points work — AI will polish it into a professional bid."
                rows={4}
                className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm resize-y"
              />
              <p className="text-[10px] text-text-muted mt-1">
                💡 Tip: Include specific details like "2 hours labor, $50 for
                plywood, 3 windows to board up"
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Labor Hours
                </label>
                <input
                  type="number"
                  value={form.estimatedLaborHours}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estimatedLaborHours: e.target.value,
                    })
                  }
                  placeholder="2"
                  className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Materials
                </label>
                <input
                  type="text"
                  value={form.estimatedMaterials}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estimatedMaterials: e.target.value,
                    })
                  }
                  placeholder="Plywood, screws"
                  className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Est. Cost ($)
                </label>
                <input
                  type="number"
                  value={form.estimatedCost}
                  onChange={(e) =>
                    setForm({ ...form, estimatedCost: e.target.value })
                  }
                  placeholder="150"
                  className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Additional Context / Reason
              </label>
              <textarea
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value })
                }
                placeholder="Why is this work needed? Any special circumstances?"
                rows={2}
                className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm resize-y"
              />
            </div>

            <Button
              type="submit"
              loading={autoBid.isPending}
              className="w-full"
            >
              <Sparkles className="h-4 w-4" />
              Generate Bid
            </Button>
          </form>
        </Card>

        {/* Result */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card padding={false}>
                  <div className="p-4 text-center">
                    <DollarSign className="h-5 w-5 mx-auto text-green-600 mb-1" />
                    <p className="text-lg font-bold text-text-primary">
                      ${result.subtotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-text-muted">Subtotal</p>
                  </div>
                </Card>
                <Card padding={false}>
                  <div className="p-4 text-center">
                    <Calculator className="h-5 w-5 mx-auto text-cyan-400 mb-1" />
                    <p className="text-lg font-bold text-text-primary">
                      ${result.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-text-muted">Total</p>
                  </div>
                </Card>
                <Card padding={false}>
                  <div className="p-4 text-center">
                    <Clock className="h-5 w-5 mx-auto text-amber-600 mb-1" />
                    <p className="text-sm font-bold text-text-primary">
                      {result.estimatedDuration}
                    </p>
                    <p className="text-xs text-text-muted">Duration</p>
                  </div>
                </Card>
              </div>

              {/* Line items */}
              <Card>
                <CardHeader>
                  <CardTitle>Line Items</CardTitle>
                </CardHeader>
                <div className="space-y-2">
                  {result.lineItems.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 bg-surface-hover rounded-lg text-sm"
                    >
                      <div>
                        <p className="font-medium text-text-primary">
                          {item.description}
                        </p>
                        <p className="text-xs text-text-muted">
                          {item.quantity} {item.unit} × ${item.rate.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-semibold text-text-primary">
                        ${item.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Full bid document */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Generated Bid</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <div className="bg-surface-hover rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-text-dim whitespace-pre-wrap font-sans">
                    {result.bid}
                  </pre>
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <div className="p-12 text-center text-text-muted">
                <FileText className="h-16 w-16 mx-auto mb-4 text-text-primary" />
                <p className="font-medium">No bid generated yet</p>
                <p className="text-sm mt-1">
                  Fill in the job details and click "Generate Bid" to create a
                  professional proposal.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
