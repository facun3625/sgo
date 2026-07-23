export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [cursos, inscripciones, transferenciaConfig] = await Promise.all([
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
            select: { id: true, cursoId: true, opcionId: true, estado: true },
        }),
        prisma.config.findUnique({ where: { clave: "transferencia_curso" } }),
    ]);

    const inscritosMap = new Map(inscripciones.map(i => [i.cursoId, i]));

    const data = cursos.map(curso => {
        const inscripcion = inscritosMap.get(curso.id) || null;
        const infoPrivada = inscripcion?.estado === "confirmada" && inscripcion.opcionId
            ? (curso.opciones.find(o => o.id === inscripcion.opcionId)?.infoPrivada ?? null)
            : null;

        return {
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
            // Una opción con precio $0 y precio no matriculado definido es exclusiva del público general
            opciones: curso.opciones
                .filter(op => !(op.precio === 0 && op.precioNoMatriculado != null))
                .map(op => ({
                    id: op.id,
                    nombre: op.nombre,
                    precio: op.precio,
                    cupo: op.cupo,
                    inscritos: op.inscritos,
                    disponible: op.cupo === 0 || op.inscritos < op.cupo,
                })),
            tipoAsistencia: curso.tipoAsistencia,
            inscripcion: inscripcion ? { ...inscripcion, infoPrivada } : null,
        };
    });

    return NextResponse.json({ cursos: data, transferenciaHabilitada: transferenciaConfig?.valor === "1", expediente: session.expediente });
}
