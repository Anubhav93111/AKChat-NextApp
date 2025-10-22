import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otpStore";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 });

    const isValid = await verifyOtp(email, otp);
    if (isValid) {
      return NextResponse.json({ message: "OTP verified successfully" });
    } else {
      return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}