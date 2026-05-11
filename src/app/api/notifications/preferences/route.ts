import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId },
    });
  }

  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await req.json();

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId },
    update: {
      messagesInApp: body.messagesInApp,
      messagesEmail: body.messagesEmail,
      messagesSms: body.messagesSms,
      workOrderStatusInApp: body.workOrderStatusInApp,
      workOrderStatusEmail: body.workOrderStatusEmail,
      workOrderStatusSms: body.workOrderStatusSms,
      dueOverdueInApp: body.dueOverdueInApp,
      dueOverdueEmail: body.dueOverdueEmail,
      dueOverdueSms: body.dueOverdueSms,
      invoicesInApp: body.invoicesInApp,
      invoicesEmail: body.invoicesEmail,
      invoicesSms: body.invoicesSms,
      supportInApp: body.supportInApp,
      supportEmail: body.supportEmail,
      supportSms: body.supportSms,
      aiInApp: body.aiInApp,
      aiEmail: body.aiEmail,
      aiSms: body.aiSms,
      quietHoursEnabled: body.quietHoursEnabled,
      quietHoursStart: body.quietHoursStart,
      quietHoursEnd: body.quietHoursEnd,
      quietHoursTimezone: body.quietHoursTimezone,
    },
    create: {
      userId,
      ...body,
    },
  });

  return NextResponse.json(prefs);
}
