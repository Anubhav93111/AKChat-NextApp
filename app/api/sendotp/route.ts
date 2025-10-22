import { NextRequest, NextResponse } from "next/server";
import { storeOtp } from "@/lib/otpStore";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await storeOtp(email, otp);
    await sendOtpEmail(email.trim().toLowerCase(), otp);

    return NextResponse.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}