import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

function calcularElegibles(
    inscripciones: { expediente: string }[],
    sesiones: { diaId: number | null; asistencias: { expediente: string }[] }[],
    tipoAsistencia: string,
    porcentajeMin: number | null,
    diasMinimos: number | null,
    totalDias: number,
) {
    if (tipoAsistencia === "ninguna") return inscripciones.map(i => i.expediente);

    return inscripciones
        .map(i => i.expediente)
        .filter(exp => {
            if (tipoAsistencia === "por_dia") {
                // días únicos asistidos (una sesión por día)
                const diasAsistidos = new Set(
                    sesiones
                        .filter(s => s.diaId !== null && s.asistencias.some(a => a.expediente === exp))
                        .map(s => s.diaId)
                ).size;
                return diasAsistidos >= (diasMinimos ?? 1);
            }
            if (tipoAsistencia === "global") {
                const totalSesiones = sesiones.length;
                if (totalSesiones === 0) return false;
                const sesionesAsistidas = sesiones.filter(s =>
                    s.asistencias.some(a => a.expediente === exp)
                ).length;
                return (sesionesAsistidas / totalSesiones) * 100 >= (porcentajeMin ?? 75);
            }
            return false;
        });
    void totalDias;
}

// GET: estado de certificados del curso
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const cursoId = parseInt(id);

    const [curso, inscripciones, sesiones, certificados, firmas] = await Promise.all([
        prisma.curso.findUnique({
            where: { id: cursoId },
            include: { dias: true },
        }),
        prisma.inscripcionCurso.findMany({ where: { cursoId, estado: "confirmada" } }),
        prisma.sesionAsistencia.findMany({
            where: { cursoId },
            include: { asistencias: true },
        }),
        prisma.certificadoCurso.findMany({ where: { cursoId } }),
        prisma.firmaAutoridad.findMany({ where: { enCertificado: true }, orderBy: { orden: "asc" } }),
    ]);

    if (!curso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const elegibles = calcularElegibles(
        inscripciones,
        sesiones,
        curso.tipoAsistencia,
        curso.porcentajeMin,
        curso.diasMinimos,
        curso.dias.length,
    );

    return NextResponse.json({ curso, elegibles, certificados, firmas });
}

// POST: emitir certificado(s)
// body: { expediente? } — si no viene expediente, emite para todos los elegibles
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const cursoId = parseInt(id);
    const body = await req.json();

    const [curso, inscripciones, sesiones] = await Promise.all([
        prisma.curso.findUnique({ where: { id: cursoId }, include: { dias: true } }),
        prisma.inscripcionCurso.findMany({ where: { cursoId, estado: "confirmada" } }),
        prisma.sesionAsistencia.findMany({ where: { cursoId }, include: { asistencias: true } }),
    ]);

    if (!curso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const elegibles = calcularElegibles(
        inscripciones,
        sesiones,
        curso.tipoAsistencia,
        curso.porcentajeMin,
        curso.diasMinimos,
        curso.dias.length,
    );

    const targets = body.expediente ? [body.expediente] : elegibles;

    // Emitir solo los que no tienen certificado todavía
    const yaEmitidos = await prisma.certificadoCurso.findMany({
        where: { cursoId, expediente: { in: targets } },
        select: { expediente: true },
    });
    const yaSet = new Set(yaEmitidos.map(c => c.expediente));
    const nuevos = targets.filter((exp: string) => !yaSet.has(exp));

    if (nuevos.length > 0) {
        await prisma.certificadoCurso.createMany({
            data: nuevos.map((exp: string) => ({ expediente: exp, cursoId })),
        });
    }

    const todos = await prisma.certificadoCurso.findMany({ where: { cursoId } });
    return NextResponse.json({ emitidos: nuevos.length, certificados: todos });
}

// DELETE: revocar certificado individual
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const cursoId = parseInt(id);
    const body = await req.json();

    await prisma.certificadoCurso.deleteMany({
        where: { cursoId, expediente: body.expediente },
    });

    return NextResponse.json({ ok: true });
}
