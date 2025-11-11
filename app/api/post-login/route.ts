import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.name) {
        redirect(`/user/${session.user.name}`);
    }
    
    return NextResponse.redirect(new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
}
