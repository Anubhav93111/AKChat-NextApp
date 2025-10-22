import {prisma} from "./prisma"// adjust path if needed

function normalize(email: string) {
  return email.trim().toLowerCase();
}

export async function storeOtp(email: string, otp: string) {
  const normalizedEmail = normalize(email);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.otp.upsert({
    where: { email: normalizedEmail },
    update: { otp, expiresAt },
    create: { email: normalizedEmail, otp, expiresAt },
  });

  console.log("📨 Stored OTP:", otp, "for", normalizedEmail);
}

export async function verifyOtp(email: string, inputOtp: string): Promise<boolean> {
  const normalizedEmail = normalize(email);
  const record = await prisma.otp.findUnique({ where: { email: normalizedEmail } });

  console.log("🔍 Verifying OTP:", inputOtp, "for", normalizedEmail, "stored:", record?.otp);

  if (!record || new Date() > record.expiresAt) return false;
  return record.otp === inputOtp;
}