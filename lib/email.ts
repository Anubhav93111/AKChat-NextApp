import { Resend } from "resend";
import React from "react";
import OtpEmails from "@/app/emails/OtpEmail";
import RegistrationEmail from "@/app/emails/RegistrationEmail";

const resend = new Resend(process.env.RESEND_API_KEY);
console.log("🔑 Loaded API key:", process.env.RESEND_API_KEY);
export async function sendOtpEmail(to: string, otp: string) {
  const response = await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject: "Your OTP for Chat App",
    react: React.createElement(OtpEmails, { otp }),
  });

  console.log("📤 Resend response:", response);
}

export async function sendRegistrationEmail(to: string, name: string) {
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject: "Welcome to Chat App!",
    react: React.createElement(RegistrationEmail, { name }), // ✅ keep this
  });
}