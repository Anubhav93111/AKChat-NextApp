import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { loginSchema } from "./validations/login";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },



            },
            async authorize(credentials) {
                const result = loginSchema.safeParse(credentials);
                if (!result.success) {
                    console.log("❌ Validation failed:", result.error.flatten().fieldErrors);
                    throw new Error("Invalid login input");
                }

                const { email, password } = result.data;
                console.log("🔐 Login attempt:", email);

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user) {
                    console.log("⚠️ User not found");
                    throw new Error("User not found");
                }

                console.log("🔍 Comparing password:", password, "with hash:", user.password);
                const isValid = await bcrypt.compare(password, user.password);
                if (!isValid) {
                    console.log("❌ Password mismatch");
                    throw new Error("Password is incorrect");
                }

                console.log("✅ Login successful for:", user.email);
                return {
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            // When `user` is present, this is the first sign-in after authenticate.
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.email = user.email;
            }
            return token;
        },
        async session({ session, token }) {

            if (session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name as string
            }

            // optional debug logging when troubleshooting deployed sessions
            if ((process.env.NEXTAUTH_DEBUG || '').toLowerCase() === 'true') {
                try {
                    console.log('[NextAuth] session callback - session.user.id=', session.user?.id, ' token.id=', token.id);
                } catch (e) {}
            }

            return session
        }
    },
    pages: {
        signIn: "/login",
        error: "/login"
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60
    },
    // Ensure cookies set by NextAuth are marked secure when the site is served over HTTPS.
    // Use NEXTAUTH_URL to decide if cookies should be secure (helpful when NODE_ENV isn't enough).
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: ((process.env.NEXTAUTH_URL || '').startsWith('https') || process.env.NODE_ENV === 'production') as boolean,
                // Don't set domain - let it default to the current domain
            },
        },
    },
    secret: process.env.NEXTAUTH_SECRET
}