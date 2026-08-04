const { getPdfAttachments, syncGmailInbox } = require("../src/lib/gmail");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Testing syncGmailInbox for radheshyamvendor@gmail.com...");
  const count = await syncGmailInbox("radheshyamvendor@gmail.com");
  console.log("SYNC RESULT COUNT:", count);

  const records = await prisma.gmailPrescription.findMany();
  console.log("PRESCRIPTION DB RECORDS NOW:", records.length, JSON.stringify(records, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
