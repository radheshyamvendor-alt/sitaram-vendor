import { google } from "googleapis";
import prisma from "@/lib/prisma";
import { emailEvents } from "./emailEvents";

// ─── OAuth Client Factory ────────────────────────────────────────────────────
export function createOAuthClient(): any {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
  );
}

// ─── Generate the Google consent URL ─────────────────────────────────────────
export function getAuthUrl(chemistEmail: string): string {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent select_account",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state: chemistEmail,
  });
}

// ─── Exchange auth code for tokens ───────────────────────────────────────────
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// ─── Get a valid access token (refresh if expired) ───────────────────────────
export async function getValidAccessToken(chemistEmail: string): Promise<string> {
  const connection = await prisma.gmailConnection.findUnique({
    where: { chemistEmail },
  });

  if (!connection || !connection.isActive) {
    throw new Error(`No active Gmail connection for ${chemistEmail}`);
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: connection.encryptedRefreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return credentials.access_token;
}

// ─── Register Gmail Pub/Sub watch for a user ─────────────────────────────────
export async function registerGmailWatch(chemistEmail: string): Promise<void> {
  const accessToken = await getValidAccessToken(chemistEmail);
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: process.env.GOOGLE_PUBSUB_TOPIC!,
      labelIds: ["INBOX"],
    },
  });

  const expiry = res.data.expiration
    ? new Date(parseInt(res.data.expiration))
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.gmailConnection.update({
    where: { chemistEmail },
    data: {
      historyId: res.data.historyId ?? null,
      watchExpiry: expiry,
    },
  });
}

// ─── Stop Gmail watch for a user ─────────────────────────────────────────────
export async function stopGmailWatch(chemistEmail: string): Promise<void> {
  try {
    const accessToken = await getValidAccessToken(chemistEmail);
    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    await gmail.users.stop({ userId: "me" });
  } catch {
    // Ignore errors on stop
  }
}

// ─── Fetch new messages since lastHistoryId ───────────────────────────────────
export async function fetchNewMessages(
  chemistEmail: string,
  startHistoryId: string
): Promise<Array<{ messageId: string; threadId: string }>> {
  const accessToken = await getValidAccessToken(chemistEmail);
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
    labelId: "INBOX",
  });

  const messages: Array<{ messageId: string; threadId: string }> = [];
  for (const record of res.data.history ?? []) {
    for (const msg of record.messagesAdded ?? []) {
      if (msg.message?.id && msg.message?.threadId) {
        messages.push({
          messageId: msg.message.id,
          threadId: msg.message.threadId,
        });
      }
    }
  }

  return messages;
}

// ─── Get PDF/Prescription attachments from a message ──────────────────────────
export async function getPdfAttachments(
  chemistEmail: string,
  messageId: string,
  existingGmail?: any
): Promise<Array<{ attachmentId: string; filename: string }>> {
  let gmail = existingGmail;
  if (!gmail) {
    const accessToken = await getValidAccessToken(chemistEmail);
    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });
    gmail = google.gmail({ version: "v1", auth: oauth2Client });
  }

  const msg = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
  });

  const pdfs: Array<{ attachmentId: string; filename: string }> = [];

  const checkPart = (part: any) => {
    if (!part) return;
    const filename = part.filename || "";
    const mimeType = part.mimeType || "";

    const isPrescriptionFile =
      mimeType.toLowerCase() === "application/pdf" ||
      filename.toLowerCase().endsWith(".pdf") ||
      mimeType.toLowerCase().startsWith("image/") ||
      /\.(pdf|png|jpe?g|webp)$/i.test(filename);

    if (isPrescriptionFile && (part.body?.attachmentId || part.body?.data || part.body?.size) && filename) {
      pdfs.push({
        attachmentId: part.body?.attachmentId || "inline",
        filename,
      });
    }

    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        checkPart(subPart);
      }
    }
  };

  if (msg.data.payload) {
    checkPart(msg.data.payload);
  }

  return pdfs;
}

// ─── Download attachment bytes ────────────────────────────────────────────────
export async function downloadAttachment(
  chemistEmail: string,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const accessToken = await getValidAccessToken(chemistEmail);
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const res = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: attachmentId,
  });

  const base64Data = (res.data.data ?? "").replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64Data, "base64");
}

// Helper to detect non-prescription emails (e.g. Microsoft invoice, GitHub, security alerts)
function isNonPrescriptionEmail(senderStr?: string, subjectStr?: string, filenameStr?: string): boolean {
  const s = (senderStr || "").toLowerCase();
  const sub = (subjectStr || "").toLowerCase();
  const fn = (filenameStr || "").toLowerCase();

  // Skip automated services and system emails
  if (
    s.includes("microsoft") ||
    s.includes("github") ||
    s.includes("vercel") ||
    s.includes("google") ||
    s.includes("azure") ||
    s.includes("noreply") ||
    s.includes("no-reply")
  ) {
    return true;
  }

  // Skip non-prescription documents (invoices, receipts, billing statements)
  if (
    sub.includes("invoice") ||
    sub.includes("receipt") ||
    sub.includes("security alert") ||
    sub.includes("billing") ||
    sub.includes("statement") ||
    fn.includes("invoice") ||
    fn.includes("receipt") ||
    fn.includes("statement")
  ) {
    return true;
  }

  return false;
}

// ─── Inbox Sync for Prescriptions ─────────────────────────────────────────────
export async function syncGmailInbox(chemistEmail: string): Promise<number> {
  console.log(`[Gmail Sync] Starting sync for: ${chemistEmail}`);

  // 1. Clean up non-prescription records (e.g. Microsoft invoices) from DB
  try {
    await prisma.gmailPrescription.deleteMany({
      where: {
        chemistEmail,
        OR: [
          { sender: { contains: "microsoft", mode: "insensitive" } },
          { sender: { contains: "github", mode: "insensitive" } },
          { sender: { contains: "vercel", mode: "insensitive" } },
          { sender: { contains: "google", mode: "insensitive" } },
          { subject: { contains: "invoice", mode: "insensitive" } },
          { subject: { contains: "receipt", mode: "insensitive" } },
        ],
      },
    });

    // Deduplicate any existing duplicate filename records in DB for this chemist
    // select only id+filename to avoid loading full rows into memory as DB grows
    const existingDbItems = await prisma.gmailPrescription.findMany({
      where: { chemistEmail },
      orderBy: { receivedAt: "desc" },
      take: 1000,
      select: { id: true, filename: true },
    });
    const seenFilenames = new Set<string>();
    const dupIds: string[] = [];
    for (const item of existingDbItems) {
      if (seenFilenames.has(item.filename)) {
        dupIds.push(item.id);
      } else {
        seenFilenames.add(item.filename);
      }
    }
    if (dupIds.length > 0) {
      await prisma.gmailPrescription.deleteMany({
        where: { id: { in: dupIds } },
      });
    }
  } catch (err) {
    console.warn("[Gmail Sync] Pre-sync DB cleanup warning:", err);
  }

  const accessToken = await getValidAccessToken(chemistEmail);
  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Verify which Gmail account this token is connected to
  const profile = await gmail.users.getProfile({ userId: "me" });
  console.log(`[Gmail Sync] Token is authenticated for: ${profile.data.emailAddress} (chemistEmail param: ${chemistEmail})`);

  const res = await gmail.users.messages.list({
    userId: "me",
    q: "has:attachment newer_than:1d",
    maxResults: 150,
  });

  const messages = res.data.messages ?? [];
  console.log(`[Gmail Sync] Found ${messages.length} messages with attachments in Gmail.`);
  let newCount = 0;

  for (const msgRef of messages) {
    if (!msgRef.id) continue;

    const msg = await gmail.users.messages.get({
      userId: "me",
      id: msgRef.id,
    });

    const headers = msg.data.payload?.headers ?? [];
    const sender = headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? undefined;
    const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? undefined;

    // Filter out non-prescription emails (e.g. Microsoft invoices, GitHub notifications)
    if (isNonPrescriptionEmail(sender, subject)) continue;

    const pdfs = await getPdfAttachments(chemistEmail, msgRef.id, gmail);
    if (pdfs.length === 0) continue;

    for (const pdf of pdfs) {
      if (isNonPrescriptionEmail(sender, subject, pdf.filename)) continue;

      try {
        // Deduplicate by filename — same prescription file (e.g. 1001728491_183845.pdf) saved only once
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

        console.log(`[Gmail Sync] New prescription: ${pdf.filename} from ${sender}`);
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

        // Emit real-time event to NotificationBell
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

        newCount++;
      } catch (err) {
        console.error(`[Gmail Sync] Error saving prescription metadata for ${pdf.filename}:`, err);
      }
    }
  }

  console.log(`[Gmail Sync] Done! ${newCount} new prescription(s) saved.`);
  return newCount;
}
