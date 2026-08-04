import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/orders/email-received?email=xxx
// Returns the most recent EMAIL_RECEIVED orders for a chemist (last 10 minutes)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chemistEmail = searchParams.get("email");

  if (!chemistEmail) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      chemistEmail,
      status: "EMAIL_RECEIVED",
      createdAt: { gte: tenMinutesAgo },
    },
    select: {
      id: true,
      patientName: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json(orders);
}
