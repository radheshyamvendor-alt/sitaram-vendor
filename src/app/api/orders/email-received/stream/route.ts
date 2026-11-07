import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Deprecated: SSE stream previously kept serverless lambdas alive 24/7,
// exhausting Vercel Fluid Provisioned Memory.
// Real-time notifications are now handled reliably with smart polling via /api/auth/gmail/prescriptions.
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "deprecated",
    message: "SSE stream has been deprecated. Prescriptions are fetched via smart polling.",
  });
}
