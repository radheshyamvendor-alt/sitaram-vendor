import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { emailEvents } from "@/lib/emailEvents";
import { getPdfAttachments, getValidAccessToken, createOAuthClient } from "@/lib/gmail";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

// POST /api/webhooks/gmail
// Receives Pub/Sub push notifications from Google when new Gmail arrives
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Pub/Sub wraps the message in an envelope
    const pubsubMessage = body?.message;
    if (!pubsubMessage?.data) {
      return NextResponse.json({ ok: true });
    }

    // Decode the base64-encoded Pub/Sub data
    const decoded = Buffer.from(pubsubMessage.data, "base64").toString("utf-8");
    let notification: { emailAddress?: string; historyId?: string };
    try {
      notification = JSON.parse(decoded);
    } catch {
      return NextResponse.json({ ok: true });
    }

    const { emailAddress, historyId: newHistoryId } = notification;

    if (!emailAddress || !newHistoryId) {
      return NextResponse.json({ ok: true });
    }

    // Look up the chemist connection by Gmail address
    const connection = await prisma.gmailConnection.findFirst({
      where: { gmailAddress: emailAddress, isActive: true },
    });

    if (!connection) {
      return NextResponse.json({ ok: true });
    }

    // Process notification asynchronously
    processEmailNotificationAsync(connection.chemistEmail, newHistoryId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Gmail Webhook] Error:", err);
    return NextResponse.json({ ok: true });
  }
}

// ─── Async processing for incoming Pub/Sub notifications ─────────────────────
async function processEmailNotificationAsync(
  chemistEmail: string,
  newHistoryId: string
) {
  try {
    const connection = await prisma.gmailConnection.findUnique({
      where: { chemistEmail },
    });

    if (!connection) return;

    const accessToken = await getValidAccessToken(chemistEmail);
    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const res = await gmail.users.messages.list({
      userId: "me",
      q: "has:attachment",
      maxResults: 50,
    });

    for (const msgRef of res.data.messages ?? []) {
      if (!msgRef.id) continue;

      const msg = await gmail.users.messages.get({
        userId: "me",
        id: msgRef.id,
      });

      const headers = msg.data.payload?.headers ?? [];
      const sender = headers.find((h) => h.name?.toLowerCase() === "from")?.value;
      const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value;

      // Skip non-prescription emails (e.g. Microsoft invoices, GitHub notifications)
      const sLower = (sender || "").toLowerCase();
      const subLower = (subject || "").toLowerCase();
      if (
        sLower.includes("microsoft") ||
        sLower.includes("github") ||
        sLower.includes("vercel") ||
        sLower.includes("google") ||
        sLower.includes("azure") ||
        sLower.includes("noreply") ||
        subLower.includes("invoice") ||
        subLower.includes("receipt")
      ) {
        continue;
      }

      const pdfs = await getPdfAttachments(chemistEmail, msgRef.id);

      for (const pdf of pdfs) {
        const fnLower = (pdf.filename || "").toLowerCase();
        if (fnLower.includes("invoice") || fnLower.includes("receipt")) continue;

        // Deduplicate by filename
        const existingSameFile = await prisma.gmailPrescription.findFirst({
          where: { chemistEmail, filename: pdf.filename },
        });

        if (existingSameFile) {
          if (existingSameFile.attachmentId !== pdf.attachmentId) {
            await prisma.gmailPrescription.update({
              where: { id: existingSameFile.id },
              data: { attachmentId: pdf.attachmentId },
            });
          }
          continue;
        }

        const rxRecord = await prisma.gmailPrescription.create({
          data: {
            chemistEmail,
            sender: sender || "Patient Email",
            subject: subject || "Prescription PDF",
            filename: pdf.filename,
            attachmentId: pdf.attachmentId,
            messageId: msgRef.id,
            status: "PENDING",
          },
        });

        // Emit real-time SSE event to trigger Notification Bell badge in Header
        emailEvents.emit("new-order", {
          chemistEmail,
          order: {
            id: rxRecord.id,
            messageId: rxRecord.messageId,
            attachmentId: rxRecord.attachmentId,
            filename: rxRecord.filename,
            sender: rxRecord.sender,
            subject: rxRecord.subject,
            receivedAt: rxRecord.receivedAt,
          },
        });
      }
    }

    // Update stored historyId
    await prisma.gmailConnection.update({
      where: { chemistEmail },
      data: { historyId: newHistoryId },
    });
  } catch (err) {
    console.error("[Gmail Webhook] processEmailNotificationAsync error:", err);
  }
}
