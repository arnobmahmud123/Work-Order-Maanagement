import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const inspector = await prisma.inspector.findUnique({
    where: { id },
    include: {
      specialties: true,
      callLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          initiator: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!inspector) {
    return NextResponse.json({ error: "Inspector not found" }, { status: 404 });
  }

  return NextResponse.json(inspector);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const inspector = await prisma.inspector.update({
    where: { id },
    data: body,
    include: { specialties: true },
  });

  return NextResponse.json(inspector);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.inspector.update({ where: { id }, data: { isActive: false } });

  return NextResponse.json({ success: true });
}
