"use client";

import { useState } from "react";
import { useAIContractorFinder, useAIAutoMessage } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Card, CardHeader, CardTitle, Avatar, Badge, Select } from "@/components/ui";
import {
  Search,
  MapPin,
  Star,
  Phone,
  Mail,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";
import { SERVICE_TYPE_LABELS, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ContractorFinderPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [serviceType, setServiceType] = useState("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(100);
  const [search, setSearch] = useState(false);

  const { data, isLoading } = useAIContractorFinder(
    search ? serviceType : undefined,
    search ? location : undefined,
    search ? radius : undefined
  );

  const contractors = data?.contractors || [];

  function handleSearch() {
    if (!serviceType && !location) {
      toast.error("Please enter a service type or location");
      return;
    }
    setSearch(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          <Users className="inline h-6 w-6 mr-2 text-cyan-400" />
          Contractor Finder
        </h1>
        <p className="text-text-muted mt-1">
          Find the best contractors for your job based on performance, availability,
          and location.
        </p>
      </div>

      {/* Search filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Service Type
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
            >
              <option value="">All Services</option>
              {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, state, zip, or address..."
                className="w-full pl-10 pr-3 py-2 border border-border-medium rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Search Radius
            </label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
            >
              <option value={25}>25 miles</option>
              <option value={50}>50 miles</option>
              <option value={100}>100 miles</option>
              <option value={200}>200 miles</option>
              <option value={500}>500 miles</option>
              <option value={1000}>1,000 miles</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleSearch} className="w-full">
              <Search className="h-4 w-4" />
              Find Contractors
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Searching...</div>
      ) : search && contractors.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-text-muted">
            <Users className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No contractors found</p>
            <p className="text-sm mt-1">Try increasing the search radius or broadening your search criteria.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {contractors.map((c: any) => (
            <ContractorCard key={c.id} contractor={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContractorCard({ contractor }: { contractor: any }) {
  const autoMessage = useAIAutoMessage();
  const [showContact, setShowContact] = useState(false);

  const stats = contractor.stats;
  const scoreColor =
    stats.overallScore >= 80
      ? "text-green-600 bg-green-50"
      : stats.overallScore >= 60
        ? "text-yellow-600 bg-yellow-50"
        : "text-red-600 bg-red-50";

  return (
    <Card>
      <div className="flex items-start gap-4">
        <Avatar
          name={contractor.name}
          src={contractor.image}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-text-primary">
              {contractor.name}
            </h3>
            <Badge className={cn("text-xs", scoreColor)}>
              Score: {stats.overallScore}
            </Badge>
          </div>
          {contractor.company && (
            <p className="text-xs text-text-muted">{contractor.company}</p>
          )}
          {contractor.profile?.address && (
            <p className="text-xs text-text-muted flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {contractor.profile.address}
              {contractor.profile.city && `, ${contractor.profile.city}`}
              {contractor.profile.state && `, ${contractor.profile.state}`}
              {contractor.distanceMiles !== null && (
                <span className="ml-1 text-cyan-400 font-medium">· {contractor.distanceMiles} mi</span>
              )}
            </p>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center p-2 bg-surface-hover rounded-lg">
              <p className="text-lg font-bold text-text-primary">
                {stats.completedJobs}
              </p>
              <p className="text-[10px] text-text-muted">Completed</p>
            </div>
            <div className="text-center p-2 bg-surface-hover rounded-lg">
              <p className="text-lg font-bold text-text-primary">
                {stats.activeJobs}
              </p>
              <p className="text-[10px] text-text-muted">Active</p>
            </div>
            <div className="text-center p-2 bg-surface-hover rounded-lg">
              <p className="text-lg font-bold text-text-primary">
                {stats.onTimeRate}%
              </p>
              <p className="text-[10px] text-text-muted">On-Time</p>
            </div>
          </div>

          {/* Service types */}
          <div className="flex flex-wrap gap-1 mt-3">
            {Object.entries(contractor.serviceBreakdown)
              .slice(0, 3)
              .map(([type, count]) => (
                <Badge key={type} className="text-[10px] bg-cyan-500/[0.06] text-cyan-400">
                  {SERVICE_TYPE_LABELS[type] || type}: {count as number}
                </Badge>
              ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContact(!showContact)}
            >
              <Phone className="h-3.5 w-3.5" />
              Contact
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success("Message sent to contractor");
              }}
            >
              <Send className="h-3.5 w-3.5" />
              Message
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success("Email sent to contractor");
              }}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </Button>
          </div>

          {/* Contact details */}
          {showContact && (
            <div className="mt-3 p-3 bg-surface-hover rounded-lg space-y-2">
              {contractor.profile?.address && (
                <div className="flex items-center gap-2 text-sm text-text-dim">
                  <MapPin className="h-4 w-4" />
                  {contractor.profile.address}
                  {contractor.profile.city && `, ${contractor.profile.city}`}
                  {contractor.profile.state && `, ${contractor.profile.state}`}
                  {contractor.profile.zipCode && ` ${contractor.profile.zipCode}`}
                  {contractor.distanceMiles !== null && (
                    <span className="text-cyan-400 font-medium">· {contractor.distanceMiles} mi away</span>
                  )}
                </div>
              )}
              {contractor.phone && (
                <a
                  href={`tel:${contractor.phone}`}
                  className="flex items-center gap-2 text-sm text-text-dim hover:text-cyan-400"
                >
                  <Phone className="h-4 w-4" />
                  {contractor.phone}
                </a>
              )}
              {contractor.email && (
                <a
                  href={`mailto:${contractor.email}`}
                  className="flex items-center gap-2 text-sm text-text-dim hover:text-cyan-400"
                >
                  <Mail className="h-4 w-4" />
                  {contractor.email}
                </a>
              )}
              {contractor.locations.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-text-dim">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>{contractor.locations.join(", ")}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
