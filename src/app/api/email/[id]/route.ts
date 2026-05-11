import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ─── Email Detail / Actions ──────────────────────────────────────────────────
// GET: Fetch single email
// PATCH: Mark read/starred/label

// Shared store - imported from parent route via globalThis
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { id } = await params;

  const store = getStore();
  const readSet = getReadTracker().get(userId) || new Set();
  const emails = store.get(userId) || [];
  const email = emails.find((e) => e.id === id);

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  // Mark as read
  readSet.add(id);
  getReadTracker().set(userId, readSet);

  return NextResponse.json({ ...email, read: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { id } = await params;
  const body = await req.json();

  const store = getStore();
  const readSet = getReadTracker().get(userId) || new Set();
  const emails = store.get(userId) || [];
  const email = emails.find((e) => e.id === id);

  if (!email) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  // Update read status via shared tracker
  if (body.read === true) readSet.add(id);
  if (body.read === false) readSet.delete(id);
  getReadTracker().set(userId, readSet);

  if (body.starred !== undefined) email.starred = body.starred;
  if (body.labels !== undefined) email.labels = body.labels;
  if (body.archived !== undefined) email.archived = body.archived;
  if (body.trashed !== undefined) email.trashed = body.trashed;

  return NextResponse.json({ ...email, read: readSet.has(id) });
}
