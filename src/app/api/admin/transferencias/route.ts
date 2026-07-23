export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

const TIPO_LABELS: Record<string, string> = {
    matricula_mensual: "Cuota mensual",
    matricula_anual: "Matrícula anual",
    deuda: "Deuda",
    curso: "Curso",
};

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const pagos = await prisma.pagoPendiente.findMany({
        orderBy: { createdAt: "desc" },
    });

    // Enriquecer con info del usuario
    const expedientes = [...new Set(pagos.map((p) => p.expediente))];
    const usuarios = await prisma.user.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, nombre: true, apellido: true },
    });
    const userMap = new Map(usuarios.map((u) => [u.expediente, u]));

    // Enriquecer inscripciones de invitados (curso) con su nombre/DNI, ya que su expediente es sintético
    const refsCurso = [...new Set(pagos.filter(p => p.tipo === "curso").map(p => parseInt(p.ref)).filter(n => !isNaN(n)))];
    const inscripciones = refsCurso.length > 0 ? await prisma.inscripcionCurso.findMany({
        where: { id: { in: refsCurso }, esInvitado: true },
        select: { id: true, guestNombre: true, guestApellido: true, guestDni: true },
    }) : [];
    const inscripcionMap = new Map(inscripciones.map(i => [i.id, i]));

    const data = pagos.map((p) => {
        const inscGuest = p.tipo === "curso" ? inscripcionMap.get(parseInt(p.ref)) : undefined;
        return {
            ...p,
            tipoLabel: TIPO_LABELS[p.tipo] ?? p.tipo,
            usuario: userMap.get(p.expediente) ?? (inscGuest ? { nombre: inscGuest.guestNombre ?? "", apellido: inscGuest.guestApellido ?? "" } : null),
            esInvitado: !!inscGuest,
            guestDni: inscGuest?.guestDni ?? null,
        };
    });

    return NextResponse.json(data);
}
