import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware() {
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;
                // ✅ Public routes: accessible to everyone
                if (
                    pathname === "/" ||
                    pathname.startsWith("/login") ||
                    pathname.startsWith("/register") ||
                    pathname.startsWith("/api/auth")
                ) {
                    return true;
                }

                // 🔐 All other routes require authentication
                return !!token;
            }
        }
    }

)

export const config = {
    matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"]
}