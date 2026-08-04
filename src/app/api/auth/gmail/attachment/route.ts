import { NextRequest, NextResponse } from "next/server";
import { downloadAttachment } from "@/lib/gmail";

export const dynamic = "force-dynamic";

// GET /api/auth/gmail/attachment?email=xxx&messageId=yyy&attachmentId=zzz
// Downloads a PDF attachment from Gmail for a chemist and returns it as a base64 Data URL or PDF binary
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const messageId = searchParams.get("messageId");
    const attachmentId = searchParams.get("attachmentId");

    if (!email || !messageId || !attachmentId) {
      return NextResponse.json(
        { error: "Missing required parameters (email, messageId, attachmentId)" },
        { status: 400 }
      );
    }

    const pdfBuffer = await downloadAttachment(email, messageId, attachmentId);
    const base64Pdf = pdfBuffer.toString("base64");

    return NextResponse.json({
      success: true,
      dataUrl: `data:application/pdf;base64,${base64Pdf}`,
      base64: base64Pdf,
    });
  } catch (error: any) {
    console.error("Failed to download Gmail attachment:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to download attachment" },
      { status: 500 }
    );
  }
}
