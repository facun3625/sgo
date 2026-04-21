export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const cursoId = parseInt(id);

    const [certificado, curso, firmas] = await Promise.all([
        prisma.certificadoCurso.findUnique({
            where: { expediente_cursoId: { expediente: session.expediente, cursoId } },
        }),
        prisma.curso.findUnique({
            where: { id: cursoId },
            select: {
                titulo: true,
                fecha: true,
                fechaFin: true,
                certTexto: true,
                certCabecera: true,
                certFirmasIds: true,
            },
        }),
        prisma.firmaAutoridad.findMany({
            where: { enCertificado: true },
            orderBy: { orden: "asc" },
        }),
    ]);

    if (!certificado || !curso) return NextResponse.json({ certificado: null });

    // Filtrar firmas según certFirmasIds (si está vacío, usar todas)
    const firmasFiltradas = curso.certFirmasIds.length > 0
        ? firmas.filter(f => curso.certFirmasIds.includes(f.id))
        : firmas;

    return NextResponse.json({
        certificado: {
            emitidoAt: certificado.emitidoAt,
        },
        curso: {
            titulo: curso.titulo,
            fecha: curso.fecha,
            fechaFin: curso.fechaFin,
            certTexto: curso.certTexto,
            certCabecera: curso.certCabecera,
        },
        firmas: firmasFiltradas,
        alumno: {
            nombre: session.nombre,
            apellido: session.apellido,
            expediente: session.expediente,
        },
    });
}
