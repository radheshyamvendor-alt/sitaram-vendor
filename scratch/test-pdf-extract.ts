import { syncGmailInbox } from "../src/lib/gmail";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Testing syncGmailInbox for radheshyamvendor@gmail.com...");
  const count = await syncGmailInbox("radheshyamvendor@gmail.com");
  console.log("SYNC RESULT COUNT:", count);

  const records = await prisma.gmailPrescription.findMany();
  console.log("PRESCRIPTION DB RECORDS NOW:", records.length, JSON.stringify(records, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
