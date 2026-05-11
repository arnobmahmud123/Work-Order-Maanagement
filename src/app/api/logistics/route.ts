import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Logistics / Supply Chain ────────────────────────────────────────────────
// Material inventory, supplier management, purchase orders, delivery tracking.

// In-memory store (replace with DB tables in production)
const materialStore: any[] = [
  {
    id: "mat-1",
    name: 'Plywood 4x8 Sheet (1/2")',
    category: "Board-Up",
    unit: "sheet",
    unitCost: 28.50,
    quantity: 45,
    minStock: 20,
    supplier: "sup-1",
    lastOrdered: "2024-04-15",
    location: "Warehouse A",
  },
  {
    id: "mat-2",
    name: "Exterior Screws (100ct)",
    category: "Hardware",
    unit: "box",
    unitCost: 12.99,
    quantity: 80,
    minStock: 30,
    supplier: "sup-1",
    lastOrdered: "2024-04-20",
    location: "Warehouse A",
  },
  {
    id: "mat-3",
    name: "Antifreeze (1 Gallon)",
    category: "Winterization",
    unit: "gallon",
    unitCost: 8.75,
    quantity: 12,
    minStock: 25,
    supplier: "sup-2",
    lastOrdered: "2024-03-10",
    location: "Warehouse B",
  },
  {
    id: "mat-4",
    name: "Plastic Sheeting (100ft roll)",
    category: "General",
    unit: "roll",
    unitCost: 22.00,
    quantity: 30,
    minStock: 15,
    supplier: "sup-1",
    lastOrdered: "2024-04-01",
    location: "Warehouse A",
  },
  {
    id: "mat-5",
    name: 'Door Lock Set (Keyed)',
    category: "Security",
    unit: "set",
    unitCost: 35.00,
    quantity: 8,
    minStock: 10,
    supplier: "sup-3",
    lastOrdered: "2024-03-25",
    location: "Warehouse A",
  },
  {
    id: "mat-6",
    name: "Padlock (Heavy Duty)",
    category: "Security",
    unit: "each",
    unitCost: 18.50,
    quantity: 22,
    minStock: 15,
    supplier: "sup-3",
    lastOrdered: "2024-04-10",
    location: "Warehouse A",
  },
  {
    id: "mat-7",
    name: "Trash Bags (55 gal, 50ct)",
    category: "Debris Removal",
    unit: "box",
    unitCost: 24.99,
    quantity: 35,
    minStock: 20,
    supplier: "sup-2",
    lastOrdered: "2024-04-18",
    location: "Warehouse B",
  },
  {
    id: "mat-8",
    name: "Lawn Mower Blades (Set)",
    category: "Grass Cut",
    unit: "set",
    unitCost: 15.00,
    quantity: 6,
    minStock: 10,
    supplier: "sup-1",
    lastOrdered: "2024-03-20",
    location: "Warehouse A",
  },
  {
    id: "mat-9",
    name: "Mold Remediating Spray (32oz)",
    category: "Mold Remediation",
    unit: "bottle",
    unitCost: 32.00,
    quantity: 4,
    minStock: 8,
    supplier: "sup-4",
    lastOrdered: "2024-02-15",
    location: "Warehouse B",
  },
  {
    id: "mat-10",
    name: "Weather Stripping (30ft)",
    category: "General",
    unit: "roll",
    unitCost: 9.50,
    quantity: 40,
    minStock: 20,
    supplier: "sup-1",
    lastOrdered: "2024-04-05",
    location: "Warehouse A",
  },
];

const supplierStore: any[] = [
  {
    id: "sup-1",
    name: "Home Depot Pro",
    contact: "John Martinez",
    email: "john.m@homedepotpro.com",
    phone: "(555) 123-4567",
    categories: ["Hardware", "Board-Up", "Grass Cut", "General"],
    rating: 4.5,
    leadTime: "1-2 days",
    address: "1234 Commerce Blvd, Springfield, IL",
  },
  {
    id: "sup-2",
    name: "Grainger Industrial",
    contact: "Lisa Park",
    email: "l.park@grainger.com",
    phone: "(555) 234-5678",
    categories: ["Winterization", "Debris Removal", "Safety"],
    rating: 4.7,
    leadTime: "2-3 days",
    address: "5678 Industrial Dr, Chicago, IL",
  },
  {
    id: "sup-3",
    name: "SecureLock Supply",
    contact: "Mike Chen",
    email: "mike@securelock.com",
    phone: "(555) 345-6789",
    categories: ["Security", "Locks"],
    rating: 4.3,
    leadTime: "3-5 days",
    address: "910 Security Way, Peoria, IL",
  },
  {
    id: "sup-4",
    name: "ProClean Remediation",
    contact: "Sarah Kim",
    email: "s.kim@proclean.com",
    phone: "(555) 456-7890",
    categories: ["Mold Remediation", "Cleaning"],
    rating: 4.8,
    leadTime: "2-4 days",
    address: "1122 Clean St, Rockford, IL",
  },
];

const purchaseOrderStore: any[] = [
  {
    id: "po-1",
    orderNumber: "PO-2024-001",
    supplierId: "sup-1",
    status: "DELIVERED",
    items: [
      { materialId: "mat-1", name: 'Plywood 4x8 Sheet', quantity: 50, unitCost: 28.50, total: 1425.00 },
      { materialId: "mat-2", name: "Exterior Screws", quantity: 20, unitCost: 12.99, total: 259.80 },
    ],
    subtotal: 1684.80,
    tax: 134.78,
    total: 1819.58,
    orderedAt: "2024-04-10",
    expectedDelivery: "2024-04-12",
    deliveredAt: "2024-04-11",
    notes: "Urgent restock for board-up jobs",
  },
  {
    id: "po-2",
    orderNumber: "PO-2024-002",
    supplierId: "sup-2",
    status: "IN_TRANSIT",
    items: [
      { materialId: "mat-3", name: "Antifreeze (1 Gal)", quantity: 36, unitCost: 8.75, total: 315.00 },
      { materialId: "mat-7", name: "Trash Bags", quantity: 15, unitCost: 24.99, total: 374.85 },
    ],
    subtotal: 689.85,
    tax: 55.19,
    total: 745.04,
    orderedAt: "2024-04-28",
    expectedDelivery: "2024-05-01",
    deliveredAt: null,
    notes: "Restock for winterization season prep",
  },
  {
    id: "po-3",
    orderNumber: "PO-2024-003",
    supplierId: "sup-3",
    status: "PENDING",
    items: [
      { materialId: "mat-5", name: "Door Lock Set", quantity: 20, unitCost: 35.00, total: 700.00 },
      { materialId: "mat-6", name: "Padlock", quantity: 15, unitCost: 18.50, total: 277.50 },
    ],
    subtotal: 977.50,
    tax: 78.20,
    total: 1055.70,
    orderedAt: "2024-04-30",
    expectedDelivery: "2024-05-05",
    deliveredAt: null,
    notes: "Security hardware restock",
  },
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "overview"; // overview, materials, suppliers, orders

  if (view === "materials") {
    const category = searchParams.get("category") || "";
    const lowStock = searchParams.get("lowStock") === "true";

    let materials = [...materialStore];
    if (category) materials = materials.filter((m) => m.category === category);
    if (lowStock) materials = materials.filter((m) => m.quantity <= m.minStock);

    return NextResponse.json({ materials });
  }

  if (view === "suppliers") {
    return NextResponse.json({ suppliers: supplierStore });
  }

  if (view === "orders") {
    const status = searchParams.get("status") || "";
    let orders = [...purchaseOrderStore];
    if (status) orders = orders.filter((o) => o.status === status);

    // Enrich with supplier info
    const enrichedOrders = orders.map((order) => ({
      ...order,
      supplier: supplierStore.find((s) => s.id === order.supplierId),
    }));

    return NextResponse.json({ orders: enrichedOrders });
  }

  // Overview
  const lowStockItems = materialStore.filter((m) => m.quantity <= m.minStock);
  const totalInventoryValue = materialStore.reduce(
    (sum, m) => sum + m.quantity * m.unitCost,
    0
  );
  const pendingOrders = purchaseOrderStore.filter(
    (o) => o.status === "PENDING" || o.status === "IN_TRANSIT"
  );
  const pendingOrderValue = pendingOrders.reduce((sum, o) => sum + o.total, 0);

  const categoryBreakdown = materialStore.reduce(
    (acc: Record<string, { count: number; value: number }>, m) => {
      if (!acc[m.category]) acc[m.category] = { count: 0, value: 0 };
      acc[m.category].count++;
      acc[m.category].value += m.quantity * m.unitCost;
      return acc;
    },
    {}
  );

  return NextResponse.json({
    overview: {
      totalMaterials: materialStore.length,
      lowStockCount: lowStockItems.length,
      totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
      supplierCount: supplierStore.length,
      pendingOrders: pendingOrders.length,
      pendingOrderValue: parseFloat(pendingOrderValue.toFixed(2)),
    },
    lowStockItems: lowStockItems.map((m) => ({
      ...m,
      supplier: supplierStore.find((s) => s.id === m.supplier),
    })),
    categoryBreakdown,
    recentOrders: purchaseOrderStore.slice(0, 5).map((o) => ({
      ...o,
      supplier: supplierStore.find((s) => s.id === o.supplierId),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "create-order") {
    const { supplierId, items, notes } = body;
    const supplier = supplierStore.find((s) => s.id === supplierId);
    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const orderItems = items.map((item: any) => {
      const material = materialStore.find((m) => m.id === item.materialId);
      return {
        materialId: item.materialId,
        name: material?.name || "Unknown",
        quantity: item.quantity,
        unitCost: material?.unitCost || 0,
        total: (material?.unitCost || 0) * item.quantity,
      };
    });

    const subtotal = orderItems.reduce(
      (sum: number, item: any) => sum + item.total,
      0
    );
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    const order = {
      id: `po-${Date.now()}`,
      orderNumber: `PO-2024-${String(purchaseOrderStore.length + 1).padStart(3, "0")}`,
      supplierId,
      status: "PENDING",
      items: orderItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat((subtotal + tax).toFixed(2)),
      orderedAt: new Date().toISOString().slice(0, 10),
      expectedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      deliveredAt: null,
      notes: notes || "",
    };

    purchaseOrderStore.push(order);

    return NextResponse.json(
      { ...order, supplier },
      { status: 201 }
    );
  }

  if (action === "update-stock") {
    const { materialId, quantity } = body;
    const material = materialStore.find((m) => m.id === materialId);
    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }
    material.quantity = quantity;
    return NextResponse.json(material);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
