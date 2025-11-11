import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function GET() {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.name) {
        redirect(`/user/${session.user.name}`);
    } else {
        redirect("/");
    }
}
