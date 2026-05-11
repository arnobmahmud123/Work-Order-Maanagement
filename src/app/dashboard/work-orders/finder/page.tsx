"use client";

import { useState } from "react";
import { useWorkOrders, useUsers } from "@/hooks/use-data";
import { Button, Badge, Card, Avatar } from "@/components/ui";
import {
  Search,
  MapPin,
  Calendar,
  User,
  ChevronRight,
  ClipboardList,
  Users,
  Wrench,
  UserCog,
  Layers,
  Filter,
} from "lucide-react";
import Link from "next/link";
import {
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDate,
  formatRelativeTime,
  cn,
} from "@/lib/utils";

type FinderTab = "contractor" | "coordinator" | "processor" | "service";

export default function WorkOrderFindersPage() {
  const [tab, setTab] = useState<FinderTab>("contractor");
  const [search, setSearch] = useState("");

  const tabs = [
    { id: "contractor" as const, label: "By Contractor", icon: Wrench },
    { id: "coordinator" as const, label: "By Coordinator", icon: UserCog },
    { id: "processor" as const, label: "By Processor", icon: Users },
    { id: "service" as const, label: "By Service Type", icon: Layers },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          <Filter className="inline h-6 w-6 mr-2 text-cyan-400" />
          Work Order Finders
        </h1>
        <p className="text-text-muted mt-1">
          Find and filter work orders by contractor, coordinator, processor, or
          service type.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-hover rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-surface-hover text-cyan-400 shadow-lg shadow-black/20"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "contractor" && <ContractorFinder />}
      {tab === "coordinator" && <CoordinatorFinder />}
      {tab === "processor" && <ProcessorFinder />}
      {tab === "service" && <ServiceTypeFinder />}
    </div>
  );
}

function ContractorFinder() {
  const { data: contractors } = useUsers("CONTRACTOR");
  const { data: woData } = useWorkOrders();
  const workOrders = woData?.workOrders || [];
  const [selected, setSelected] = useState<string | null>(null);

  const contractorOrders = selected
    ? workOrders.filter((wo: any) => wo.contractorId === selected)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card padding={false}>
        <div className="p-3 border-b border-border-subtle">
          <p className="text-xs font-semibold text-text-muted uppercase">
            Contractors ({contractors?.length || 0})
          </p>
        </div>
        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {contractors?.map((c: any) => {
            const count = workOrders.filter(
              (wo: any) => wo.contractorId === c.id
            ).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left hover:bg-surface-hover transition-colors",
                  selected === c.id && "bg-cyan-500/[0.06]"
                )}
              >
                <Avatar name={c.name} src={c.image} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-text-muted">{c.company || "Independent"}</p>
                </div>
                <Badge className="bg-surface-hover text-text-muted text-xs">
                  {count} WO
                </Badge>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="lg:col-span-2">
        {selected ? (
          <WorkOrderList
            workOrders={contractorOrders}
            title={`Work Orders — ${contractors?.find((c: any) => c.id === selected)?.name}`}
          />
        ) : (
          <Card>
            <div className="p-12 text-center text-text-muted">
              <Wrench className="h-12 w-12 mx-auto mb-3 text-text-primary" />
              <p className="font-medium">Select a contractor</p>
              <p className="text-sm mt-1">
                Choose a contractor from the list to see their work orders.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function CoordinatorFinder() {
  const { data: coordinators } = useUsers("COORDINATOR");
  const { data: woData } = useWorkOrders();
  const workOrders = woData?.workOrders || [];
  const [selected, setSelected] = useState<string | null>(null);

  const coordOrders = selected
    ? workOrders.filter((wo: any) => wo.coordinatorId === selected)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card padding={false}>
        <div className="p-3 border-b border-border-subtle">
          <p className="text-xs font-semibold text-text-muted uppercase">
            Coordinators ({coordinators?.length || 0})
          </p>
        </div>
        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {coordinators?.map((c: any) => {
            const count = workOrders.filter(
              (wo: any) => wo.coordinatorId === c.id
            ).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left hover:bg-surface-hover transition-colors",
                  selected === c.id && "bg-cyan-500/[0.06]"
                )}
              >
                <Avatar name={c.name} src={c.image} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-text-muted">{c.email}</p>
                </div>
                <Badge className="bg-surface-hover text-text-muted text-xs">
                  {count} WO
                </Badge>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="lg:col-span-2">
        {selected ? (
          <WorkOrderList
            workOrders={coordOrders}
            title={`Work Orders — ${coordinators?.find((c: any) => c.id === selected)?.name}`}
          />
        ) : (
          <Card>
            <div className="p-12 text-center text-text-muted">
              <UserCog className="h-12 w-12 mx-auto mb-3 text-text-primary" />
              <p className="font-medium">Select a coordinator</p>
              <p className="text-sm mt-1">
                Choose a coordinator to see their managed work orders.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProcessorFinder() {
  const { data: processors } = useUsers("PROCESSOR");
  const { data: woData } = useWorkOrders();
  const workOrders = woData?.workOrders || [];
  const [selected, setSelected] = useState<string | null>(null);

  const procOrders = selected
    ? workOrders.filter((wo: any) => wo.processorId === selected)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card padding={false}>
        <div className="p-3 border-b border-border-subtle">
          <p className="text-xs font-semibold text-text-muted uppercase">
            Processors ({processors?.length || 0})
          </p>
        </div>
        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {processors?.map((p: any) => {
            const count = workOrders.filter(
              (wo: any) => wo.processorId === p.id
            ).length;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 text-left hover:bg-surface-hover transition-colors",
                  selected === p.id && "bg-cyan-500/[0.06]"
                )}
              >
                <Avatar name={p.name} src={p.image} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-text-muted">{p.email}</p>
                </div>
                <Badge className="bg-surface-hover text-text-muted text-xs">
                  {count} WO
                </Badge>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="lg:col-span-2">
        {selected ? (
          <WorkOrderList
            workOrders={procOrders}
            title={`Work Orders — ${processors?.find((p: any) => p.id === selected)?.name}`}
          />
        ) : (
          <Card>
            <div className="p-12 text-center text-text-muted">
              <Users className="h-12 w-12 mx-auto mb-3 text-text-primary" />
              <p className="font-medium">Select a processor</p>
              <p className="text-sm mt-1">
                Choose a processor to see their assigned work orders.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ServiceTypeFinder() {
  const { data: woData } = useWorkOrders();
  const workOrders = woData?.workOrders || [];
  const [selected, setSelected] = useState<string | null>(null);

  const serviceCounts = Object.entries(SERVICE_TYPE_LABELS).map(
    ([type, label]) => ({
      type,
      label,
      count: workOrders.filter((wo: any) => wo.serviceType === type).length,
    })
  );

  const filteredOrders = selected
    ? workOrders.filter((wo: any) => wo.serviceType === selected)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card padding={false}>
        <div className="p-3 border-b border-border-subtle">
          <p className="text-xs font-semibold text-text-muted uppercase">
            Service Types
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {serviceCounts.map((s) => (
            <button
              key={s.type}
              onClick={() => setSelected(s.type)}
              className={cn(
                "w-full flex items-center justify-between p-3 text-left hover:bg-surface-hover transition-colors",
                selected === s.type && "bg-cyan-500/[0.06]"
              )}
              >
              <span className="text-sm font-medium text-text-primary">
                {s.label}
              </span>
              <Badge className="bg-surface-hover text-text-muted text-xs">
                {s.count}
              </Badge>
            </button>
          ))}
        </div>
      </Card>

      <div className="lg:col-span-2">
        {selected ? (
          <WorkOrderList
            workOrders={filteredOrders}
            title={`${SERVICE_TYPE_LABELS[selected]} Work Orders`}
          />
        ) : (
          <Card>
            <div className="p-12 text-center text-text-muted">
              <Layers className="h-12 w-12 mx-auto mb-3 text-text-primary" />
              <p className="font-medium">Select a service type</p>
              <p className="text-sm mt-1">
                Choose a service type to see matching work orders.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Shared Work Order List ──────────────────────────────────────────────────

function WorkOrderList({
  workOrders,
  title,
}: {
  workOrders: any[];
  title: string;
}) {
  return (
    <Card padding={false}>
      <div className="p-4 border-b border-border-subtle flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-xs text-text-muted">{workOrders.length} work orders</p>
        </div>
      </div>

      {workOrders.length === 0 ? (
        <div className="p-8 text-center text-text-muted">
          <ClipboardList className="h-10 w-10 mx-auto mb-2 text-text-dim" />
          <p className="text-sm">No work orders found</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {workOrders.map((wo: any) => (
            <Link
              key={wo.id}
              href={`/dashboard/work-orders/${wo.id}`}
              className="flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-text-primary truncate">
                    {wo.title}
                  </h4>
                  <Badge className={cn("text-xs", STATUS_COLORS[wo.status])}>
                    {STATUS_LABELS[wo.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {wo.address}
                  </span>
                  <span>{SERVICE_TYPE_LABELS[wo.serviceType]}</span>
                  {wo.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(wo.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted" />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
