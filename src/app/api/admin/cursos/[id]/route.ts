import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const curso = await prisma.curso.findUnique({
        where: { id: parseInt(id) },
        include: {
            opciones: true,
            inscripciones: {
                include: { opcion: true }
            }
        }
    });

    if (!curso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(curso);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await req.json();
    const { titulo, descripcion, organizador, fecha, fechaFin, hora, lugar, imagen, modalidad, fechaLimiteInscripcion, activo, mostrarEnCalendario, opciones } = body;

    await prisma.curso.update({
        where: { id },
        data: {
            titulo,
            descripcion,
            organizador: organizador || null,
            fecha: new Date(fecha),
            fechaFin: fechaFin ? new Date(fechaFin) : null,
            hora: hora || null,
            lugar: lugar || null,
            imagen: imagen || null,
            modalidad,
            fechaLimiteInscripcion: fechaLimiteInscripcion ? new Date(fechaLimiteInscripcion) : null,
            activo,
            mostrarEnCalendario: mostrarEnCalendario ?? false,
        }
    });

    if (opciones) {
        await prisma.cursoOpcion.deleteMany({ where: { cursoId: id } });
        await prisma.cursoOpcion.createMany({
            data: opciones.map((o: { nombre: string; precio: number; cupo: number }) => ({
                cursoId: id,
                nombre: o.nombre,
                precio: o.precio ?? 0,
                cupo: o.cupo ?? 0,
            }))
        });
    }

    const updated = await prisma.curso.findUnique({
        where: { id },
        include: { opciones: true }
    });

    return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.curso.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
}
