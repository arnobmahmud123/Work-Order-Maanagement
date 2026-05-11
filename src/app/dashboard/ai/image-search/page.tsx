"use client";

import { useState } from "react";
import { useAIImageSearch } from "@/hooks/use-data";
import { Button, Card, CardHeader, CardTitle, Badge } from "@/components/ui";
import {
  Search,
  Image as ImageIcon,
  Camera,
  MapPin,
  Calendar,
  FileText,
  Download,
  Eye,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { formatDate, SERVICE_TYPE_LABELS, cn } from "@/lib/utils";

export default function ImageSearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useAIImageSearch(
    searchQuery,
    category || undefined
  );

  const results = data?.results || [];
  const grouped = data?.grouped || [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchQuery(query.trim());
  }

  const categories = [
    { value: "", label: "All Categories" },
    { value: "BEFORE", label: "Before Photos" },
    { value: "DURING", label: "During Photos" },
    { value: "AFTER", label: "After Photos" },
    { value: "BID", label: "Bid Photos" },
    { value: "INSPECTION", label: "Inspection Photos" },
    { value: "DOCS", label: "Documents" },
  ];

  const suggestions = [
    "lockbox photos",
    "before grass cut",
    "winterization",
    "board up windows",
    "debris removal",
    "mold inspection",
    "after photos",
    "key code",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          <ImageIcon className="inline h-6 w-6 mr-2 text-cyan-400" />
          Image Search
        </h1>
        <p className="text-text-muted mt-1">
          Search photos by description. Find any uploaded image across all work
          orders.
        </p>
      </div>

      {/* Search bar */}
      <Card>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Search photos... e.g., "lockbox photos at 123 Main St" or "before winterization"'
                className="w-full pl-10 pr-4 py-3 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-border-medium rounded-lg text-sm"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <Button type="submit">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-text-muted">Try:</span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuery(s);
                  setSearchQuery(s);
                }}
                className="px-2.5 py-1 bg-surface-hover hover:bg-surface-hover rounded-full text-xs text-text-dim"
              >
                {s}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Searching...</div>
      ) : searchQuery && results.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-text-muted">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No images found</p>
            <p className="text-sm mt-1">
              Try different search terms or remove category filters.
            </p>
          </div>
        </Card>
      ) : searchQuery ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Found {results.length} image{results.length !== 1 ? "s" : ""} for "
              {searchQuery}"
            </p>
          </div>

          {/* Grouped by work order */}
          {grouped.map((group: any, i: number) => (
            <Card key={i}>
              {group.workOrder && (
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border-subtle">
                  <MapPin className="h-4 w-4 text-text-muted" />
                  <div>
                    <Link
                      href={`/dashboard/work-orders/${group.workOrder.id}`}
                      className="text-sm font-semibold text-cyan-400 hover:underline"
                    >
                      {group.workOrder.title}
                    </Link>
                    <p className="text-xs text-text-muted">
                      {group.workOrder.address}
                      {group.workOrder.city && `, ${group.workOrder.city}`}
                      {group.workOrder.state && `, ${group.workOrder.state}`}
                      {" • "}
                      {SERVICE_TYPE_LABELS[group.workOrder.serviceType] ||
                        group.workOrder.serviceType}
                    </p>
                  </div>
                  <Badge className="ml-auto text-xs bg-surface-hover text-text-muted">
                    {group.files.length} photo{group.files.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {group.files.map((file: any) => (
                  <a
                    key={file.id}
                    href={file.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block rounded-lg overflow-hidden border border-border-subtle hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <img
                      src={file.path}
                      alt={file.originalName}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-text-primary truncate">
                        {file.originalName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-[10px] bg-cyan-500/[0.06] text-cyan-400">
                          {file.category}
                        </Badge>
                        <span className="text-[10px] text-text-muted">
                          {formatDate(file.createdAt)}
                        </span>
                      </div>
                      {file.uploader && (
                        <p className="text-[10px] text-text-muted mt-0.5">
                          By {file.uploader.name}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </Card>
          ))}

          {/* Flat results view */}
          {grouped.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>All Results ({results.length})</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {results.map((file: any) => (
                  <a
                    key={file.id}
                    href={file.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block rounded-lg overflow-hidden border border-border-subtle hover:border-indigo-300"
                  >
                    <img
                      src={file.path}
                      alt={file.originalName}
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-1.5">
                      <p className="text-[10px] text-text-muted truncate">
                        {file.originalName}
                      </p>
                      <Badge className="text-[9px] bg-surface-hover text-text-muted mt-0.5">
                        {file.category}
                      </Badge>
                    </div>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <div className="p-12 text-center text-text-muted">
            <Camera className="h-16 w-16 mx-auto mb-4 text-text-primary" />
            <p className="font-medium">Search for photos</p>
            <p className="text-sm mt-1">
              Type a description to find photos across all work orders. Try
              "lockbox", "before grass cut", or "winterization".
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
