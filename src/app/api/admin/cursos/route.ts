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
    const { titulo, descripcion, organizador, fecha, fechaFin, hora, lugar, imagen, modalidad, fechaLimiteInscripcion, activo, opciones } = body;

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
            modalidad: modalidad || "Presencial",
            fechaLimiteInscripcion: fechaLimiteInscripcion ? new Date(fechaLimiteInscripcion) : null,
            activo: activo ?? true,
            opciones: {
                create: (opciones || []).map((o: { nombre: string; precio: number; cupo: number }) => ({
                    nombre: o.nombre,
                    precio: o.precio ?? 0,
                    cupo: o.cupo ?? 0,
                }))
            }
        },
        include: { opciones: true }
    });

    return NextResponse.json(curso);
}
