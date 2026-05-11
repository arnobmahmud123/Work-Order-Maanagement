"use client";

import { useState } from "react";
import { useAllMessages, useWorkOrders, useUsers } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Card, Avatar, Badge, Select } from "@/components/ui";
import {
  MessageSquare,
  Filter,
  Search,
  FileText,
  FileDown,
  AlertTriangle,
  Pin,
  Reply,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { formatDateTime, cn, truncate } from "@/lib/utils";

export default function AllMessagesPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [filters, setFilters] = useState({
    workOrderId: "",
    userId: "",
    type: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useAllMessages({
    workOrderId: filters.workOrderId || undefined,
    userId: filters.userId || undefined,
    type: filters.type || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });

  const { data: workOrdersData } = useWorkOrders();
  const { data: users } = useUsers();
  const userId = (session?.user as any)?.id;

  const messages = data?.messages || [];
  const totalPages = data?.totalPages || 1;

  const messageTypes = [
    { value: "", label: "All Types" },
    { value: "COMMENT", label: "Comment" },
    { value: "SYSTEM", label: "System" },
    { value: "REVISION", label: "Revision" },
    { value: "CLIENT_UPDATE", label: "Client Update" },
    { value: "QC", label: "QC" },
    { value: "BID", label: "Bid" },
    { value: "INSPECTION", label: "Inspection" },
    { value: "ACCOUNTING", label: "Accounting" },
    { value: "TASK", label: "Task" },
  ];

  // Client-side search filter
  const filteredMessages = filters.search
    ? messages.filter(
        (m: any) =>
          m.content?.toLowerCase().includes(filters.search.toLowerCase()) ||
          m.author?.name?.toLowerCase().includes(filters.search.toLowerCase())
      )
    : messages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">All Messages</h1>
          <p className="text-text-muted mt-1">
            View all messages across work orders and threads
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Work Order
              </label>
              <select
                value={filters.workOrderId}
                onChange={(e) => {
                  setFilters({ ...filters, workOrderId: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
              >
                <option value="">All Work Orders</option>
                {workOrdersData?.workOrders?.map((wo: any) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.title} — {wo.address}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                User
              </label>
              <select
                value={filters.userId}
                onChange={(e) => {
                  setFilters({ ...filters, userId: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
              >
                <option value="">All Users</option>
                {users?.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Message Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => {
                  setFilters({ ...filters, type: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
              >
                {messageTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  setFilters({ ...filters, dateFrom: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => {
                  setFilters({ ...filters, dateTo: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-border-medium rounded-lg text-sm"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() =>
                  setFilters({
                    workOrderId: "",
                    userId: "",
                    type: "",
                    dateFrom: "",
                    dateTo: "",
                    search: "",
                  })
                }
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search messages..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2.5 border border-border-medium rounded-lg text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
        />
      </div>

      {/* Messages list */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No messages found</p>
            <p className="text-sm mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredMessages.map((msg: any) => {
              const isOwn = msg.authorId === userId;
              const isSystem = msg.type === "SYSTEM";

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "p-4 hover:bg-surface-hover transition-colors",
                    isSystem && "bg-surface-hover/50"
                  )}
                >
                  <div className="flex gap-3">
                    {!isSystem && (
                      <Avatar
                        name={msg.author?.name}
                        src={msg.author?.image}
                        size="sm"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {!isSystem && (
                          <span className="text-sm font-medium text-text-primary">
                            {msg.author?.name}
                          </span>
                        )}
                        {msg.thread?.workOrder && (
                          <Link
                            href={`/dashboard/work-orders/${msg.thread.workOrder.id}`}
                            className="text-xs text-cyan-400 hover:underline"
                          >
                            {msg.thread.workOrder.title}
                          </Link>
                        )}
                        <Badge className="text-xs bg-surface-hover text-text-muted">
                          {msg.type}
                        </Badge>
                        {msg.isUrgent && (
                          <Badge className="text-xs bg-red-100 text-red-700 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Urgent
                          </Badge>
                        )}
                        {msg.isPinned && (
                          <Badge className="text-xs bg-yellow-100 text-yellow-700 gap-1">
                            <Pin className="h-3 w-3" />
                            Pinned
                          </Badge>
                        )}
                        <span className="text-xs text-text-muted ml-auto">
                          {formatDateTime(msg.createdAt)}
                        </span>
                      </div>

                      <p className="text-sm text-text-dim whitespace-pre-wrap">
                        {msg.content}
                      </p>

                      {/* Attachments */}
                      {msg.attachments?.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {msg.attachments.map((att: any) => (
                            <div key={att.id}>
                              {att.mimeType?.startsWith("image/") ? (
                                <a href={att.path} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={att.path}
                                    alt={att.originalName}
                                    className="h-20 w-20 object-cover rounded-lg border border-border-subtle"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={att.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-hover rounded-lg text-xs text-text-dim hover:bg-surface-hover"
                                >
                                  <FileDown className="h-3.5 w-3.5 text-text-muted" />
                                  {truncate(att.originalName, 20)}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {msg._count?.replies > 0 && (
                        <p className="text-xs text-text-muted mt-1">
                          {msg._count.replies} replies
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border-subtle">
            <p className="text-sm text-text-muted">
              Page {page} of {totalPages} • {data?.total || 0} messages
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
