"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Briefcase, MapPin, Clock, DollarSign, AlertTriangle,
  CheckCircle, XCircle, Users, Filter, Search, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  OFFERED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  ASSIGNED: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  COMPLETED: "bg-green-500/20 text-green-300 border-green-500/30",
  CANCELLED: "bg-slate-500/20 text-text-secondary border-slate-500/30",
};

const URGENCY_COLORS: Record<string, string> = {
  LOW: "text-text-secondary",
  MEDIUM: "text-blue-400",
  HIGH: "text-amber-400",
  CRITICAL: "text-rose-400",
};

export default function JobMarketplacePage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [offerMessage, setOfferMessage] = useState("");
  const [showOfferModal, setShowOfferModal] = useState(false);

  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  // Fetch jobs
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ["network-jobs", statusFilter, urgencyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      if (urgencyFilter) params.set("urgency", urgencyFilter);
      const res = await fetch(`/api/network/jobs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  // Fetch job details
  const { data: jobDetail } = useQuery({
    queryKey: ["network-job-detail", selectedJob?.id],
    queryFn: async () => {
      if (!selectedJob?.id) return null;
      const res = await fetch(`/api/network/jobs/${selectedJob.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedJob?.id,
  });

  // Take job mutation
  const takeJob = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/network/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "take_it" }),
      });
      if (!res.ok) throw new Error("Failed to take job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["network-job-detail"] });
    },
  });

  // Submit offer mutation
  const submitOffer = useMutation({
    mutationFn: async ({ jobId, message }: { jobId: string; message: string }) => {
      const res = await fetch(`/api/network/jobs/${jobId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to submit offer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-job-detail"] });
      setShowOfferModal(false);
      setOfferMessage("");
    },
  });

  // Accept/reject offer mutation
  const handleOffer = useMutation({
    mutationFn: async ({ jobId, offerId, action }: { jobId: string; offerId: string; action: string }) => {
      const res = await fetch(`/api/network/jobs/${jobId}/offers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, action }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["network-job-detail"] });
    },
  });

  const jobs = jobsData?.jobs || [];
  const job = jobDetail?.job;
  const filteredJobs = search
    ? jobs.filter((j: any) =>
        j.post?.title?.toLowerCase().includes(search.toLowerCase()) ||
        j.scopeOfWork?.toLowerCase().includes(search.toLowerCase()) ||
        j.location?.toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              Job Marketplace
            </h1>
            <p className="text-sm text-text-muted mt-1">Find coverage opportunities or post your needs</p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Job List */}
          <div className="flex-1 min-w-0">
            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search jobs..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/30 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
              >
                <option value="">All Urgency</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Job Cards */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-surface-hover border border-border-subtle rounded-2xl p-5 animate-pulse">
                    <div className="h-5 w-48 bg-surface-hover rounded mb-3" />
                    <div className="h-4 w-full bg-surface-hover rounded mb-2" />
                    <div className="h-4 w-2/3 bg-surface-hover rounded" />
                  </div>
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase className="h-12 w-12 text-text-dim mx-auto mb-3" />
                <h3 className="text-lg font-medium text-text-secondary">No jobs found</h3>
                <p className="text-sm text-text-muted mt-1">Check back later or adjust your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((j: any) => (
                  <div
                    key={j.id}
                    onClick={() => setSelectedJob(j)}
                    className={cn(
                      "bg-surface-hover border rounded-2xl p-5 cursor-pointer transition-all hover:border-border-medium",
                      selectedJob?.id === j.id ? "border-emerald-500/30 ring-1 ring-emerald-500/10" : "border-border-subtle"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", STATUS_COLORS[j.status])}>
                            {j.status?.replace(/_/g, " ")}
                          </span>
                          <span className={cn("text-xs font-medium", URGENCY_COLORS[j.urgency])}>
                            {j.urgency === "CRITICAL" && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                            {j.urgency}
                          </span>
                        </div>
                        <h3 className="font-semibold text-text-primary text-sm">{j.post?.title || "Untitled Job"}</h3>
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">{j.scopeOfWork}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-text-dim shrink-0" />
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {j.city ? `${j.city}, ${j.state}` : j.location}
                      </span>
                      {j.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Due {new Date(j.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {j.budget && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> ${j.budget}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {j._count?.offers || 0} offers
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Job Detail Panel */}
          <div className="w-96 shrink-0 hidden lg:block">
            <div className="sticky top-6">
              {job ? (
                <div className="bg-surface-hover border border-border-subtle rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-border-subtle">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", STATUS_COLORS[job.status])}>
                        {job.status?.replace(/_/g, " ")}
                      </span>
                      <span className={cn("text-xs font-medium", URGENCY_COLORS[job.urgency])}>
                        {job.urgency} urgency
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-text-primary">{job.post?.title}</h2>
                    <p className="text-sm text-text-secondary mt-2">{job.scopeOfWork}</p>
                  </div>

                  <div className="p-5 space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}{job.city ? `, ${job.city}, ${job.state}` : ""}</span>
                    </div>
                    {job.deadline && (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Clock className="h-4 w-4" />
                        <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                    {job.budget && (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <DollarSign className="h-4 w-4" />
                        <span>Budget: ${job.budget}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Briefcase className="h-4 w-4" />
                      <span>Posted by {job.requester?.name}</span>
                    </div>
                    {job.workOrder && (
                      <a
                        href={`/dashboard/work-orders/${job.workOrder.id}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-300 hover:bg-blue-500/10 mt-2"
                      >
                        📋 {job.workOrder.title} — {job.workOrder.address}
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  {job.status === "OPEN" && job.requesterId !== userId && (
                    <div className="p-5 border-t border-border-subtle space-y-2">
                      <button
                        onClick={() => takeJob.mutate(job.id)}
                        className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-medium text-sm hover:bg-emerald-500/30 border border-emerald-500/20 transition-colors"
                      >
                        I'll Take It
                      </button>
                      <button
                        onClick={() => setShowOfferModal(true)}
                        className="w-full py-2.5 rounded-xl bg-surface-hover text-text-secondary text-sm hover:bg-surface-hover border border-border-subtle transition-colors"
                      >
                        Submit Offer
                      </button>
                    </div>
                  )}

                  {/* Offers (for requester) */}
                  {job.requesterId === userId && job.offers?.length > 0 && (
                    <div className="p-5 border-t border-border-subtle">
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                        Offers ({job.offers.length})
                      </h3>
                      <div className="space-y-2">
                        {job.offers.map((offer: any) => (
                          <div key={offer.id} className="p-3 rounded-xl bg-surface-hover border border-border-subtle">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-text-primary">{offer.offeror?.name}</span>
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full",
                                offer.status === "PENDING" ? "bg-amber-500/20 text-amber-300" :
                                offer.status === "ACCEPTED" ? "bg-green-500/20 text-green-300" :
                                "bg-slate-500/20 text-text-secondary"
                              )}>
                                {offer.status}
                              </span>
                            </div>
                            {offer.message && <p className="text-xs text-text-secondary mt-1">{offer.message}</p>}
                            {offer.status === "PENDING" && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleOffer.mutate({ jobId: job.id, offerId: offer.id, action: "accept" })}
                                  className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs hover:bg-emerald-500/30"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleOffer.mutate({ jobId: job.id, offerId: offer.id, action: "reject" })}
                                  className="flex-1 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs hover:bg-rose-500/30"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assigned contractor */}
                  {job.assignedTo && (
                    <div className="p-5 border-t border-border-subtle">
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Assigned To</h3>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {(job.assignedTo.name?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{job.assignedTo.name}</p>
                          <p className="text-xs text-text-muted">{job.assignedTo.company}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-surface-hover border border-border-subtle rounded-2xl p-5 text-center">
                  <Briefcase className="h-10 w-10 text-text-dim mx-auto mb-3" />
                  <p className="text-sm text-text-secondary">Select a job to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOfferModal(false)} />
          <div className="relative bg-surface-hover border border-border-subtle rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-4">Submit Offer</h2>
            <p className="text-sm text-text-secondary mb-4">
              For: <span className="text-text-primary">{job.post?.title}</span>
            </p>
            <textarea
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              placeholder="Describe why you're a good fit, your proposed approach, timeline..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/40 text-sm resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowOfferModal(false)}
                className="flex-1 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary border border-border-subtle"
              >
                Cancel
              </button>
              <button
                onClick={() => submitOffer.mutate({ jobId: job.id, message: offerMessage })}
                disabled={!offerMessage.trim()}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium disabled:opacity-50"
              >
                Submit Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
