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
            dias: { orderBy: { orden: "asc" } },
            inscripciones: {
                include: { opcion: true }
            }
        }
    });

    if (!curso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Adjuntar el comprobante de transferencia pendiente (si lo hay) a cada inscripción
    const refs = curso.inscripciones.map(i => String(i.id));
    const pagos = refs.length > 0 ? await prisma.pagoPendiente.findMany({
        where: { tipo: "curso", ref: { in: refs }, estado: "pendiente" },
        select: { ref: true, comprobante: true },
    }) : [];
    const comprobanteMap = new Map(pagos.map(p => [p.ref, p.comprobante]));

    // Resolver nombre/apellido de los matriculados reales (no invitados)
    const expedientes = curso.inscripciones.filter(i => !i.esInvitado).map(i => i.expediente);
    const usuarios = expedientes.length > 0 ? await prisma.user.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, nombre: true, apellido: true },
    }) : [];
    const usuarioMap = new Map(usuarios.map(u => [u.expediente, u]));

    const data = {
        ...curso,
        inscripciones: curso.inscripciones.map(i => ({
            ...i,
            comprobante: comprobanteMap.get(String(i.id)) ?? null,
            nombre: usuarioMap.get(i.expediente)?.nombre ?? null,
            apellido: usuarioMap.get(i.expediente)?.apellido ?? null,
        })),
    };

    return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await req.json();
    const { titulo, descripcion, organizador, fecha, fechaFin, hora, lugar, imagen, modalidad, fechaLimiteInscripcion, activo, mostrarEnCalendario, opciones, tipoAsistencia, porcentajeMin, diasMinimos, dias, certTexto, certCabecera, certFirmasIds, abiertoNoMatriculados } = body;

    const mod = modalidad || "Presencial";
    const tipoAsis = mod === "Virtual" ? "ninguna" : (tipoAsistencia || "ninguna");

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
            modalidad: mod,
            fechaLimiteInscripcion: fechaLimiteInscripcion ? new Date(fechaLimiteInscripcion) : null,
            activo,
            mostrarEnCalendario: mostrarEnCalendario ?? false,
            tipoAsistencia: tipoAsis,
            porcentajeMin: tipoAsis === "global" ? (porcentajeMin ?? null) : null,
            diasMinimos: tipoAsis === "por_dia" ? (diasMinimos ?? null) : null,
            certTexto: certTexto ?? null,
            certCabecera: certCabecera ?? null,
            certFirmasIds: certFirmasIds ?? [],
            abiertoNoMatriculados: abiertoNoMatriculados ?? false,
        }
    });

    if (opciones) {
        await prisma.cursoOpcion.deleteMany({ where: { cursoId: id } });
        await prisma.cursoOpcion.createMany({
            data: opciones.map((o: { nombre: string; precio: number; cupo: number; infoPrivada?: string; precioNoMatriculado?: number | null }) => ({
                cursoId: id,
                nombre: o.nombre,
                precio: o.precio ?? 0,
                cupo: o.cupo ?? 0,
                infoPrivada: o.infoPrivada || null,
                precioNoMatriculado: o.precioNoMatriculado ?? null,
            }))
        });
    }

    if (tipoAsis === "por_dia" && dias) {
        await prisma.cursoDia.deleteMany({ where: { cursoId: id } });
        if (dias.length > 0) {
            await prisma.cursoDia.createMany({
                data: (dias as { fecha: string; nombre?: string }[]).map((d, i) => ({
                    cursoId: id,
                    fecha: new Date(d.fecha),
                    nombre: d.nombre || null,
                    orden: i,
                }))
            });
        }
    } else if (tipoAsis !== "por_dia") {
        await prisma.cursoDia.deleteMany({ where: { cursoId: id } });
    }

    const updated = await prisma.curso.findUnique({
        where: { id },
        include: { opciones: true, dias: { orderBy: { orden: "asc" } } }
    });

    return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const cursoId = parseInt(id);

    // Eliminar relaciones sin cascade explícito
    await prisma.inscripcionCurso.deleteMany({ where: { cursoId } });

    await prisma.curso.delete({ where: { id: cursoId } });
    return NextResponse.json({ success: true });
}
