import { NextRequest, NextResponse } from "next/server";
import { stopGmailWatch } from "@/lib/gmail";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/auth/gmail/disconnect
// Body: { chemistEmail: string }
export async function POST(req: NextRequest) {
  try {
    const { chemistEmail } = await req.json();

    if (!chemistEmail) {
      return NextResponse.json({ error: "Missing chemistEmail" }, { status: 400 });
    }

    const connection = await prisma.gmailConnection.findUnique({
      where: { chemistEmail },
    });

    if (!connection) {
      return NextResponse.json({ error: "No Gmail connection found" }, { status: 404 });
    }

    // Stop the Gmail Pub/Sub watch
    await stopGmailWatch(chemistEmail);

    // Mark as inactive in database
    await prisma.gmailConnection.update({
      where: { chemistEmail },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Gmail disconnect error:", err);
    return NextResponse.json({ error: "Failed to disconnect Gmail" }, { status: 500 });
  }
}
