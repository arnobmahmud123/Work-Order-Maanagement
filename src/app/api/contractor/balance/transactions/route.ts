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
  const { searchParams } = new URL(req.url);
  const contractorId = searchParams.get("contractorId");

  const where: any = {};

  if (role === "ADMIN" && contractorId) {
    where.contractorId = contractorId;
  } else if (role === "ADMIN") {
    // Admin sees all
  } else {
    where.contractorId = userId;
  }

  const transactions = await prisma.balanceTransaction.findMany({
    where,
    include: {
      contractor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ transactions });
}
