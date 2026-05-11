import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, details } = body;

  if (!action || !details) {
    return NextResponse.json(
      { error: "action and details are required" },
      { status: 400 }
    );
  }

  const userId = (session.user as any).id;
  const userName = (session.user as any).name || "Unknown User";

  const log = await prisma.activityLog.create({
    data: {
      action,
      details: `${details} — by ${userName}`,
      userId,
      workOrderId: id,
    },
  });

  return NextResponse.json(log, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("entryId");

  if (!entryId) {
    return NextResponse.json({ error: "entryId is required" }, { status: 400 });
  }

  // Only allow admins or the user who created the entry to delete it
  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    const entry = await prisma.activityLog.findUnique({ where: { id: entryId } });
    if (!entry || entry.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.activityLog.delete({ where: { id: entryId } });

  return NextResponse.json({ success: true });
}
