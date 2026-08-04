const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const records = await prisma.gmailPrescription.findMany();
  console.log("TOTAL GMAIL PRESCRIPTIONS IN DB:", records.length);
  console.log(JSON.stringify(records, null, 2));
}

main().finally(() => prisma.$disconnect());
