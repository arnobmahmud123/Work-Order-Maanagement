import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  if (role === "ADMIN") {
    // Admin sees all balances
    const balances = await prisma.contractorBalance.findMany({
      include: {
        contractor: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ balances });
  }

  // Contractor sees only their balance
  const balance = await prisma.contractorBalance.findUnique({
    where: { contractorId: userId },
    include: {
      contractor: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json({ balance: balance || null });
}
