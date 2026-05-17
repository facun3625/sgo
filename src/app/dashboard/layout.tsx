import DashboardShell from "@/components/dashboard/DashboardShell";
import CuilGate from "@/components/dashboard/CuilGate";
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

    if ((session.accessLevel === "superadmin" || session.accessLevel === "admin") && !session._impersonando) {
        redirect("/admin");
    }

    const dbUser = await prisma.user.findUnique({
        where: { expediente: session.expediente }
    });

    if (!dbUser) {
        redirect("/login");
    }

    // Auto-rehabilitación por vencimiento de plazo
    if ((dbUser.status === "suspended" || dbUser.status === "cancelled") &&
        dbUser.suspendedUntil && dbUser.suspendedUntil < new Date()) {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: dbUser.id },
                data: { status: "active", suspendedUntil: null },
            }),
            prisma.historialMatricula.create({
                data: {
                    expediente: dbUser.expediente ?? "",
                    accion: "habilitacion",
                    comentario: "Habilitación automática por vencimiento del plazo de suspensión.",
                    adminNombre: "Sistema",
                },
            }),
        ]);
        dbUser.status = "active";
        (dbUser as any).suspendedUntil = null;
    }

    let hasDebt = false;
    let needsCuil = false;
    try {
        const [debtRecord, dato] = await Promise.all([
            prisma.deuda.findFirst({ where: { expediente: session.expediente } }),
            prisma.dato.findFirst({
                where: { expediente: session.expediente },
                select: { cuil: true },
            }),
        ]);
        hasDebt = !!debtRecord;
        needsCuil = !dato?.cuil;
    } catch (error) {
        console.error("Error checking user data:", error);
    }

    const user = {
        nombre: dbUser.nombre,
        apellido: dbUser.apellido,
        expediente: dbUser.expediente || "",
        image: dbUser.image,
        hasDebt,
        status: dbUser.status,
        isSuspended: dbUser.status === "suspended" || dbUser.status === "cancelled",
        needsCuil,
        impersonando: session._impersonando ?? false,
        impersonadoPor: session._impersonadoPor ?? "",
    };

    return (
        <>
            <DashboardShell user={user}>
                {children}
            </DashboardShell>
            {needsCuil && !session._impersonando && <CuilGate />}
        </>
    );
}
