"use client";

import { useState } from "react";
import { useLogistics, useCreatePurchaseOrder } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Card, CardHeader, CardTitle, Badge, Modal } from "@/components/ui";
import {
  Truck,
  Package,
  Users,
  ClipboardList,
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  MapPin,
  ArrowLeft,
  ShoppingCart,
  TrendingDown,
  Box,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function LogisticsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [view, setView] = useState<"overview" | "materials" | "suppliers" | "orders">("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <Truck className="inline h-6 w-6 mr-2 text-cyan-400" />
            Logistics & Supply Chain
          </h1>
          <p className="text-text-muted mt-1">
            Material inventory, suppliers, purchase orders, and delivery tracking.
          </p>
        </div>
        <div className="flex rounded-lg border border-border-medium overflow-hidden">
          {(["overview", "materials", "suppliers", "orders"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize",
                view === v
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/10"
                  : "bg-surface text-text-secondary hover:bg-surface-hover"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "overview" && <OverviewView />}
      {view === "materials" && <MaterialsView />}
      {view === "suppliers" && <SuppliersView />}
      {view === "orders" && <OrdersView />}
    </div>
  );
}

function OverviewView() {
  const { data, isLoading } = useLogistics("overview");

  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading...</div>;
  if (!data) return null;

  const { overview, lowStockItems, categoryBreakdown, recentOrders } = data;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Materials",
            value: overview.totalMaterials,
            icon: Package,
            color: "text-blue-500 bg-blue-500/10",
          },
          {
            label: "Low Stock",
            value: overview.lowStockCount,
            icon: AlertTriangle,
            color: overview.lowStockCount > 0 ? "text-rose-500 bg-rose-500/10" : "text-text-muted bg-surface-hover",
          },
          {
            label: "Inventory Value",
            value: formatCurrency(overview.totalInventoryValue),
            icon: DollarSign,
            color: "text-emerald-500 bg-emerald-500/10",
          },
          {
            label: "Suppliers",
            value: overview.supplierCount,
            icon: Users,
            color: "text-violet-500 bg-violet-500/10",
          },
          {
            label: "Pending Orders",
            value: overview.pendingOrders,
            icon: ClipboardList,
            color: "text-amber-500 bg-amber-500/10",
          },
          {
            label: "Order Value",
            value: formatCurrency(overview.pendingOrderValue),
            icon: ShoppingCart,
            color: "text-cyan-400 bg-cyan-400/10",
          },
        ].map((m) => (
          <Card key={m.label} padding={false}>
            <div className="p-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", m.color)}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{m.value}</p>
                <p className="text-xs text-text-muted">{m.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Low Stock Alerts ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {lowStockItems.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3"
              >
                <div className="p-2 rounded-lg bg-rose-500/10">
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {item.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {item.category} • {item.supplier?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-500">
                    {item.quantity} {item.unit}s
                  </p>
                  <p className="text-xs text-text-muted">
                    Min: {item.minStock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category breakdown + Recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Inventory by Category</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => (b as any).value - (a as any).value)
              .map(([cat, data]: [string, any]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm text-text-dim w-32 truncate">
                    {cat}
                  </span>
                  <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500/20 rounded-full"
                      style={{
                        width: `${
                          (data.value /
                            Math.max(
                              ...Object.values(categoryBreakdown).map(
                                (v: any) => v.value
                              )
                            )) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary w-20 text-right">
                    {formatCurrency(data.value)}
                  </span>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Purchase Orders</CardTitle>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order: any) => (
              <div
                key={order.id}
                className="flex items-center gap-3 p-3"
              >
                <OrderStatusIcon status={order.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-text-muted">
                    {order.supplier?.name} • {order.items.length} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-text-primary">
                    {formatCurrency(order.total)}
                  </p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MaterialsView() {
  const [category, setCategory] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const { data, isLoading } = useLogistics("materials");

  const materials = data?.materials || [];
  const filtered = materials.filter((m: any) => {
    if (category && m.category !== category) return false;
    if (lowStock && m.quantity > m.minStock) return false;
    return true;
  });

  const categories: string[] = [...new Set(materials.map((m: any) => m.category))] as string[];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 border border-border-medium rounded-lg text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => setLowStock(e.target.checked)}
            className="rounded border-border-medium text-cyan-400"
          />
          Low stock only
        </label>
      </div>

      {/* Materials table */}
      <Card padding={false}>
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-surface-hover border-b border-border-subtle text-xs font-semibold text-text-muted uppercase">
          <div className="col-span-3">Material</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-1 text-center">Stock</div>
          <div className="col-span-1 text-center">Min</div>
          <div className="col-span-1 text-right">Unit Cost</div>
          <div className="col-span-1 text-right">Value</div>
          <div className="col-span-2">Supplier</div>
          <div className="col-span-1">Location</div>
        </div>
        <div className="divide-y divide-gray-100">
          {filtered.map((mat: any) => {
            const isLow = mat.quantity <= mat.minStock;
            return (
              <div
                key={mat.id}
                className={cn(
                  "grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm",
                  isLow && "bg-rose-500/[0.03]"
                )}
              >
                <div className="col-span-3 font-medium text-text-primary truncate">
                  {mat.name}
                </div>
                <div className="col-span-2">
                  <Badge className="text-[10px] bg-surface-hover text-text-muted">
                    {mat.category}
                  </Badge>
                </div>
                <div
                  className={cn(
                    "col-span-1 text-center font-bold",
                    isLow ? "text-rose-500" : "text-text-primary"
                  )}
                >
                  {mat.quantity}
                </div>
                <div className="col-span-1 text-center text-text-muted">
                  {mat.minStock}
                </div>
                <div className="col-span-1 text-right text-text-dim">
                  {formatCurrency(mat.unitCost)}
                </div>
                <div className="col-span-1 text-right font-medium text-text-primary">
                  {formatCurrency(mat.quantity * mat.unitCost)}
                </div>
                <div className="col-span-2 text-xs text-text-muted truncate">
                  {mat.supplier}
                </div>
                <div className="col-span-1 text-xs text-text-muted">
                  {mat.location}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function SuppliersView() {
  const { data, isLoading } = useLogistics("suppliers");
  const suppliers = data?.suppliers || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : (
        suppliers.map((sup: any) => (
          <Card key={sup.id}>
            <div className="flex items-start gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">
                {sup.name[0]}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-text-primary">
                  {sup.name}
                </h3>
                <p className="text-xs text-text-muted">{sup.contact}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-amber-500">
                  {sup.rating}
                </span>
                <span className="text-xs text-text-muted">/5</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-text-muted">
                <span className="font-medium">Email:</span>
                {sup.email}
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <span className="font-medium">Phone:</span>
                {sup.phone}
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <Clock className="h-3 w-3" />
                <span className="font-medium">Lead time:</span>
                {sup.leadTime}
              </div>
              <div className="flex items-start gap-2 text-text-muted">
                <MapPin className="h-3 w-3 mt-0.5" />
                {sup.address}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-3">
              {sup.categories.map((cat: string) => (
                <Badge
                  key={cat}
                  className="text-[10px] bg-cyan-500/[0.06] text-cyan-400"
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function OrdersView() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useLogistics("orders");
  const orders = data?.orders || [];
  const filtered = status
    ? orders.filter((o: any) => o.status === status)
    : orders;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["", "PENDING", "IN_TRANSIT", "DELIVERED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
              status === s
                ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/10 border-transparent"
                : "bg-surface text-text-secondary border-border-subtle hover:bg-surface-hover"
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order: any) => (
            <Card key={order.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {order.orderNumber}
                    </h3>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    {order.supplier?.name} • Ordered {order.orderedAt}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-text-primary">
                    {formatCurrency(order.total)}
                  </p>
                  <p className="text-xs text-text-muted">
                    Expected: {order.expectedDelivery}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="bg-surface-hover rounded-lg p-3 space-y-2">
                {order.items.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-dim">{item.name}</span>
                    <span className="text-text-muted">
                      {item.quantity} × {formatCurrency(item.unitCost)} ={" "}
                      <span className="font-medium text-text-primary">
                        {formatCurrency(item.total)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <p className="text-xs text-text-muted mt-2">
                  Note: {order.notes}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-600",
    IN_TRANSIT: "bg-blue-500/10 text-blue-600",
    DELIVERED: "bg-emerald-500/10 text-emerald-600",
  };
  return (
    <Badge className={cn("text-[10px]", colors[status] || "bg-surface-hover text-text-muted")}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function OrderStatusIcon({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-500",
    IN_TRANSIT: "bg-blue-500/10 text-blue-500",
    DELIVERED: "bg-emerald-500/10 text-emerald-500",
  };
  const icons: Record<string, any> = {
    PENDING: Clock,
    IN_TRANSIT: Truck,
    DELIVERED: CheckCircle2,
  };
  const Icon = icons[status] || Clock;
  return (
    <div className={cn("p-2 rounded-lg", colors[status] || "bg-surface-hover")}>
      <Icon className="h-4 w-4" />
    </div>
  );
}
