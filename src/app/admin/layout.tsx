import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import prisma from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (!session) redirect("/login");
    if (session.accessLevel !== "superadmin" && session.accessLevel !== "admin") {
        redirect("/dashboard");
    }

    const dbUser = await prisma.user.findUnique({
        where: { expediente: session.expediente },
        select: { image: true }
    });

    return (
        <AdminShell session={session} image={dbUser?.image || null}>
            {children}
        </AdminShell>
    );
}
