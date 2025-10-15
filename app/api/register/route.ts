// app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/register";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  console.log("✅ /api/register route hit");

  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      console.warn("❌ Validation failed:", result.error.flatten());
      return NextResponse.json(
        { message: "Validation error", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, name } = result.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    return NextResponse.json(
      { message: "✅ New user created", user: { id: createdUser.id, email: createdUser.email } },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Registration error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}