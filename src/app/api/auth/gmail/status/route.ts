import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/auth/gmail/status?email=xxx
// Returns the Gmail connection status for a chemist
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chemistEmail = searchParams.get("email");

    if (!chemistEmail) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const connection = await prisma.gmailConnection.findUnique({
      where: { chemistEmail },
      select: {
        gmailAddress: true,
        isActive: true,
        watchExpiry: true,
        connectedAt: true,
      },
    });

    if (!connection || !connection.isActive) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      gmailAddress: connection.gmailAddress,
      watchExpiry: connection.watchExpiry,
      connectedAt: connection.connectedAt,
    });
  } catch (error) {
    console.error("Failed to fetch Gmail status:", error);
    // Return connected: false gracefully instead of 500
    return NextResponse.json({ connected: false });
  }
}
