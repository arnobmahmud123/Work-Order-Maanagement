import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── AI Auto Text Messaging ──────────────────────────────────────────────────
// Generates context-aware messages for contractors based on work order status,
// due dates, unread messages, and pending issues.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { workOrderId, messageType } = body;

  if (!workOrderId) {
    return NextResponse.json(
      { error: "Work order ID is required" },
      { status: 400 }
    );
  }

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      contractor: { select: { id: true, name: true, email: true, phone: true } },
      coordinator: { select: { id: true, name: true, email: true } },
      threads: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { author: { select: { name: true } } },
          },
          participants: { select: { userId: true } },
        },
      },
    },
  });

  if (!workOrder) {
    return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  }

  if (!workOrder.contractor) {
    return NextResponse.json(
      { error: "No contractor assigned" },
      { status: 400 }
    );
  }

  const now = new Date();
  const dueDate = workOrder.dueDate ? new Date(workOrder.dueDate) : null;
  const daysUntilDue = dueDate
    ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let message = "";
  let urgency: "low" | "medium" | "high" | "urgent" = "low";

  switch (messageType) {
    case "due_reminder":
      if (daysUntilDue !== null) {
        if (daysUntilDue < 0) {
          message = `⚠️ OVERDUE: Work order "${workOrder.title}" at ${workOrder.address} was due ${Math.abs(daysUntilDue)} day(s) ago. Current status: ${workOrder.status}. Please provide an update immediately.`;
          urgency = "urgent";
        } else if (daysUntilDue <= 1) {
          message = `🔴 DUE TODAY: Work order "${workOrder.title}" at ${workOrder.address} is due today. Current status: ${workOrder.status}. Please confirm completion or provide an update.`;
          urgency = "high";
        } else if (daysUntilDue <= 3) {
          message = `🟡 UPCOMING: Work order "${workOrder.title}" at ${workOrder.address} is due in ${daysUntilDue} days. Current status: ${workOrder.status}. Please confirm you're on track.`;
          urgency = "medium";
        } else {
          message = `📋 Reminder: Work order "${workOrder.title}" at ${workOrder.address} is due in ${daysUntilDue} days. Status: ${workOrder.status}.`;
          urgency = "low";
        }
      }
      break;

    case "status_update":
      message = `📋 Status Update Needed: Work order "${workOrder.title}" at ${workOrder.address} is currently "${workOrder.status}". Please provide a progress update with photos if applicable.`;
      urgency = "medium";
      break;

    case "photo_request":
      message = `📸 Photo Update Required: Please upload ${workOrder.status === "IN_PROGRESS" ? "during" : "after"} photos for work order "${workOrder.title}" at ${workOrder.address}. Include before, during, and after shots as applicable.`;
      urgency = "medium";
      break;

    case "completion_reminder":
      message = `✅ Completion Reminder: Work order "${workOrder.title}" at ${workOrder.address} needs to be marked as complete. Please ensure all tasks are done, photos uploaded, and mark the job as field complete.`;
      urgency = "high";
      break;

    case "unread_messages":
      // Check for unread messages
      const lastMessage = workOrder.threads
        .flatMap((t: any) => t.messages)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (lastMessage) {
        message = `💬 Unread Message: There's a new message on work order "${workOrder.title}" from ${lastMessage.author?.name}: "${lastMessage.content?.slice(0, 100)}..." — Please check and respond.`;
        urgency = "medium";
      }
      break;

    case "access_info":
      message = `🔑 Access Info for "${workOrder.title}" at ${workOrder.address}:`;
      if (workOrder.lockCode) message += `\n- Lock Code: ${workOrder.lockCode}`;
      if (workOrder.gateCode) message += `\n- Gate Code: ${workOrder.gateCode}`;
      if (workOrder.keyCode) message += `\n- Key Code: ${workOrder.keyCode}`;
      if (workOrder.specialInstructions) message += `\n- Instructions: ${workOrder.specialInstructions}`;
      urgency = "low";
      break;

    default:
      // Auto-detect what message to send
      if (daysUntilDue !== null && daysUntilDue <= 0) {
        message = `⚠️ OVERDUE ALERT: "${workOrder.title}" at ${workOrder.address} is ${Math.abs(daysUntilDue)} day(s) past due. Status: ${workOrder.status}. Immediate action required.`;
        urgency = "urgent";
      } else if (daysUntilDue !== null && daysUntilDue <= 2) {
        message = `🔴 Due Soon: "${workOrder.title}" at ${workOrder.address} is due in ${daysUntilDue} day(s). Current status: ${workOrder.status}. Please confirm progress.`;
        urgency = "high";
      } else if (workOrder.status === "ASSIGNED") {
        message = `📋 New Assignment: You've been assigned "${workOrder.title}" at ${workOrder.address}. Due: ${dueDate?.toLocaleDateString() || "TBD"}. Please confirm receipt and schedule the work.`;
        urgency = "medium";
      } else if (workOrder.status === "REVISIONS_NEEDED") {
        message = `🔄 Revisions Needed: "${workOrder.title}" at ${workOrder.address} requires revisions. Please review the feedback and address the issues.`;
        urgency = "high";
      } else {
        message = `📋 Update Request: Please provide a status update on "${workOrder.title}" at ${workOrder.address}. Current status: ${workOrder.status}.`;
        urgency = "medium";
      }
  }

  // Create notification for contractor
  await prisma.notification.create({
    data: {
      title: `Message from Coordinator`,
      message: message.slice(0, 200),
      type: "MESSAGE",
      userId: workOrder.contractorId!,
      workOrderId: workOrder.id,
    },
  });

  // Log the auto-message
  await prisma.activityLog.create({
    data: {
      action: "AUTO_MESSAGE_SENT",
      details: `Auto-message (${messageType || "auto"}) sent to ${workOrder.contractor.name}: ${message.slice(0, 100)}`,
      userId: (session.user as any).id,
      workOrderId: workOrder.id,
    },
  });

  return NextResponse.json({
    message,
    urgency,
    recipient: {
      id: workOrder.contractor.id,
      name: workOrder.contractor.name,
      email: workOrder.contractor.email,
      phone: workOrder.contractor.phone,
    },
    workOrder: {
      id: workOrder.id,
      title: workOrder.title,
      status: workOrder.status,
      dueDate: workOrder.dueDate,
    },
  });
}
