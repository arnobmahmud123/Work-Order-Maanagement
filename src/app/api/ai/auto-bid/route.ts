import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ─── AI Auto-Bid Completion ───────────────────────────────────────────────────
// Generates a polished bid from minimal notes: order type, location, costs,
// labor hours, materials, and reason.

interface BidRequest {
  serviceType: string;
  address: string;
  city?: string;
  state?: string;
  notes: string;
  estimatedLaborHours?: number;
  estimatedMaterials?: string;
  estimatedCost?: number;
  reason?: string;
  preparedBy?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: BidRequest = await req.json();
  const {
    serviceType,
    address,
    city,
    state,
    notes,
    estimatedLaborHours,
    estimatedMaterials,
    estimatedCost,
    reason,
  } = body;

  if (!serviceType || !address || !notes) {
    return NextResponse.json(
      { error: "Service type, address, and notes are required" },
      { status: 400 }
    );
  }

  // Generate polished bid from notes
  const bid = generateBid({
    serviceType,
    address,
    city,
    state,
    notes,
    estimatedLaborHours,
    estimatedMaterials,
    estimatedCost,
    reason,
    preparedBy: (session.user as any)?.name || "PropPreserve Team",
  });

  return NextResponse.json(bid);
}

function generateBid(input: BidRequest) {
  const {
    serviceType,
    address,
    city,
    state,
    notes,
    estimatedLaborHours,
    estimatedMaterials,
    estimatedCost,
    reason,
    preparedBy,
  } = input;

  const fullAddress = [address, city, state].filter(Boolean).join(", ");

  const serviceNames: Record<string, string> = {
    GRASS_CUT: "Grass Cut & Lawn Maintenance",
    DEBRIS_REMOVAL: "Debris Removal & Property Clean-Up",
    WINTERIZATION: "Winterization Services",
    BOARD_UP: "Board-Up & Property Securing",
    INSPECTION: "Property Inspection",
    MOLD_REMEDIATION: "Mold Remediation",
    OTHER: "General Property Preservation",
  };

  const serviceName = serviceNames[serviceType] || serviceType;

  // Parse notes for key details
  const parsedNotes = parseNotes(notes);

  // Build line items
  const lineItems: {
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  }[] = [];

  // Labor
  const laborHours = estimatedLaborHours || parsedNotes.laborHours || 2;
  const laborRate = parsedNotes.laborRate || 45;
  lineItems.push({
    description: `Labor — ${serviceName}`,
    quantity: laborHours,
    unit: "hours",
    rate: laborRate,
    amount: laborHours * laborRate,
  });

  // Materials
  if (estimatedMaterials || parsedNotes.materials.length > 0) {
    const materials = parsedNotes.materials.length > 0
      ? parsedNotes.materials
      : [{ name: estimatedMaterials || "Materials", cost: estimatedCost ? estimatedCost * 0.3 : 75 }];

    materials.forEach((m: any) => {
      lineItems.push({
        description: m.name,
        quantity: 1,
        unit: "lot",
        rate: m.cost,
        amount: m.cost,
      });
    });
  }

  // Service-specific line items
  if (serviceType === "WINTERIZATION") {
    lineItems.push({
      description: "Winterization supplies (antifreeze, tape, caps)",
      quantity: 1,
      unit: "lot",
      rate: 35,
      amount: 35,
    });
  }

  if (serviceType === "BOARD_UP") {
    lineItems.push({
      description: "Board-up materials (plywood, screws, hardware)",
      quantity: 1,
      unit: "lot",
      rate: 85,
      amount: 85,
    });
  }

  // Trip fee
  lineItems.push({
    description: "Trip / mobilization fee",
    quantity: 1,
    unit: "trip",
    rate: 25,
    amount: 25,
  });

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Generate the polished bid document
  const bidDocument = `
# BID PROPOSAL

## Property Preservation Services

**Property:** ${fullAddress}
**Service Type:** ${serviceName}
**Date Prepared:** ${new Date().toLocaleDateString()}
**Prepared By:** ${preparedBy || "PropPreserve Team"}

---

## Scope of Work

${generateScopeOfWork(serviceType, notes, parsedNotes)}

## Line Items

| Description | Qty | Unit | Rate | Amount |
|------------|-----|------|------|--------|
${lineItems.map((item) => `| ${item.description} | ${item.quantity} | ${item.unit} | $${item.rate.toFixed(2)} | $${item.amount.toFixed(2)} |`).join("\n")}

---

| | |
|---|---|
| **Subtotal** | $${subtotal.toFixed(2)} |
${taxRate > 0 ? `| **Tax (${(taxRate * 100).toFixed(1)}%)** | $${tax.toFixed(2)} |` : ""}
| **Total** | **$${total.toFixed(2)}** |

---

## Timeline

- **Estimated Start:** Within 48 hours of approval
- **Estimated Completion:** ${getEstimatedDuration(serviceType, laborHours)}
- **Weather Contingency:** Work may be delayed due to inclement weather

## Terms & Conditions

1. Payment due upon completion of work
2. Photos will be provided: before, during, and after
3. All work performed per property preservation industry standards
4. Client reserves the right to request revisions at no additional charge
5. Property will be secured upon completion (locks, windows, doors)

${reason ? `\n## Notes\n\n${reason}\n` : ""}
${parsedNotes.additionalNotes.length > 0 ? `\n## Additional Details\n\n${parsedNotes.additionalNotes.map((n: string) => `- ${n}`).join("\n")}\n` : ""}

---
*This bid is valid for 30 days from the date prepared.*
`;

  return {
    bid: bidDocument.trim(),
    lineItems,
    subtotal,
    tax,
    total,
    estimatedDuration: getEstimatedDuration(serviceType, laborHours),
    serviceName,
    propertyAddress: fullAddress,
  };
}

function parseNotes(notes: string) {
  const result = {
    laborHours: 0,
    laborRate: 0,
    materials: [] as { name: string; cost: number }[],
    additionalNotes: [] as string[],
  };

  // Try to extract labor hours
  const hourMatch = notes.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if (hourMatch) result.laborHours = parseFloat(hourMatch[1]);

  // Try to extract rate
  const rateMatch = notes.match(/\$(\d+(?:\.\d+)?)\s*(?:\/|per)?\s*(?:hour|hr)/i);
  if (rateMatch) result.laborRate = parseFloat(rateMatch[1]);

  // Try to extract costs
  const costMatches = notes.matchAll(/\$(\d+(?:\.\d+)?)\s+(?:for|—|-)\s+(.+?)(?:\.|,|$)/gi);
  for (const match of costMatches) {
    result.materials.push({
      name: match[2].trim(),
      cost: parseFloat(match[1]),
    });
  }

  // If no materials found, check for material keywords
  if (result.materials.length === 0) {
    const materialKeywords = [
      "plywood", "antifreeze", "screws", "tape", "plastic",
      "lock", "hardware", "supplies", "chemicals", "paint",
    ];
    const foundMaterials = materialKeywords.filter((k) =>
      notes.toLowerCase().includes(k)
    );
    if (foundMaterials.length > 0) {
      result.materials.push({
        name: `Materials: ${foundMaterials.join(", ")}`,
        cost: 50,
      });
    }
  }

  // Everything else as additional notes
  const lines = notes.split("\n").filter((l) => l.trim());
  result.additionalNotes = lines.filter(
    (l) =>
      !l.match(/\d+\s*(?:hours?|hrs?)/i) &&
      !l.match(/\$\d+/i)
  );

  return result;
}

function generateScopeOfWork(
  serviceType: string,
  notes: string,
  parsed: any
): string {
  const scopes: Record<string, string> = {
    GRASS_CUT: `This bid covers professional grass cutting and lawn maintenance services including:
- Mowing all grass areas to a maintained height
- Trimming edges along walkways, driveways, and structures
- Blowing debris from walkways and driveways
- Removal of all clippings and yard waste
- Property inspection and photo documentation`,

    DEBRIS_REMOVAL: `This bid covers comprehensive debris removal and property clean-up including:
- Removal of all visible debris from interior and exterior
- Hauling and proper disposal of all materials
- Sweeping and basic cleaning of cleared areas
- Photo documentation before, during, and after`,

    WINTERIZATION: `This bid covers professional winterization services including:
- Draining all water lines and water heater
- Adding antifreeze to all traps and toilets
- Shutting off water supply
- Securing all windows and doors
- Photo documentation of all completed steps`,

    BOARD_UP: `This bid covers professional board-up services including:
- Securing all entry points (doors, windows)
- Installation of plywood boarding with proper hardware
- Ensuring property is weatherproof and secure
- Photo documentation of all secured openings`,

    INSPECTION: `This bid covers comprehensive property inspection including:
- Full interior and exterior inspection
- Photo documentation of property condition
- Identification of maintenance needs
- Detailed inspection report`,

    MOLD_REMEDIATION: `This bid covers professional mold remediation including:
- Assessment and containment of affected areas
- Removal of mold-contaminated materials
- Treatment with antimicrobial solutions
- Air quality testing (pre and post)
- Photo documentation throughout process`,
  };

  let scope = scopes[serviceType] || `This bid covers professional property preservation services as described in the notes.`;

  if (notes) {
    scope += `\n\n**Additional scope from notes:**\n${notes}`;
  }

  return scope;
}

function getEstimatedDuration(serviceType: string, hours: number): string {
  if (hours <= 4) return "Same day";
  if (hours <= 8) return "1 business day";

  const days: Record<string, string> = {
    GRASS_CUT: "1-2 business days",
    DEBRIS_REMOVAL: "2-3 business days",
    WINTERIZATION: "1-2 business days",
    BOARD_UP: "1-2 business days",
    INSPECTION: "1 business day",
    MOLD_REMEDIATION: "3-5 business days",
  };

  return days[serviceType] || "2-3 business days";
}
