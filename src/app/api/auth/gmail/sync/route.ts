import { NextRequest, NextResponse } from "next/server";
import { syncGmailInbox } from "@/lib/gmail";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/auth/gmail/sync
// Manually triggers a scan of the connected Gmail inbox for PDF prescriptions
export async function POST(req: NextRequest) {
  try {
    const { chemistEmail } = await req.json();

    if (!chemistEmail) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const processedCount = await syncGmailInbox(chemistEmail);
    const totalCount = await prisma.gmailPrescription.count({
      where: { chemistEmail },
    });

    let message = "";
    if (processedCount > 0) {
      message = `Found and scanned ${processedCount} new email prescription(s)!`;
    } else if (totalCount > 0) {
      message = `Inbox is up to date! All ${totalCount} prescription(s) are synchronized in your hub.`;
    } else {
      message = "No PDF or image prescriptions found in connected Gmail inbox.";
    }

    return NextResponse.json({
      success: true,
      processedCount,
      totalCount,
      message,
    });
  } catch (error: any) {
    console.error("Gmail inbox sync error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to sync Gmail inbox" },
      { status: 500 }
    );
  }
}
