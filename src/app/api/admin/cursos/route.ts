import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const cursos = await prisma.curso.findMany({
        include: {
            opciones: true,
            _count: { select: { inscripciones: true } }
        },
        orderBy: { fecha: "asc" }
    });

    return NextResponse.json(cursos);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { titulo, descripcion, organizador, fecha, fechaFin, hora, lugar, imagen, modalidad, fechaLimiteInscripcion, activo, opciones, tipoAsistencia, porcentajeMin, diasMinimos, dias } = body;

    const mod = modalidad || "Presencial";
    const tipoAsis = mod === "Virtual" ? "ninguna" : (tipoAsistencia || "ninguna");

    const curso = await prisma.curso.create({
        data: {
            titulo,
            descripcion,
            organizador: organizador || null,
            fecha: new Date(fecha),
            fechaFin: fechaFin ? new Date(fechaFin) : null,
            hora: hora || null,
            lugar: lugar || null,
            imagen: imagen || null,
            modalidad: mod,
            fechaLimiteInscripcion: fechaLimiteInscripcion ? new Date(fechaLimiteInscripcion) : null,
            activo: activo ?? true,
            tipoAsistencia: tipoAsis,
            porcentajeMin: tipoAsis === "global" ? (porcentajeMin ?? null) : null,
            diasMinimos: tipoAsis === "por_dia" ? (diasMinimos ?? null) : null,
            opciones: {
                create: (opciones || []).map((o: { nombre: string; precio: number; cupo: number }) => ({
                    nombre: o.nombre,
                    precio: o.precio ?? 0,
                    cupo: o.cupo ?? 0,
                }))
            },
            dias: tipoAsis === "por_dia" && dias?.length ? {
                create: (dias as { fecha: string; nombre?: string }[]).map((d, i) => ({
                    fecha: new Date(d.fecha),
                    nombre: d.nombre || null,
                    orden: i,
                }))
            } : undefined,
        },
        include: { opciones: true, dias: { orderBy: { orden: "asc" } } }
    });

    return NextResponse.json(curso);
}
