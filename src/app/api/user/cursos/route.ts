import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [cursos, inscripciones] = await Promise.all([
        prisma.curso.findMany({
            where: { activo: true },
            include: {
                opciones: true,
                _count: { select: { inscripciones: true } },
            },
            orderBy: { fecha: "asc" },
        }),
        prisma.inscripcionCurso.findMany({
            where: { expediente: session.expediente },
            select: { cursoId: true, opcionId: true, estado: true },
        }),
    ]);

    const inscritosMap = new Map(inscripciones.map(i => [i.cursoId, i]));

    const data = cursos.map(curso => ({
        id: curso.id,
        titulo: curso.titulo,
        descripcion: curso.descripcion,
        organizador: curso.organizador,
        fecha: curso.fecha,
        fechaFin: curso.fechaFin,
        hora: curso.hora,
        lugar: curso.lugar,
        imagen: curso.imagen,
        modalidad: curso.modalidad,
        fechaLimiteInscripcion: curso.fechaLimiteInscripcion,
        totalInscripciones: curso._count.inscripciones,
        opciones: curso.opciones.map(op => ({
            id: op.id,
            nombre: op.nombre,
            precio: op.precio,
            cupo: op.cupo,
            inscritos: op.inscritos,
            disponible: op.cupo === 0 || op.inscritos < op.cupo,
        })),
        inscripcion: inscritosMap.get(curso.id) || null,
    }));

    return NextResponse.json(data);
}
