import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { loginSchema } from "./validations/login";

export const authOptions: NextAuthOptions = {
    providers: [
        // Register Google provider only when env vars are present to avoid runtime errors
        ...(function createGoogleProvider() {
            const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXTAUTH_GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.NEXTAUTH_GOOGLE_CLIENT_SECRET;
            if (clientId && clientSecret) {
                return [GoogleProvider({ clientId, clientSecret })];
            }
            try { console.warn('[NextAuth] Google provider not configured (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)'); } catch {}
            return [];
        })(),

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
                // For OAuth providers (Google) ensure user exists in DB and set token.id
                try {
                    // avoid `any` by using a narrow unknown->typed shape for provider user
                    const providerUser = user as unknown as { email?: string; name?: string; id?: string };
                    const email = providerUser.email as string | undefined;
                    const name = providerUser.name as string | undefined;
                    if (email) {
                        // upsert user record for OAuth logins
                        // generate a random password hash for OAuth-created users so DB constraints are satisfied
                        const randomPwd = Math.random().toString(36).slice(2);
                        const hashed = await bcrypt.hash(randomPwd, 10);
                        const dbUser = await prisma.user.upsert({
                            where: { email },
                            update: { name: name ?? undefined },
                            create: { email, name: name ?? '', password: hashed },
                        });
                        token.id = dbUser.id.toString();
                        token.name = dbUser.name;
                        token.email = dbUser.email;
                        // Notify websocket server (optional) so other connected devices can react
                        try {
                            const notifyUrl = process.env.WS_NOTIFY_URL;
                            const adminSecret = process.env.WS_ADMIN_SECRET;
                            if (notifyUrl) {
                                // best-effort notify; don't block signin on failures
                                const headers: Record<string, string> = { 'content-type': 'application/json' };
                                if (adminSecret) headers['x-admin-secret'] = adminSecret;
                                fetch(notifyUrl, {
                                    method: 'POST',
                                    headers,
                                    body: JSON.stringify({ userId: dbUser.id, name: dbUser.name, url: `/user/${dbUser.name}` }),
                                }).catch((e) => console.warn('[NextAuth] notify ws server failed', e));
                            }
                        } catch (e) {
                            console.warn('[NextAuth] ws notify error', e);
                        }
                    } else {
                        // fallback to whatever the provider returned
                        token.id = providerUser.id ?? token.id;
                        token.name = providerUser.name ?? token.name;
                    }
                } catch (err) {
                    console.warn('[NextAuth] jwt upsert user failed', err);
                }
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
            },
        },
    },
    secret: process.env.NEXTAUTH_SECRET
}