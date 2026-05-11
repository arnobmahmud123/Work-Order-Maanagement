"use client";

import { useUsers } from "@/hooks/use-data";
import { Card, Badge, Avatar } from "@/components/ui";
import { Wrench, Star, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AdminContractorsPage() {
  const { data: contractors, isLoading } = useUsers("CONTRACTOR");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Contractors</h1>
        <p className="text-text-muted mt-1">Manage contractor network</p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : contractors?.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium text-text-muted">No contractors yet</p>
            <p className="text-sm text-text-muted mt-1">
              Contractors will appear here when they register.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractors?.map((contractor: any) => (
            <Card key={contractor.id}>
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={contractor.name} src={contractor.image} />
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {contractor.name}
                  </h3>
                  <p className="text-xs text-text-muted">{contractor.email}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-text-muted">
                {contractor.company && (
                  <p className="flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    {contractor.company}
                  </p>
                )}
                <p>
                  {contractor._count?.assignedWorkOrders || 0} work orders completed
                </p>
                <p>Joined {formatDate(contractor.createdAt)}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-border-subtle">
                <Badge variant={contractor.isActive ? "emerald" : "rose"}>
                  {contractor.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
