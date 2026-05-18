import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({ blocked: false });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { presentarAnte, emailLegal, detalles } = body;

    const today = new Date();
    const expediente = session.expediente || "";

    // Verificar estado del usuario
    const dbUser = await prisma.user.findFirst({
        where: { expediente },
        select: { status: true },
    });

    if (dbUser?.status === "cancelled") {
        return NextResponse.json({ error: "La matrícula está cancelada. No es posible emitir el certificado." }, { status: 403 });
    }

    // Snapshot del firmante activo al momento de emisión
    const firmante = await prisma.firmaAutoridad.findFirst({ where: { enCertificado: true } });

    // Verificar sanciones activas (fin null = sin vencimiento, ej: apercibimientos)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sancionesActivas = await (prisma.tribunalEtica.findMany as any)({
        where: {
            expediente,
            inicio: { lte: today },
            OR: [
                { fin: { gte: today } },
                { fin: null },
            ],
        },
    }) as Awaited<ReturnType<typeof prisma.tribunalEtica.findMany>>;

    // Si está suspendido, obtener la última suspensión para el certificado
    let ultimaSuspension = null;
    if (dbUser?.status === "suspended") {
        ultimaSuspension = await (prisma as any).historialMatricula.findFirst({
            where: { expediente, accion: { in: ["suspension", "cancelacion"] } },
            orderBy: { createdAt: "desc" },
            select: { motivoNombre: true, comentario: true, createdAt: true },
        });
    }

    const solicitud = await prisma.solicitud.create({
        data: {
            expediente,
            tipo: "Certificado de Matriculación",
            presentarAnte: presentarAnte || null,
            emailLegal: emailLegal || null,
            estado: "completada",
            detalles: {
                ...(detalles || {}),
                firmante: firmante ? {
                    cargo: firmante.cargo,
                    nombre: firmante.nombre,
                    firma: firmante.firma,
                } : null,
                sanciones: sancionesActivas.map(s => ({
                    texto: s.texto,
                    inicio: s.inicio.toISOString(),
                    fin: s.fin ? s.fin.toISOString() : null,
                })),
                userStatus: dbUser?.status ?? "active",
                suspension: ultimaSuspension ? {
                    motivoNombre: ultimaSuspension.motivoNombre,
                    comentario: ultimaSuspension.comentario,
                    fecha: ultimaSuspension.createdAt.toISOString(),
                } : null,
            },
        }
    });

    return NextResponse.json(solicitud);
}

export async function PATCH(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const id = parseInt(formData.get("id") as string);
    const file = formData.get("pdf") as File;

    if (!file || !id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = join(process.cwd(), "public", "uploads", "certificados");
    await mkdir(uploadDir, { recursive: true });

    const filename = `certificado-${session.expediente}-${id}.pdf`;
    await writeFile(join(uploadDir, filename), buffer);

    await prisma.solicitud.update({
        where: { id },
        data: { adjunto: `/uploads/certificados/${filename}` }
    });

    return NextResponse.json({ success: true });
}
