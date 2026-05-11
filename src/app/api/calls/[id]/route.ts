import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const call = await prisma.callLog.findUnique({
    where: { id },
    include: {
      initiator: { select: { id: true, name: true, email: true, image: true } },
      recipient: { select: { id: true, name: true, email: true, image: true } },
      voiceProfile: true,
      inspector: { select: { id: true, name: true, company: true, phone: true } },
    },
  });

  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  return NextResponse.json(call);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const call = await prisma.callLog.update({
    where: { id },
    data: body,
    include: {
      initiator: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(call);
}
