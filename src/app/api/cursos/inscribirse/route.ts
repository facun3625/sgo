import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

// Consulta pública: ¿este DNI ya está inscripto a este curso? — sin sesión.
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const cursoId = searchParams.get("cursoId");
    const dni = searchParams.get("dni")?.trim();

    if (!cursoId || !dni) {
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const inscripcion = await prisma.inscripcionCurso.findFirst({
        where: { cursoId: Number(cursoId), esInvitado: true, guestDni: dni },
        include: { opcion: true },
    });

    if (!inscripcion) return NextResponse.json({ inscripto: false });

    const pagoPendiente = inscripcion.estado === "pendiente_pago"
        ? await prisma.pagoPendiente.findFirst({
            where: { tipo: "curso", ref: String(inscripcion.id), estado: "pendiente" },
        })
        : null;

    return NextResponse.json({
        inscripto: true,
        estado: inscripcion.estado,
        comprobanteEnviado: !!pagoPendiente,
        opcion: inscripcion.opcion?.nombre ?? null,
        nombre: inscripcion.guestNombre,
        apellido: inscripcion.guestApellido,
        email: inscripcion.guestEmail,
        dni: inscripcion.guestDni,
        telefono: inscripcion.guestTelefono,
        direccion: inscripcion.guestDireccion,
        localidad: inscripcion.guestLocalidad,
        provincia: inscripcion.guestProvincia,
        id: inscripcion.id,
        monto: inscripcion.opcion?.precioNoMatriculado ?? null,
        fecha: inscripcion.fecha,
    });
}

// Inscripción pública de no matriculados — sin sesión.
export async function POST(req: NextRequest) {
    const { cursoId, opcionId, nombre, apellido, dni, email, telefono, direccion, localidad, provincia } = await req.json();

    if (!cursoId || !opcionId || !nombre?.trim() || !apellido?.trim() || !dni?.trim() || !email?.trim()
        || !telefono?.trim() || !direccion?.trim() || !localidad?.trim() || !provincia?.trim()) {
        return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const curso = await prisma.curso.findUnique({
        where: { id: Number(cursoId), activo: true, abiertoNoMatriculados: true },
    });
    if (!curso) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    if (curso.fechaLimiteInscripcion && new Date() > curso.fechaLimiteInscripcion) {
        return NextResponse.json({ error: "El período de inscripción ha cerrado" }, { status: 400 });
    }

    const opcion = await prisma.cursoOpcion.findUnique({
        where: { id: Number(opcionId), cursoId: Number(cursoId) },
    });
    if (!opcion || opcion.precioNoMatriculado == null) {
        return NextResponse.json({ error: "Opción no válida" }, { status: 400 });
    }

    if (opcion.cupo > 0 && opcion.inscritos >= opcion.cupo) {
        return NextResponse.json({ error: "No hay cupos disponibles para esta opción" }, { status: 400 });
    }

    const yaInscrito = await prisma.inscripcionCurso.findFirst({
        where: { cursoId: Number(cursoId), esInvitado: true, guestDni: dni.trim() },
    });
    if (yaInscrito) return NextResponse.json({ error: "Ya hay una inscripción registrada con ese DNI para este curso" }, { status: 400 });

    const precio = opcion.precioNoMatriculado;

    const [inscripcion] = await prisma.$transaction([
        prisma.inscripcionCurso.create({
            data: {
                expediente: `guest_${randomUUID()}`,
                cursoId: Number(cursoId),
                opcionId: Number(opcionId),
                estado: precio === 0 ? "confirmada" : "pendiente_pago",
                esInvitado: true,
                guestNombre: nombre.trim(),
                guestApellido: apellido.trim(),
                guestEmail: email.trim(),
                guestTelefono: telefono.trim(),
                guestDni: dni.trim(),
                guestDireccion: direccion.trim(),
                guestLocalidad: localidad.trim(),
                guestProvincia: provincia.trim(),
            },
        }),
        prisma.cursoOpcion.update({
            where: { id: Number(opcionId) },
            data: { inscritos: { increment: 1 } },
        }),
    ]);

    return NextResponse.json({ id: inscripcion.id, estado: inscripcion.estado, monto: precio, fecha: inscripcion.fecha });
}
