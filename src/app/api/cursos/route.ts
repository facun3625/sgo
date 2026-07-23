export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Listado público de cursos abiertos a no matriculados — sin sesión.
export async function GET() {
    const [cursos, transferenciaConfig] = await Promise.all([
        prisma.curso.findMany({
            where: { activo: true, abiertoNoMatriculados: true },
            include: { opciones: true },
            orderBy: { fecha: "asc" },
        }),
        prisma.config.findUnique({ where: { clave: "transferencia_curso" } }),
    ]);

    const data = cursos
        .map(curso => ({
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
            opciones: curso.opciones
                .filter(op => op.precioNoMatriculado != null)
                .map(op => ({
                    id: op.id,
                    nombre: op.nombre,
                    precio: op.precioNoMatriculado as number,
                    cupo: op.cupo,
                    inscritos: op.inscritos,
                    disponible: op.cupo === 0 || op.inscritos < op.cupo,
                })),
        }))
        .filter(curso => curso.opciones.length > 0);

    return NextResponse.json({ cursos: data, transferenciaHabilitada: transferenciaConfig?.valor === "1" });
}
