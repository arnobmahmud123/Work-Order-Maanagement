import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const TEMPLATES = [
  {
    id: "revision-request",
    name: "Revision Request",
    category: "QC",
    content:
      "Hi {contractor},\n\nAfter reviewing the work completed at {address}, we've identified the following issues that need to be addressed:\n\n• \n\nPlease complete these revisions by {dueDate} and upload updated photos upon completion.\n\nThank you,\n{coordinator}",
  },
  {
    id: "client-update",
    name: "Client Update",
    category: "CLIENT",
    content:
      "Hi {client},\n\nHere's an update on your property at {address}:\n\nWork Order: {title}\nStatus: {status}\nContractor: {contractor}\nExpected Completion: {dueDate}\n\nDetails:\n\n\nPlease let us know if you have any questions.\n\nBest regards,\n{coordinator}",
  },
  {
    id: "assignment-note",
    name: "Assignment Note",
    category: "ASSIGNMENT",
    content:
      "Hi {contractor},\n\nYou've been assigned a new work order:\n\nProperty: {address}\nService: {serviceType}\nDue Date: {dueDate}\n\nAccess Info:\n- Lock Code: {lockCode}\n- Gate Code: {gateCode}\n\nSpecial Instructions:\n{specialInstructions}\n\nPlease confirm receipt and estimated completion time.\n\nThanks,\n{coordinator}",
  },
  {
    id: "qc-feedback",
    name: "QC Feedback",
    category: "QC",
    content:
      "QC Review — {title}\n\nProperty: {address}\nContractor: {contractor}\nReview Date: {date}\n\nChecklist:\n☐ Before photos uploaded\n☐ During photos uploaded\n☐ After photos uploaded\n☐ All tasks completed\n☐ Property secured\n☐ Access codes documented\n\nQC Notes:\n\n\nResult: ☐ PASS  ☐ REVISIONS NEEDED",
  },
  {
    id: "accounting-note",
    name: "Accounting Note",
    category: "ACCOUNTING",
    content:
      "Accounting Note — {title}\n\nProperty: {address}\nInvoice #: {invoiceNumber}\nAmount: {amount}\n\nDetails:\n\n\nAction Required: ☐ Approve  ☐ Hold  ☐ Dispute",
  },
];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(TEMPLATES);
}
