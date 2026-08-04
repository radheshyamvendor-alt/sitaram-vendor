import { NextRequest, NextResponse } from "next/server";
import { verifyOtpApi } from "@/app/actions/order";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { prescriptionNo, otp } = await req.json();
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "").trim();

    if (!prescriptionNo || !otp) {
      return NextResponse.json({ success: false, error: "Missing prescriptionNo or otp" }, { status: 400 });
    }

    const result = await verifyOtpApi(prescriptionNo, otp, accessToken);
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    }
    
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  } catch (error) {
    console.error("API verify route error:", error);
    const message = error instanceof Error ? error.message : "OTP verification failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
