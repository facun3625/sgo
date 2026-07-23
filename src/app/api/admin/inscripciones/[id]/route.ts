import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";
import { enviarInscripcionCursoConfirmada } from "@/lib/mailer";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { estado } = await req.json();

    const previa = await prisma.inscripcionCurso.findUnique({
        where: { id: parseInt(id) },
        include: { curso: true },
    });

    const updated = await prisma.inscripcionCurso.update({
        where: { id: parseInt(id) },
        data: { estado },
    });

    // Recién confirmada: aprobar el comprobante pendiente (si lo hay) y avisar al inscripto
    if (estado === "confirmada" && previa?.estado !== "confirmada") {
        await prisma.pagoPendiente.updateMany({
            where: { tipo: "curso", ref: id, estado: "pendiente" },
            data: { estado: "aprobado" },
        });

        if (previa?.esInvitado && previa.guestEmail) {
            enviarInscripcionCursoConfirmada(previa.guestEmail, previa.curso.titulo).catch(err => console.error("[mailer] error enviando confirmación a invitado:", err));
        } else if (previa) {
            await crearNotificacion(previa.expediente, "Inscripción confirmada",
                `Tu inscripción al curso "${previa.curso.titulo}" fue confirmada.`, "curso");
        }
    }

    return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Decrementar inscritos en la opción
    const insc = await prisma.inscripcionCurso.findUnique({
        where: { id: parseInt(id) },
        select: { opcionId: true },
    });

    await prisma.inscripcionCurso.delete({ where: { id: parseInt(id) } });

    if (insc?.opcionId) {
        await prisma.cursoOpcion.update({
            where: { id: insc.opcionId },
            data: { inscritos: { decrement: 1 } },
        });
    }

    return NextResponse.json({ success: true });
}
