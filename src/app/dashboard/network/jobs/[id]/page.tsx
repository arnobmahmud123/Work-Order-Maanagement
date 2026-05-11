"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Briefcase, MapPin, Clock, DollarSign,
  AlertTriangle, CheckCircle, Users, MessageCircle,
  Star, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NetworkChat } from "@/components/network/network-chat";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  ASSIGNED: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  COMPLETED: "bg-green-500/20 text-green-300 border-green-500/30",
  CANCELLED: "bg-slate-500/20 text-text-secondary border-slate-500/30",
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showChat, setShowChat] = useState(false);
  const [offerMessage, setOfferMessage] = useState("");
  const [showOfferModal, setShowOfferModal] = useState(false);

  const jobId = params.id as string;
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;

  // Fetch job
  const { data: jobData, isLoading } = useQuery({
    queryKey: ["network-job", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/network/jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Take job
  const takeJob = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/network/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "take_it" }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["network-job"] }),
  });

  // Submit offer
  const submitOffer = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/network/jobs/${jobId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: offerMessage }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["network-job"] });
      setShowOfferModal(false);
      setOfferMessage("");
    },
  });

  // Handle offer (accept/reject)
  const handleOffer = useMutation({
    mutationFn: async ({ offerId, action }: { offerId: string; action: string }) => {
      const res = await fetch(`/api/network/jobs/${jobId}/offers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, action }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["network-job"] }),
  });

  // Complete job
  const completeJob = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/network/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["network-job"] }),
  });

  const job = jobData?.job;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Loading job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">Job not found</p>
        <button onClick={() => router.push("/dashboard/network/jobs")} className="text-cyan-400 text-sm">
          ← Back to marketplace
        </button>
      </div>
    );
  }

  const isRequester = job.requesterId === userId;
  const isAssigned = job.assignedToId === userId;
  const canTake = job.status === "OPEN" && !isRequester;
  const canComplete = (isRequester || isAssigned) && job.status === "IN_PROGRESS";

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button
          onClick={() => router.push("/dashboard/network/jobs")}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-4">
            {/* Job Header */}
            <div className="bg-surface-hover border border-border-subtle rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium", STATUS_COLORS[job.status])}>
                  {job.status?.replace(/_/g, " ")}
                </span>
                <span className={cn("text-xs font-medium",
                  job.urgency === "CRITICAL" ? "text-rose-400" :
                  job.urgency === "HIGH" ? "text-amber-400" :
                  "text-text-secondary"
                )}>
                  {job.urgency === "CRITICAL" && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                  {job.urgency} urgency
                </span>
              </div>

              <h1 className="text-xl font-bold text-text-primary">{job.post?.title}</h1>
              <p className="text-sm text-text-secondary mt-3 leading-relaxed">{job.scopeOfWork}</p>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {job.location}{job.city ? `, ${job.city}, ${job.state}` : ""}
                </span>
                {job.deadline && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Due {new Date(job.deadline).toLocaleDateString()}
                  </span>
                )}
                {job.budget && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Budget: ${job.budget}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {job.offers?.length || 0} offers
                </span>
              </div>

              {job.workOrder && (
                <a
                  href={`/dashboard/work-orders/${job.workOrder.id}`}
                  className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-sm text-blue-300 hover:bg-blue-500/10 w-fit"
                >
                  <ExternalLink className="h-4 w-4" />
                  {job.workOrder.title} — {job.workOrder.address}
                </a>
              )}

              {/* Tags */}
              {job.post?.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {job.post.tags.map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Offers Section */}
            {(isRequester || role === "ADMIN") && job.offers?.length > 0 && (
              <div className="bg-surface-hover border border-border-subtle rounded-2xl p-5">
                <h2 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-text-secondary" />
                  Offers ({job.offers.length})
                </h2>
                <div className="space-y-3">
                  {job.offers.map((offer: any) => (
                    <div key={offer.id} className="p-4 rounded-xl bg-surface-hover border border-border-subtle">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {offer.offeror?.image ? (
                              <img src={offer.offeror.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              (offer.offeror?.name?.[0] || "?").toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{offer.offeror?.name}</p>
                            <p className="text-xs text-text-muted">{offer.offeror?.company}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          offer.status === "PENDING" ? "bg-amber-500/20 text-amber-300" :
                          offer.status === "ACCEPTED" ? "bg-green-500/20 text-green-300" :
                          offer.status === "REJECTED" ? "bg-rose-500/20 text-rose-300" :
                          "bg-slate-500/20 text-text-secondary"
                        )}>
                          {offer.status}
                        </span>
                      </div>
                      {offer.message && <p className="text-sm text-text-secondary mt-2">{offer.message}</p>}
                      {offer.proposedBudget && (
                        <p className="text-xs text-text-secondary mt-1">Proposed: ${offer.proposedBudget}</p>
                      )}
                      {offer.status === "PENDING" && isRequester && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleOffer.mutate({ offerId: offer.id, action: "accept" })}
                            className="flex-1 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm hover:bg-emerald-500/30 border border-emerald-500/20"
                          >
                            Accept Offer
                          </button>
                          <button
                            onClick={() => handleOffer.mutate({ offerId: offer.id, action: "reject" })}
                            className="flex-1 py-2 rounded-xl bg-rose-500/10 text-rose-300 text-sm hover:bg-rose-500/20 border border-rose-500/10"
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

            {/* Discussion */}
            <div className="bg-surface-hover border border-border-subtle rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowChat(!showChat)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-hover"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-text-primary">Job Discussion</span>
                </div>
                <span className="text-xs text-text-muted">{showChat ? "Hide" : "Show"}</span>
              </button>
              {showChat && job.workOrderId && (
                <NetworkChat workOrderId={job.workOrderId} className="border-0 rounded-none" />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Requester */}
            <div className="bg-surface-hover border border-border-subtle rounded-2xl p-5">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Posted By</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {(job.requester?.name?.[0] || "?").toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{job.requester?.name}</p>
                  <p className="text-xs text-text-muted">{job.requester?.company}</p>
                </div>
              </div>
            </div>

            {/* Assigned contractor */}
            {job.assignedTo && (
              <div className="bg-surface-hover border border-border-subtle rounded-2xl p-5">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Assigned To</h3>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
                    {(job.assignedTo.name?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{job.assignedTo.name}</p>
                    <p className="text-xs text-text-muted">{job.assignedTo.company}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-surface-hover border border-border-subtle rounded-2xl p-5 space-y-2">
              {canTake && (
                <>
                  <button
                    onClick={() => takeJob.mutate()}
                    className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-medium text-sm hover:bg-emerald-500/30 border border-emerald-500/20"
                  >
                    I'll Take It
                  </button>
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="w-full py-2.5 rounded-xl bg-surface-hover text-text-secondary text-sm hover:bg-surface-hover border border-border-subtle"
                  >
                    Submit Offer
                  </button>
                </>
              )}
              {canComplete && (
                <button
                  onClick={() => completeJob.mutate()}
                  className="w-full py-2.5 rounded-xl bg-green-500/20 text-green-300 font-medium text-sm hover:bg-green-500/30 border border-green-500/20"
                >
                  Mark Complete
                </button>
              )}
              {isRequester && job.status === "OPEN" && (
                <button
                  onClick={() => {
                    fetch(`/api/network/jobs/${jobId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "cancel" }),
                    }).then(() => queryClient.invalidateQueries({ queryKey: ["network-job"] }));
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/10 text-rose-300 text-sm hover:bg-rose-500/20 border border-rose-500/10"
                >
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOfferModal(false)} />
          <div className="relative bg-surface-hover border border-border-subtle rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-4">Submit Offer</h2>
            <textarea
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              placeholder="Why are you a good fit? Proposed approach, timeline..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-hover border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/40 text-sm resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowOfferModal(false)} className="flex-1 py-2 rounded-xl text-sm text-text-secondary border border-border-subtle">
                Cancel
              </button>
              <button
                onClick={() => submitOffer.mutate()}
                disabled={!offerMessage.trim()}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
