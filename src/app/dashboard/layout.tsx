import DashboardShell from "@/components/dashboard/DashboardShell";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    if (session.accessLevel === "superadmin" || session.accessLevel === "admin") {
        redirect("/admin");
    }

    const dbUser = await prisma.user.findUnique({
        where: { expediente: session.expediente }
    });

    if (!dbUser) {
        redirect("/login");
    }

    let hasDebt = false;
    try {
        const debtRecord = await prisma.deuda.findFirst({
            where: { expediente: session.expediente }
        });
        hasDebt = !!debtRecord;
    } catch (error) {
        console.error("Error checking debt status:", error);
    }

    const user = {
        nombre: dbUser.nombre,
        apellido: dbUser.apellido,
        expediente: dbUser.expediente || "",
        image: dbUser.image,
        hasDebt,
        isSuspended: dbUser.status === "suspended",
    };

    return (
        <DashboardShell user={user}>
            {children}
        </DashboardShell>
    );
}
