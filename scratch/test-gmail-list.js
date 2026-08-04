const { google } = require("googleapis");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const connection = await prisma.gmailConnection.findUnique({
    where: { chemistEmail: "radheshyamvendor@gmail.com" },
  });

  if (!connection) {
    console.log("No connection found for radheshyamvendor@gmail.com");
    return;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
  );

  oauth2Client.setCredentials({
    refresh_token: connection.encryptedRefreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials({ access_token: credentials.access_token });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults: 5,
  });

  console.log("MESSAGES FOUND:", listRes.data.messages?.length);

  for (const mRef of listRes.data.messages || []) {
    const msg = await gmail.users.messages.get({ userId: "me", id: mRef.id });
    const headers = msg.data.payload?.headers || [];
    const subject = headers.find(h => h.name?.toLowerCase() === "subject")?.value;
    const from = headers.find(h => h.name?.toLowerCase() === "from")?.value;
    console.log(`\n--- MSG ${msg.data.id} ---`);
    console.log("From:", from);
    console.log("Subject:", subject);
    console.log("Payload MimeType:", msg.data.payload?.mimeType);
    console.log("Payload Filename:", msg.data.payload?.filename);
    console.log("Payload Parts count:", msg.data.payload?.parts?.length);

    if (msg.data.payload?.parts) {
      msg.data.payload.parts.forEach((p, idx) => {
        console.log(`  Part [${idx}]: mimeType=${p.mimeType}, filename=${p.filename}, hasBodyAttachmentId=${!!p.body?.attachmentId}, bodySize=${p.body?.size}`);
        if (p.parts) {
          p.parts.forEach((sp, sidx) => {
            console.log(`    SubPart [${sidx}]: mimeType=${sp.mimeType}, filename=${sp.filename}, hasBodyAttachmentId=${!!sp.body?.attachmentId}, bodySize=${sp.body?.size}`);
          });
        }
      });
    }
  }
}

main().finally(() => prisma.$disconnect());
