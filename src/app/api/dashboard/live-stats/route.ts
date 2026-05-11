import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last15min = new Date(now.getTime() - 15 * 60 * 1000);

  try {
    const [
      activeUsers,
      onlineNow,
      photosToday,
      messagesSent,
      tasksDone,
      bidsSubmitted,
      inspections,
    ] = await Promise.all([
      // Active users: users with activity logs in last 24h
      prisma.activityLog.findMany({
        where: { createdAt: { gte: last24h } },
        select: { userId: true },
        distinct: ["userId"],
      }).then((logs) => logs.filter((l) => l.userId).length),

      // Online now: users with sessions active in last 15 min
      prisma.session.count({
        where: { expires: { gte: now } },
      }),

      // Photos today: file uploads today
      prisma.fileUpload.count({
        where: { createdAt: { gte: todayStart } },
      }),

      // Messages sent today (both thread messages and chat messages)
      Promise.all([
        prisma.message.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.chatMessage.count({ where: { createdAt: { gte: todayStart } } }),
      ]).then(([m1, m2]) => m1 + m2),

      // Tasks done: work orders completed today
      prisma.workOrder.count({
        where: {
          status: { in: ["CLOSED", "OFFICE_COMPLETE"] },
          updatedAt: { gte: todayStart },
        },
      }),

      // Bids submitted: invoices created today
      prisma.invoice.count({
        where: { createdAt: { gte: todayStart } },
      }),

      // Inspections: inspection-type work orders today
      prisma.workOrder.count({
        where: {
          serviceType: "INSPECTION",
          createdAt: { gte: todayStart },
        },
      }),
    ]);

    // Average response time: average time between a message and the first reply
    let avgResponseTime = "0m";
    try {
      const threads = await prisma.thread.findMany({
        where: { createdAt: { gte: last24h } },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20,
            select: { authorId: true, createdAt: true },
          },
        },
        take: 50,
      });

      let totalResponseMs = 0;
      let responseCount = 0;

      for (const thread of threads) {
        const msgs = thread.messages;
        for (let i = 0; i < msgs.length - 1; i++) {
          if (msgs[i].authorId !== msgs[i + 1].authorId) {
            totalResponseMs +=
              msgs[i + 1].createdAt.getTime() - msgs[i].createdAt.getTime();
            responseCount++;
            break; // only first reply per thread
          }
        }
      }

      if (responseCount > 0) {
        const avgMs = totalResponseMs / responseCount;
        const avgMinutes = Math.round(avgMs / 60000);
        avgResponseTime = `${avgMinutes}m`;
      }
    } catch {}

    return NextResponse.json({
      activeUsers,
      onlineNow,
      photosToday,
      messagesSent,
      tasksDone,
      bidsSubmitted,
      inspections,
      avgResponseTime,
    });
  } catch (error) {
    console.error("Live stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch live stats" },
      { status: 500 }
    );
  }
}
