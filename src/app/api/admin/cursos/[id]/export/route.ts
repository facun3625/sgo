import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

function escapeCsv(val: string | null | undefined): string {
    if (val == null) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const cursoId = parseInt(id);

    const [curso, inscripciones] = await Promise.all([
        prisma.curso.findUnique({ where: { id: cursoId }, select: { titulo: true } }),
        prisma.inscripcionCurso.findMany({
            where: { cursoId },
            include: { opcion: true },
            orderBy: { fecha: "asc" },
        }),
    ]);

    if (!curso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const expedientes = inscripciones.map(i => i.expediente).filter(Boolean);
    const [usuarios, datos] = await Promise.all([
        prisma.user.findMany({
            where: { expediente: { in: expedientes } },
            select: { expediente: true, nombre: true, apellido: true },
        }),
        prisma.dato.findMany({
            where: { expediente: { in: expedientes } },
            select: {
                expediente: true, documento: true, emailLegal: true, emailReal: true,
                movilLegal: true, movilReal: true, domicilioLegal: true, domicilioReal: true,
                localidadLegal: true, localidadReal: true, provinciaReal: true,
            },
        }),
    ]);
    const usuariosMap = new Map(usuarios.map(u => [u.expediente, u]));
    const datosMap = new Map(datos.map(d => [d.expediente, d]));

    const estadoLabel: Record<string, string> = {
        confirmada: "Confirmada",
        pendiente_pago: "Pendiente de pago",
        cancelada: "Cancelada",
    };

    const header = [
        "Expediente", "Apellido", "Nombre", "No matriculado", "DNI", "Email", "Celular",
        "Dirección", "Localidad", "Provincia", "Opción", "Estado", "Método de pago", "Fecha inscripción",
    ];
    const rows = inscripciones.map(i => {
        const u = usuariosMap.get(i.expediente);
        const d = datosMap.get(i.expediente);
        return [
            escapeCsv(i.expediente),
            escapeCsv(i.esInvitado ? i.guestApellido : u?.apellido),
            escapeCsv(i.esInvitado ? i.guestNombre : u?.nombre),
            escapeCsv(i.esInvitado ? "Sí" : "No"),
            escapeCsv(i.esInvitado ? i.guestDni : d?.documento),
            escapeCsv(i.esInvitado ? i.guestEmail : (d?.emailLegal || d?.emailReal)),
            escapeCsv(i.esInvitado ? i.guestTelefono : (d?.movilLegal || d?.movilReal)),
            escapeCsv(i.esInvitado ? i.guestDireccion : (d?.domicilioLegal || d?.domicilioReal)),
            escapeCsv(i.esInvitado ? i.guestLocalidad : (d?.localidadLegal || d?.localidadReal)),
            escapeCsv(i.esInvitado ? i.guestProvincia : d?.provinciaReal),
            escapeCsv(i.opcion?.nombre),
            escapeCsv(estadoLabel[i.estado] ?? i.estado),
            escapeCsv(i.metodoPago),
            escapeCsv(new Date(i.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" })),
        ].join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");
    const filename = `inscriptos_${curso.titulo.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`;

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
