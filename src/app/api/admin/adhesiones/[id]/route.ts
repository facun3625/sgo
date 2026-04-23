export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const { estado } = await req.json();
    if (!["pendiente", "aprobada", "rechazada"].includes(estado))
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

    const adhesion = await prisma.adhesionDebito.findUnique({ where: { id } });
    if (!adhesion) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const updated = await prisma.adhesionDebito.update({
        where: { id },
        data: { estado },
    });

    if (estado === "aprobada") {
        if (adhesion.tipoAdhesion === "CANCELACION") {
            // Al aprobar cancelación: desactivar la adhesión original
            await prisma.adhesionDebito.updateMany({
                where: {
                    expediente: adhesion.expediente,
                    tipoAdhesion: { not: "CANCELACION" },
                    estado: "aprobada",
                },
                data: { estado: "rechazada" },
            });
        } else {
            // Al aprobar nueva adhesión: limpiar cancelaciones aprobadas anteriores
            await prisma.adhesionDebito.updateMany({
                where: {
                    expediente: adhesion.expediente,
                    tipoAdhesion: "CANCELACION",
                    estado: "aprobada",
                },
                data: { estado: "rechazada" },
            });
        }
    }

    const esCancelacion = adhesion.tipoAdhesion === "CANCELACION";
    const mensajes: Record<string, string> = {
        aprobada: esCancelacion
            ? "Tu solicitud de cancelación de débito automático fue aprobada. El débito de tus cuotas ya no se procesará automáticamente."
            : "Tu solicitud de adhesión a débito automático fue aprobada. En breve se procesará el débito de tus cuotas.",
        rechazada: esCancelacion
            ? "Tu solicitud de cancelación de débito automático fue rechazada. Comunicate con el CPASF para más información."
            : "Tu solicitud de adhesión a débito automático fue rechazada. Comunicate con el CPASF para más información.",
    };

    if (mensajes[estado]) {
        await prisma.notificacion.create({
            data: {
                expediente: adhesion.expediente,
                titulo: "Adhesión a Débito Automático",
                mensaje: mensajes[estado],
                tipo: "debito",
            },
        });
    }

    return NextResponse.json(updated);
}
