"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star, Award, TrendingUp, Clock, CheckCircle,
  Shield, Target, Zap, Edit3, Save, X, MapPin, Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BADGE_ICONS: Record<string, string> = {
  TOP_VENDOR: "🏆",
  FAST_RESPONDER: "⚡",
  TRUSTED: "🛡️",
  RISING_STAR: "🌟",
  QUALITY_WORK: "✨",
  FIVE_STAR: "⭐",
  COMPLETED_10: "🔟",
  COMPLETED_50: "5️⃣0️⃣",
  COMPLETED_100: "💯",
};

export default function ReputationPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bio: "",
    skills: "",
    specialties: "",
    serviceRadius: 50,
    hourlyRate: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    latitude: "",
    longitude: "",
  });

  const userId = (session?.user as any)?.id;

  // Fetch leaderboard
  const { data: leaderboardData } = useQuery({
    queryKey: ["reputation-leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/network/reputation?sort=rating&limit=20");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Fetch own profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["reputation-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/network/reputation/${userId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!userId,
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/network/reputation/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reputation-profile"] });
      setEditing(false);
    },
  });

  const profile = profileData?.profile;
  const ratings = profileData?.ratings || [];
  const leaderboard = leaderboardData?.profiles || [];

  const startEditing = () => {
    if (profile) {
      setProfileForm({
        bio: profile.bio || "",
        skills: (profile.skills || []).join(", "),
        specialties: (profile.specialties || []).join(", "),
        serviceRadius: profile.serviceRadius || 50,
        hourlyRate: profile.hourlyRate?.toString() || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
        latitude: profile.latitude?.toString() || "",
        longitude: profile.longitude?.toString() || "",
      });
    }
    setEditing(true);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProfileForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleGeocode = async () => {
    const parts = [profileForm.address, profileForm.city, profileForm.state, profileForm.zipCode].filter(Boolean);
    if (parts.length === 0) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(parts.join(", "))}&limit=1`
      );
      const results = await res.json();
      if (results.length > 0) {
        setProfileForm((f) => ({
          ...f,
          latitude: parseFloat(results[0].lat).toFixed(6),
          longitude: parseFloat(results[0].lon).toFixed(6),
          // Also fill in city/state/zip if empty
          city: f.city || results[0].address?.city || results[0].address?.town || results[0].address?.village || f.city,
          state: f.state || results[0].address?.state || f.state,
          zipCode: f.zipCode || results[0].address?.postcode || f.zipCode,
        }));
      }
    } catch (e) {
      console.error("Geocode error:", e);
    }
  };

  const handleSave = () => {
    updateProfile.mutate({
      bio: profileForm.bio,
      skills: profileForm.skills.split(",").map((s) => s.trim()).filter(Boolean),
      specialties: profileForm.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      serviceRadius: profileForm.serviceRadius,
      hourlyRate: profileForm.hourlyRate ? parseFloat(profileForm.hourlyRate) : null,
      address: profileForm.address || null,
      city: profileForm.city || null,
      state: profileForm.state || null,
      zipCode: profileForm.zipCode || null,
      latitude: profileForm.latitude ? parseFloat(profileForm.latitude) : null,
      longitude: profileForm.longitude ? parseFloat(profileForm.longitude) : null,
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-text-dim"
            )}
          />
        ))}
        <span className="ml-1.5 text-sm font-medium text-text-secondary">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
              Reputation Board
            </h1>
            <p className="text-sm text-text-muted mt-1">Ratings, badges, and contractor rankings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Your Profile */}
          <div className="lg:col-span-1 space-y-4">
            {/* Profile Card */}
            <div className="bg-surface-hover border border-border-subtle rounded-2xl overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-cyan-500/20 to-blue-600/20" />
              <div className="px-5 pb-5 -mt-8">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-border-subtle shadow-lg">
                  {profile?.user?.image ? (
                    <img src={profile.user.image} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                  ) : (
                    (profile?.user?.name?.[0] || "?").toUpperCase()
                  )}
                </div>
                <h2 className="text-lg font-bold text-text-primary mt-2">{profile?.user?.name}</h2>
                <p className="text-xs text-text-muted">{profile?.user?.company}</p>

                {/* Rating */}
                <div className="mt-3">
                  {renderStars(profile?.avgRating || 0)}
                  <p className="text-xs text-text-muted mt-1">{profile?.totalRatings || 0} ratings</p>
                </div>

                {/* Availability Toggle */}
                {!editing && (
                  <button
                    onClick={() => updateProfile.mutate({ isAvailable: !profile?.isAvailable })}
                    className={cn(
                      "mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors border",
                      profile?.isAvailable
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-slate-500/10 text-text-secondary border-slate-500/20 hover:bg-slate-500/20"
                    )}
                  >
                    <span className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      profile?.isAvailable ? "bg-emerald-400" : "bg-slate-500"
                    )} />
                    {profile?.isAvailable ? "Available for Jobs" : "Unavailable"}
                  </button>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3 rounded-xl bg-surface-hover border border-border-subtle">
                    <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                      <CheckCircle className="h-3 w-3" /> Completed
                    </div>
                    <p className="text-xl font-bold text-text-primary">{profile?.completedJobs || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-hover border border-border-subtle">
                    <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                      <Target className="h-3 w-3" /> Active
                    </div>
                    <p className="text-xl font-bold text-text-primary">{profile?.activeJobs || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-hover border border-border-subtle">
                    <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                      <Shield className="h-3 w-3" /> Reliability
                    </div>
                    <p className="text-xl font-bold text-text-primary">{profile?.reliabilityScore || 100}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-hover border border-border-subtle">
                    <div className="flex items-center gap-1.5 text-text-secondary text-xs mb-1">
                      <Zap className="h-3 w-3" /> Rate
                    </div>
                    <p className="text-xl font-bold text-text-primary">
                      {profile?.hourlyRate ? `$${profile.hourlyRate}/hr` : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                {profile?.badges?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Badges</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.badges.map((badge: any) => (
                        <div
                          key={badge.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300"
                          title={badge.description}
                        >
                          <span>{BADGE_ICONS[badge.type] || "🏅"}</span>
                          <span>{badge.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location */}
                {!editing && (profile?.address || profile?.city || profile?.latitude) && (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Location
                    </h3>
                    {profile.address && (
                      <p className="text-sm text-text-secondary">{profile.address}</p>
                    )}
                    <p className="text-sm text-text-secondary">
                      {profile.city && profile.state
                        ? `${profile.city}, ${profile.state}${profile.zipCode ? ` ${profile.zipCode}` : ""}`
                        : profile.city || (!profile.address ? "Set your location" : "")}
                    </p>
                    {profile.latitude && profile.longitude && (
                      <a
                        href={`/dashboard/network/map?lat=${profile.latitude}&lng=${profile.longitude}`}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 mt-1 inline-flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" /> View on map
                      </a>
                    )}
                  </div>
                )}

                {/* Skills */}
                {!editing && profile?.skills?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((skill: string) => (
                        <span key={skill} className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs border border-cyan-500/20">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {!editing && profile?.bio && (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Bio</h3>
                    <p className="text-sm text-text-secondary">{profile.bio}</p>
                  </div>
                )}

                {/* Edit Form */}
                {editing && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">Bio</label>
                      <textarea
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">Skills (comma-separated)</label>
                      <input
                        type="text"
                        value={profileForm.skills}
                        onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary mb-1 block">Specialties</label>
                      <input
                        type="text"
                        value={profileForm.specialties}
                        onChange={(e) => setProfileForm({ ...profileForm, specialties: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-text-secondary mb-1 block">Radius (mi)</label>
                        <input
                          type="number"
                          value={profileForm.serviceRadius}
                          onChange={(e) => setProfileForm({ ...profileForm, serviceRadius: parseInt(e.target.value) || 50 })}
                          className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary mb-1 block">Rate ($/hr)</label>
                        <input
                          type="number"
                          value={profileForm.hourlyRate}
                          onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-text-secondary flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Base Location
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleGeocode}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                            title="Get coordinates from address"
                          >
                            <MapPin className="h-3 w-3" /> Geocode
                          </button>
                          <button
                            onClick={handleLocate}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <Navigation className="h-3 w-3" /> Auto-detect
                          </button>
                        </div>
                      </div>
                      <div className="mb-2">
                        <input
                          type="text"
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                          placeholder="Street address (e.g. 123 Main St)"
                          className="w-full px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={profileForm.city}
                          onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                          placeholder="City"
                          className="px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
                        />
                        <input
                          type="text"
                          value={profileForm.state}
                          onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                          placeholder="State"
                          className="px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        <input
                          type="text"
                          value={profileForm.zipCode}
                          onChange={(e) => setProfileForm({ ...profileForm, zipCode: e.target.value })}
                          placeholder="ZIP Code"
                          className="px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
                        />
                        <input
                          type="text"
                          value={profileForm.latitude}
                          onChange={(e) => setProfileForm({ ...profileForm, latitude: e.target.value })}
                          placeholder="Latitude"
                          className="px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
                        />
                        <input
                          type="text"
                          value={profileForm.longitude}
                          onChange={(e) => setProfileForm({ ...profileForm, longitude: e.target.value })}
                          placeholder="Longitude"
                          className="px-3 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-primary text-sm"
                        />
                      </div>
                      {(profileForm.latitude && profileForm.longitude) && (
                        <a
                          href={`/dashboard/network/map?lat=${profileForm.latitude}&lng=${profileForm.longitude}`}
                          className="mt-2 flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                        >
                          <MapPin className="h-3 w-3" /> View on map
                        </a>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30"
                      >
                        <Save className="h-4 w-4" /> Save
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-hover text-text-secondary text-sm hover:bg-surface-hover"
                      >
                        <X className="h-4 w-4" /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit Button */}
                {!editing && (
                  <button
                    onClick={startEditing}
                    className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-hover border border-border-subtle text-text-secondary text-sm hover:bg-surface-hover"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Recent Ratings */}
            <div className="bg-surface-hover border border-border-subtle rounded-2xl p-5">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Recent Ratings</h3>
              {ratings.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">No ratings yet</p>
              ) : (
                <div className="space-y-3">
                  {ratings.slice(0, 5).map((rating: any) => (
                    <div key={rating.id} className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {(rating.raterUser?.name?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-text-primary">{rating.raterUser?.name}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} className={cn("h-3 w-3", i <= rating.score ? "text-amber-400 fill-amber-400" : "text-text-dim")} />
                            ))}
                          </div>
                        </div>
                        {rating.comment && <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{rating.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Leaderboard */}
          <div className="lg:col-span-2">
            <div className="bg-surface-hover border border-border-subtle rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border-subtle">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  Top Contractors
                </h2>
                <p className="text-xs text-text-muted mt-1">Ranked by rating, reliability, and completed jobs</p>
              </div>

              <div className="divide-y divide-border-subtle">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-16">
                    <Award className="h-12 w-12 text-text-dim mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-text-secondary">No rankings yet</h3>
                    <p className="text-sm text-text-muted mt-1">Complete jobs and earn ratings to appear here</p>
                  </div>
                ) : (
                  leaderboard.map((p: any, index: number) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors",
                        p.userId === userId && "bg-cyan-500/5"
                      )}
                    >
                      {/* Rank */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        index === 0 ? "bg-amber-500/20 text-amber-300" :
                        index === 1 ? "bg-slate-400/20 text-text-secondary" :
                        index === 2 ? "bg-orange-500/20 text-orange-300" :
                        "bg-surface-hover text-text-muted"
                      )}>
                        {index + 1}
                      </div>

                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {p.user?.image ? (
                          <img src={p.user.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          (p.user?.name?.[0] || "?").toUpperCase()
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text-primary truncate">
                            {p.user?.name}
                            {p.userId === userId && <span className="text-cyan-400 ml-1">(You)</span>}
                          </span>
                          {p.badges?.slice(0, 3).map((badge: any) => (
                            <span key={badge.id} title={badge.description}>
                              {BADGE_ICONS[badge.type] || "🏅"}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-text-muted">{p.user?.company}</p>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            <span className="font-bold text-text-primary">{p.avgRating?.toFixed(1) || "0.0"}</span>
                          </div>
                          <p className="text-[10px] text-text-muted">Rating</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-text-primary">{p.completedJobs || 0}</p>
                          <p className="text-[10px] text-text-muted">Jobs</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-text-primary">{p.reliabilityScore || 100}%</p>
                          <p className="text-[10px] text-text-muted">Reliability</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
