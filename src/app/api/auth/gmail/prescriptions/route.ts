import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/auth/gmail/prescriptions?email=xxx&page=1&pageSize=10&search=xxx&statusFilter=all
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("statusFilter") || "all";

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const whereConditions: any = { chemistEmail: email };

    if (statusFilter === "unread") {
      whereConditions.status = "PENDING";
    } else if (statusFilter === "read") {
      whereConditions.status = "PROCESSED";
    } else if (statusFilter === "ordered") {
      whereConditions.status = "ORDERED";
    }

    if (search.trim()) {
      const query = search.trim();
      whereConditions.OR = [
        { sender: { contains: query, mode: "insensitive" } },
        { subject: { contains: query, mode: "insensitive" } },
        { filename: { contains: query, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * pageSize;

    const [prescriptions, totalCount, unreadCount] = await Promise.all([
      prisma.gmailPrescription.findMany({
        where: whereConditions,
        orderBy: { receivedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.gmailPrescription.count({ where: whereConditions }),
      prisma.gmailPrescription.count({
        where: { chemistEmail: email, status: "PENDING" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      prescriptions,
      unreadCount,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch gmail prescriptions:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}

// PATCH /api/auth/gmail/prescriptions
// Updates prescription status to "PROCESSED" (read)
export async function PATCH(req: NextRequest) {
  try {
    const { email, id, markAll } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Missing chemist email" }, { status: 400 });
    }

    if (markAll) {
      await prisma.gmailPrescription.updateMany({
        where: { chemistEmail: email, status: "PENDING" },
        data: { status: "PROCESSED" },
      });
      return NextResponse.json({ success: true, message: "All prescriptions marked as read" });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing prescription id" }, { status: 400 });
    }

    await prisma.gmailPrescription.update({
      where: { id },
      data: { status: "PROCESSED" },
    });

    return NextResponse.json({ success: true, message: "Prescription marked as read" });
  } catch (error: any) {
    console.error("Failed to update prescription status:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update status" },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/gmail/prescriptions?id=xxx&email=xxx
// Deletes a prescription record from the database
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (!id || !email) {
      return NextResponse.json({ error: "Missing prescription id or email" }, { status: 400 });
    }

    await prisma.gmailPrescription.deleteMany({
      where: {
        id,
        chemistEmail: email,
      },
    });

    return NextResponse.json({ success: true, message: "Prescription removed successfully" });
  } catch (error: any) {
    console.error("Failed to delete prescription:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to remove prescription" },
      { status: 500 }
    );
  }
}

