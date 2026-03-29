import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        // Verificar que tiene una adhesión aprobada (que no sea la cancelación misma)
        const adhesion = await prisma.adhesionDebito.findFirst({
            where: { expediente: session.expediente, estado: "aprobada", tipoAdhesion: { not: "CANCELACION" } },
        });

        if (!adhesion) {
            return NextResponse.json({ error: "No se encontró adhesión aprobada" }, { status: 400 });
        }

        // Verificar que no hay ya una cancelación pendiente
        const cancelacionPendiente = await prisma.adhesionDebito.findFirst({
            where: { expediente: session.expediente, tipoAdhesion: "CANCELACION", estado: "pendiente" },
        });

        if (cancelacionPendiente) {
            return NextResponse.json({ error: "Ya existe una solicitud de cancelación pendiente" }, { status: 400 });
        }

        // Crear solicitud de cancelación
        await prisma.adhesionDebito.create({
            data: {
                expediente: session.expediente || "",
                tipoAdhesion: "CANCELACION",
                estado: "pendiente",
                terminosAceptados: true,
            },
        });

        // Notificar a todos los admins
        const admins = await prisma.user.findMany({
            where: { accessLevel: { in: ["admin", "superadmin"] } },
            select: { expediente: true },
        });

        if (admins.length > 0) {
            const user = await prisma.user.findUnique({
                where: { expediente: session.expediente },
                select: { nombre: true, apellido: true },
            });
            const nombre = user ? `${user.apellido}, ${user.nombre}` : `Mat. ${session.expediente}`;

            await prisma.notificacion.createMany({
                data: admins.map((a) => ({
                    expediente: a.expediente!,
                    titulo: "Solicitud de Cancelación de Débito",
                    mensaje: `${nombre} (Mat. ${session.expediente}) solicita la cancelación de su adhesión a débito automático.`,
                    tipo: "admin_debito",
                })),
            });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error en cancelación:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
