import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/gmail";

export const dynamic = "force-dynamic";

// GET /api/auth/gmail/connect
// Reads chemistEmail from query param and redirects to Google OAuth consent screen
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chemistEmail = searchParams.get("email");

  if (!chemistEmail) {
    return NextResponse.json({ error: "Missing email parameter" }, { status: 400 });
  }

  const authUrl = getAuthUrl(chemistEmail);
  return NextResponse.redirect(authUrl);
}
