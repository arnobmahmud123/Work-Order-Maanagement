import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── AI Chat Assistant (Context-Aware) ────────────────────────────────────────
// Supports queries about: work orders, properties, conversations, call history,
// summaries, contractor search, and general questions.

interface ChatRequest {
  message: string;
  context?: {
    type: "work_order" | "property" | "general" | "contractor_search";
    id?: string;
  };
  conversationHistory?: { role: string; content: string }[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const body: ChatRequest = await req.json();
  const { message, context, conversationHistory } = body;

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Gather context data based on the request
  let systemContext = "";
  let responseData: any = {};

  try {
    if (context?.type === "work_order" && context.id) {
      const data = await getWorkOrderContext(context.id, userId, role);
      systemContext = data.systemContext;
      responseData = data.responseData;
    } else if (context?.type === "property" && context.id) {
      const data = await getPropertyContext(context.id, userId, role);
      systemContext = data.systemContext;
      responseData = data.responseData;
    } else if (context?.type === "contractor_search") {
      const data = await getContractorSearchContext(message, userId, role);
      systemContext = data.systemContext;
      responseData = data.responseData;
    } else {
      const data = await getGeneralContext(userId, role);
      systemContext = data.systemContext;
      responseData = data.responseData;
    }

    // Build the AI prompt
    const prompt = buildAIPrompt(message, systemContext, role, conversationHistory);

    // Generate AI response
    const aiResponse = generateAIResponse(prompt, message, responseData, role);

    return NextResponse.json({
      response: aiResponse,
      context: responseData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to process request", details: error.message },
      { status: 500 }
    );
  }
}

// ─── Context Gathering Functions ──────────────────────────────────────────────

async function getWorkOrderContext(workOrderId: string, userId: string, role: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      contractor: { select: { id: true, name: true, email: true, phone: true } },
      coordinator: { select: { id: true, name: true, email: true, phone: true } },
      processor: { select: { id: true, name: true, email: true } },
      property: true,
      files: { select: { id: true, originalName: true, category: true, mimeType: true, createdAt: true } },
      threads: {
        include: {
          messages: {
            include: { author: { select: { name: true, role: true } } },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      },
      invoices: true,
      history: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  if (!workOrder) {
    throw new Error("Work order not found");
  }

  // Access control
  if (role === "CLIENT" && workOrder.contractorId !== userId && workOrder.coordinatorId !== userId) {
    // Check if client owns the property (simplified)
  }
  if (role === "CONTRACTOR" && workOrder.contractorId !== userId) {
    throw new Error("Access denied");
  }

  const messages = workOrder.threads.flatMap((t: any) =>
    t.messages.map((m: any) => ({
      author: m.author?.name,
      role: m.author?.role,
      content: m.content,
      date: m.createdAt,
      type: m.type,
    }))
  );

  const systemContext = `
WORK ORDER DETAILS:
- Title: ${workOrder.title}
- Address: ${workOrder.address}, ${workOrder.city || ""}, ${workOrder.state || ""} ${workOrder.zipCode || ""}
- Service Type: ${workOrder.serviceType}
- Status: ${workOrder.status}
- Priority: ${workOrder.priority}
- Due Date: ${workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : "Not set"}
- Created: ${new Date(workOrder.createdAt).toLocaleDateString()}
- Completed: ${workOrder.completedAt ? new Date(workOrder.completedAt).toLocaleDateString() : "Not yet"}
- Description: ${workOrder.description || "None"}
- Lock Code: ${workOrder.lockCode || "None"}
- Gate Code: ${workOrder.gateCode || "None"}
- Key Code: ${workOrder.keyCode || "None"}
- Special Instructions: ${workOrder.specialInstructions || "None"}

ASSIGNEES:
- Contractor: ${workOrder.contractor?.name || "Unassigned"} (${workOrder.contractor?.email || "N/A"})
- Coordinator: ${workOrder.coordinator?.name || "None"} (${workOrder.coordinator?.email || "N/A"})
- Processor: ${workOrder.processor?.name || "None"}

FILES (${workOrder.files.length}):
${workOrder.files.map((f: any) => `- ${f.originalName} (${f.category}) ${new Date(f.createdAt).toLocaleDateString()}`).join("\n") || "No files"}

TASKS:
${(workOrder.tasks as any[])?.map((t: any) => `- [${t.completed ? "x" : " "}] ${t.title}`).join("\n") || "No tasks"}

RECENT MESSAGES (last 20):
${messages.map((m: any) => `[${m.author} - ${m.type}] ${m.content?.slice(0, 200)}`).join("\n") || "No messages"}

ACTIVITY HISTORY (last 30):
${workOrder.history.map((h: any) => `- ${h.action}: ${h.details} (${h.user?.name} - ${new Date(h.createdAt).toLocaleDateString()})`).join("\n") || "No history"}

INVOICES:
${workOrder.invoices.map((inv: any) => `- #${inv.invoiceNumber}: $${inv.total} (${inv.status})`).join("\n") || "No invoices"}
`;

  return {
    systemContext,
    responseData: {
      workOrder: {
        id: workOrder.id,
        title: workOrder.title,
        address: workOrder.address,
        status: workOrder.status,
        serviceType: workOrder.serviceType,
        dueDate: workOrder.dueDate,
        contractor: workOrder.contractor,
        coordinator: workOrder.coordinator,
      },
      messageCount: messages.length,
      fileCount: workOrder.files.length,
      taskCount: (workOrder.tasks as any[])?.length || 0,
      completedTasks: (workOrder.tasks as any[])?.filter((t: any) => t.completed).length || 0,
      invoiceCount: workOrder.invoices.length,
      historyCount: workOrder.history.length,
    },
  };
}

async function getPropertyContext(propertyId: string, userId: string, role: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      workOrders: {
        include: {
          contractor: { select: { name: true } },
          coordinator: { select: { name: true } },
          invoices: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!property) throw new Error("Property not found");

  const totalRevenue = property.workOrders.reduce(
    (sum: number, wo: any) => sum + wo.invoices.reduce((s: number, inv: any) => s + inv.total, 0),
    0
  );

  const statusCounts = property.workOrders.reduce((acc: Record<string, number>, wo: any) => {
    acc[wo.status] = (acc[wo.status] || 0) + 1;
    return acc;
  }, {});

  const systemContext = `
PROPERTY DETAILS:
- Address: ${property.address}, ${property.city || ""}, ${property.state || ""} ${property.zipCode || ""}
- Created: ${new Date(property.createdAt).toLocaleDateString()}

WORK ORDERS (${property.workOrders.length}):
${property.workOrders.map((wo: any) => `- ${wo.title} [${wo.status}] ${wo.serviceType} - Contractor: ${wo.contractor?.name || "N/A"} - Due: ${wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "N/A"}`).join("\n")}

STATUS BREAKDOWN:
${Object.entries(statusCounts).map(([status, count]) => `- ${status}: ${count}`).join("\n")}

TOTAL REVENUE: $${totalRevenue.toFixed(2)}
`;

  return {
    systemContext,
    responseData: {
      property: {
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
      },
      workOrderCount: property.workOrders.length,
      totalRevenue,
      statusCounts,
    },
  };
}

async function getContractorSearchContext(message: string, userId: string, role: string) {
  // Extract location and service type from message
  const locationKeywords = extractLocation(message);
  const serviceKeywords = extractServiceType(message);

  const where: any = { role: "CONTRACTOR", isActive: true };
  if (serviceKeywords.length > 0) {
    // Search by company or name matching service type
    where.OR = serviceKeywords.map((s) => ({
      OR: [
        { company: { contains: s, mode: "insensitive" } },
        { name: { contains: s, mode: "insensitive" } },
      ],
    }));
  }

  const contractors = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      image: true,
      assignedWorkOrders: {
        select: {
          id: true,
          title: true,
          status: true,
          address: true,
          serviceType: true,
          completedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    take: 20,
  });

  // Calculate stats for each contractor
  const contractorStats = contractors.map((c: any) => {
    const total = c.assignedWorkOrders.length;
    const completed = c.assignedWorkOrders.filter(
      (wo: any) => wo.status === "CLOSED" || wo.status === "OFFICE_COMPLETE"
    ).length;
    const active = c.assignedWorkOrders.filter(
      (wo: any) => !["CLOSED", "CANCELLED"].includes(wo.status)
    ).length;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      image: c.image,
      totalJobs: total,
      completedJobs: completed,
      activeJobs: active,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : "N/A",
    };
  });

  const systemContext = `
CONTRACTOR SEARCH RESULTS:
Search query: "${message}"
${locationKeywords.length > 0 ? `Location filter: ${locationKeywords.join(", ")}` : ""}
${serviceKeywords.length > 0 ? `Service filter: ${serviceKeywords.join(", ")}` : ""}

AVAILABLE CONTRACTORS (${contractorStats.length}):
${contractorStats.map((c) => `- ${c.name} (${c.company || "Independent"}) - Jobs: ${c.totalJobs} (Completed: ${c.completedJobs}, Active: ${c.activeJobs}) - Rate: ${c.completionRate}% - Phone: ${c.phone || "N/A"} - Email: ${c.email}`).join("\n")}
`;

  return {
    systemContext,
    responseData: {
      contractors: contractorStats,
      searchCriteria: {
        location: locationKeywords,
        serviceType: serviceKeywords,
      },
    },
  };
}

async function getGeneralContext(userId: string, role: string) {
  const where: any = {};
  if (role === "CONTRACTOR") where.contractorId = userId;
  if (role === "CLIENT") where.contractorId = userId; // Simplified

  const [workOrders, recentMessages, invoices] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        serviceType: true,
        dueDate: true,
        address: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.message.findMany({
      where: {
        thread: { participants: { some: { userId } } },
      },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.invoice.findMany({
      where: role === "ADMIN" ? {} : { clientId: userId },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const statusCounts = workOrders.reduce((acc: Record<string, number>, wo: any) => {
    acc[wo.status] = (acc[wo.status] || 0) + 1;
    return acc;
  }, {});

  const overdue = workOrders.filter(
    (wo: any) =>
      wo.dueDate &&
      new Date(wo.dueDate) < new Date() &&
      !["CLOSED", "CANCELLED"].includes(wo.status)
  );

  const systemContext = `
PLATFORM OVERVIEW:
Role: ${role}

WORK ORDERS (${workOrders.length}):
Status breakdown:
${Object.entries(statusCounts).map(([s, c]) => `  - ${s}: ${c}`).join("\n")}

OVERDUE WORK ORDERS (${overdue.length}):
${overdue.map((wo: any) => `- ${wo.title} at ${wo.address} (Due: ${new Date(wo.dueDate).toLocaleDateString()}) [${wo.status}]`).join("\n") || "None"}

RECENT MESSAGES (${recentMessages.length}):
${recentMessages.slice(0, 10).map((m: any) => `- [${m.author?.name}] ${m.content?.slice(0, 100)}`).join("\n") || "No recent messages"}

INVOICES (${invoices.length}):
${invoices.slice(0, 5).map((inv: any) => `- #${inv.invoiceNumber}: $${inv.total} (${inv.status})`).join("\n") || "No invoices"}

TOTAL REVENUE: $${invoices.reduce((s: number, i: any) => s + i.total, 0).toFixed(2)}
`;

  return {
    systemContext,
    responseData: {
      workOrderCount: workOrders.length,
      statusCounts,
      overdueCount: overdue.length,
      recentMessageCount: recentMessages.length,
      invoiceCount: invoices.length,
      totalRevenue: invoices.reduce((s: number, i: any) => s + i.total, 0),
    },
  };
}

// ─── AI Response Generator ───────────────────────────────────────────────────

function buildAIPrompt(
  userMessage: string,
  systemContext: string,
  role: string,
  history?: { role: string; content: string }[]
): string {
  const roleInstructions: Record<string, string> = {
    ADMIN:
      "You have FULL ACCESS to all data. You can see work orders, properties, messages, invoices, and user details for the entire platform.",
    COORDINATOR:
      "You have access to work orders you coordinate, their messages, files, and related data.",
    PROCESSOR:
      "You have access to work orders you process, QC data, and completion details.",
    CONTRACTOR:
      "You can ONLY see work orders assigned to you. You cannot see other contractors' data.",
    CLIENT:
      "You can ONLY see work orders and invoices related to your properties.",
  };

  return `You are PropPreserve AI Assistant — an intelligent helper for a property preservation management platform.

ROLE: ${role}
ACCESS LEVEL: ${roleInstructions[role] || "Limited access"}

CONTEXT DATA:
${systemContext}

INSTRUCTIONS:
- Answer questions based ONLY on the context data provided above.
- If asked about something not in the data, say "I don't have that information available."
- Be concise and specific. Use numbers and dates when available.
- For summaries, organize information clearly with bullet points.
- For contractor searches, rank by completion rate and availability.
- For overdue items, flag them clearly.
- Never fabricate data. Only use what's in the context.

${history?.length ? `CONVERSATION HISTORY:\n${history.map((h) => `${h.role}: ${h.content}`).join("\n")}` : ""}

USER QUESTION: ${userMessage}`;
}

function generateAIResponse(
  prompt: string,
  userMessage: string,
  contextData: any,
  role: string
): string {
  const msg = userMessage.toLowerCase();

  // Work order summary
  if (msg.includes("summar") && contextData.workOrder) {
    const wo = contextData.workOrder;
    return `📋 **Work Order Summary: ${wo.title}**

**Address:** ${wo.address}
**Status:** ${wo.status}
**Service Type:** ${wo.serviceType}
**Due Date:** ${wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : "Not set"}

**Progress:**
- Tasks: ${contextData.completedTasks}/${contextData.taskCount} completed
- Files: ${contextData.fileCount} uploaded
- Messages: ${contextData.messageCount} in threads
- Invoices: ${contextData.invoiceCount}

**Assigned To:**
- Contractor: ${wo.contractor?.name || "Unassigned"}
- Coordinator: ${wo.coordinator?.name || "None"}

${wo.status === "CLOSED" ? "✅ This work order is completed." : `⏳ Current status: ${wo.status}`}`;
  }

  // Property summary
  if (msg.includes("summar") && contextData.property) {
    const p = contextData.property;
    return `🏠 **Property Summary**

**Address:** ${p.address}, ${p.city || ""}, ${p.state || ""}

**Overview:**
- Total Work Orders: ${contextData.workOrderCount}
- Total Revenue: $${contextData.totalRevenue?.toFixed(2) || "0.00"}

**Status Breakdown:**
${Object.entries(contextData.statusCounts || {})
  .map(([status, count]) => `- ${status}: ${count}`)
  .join("\n")}`;
  }

  // Overdue check
  if (msg.includes("overdue") || msg.includes("late") || msg.includes("past due")) {
    if (contextData.overdueCount !== undefined) {
      return contextData.overdueCount > 0
        ? `⚠️ **${contextData.overdueCount} work order(s) are overdue.** Check the dashboard for details.`
        : "✅ No overdue work orders. Everything is on track!";
    }
  }

  // Status check
  if (msg.includes("status") || msg.includes("how many") || msg.includes("count")) {
    if (contextData.statusCounts) {
      return `📊 **Work Order Status Overview:**

${Object.entries(contextData.statusCounts)
  .map(([status, count]) => `- **${status}:** ${count}`)
  .join("\n")}

**Total:** ${contextData.workOrderCount || 0} work orders
${contextData.overdueCount > 0 ? `\n⚠️ **${contextData.overdueCount} overdue**` : ""}`;
    }
  }

  // Contractor search
  if (
    msg.includes("find") ||
    msg.includes("search") ||
    msg.includes("contractor") ||
    msg.includes("who can") ||
    msg.includes("available")
  ) {
    if (contextData.contractors?.length > 0) {
      const sorted = [...contextData.contractors].sort(
        (a: any, b: any) => parseFloat(b.completionRate) - parseFloat(a.completionRate)
      );
      return `👷 **Contractor Search Results:**

${sorted
  .slice(0, 5)
  .map(
    (c: any, i: number) =>
      `${i + 1}. **${c.name}** ${c.company ? `(${c.company})` : ""}
   - Completed: ${c.completedJobs}/${c.totalJobs} jobs (${c.completionRate}%)
   - Active: ${c.activeJobs} jobs
   - Phone: ${c.phone || "N/A"}
   - Email: ${c.email}`
  )
  .join("\n\n")}

${sorted.length > 5 ? `\n*And ${sorted.length - 5} more contractors available.*` : ""}`;
    }
    return "No contractors found matching your criteria. Try broadening your search.";
  }

  // General overview
  if (contextData.workOrderCount !== undefined) {
    return `📊 **Platform Overview:**

- **Work Orders:** ${contextData.workOrderCount}
- **Overdue:** ${contextData.overdueCount || 0}
- **Recent Messages:** ${contextData.recentMessageCount || 0}
- **Invoices:** ${contextData.invoiceCount || 0}
- **Total Revenue:** $${(contextData.totalRevenue || 0).toFixed(2)}

${contextData.overdueCount > 0 ? "⚠️ You have overdue work orders that need attention." : "✅ No overdue items."}

Ask me about specific work orders, properties, contractors, or request a summary!`;
  }

  // Fallback
  return `I can help you with:
- **Work order details** — "Tell me about work order [title/address]"
- **Summaries** — "Summarize this work order"
- **Status checks** — "How many work orders are overdue?"
- **Contractor search** — "Find contractors for grass cut in [area]"
- **Property history** — "What work orders are at [address]?"
- **General overview** — "Show me platform status"

What would you like to know?`;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function extractLocation(message: string): string[] {
  const locationPatterns = [
    /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /near\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
  ];
  const locations: string[] = [];
  for (const pattern of locationPatterns) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      locations.push(match[1]);
    }
  }
  return locations;
}

function extractServiceType(message: string): string[] {
  const serviceMap: Record<string, string[]> = {
    "GRASS_CUT": ["grass", "lawn", "mow", "cut"],
    "DEBRIS_REMOVAL": ["debris", "trash", "junk", "removal", "clean"],
    "WINTERIZATION": ["winter", "winterize", "freeze"],
    "BOARD_UP": ["board", "boardup", "window", "secure"],
    "INSPECTION": ["inspect", "inspection", "check"],
    "MOLD_REMEDIATION": ["mold", "remediation", "mildew"],
  };

  const msg = message.toLowerCase();
  const found: string[] = [];
  for (const [type, keywords] of Object.entries(serviceMap)) {
    if (keywords.some((k) => msg.includes(k))) {
      found.push(type);
    }
  }
  return found;
}
