import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Internal Email System ──────────────────────────────────────────────────
// GET: Fetch emails for the current user (with proper unread tracking)
// POST: Send a new internal email

interface EmailDraft {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  workOrderId?: string;
  threadId?: string;
  priority?: string;
  labels?: string[];
  attachments?: { filename: string; path: string; mimeType: string }[];
}

// In-memory email store with per-user read tracking (shared via globalThis)
function getStore(): Map<string, any[]> {
  const g = globalThis as any;
  if (!g.__emailStore) g.__emailStore = new Map();
  return g.__emailStore;
}

function getReadTracker(): Map<string, Set<string>> {
  const g = globalThis as any;
  if (!g.__readTracker) g.__readTracker = new Map();
  return g.__readTracker;
}

// Legacy aliases
const emailStore = { get: (k: string) => getStore().get(k), set: (k: string, v: any[]) => getStore().set(k, v), has: (k: string) => getStore().has(k) };
const readTracker = { get: (k: string) => getReadTracker().get(k), set: (k: string, v: Set<string>) => getReadTracker().set(k, v), has: (k: string) => getReadTracker().has(k) };

function getUserEmail(user: any): string {
  if (user.email) return user.email;
  const name = (user.name || "user").toLowerCase().replace(/\s+/g, ".");
  return `${name}@proppreserve.com`;
}

function seedDemoEmails(userId: string, userName: string, userEmail: string) {
  if (emailStore.has(userId)) return;

  const now = new Date();
  const emails = [
    {
      id: `email-${userId}-1`,
      from: { name: "John Smith", email: "john.smith@proppreserve.com" },
      to: [{ name: userName, email: userEmail }],
      cc: [],
      subject: "Work Order #1042 — Grass Cut Completed",
      body: `Hi ${userName?.split(" ")[0] || "there"},\n\nJust wanted to let you know that the grass cut at 456 Oak Avenue has been completed. All photos have been uploaded.\n\nPlease review and let me know if anything else is needed.\n\nBest regards,\nJohn Smith\nContractor`,
      date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      starred: true,
      labels: ["work-order"],
      priority: "normal",
      workOrderId: null,
      attachments: [],
      direction: "inbound",
    },
    {
      id: `email-${userId}-2`,
      from: { name: "Sarah Johnson", email: "sarah.johnson@proppreserve.com" },
      to: [{ name: userName, email: userEmail }],
      cc: [{ name: "Mike Wilson", email: "mike.wilson@proppreserve.com" }],
      subject: "Urgent: Board-Up Required at 789 Elm Street",
      body: `Hello,\n\nWe have an emergency situation at 789 Elm Street. A window was broken during the storm last night and we need an immediate board-up.\n\nCan you prioritize this? The property is vacant and we need to secure it ASAP.\n\nThanks,\nSarah Johnson\nProperty Manager`,
      date: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      read: false,
      starred: false,
      labels: ["urgent"],
      priority: "high",
      workOrderId: null,
      attachments: [],
      direction: "inbound",
    },
    {
      id: `email-${userId}-3`,
      from: { name: userName, email: userEmail },
      to: [{ name: "Mike Contractor", email: "mike.contractor@proppreserve.com" }],
      cc: [],
      subject: "Assignment: Winterization — 321 Pine Road",
      body: `Hi Mike,\n\nYou've been assigned a new winterization job:\n\nProperty: 321 Pine Road, Springfield, IL\nDue Date: ${new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n\nAccess Info:\n- Lock Code: 4582\n- Gate Code: N/A\n\nPlease confirm receipt and schedule the work.\n\nThanks,\n${userName}\nPropPreserve Team`,
      date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      starred: false,
      labels: ["assignment"],
      priority: "normal",
      workOrderId: null,
      attachments: [],
      direction: "outbound",
    },
    {
      id: `email-${userId}-4`,
      from: { name: "Accounting Dept", email: "accounting@proppreserve.com" },
      to: [{ name: userName, email: userEmail }],
      cc: [],
      subject: "Invoice #INV-2024-0047 Overdue — Action Required",
      body: `Hi ${userName?.split(" ")[0] || "there"},\n\nInvoice #INV-2024-0047 for $1,250.00 is now 15 days overdue.\n\nProperty: 567 Maple Drive\nClient: ABC Properties LLC\nAmount: $1,250.00\nDue Date: ${new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n\nPlease follow up with the client.\n\nThanks,\nAccounting Department`,
      date: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      read: true,
      starred: true,
      labels: ["accounting"],
      priority: "high",
      workOrderId: null,
      attachments: [],
      direction: "inbound",
    },
    {
      id: `email-${userId}-5`,
      from: { name: userName, email: userEmail },
      to: [{ name: "Sarah Johnson", email: "sarah.johnson@proppreserve.com" }],
      cc: [],
      subject: "Re: Monthly Property Report — April 2024",
      body: `Hi Sarah,\n\nAttached is the monthly property report for April 2024.\n\nSummary:\n- 12 work orders completed\n- 3 in progress\n- Total spend: $8,450\n- Average completion time: 2.3 days\n\nLet me know if you need any clarification.\n\nBest,\n${userName}`,
      date: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
      read: true,
      starred: false,
      labels: ["report"],
      priority: "normal",
      workOrderId: null,
      attachments: [{ filename: "april-2024-report.pdf", path: "#", mimeType: "application/pdf" }],
      direction: "outbound",
    },
    {
      id: `email-${userId}-6`,
      from: { name: "David Lee", email: "david.lee@proppreserve.com" },
      to: [{ name: userName, email: userEmail }],
      cc: [],
      subject: "Quote: Debris Removal — 890 Industrial Blvd",
      body: `Hi ${userName?.split(" ")[0] || "there"},\n\nPer your request, here's our quote for debris removal at 890 Industrial Blvd:\n\n- Labor (4 hours @ $55/hr): $220\n- Dumpster rental: $175\n- Disposal fees: $125\n- Trip fee: $25\n\nTotal: $545\n\nThis quote is valid for 14 days. Let me know if you'd like to proceed.\n\nThanks,\nDavid Lee\nClean-Up Pro Services`,
      date: new Date(now.getTime() - 96 * 60 * 60 * 1000).toISOString(),
      read: true,
      starred: false,
      labels: ["quote"],
      priority: "normal",
      workOrderId: null,
      attachments: [],
      direction: "inbound",
    },
    {
      id: `email-${userId}-7`,
      from: { name: "Lisa Chen", email: "lisa.chen@proppreserve.com" },
      to: [{ name: userName, email: userEmail }],
      cc: [],
      subject: "New Training Module Available — Safety Protocols 2024",
      body: `Hi team,\n\nWe've just published a new training module on safety protocols for 2024. Please complete it by end of this week.\n\nTopics covered:\n- Updated PPE requirements\n- Hazardous material handling\n- Emergency procedures\n- Client property protection\n\nAccess it from the Training section in your dashboard.\n\nBest,\nLisa Chen\nTraining Coordinator`,
      date: new Date(now.getTime() - 120 * 60 * 60 * 1000).toISOString(),
      read: false,
      starred: false,
      labels: [],
      priority: "normal",
      workOrderId: null,
      attachments: [],
      direction: "inbound",
    },
  ];

  emailStore.set(userId, emails);
  // Mark some as read
  const readSet = new Set<string>();
  emails.forEach((e) => { if (e.read) readSet.add(e.id); });
  readTracker.set(userId, readSet);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const userName = (session.user as any).name || "User";
  const userEmail = getUserEmail(session.user);

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") || "inbox";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  seedDemoEmails(userId, userName, userEmail);

  let emails = emailStore.get(userId) || [];
  const readSet = readTracker.get(userId) || new Set();

  // Apply read status from tracker
  emails = emails.map((e) => ({
    ...e,
    read: readSet.has(e.id),
  }));

  // Filter by folder
  if (folder === "inbox") {
    emails = emails.filter((e) => e.direction === "inbound");
  } else if (folder === "sent") {
    emails = emails.filter((e) => e.direction === "outbound");
  } else if (folder === "starred") {
    emails = emails.filter((e) => e.starred);
  } else if (folder === "unread") {
    emails = emails.filter((e) => !e.read);
  } else if (folder === "drafts") {
    emails = emails.filter((e) => e.isDraft);
  } else if (folder === "trash") {
    emails = emails.filter((e) => e.trashed);
  }

  // Search
  if (search) {
    const s = search.toLowerCase();
    emails = emails.filter(
      (e) =>
        e.subject?.toLowerCase().includes(s) ||
        e.body?.toLowerCase().includes(s) ||
        e.from?.name?.toLowerCase().includes(s) ||
        e.from?.email?.toLowerCase().includes(s) ||
        e.to?.some((t: any) => t.name?.toLowerCase().includes(s) || t.email?.toLowerCase().includes(s))
    );
  }

  // Sort by date descending
  emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = emails.length;
  const paginated = emails.slice((page - 1) * limit, page * limit);

  // Count unread inbound emails
  const allEmails = emailStore.get(userId) || [];
  const allReadSet = readTracker.get(userId) || new Set();
  const unreadCount = allEmails.filter(
    (e) => e.direction === "inbound" && !allReadSet.has(e.id) && !e.trashed
  ).length;

  return NextResponse.json({
    emails: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    unreadCount,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const userName = (session.user as any).name || "User";
  const userEmail = getUserEmail(session.user);
  const body: EmailDraft = await req.json();

  if (!body.to?.length || !body.subject || !body.body) {
    return NextResponse.json(
      { error: "To, subject, and body are required" },
      { status: 400 }
    );
  }

  seedDemoEmails(userId, userName, userEmail);

  const newEmail = {
    id: `email-${userId}-${Date.now()}`,
    from: { name: userName, email: userEmail },
    to: body.to.map((email) => {
      // Find user name from email
      const name = email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      return { name, email };
    }),
    cc: (body.cc || []).map((email) => {
      const name = email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      return { name, email };
    }),
    subject: body.subject,
    body: body.body,
    date: new Date().toISOString(),
    read: true,
    starred: false,
    labels: body.labels || [],
    priority: body.priority || "normal",
    workOrderId: body.workOrderId || null,
    attachments: body.attachments || [],
    direction: "outbound",
  };

  // Add to sender's store
  const emails = emailStore.get(userId) || [];
  emails.unshift(newEmail);
  emailStore.set(userId, emails);

  // Mark as read for sender
  const readSet = readTracker.get(userId) || new Set();
  readSet.add(newEmail.id);
  readTracker.set(userId, readSet);

  // Also deliver to recipients (internal emails)
  for (const recipient of body.to) {
    // Find recipient user by email pattern
    const recipientEmail = recipient.toLowerCase();
    // In a real system, look up by email. For demo, create inbox entries for all users.
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
    });

    for (const user of allUsers) {
      const uEmail = getUserEmail(user);
      if (uEmail.toLowerCase() === recipientEmail && user.id !== userId) {
        const recipientEmailObj = {
          ...newEmail,
          id: `email-${user.id}-${Date.now()}`,
          direction: "inbound",
          read: false,
          to: [{ name: user.name || "User", email: uEmail }],
        };

        if (!emailStore.has(user.id)) {
          emailStore.set(user.id, []);
        }
        emailStore.get(user.id)!.unshift(recipientEmailObj);
        // Don't mark as read for recipient
      }
    }
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "EMAIL_SENT",
      details: `Email sent to ${body.to.join(", ")}: ${body.subject}`,
      userId,
      workOrderId: body.workOrderId || null,
    },
  });

  return NextResponse.json(newEmail, { status: 201 });
}

// PATCH: Mark email as read/unread, star/unstar
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();
  const { emailId, read, starred, archived, trashed } = body;

  if (!emailId) {
    return NextResponse.json({ error: "emailId required" }, { status: 400 });
  }

  const readSet = readTracker.get(userId) || new Set();

  if (read === true) readSet.add(emailId);
  if (read === false) readSet.delete(emailId);

  readTracker.set(userId, readSet);

  // Update starred/archived/trashed in store
  const emails = emailStore.get(userId) || [];
  const email = emails.find((e) => e.id === emailId);
  if (email) {
    if (starred !== undefined) email.starred = starred;
    if (archived !== undefined) email.archived = archived;
    if (trashed !== undefined) email.trashed = trashed;
  }

  return NextResponse.json({ success: true });
}
