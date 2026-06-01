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

    let permisos: string[] = [];
    if (session.accessLevel !== "superadmin") {
        try {
            // Si está impersonando, usar permisos del JWT (ya son del admin impersonado)
            // Si es admin real, leer de DB (siempre fresco)
            const source = session._impersonando ? session.permisos : JSON.parse(dbUser?.permisos || "[]");
            permisos = Array.isArray(source) ? source : JSON.parse(source || "[]");
        } catch { permisos = []; }
    }

    return (
        <AdminShell session={session} image={dbUser?.image || null} permisos={session.accessLevel === "superadmin" ? null : permisos}>
            {children}
        </AdminShell>
    );
}
