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
        select: { image: true, permisos: true }
    });

    // Always read permisos from DB (fresh, not from JWT which may be stale)
    let permisos: string[] = [];
    if (session.accessLevel !== "superadmin") {
        try {
            permisos = JSON.parse(dbUser?.permisos || "[]");
        } catch { permisos = []; }
    }

    return (
        <AdminShell session={session} image={dbUser?.image || null} permisos={session.accessLevel === "superadmin" ? null : permisos}>
            {children}
        </AdminShell>
    );
}
