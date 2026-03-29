export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const envios = await prisma.envioMasivo.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { destinatarios: true } },
            destinatarios: { select: { leido: true } },
        },
    });

    const result = envios.map(e => ({
        id: e.id,
        asunto: e.asunto,
        totalEnvios: e.totalEnvios,
        leidos: e.destinatarios.filter(d => d.leido).length,
        createdAt: e.createdAt,
    }));

    return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { asunto, contenido, expedientes } = await req.json();
    if (!asunto?.trim() || !contenido?.trim() || !Array.isArray(expedientes) || expedientes.length === 0) {
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Validate expedientes exist
    const users = await prisma.user.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true },
    });
    const validExp = users.map(u => u.expediente!).filter(Boolean);
    const invalid = expedientes.filter(e => !validExp.includes(e));

    if (validExp.length === 0) {
        return NextResponse.json({ error: "Ningún expediente válido", invalid }, { status: 400 });
    }

    const [envio] = await prisma.$transaction([
        prisma.envioMasivo.create({
            data: {
                asunto: asunto.trim(),
                contenido: contenido.trim(),
                totalEnvios: validExp.length,
                destinatarios: {
                    create: validExp.map(exp => ({ expediente: exp })),
                },
            },
        }),
        prisma.notificacion.createMany({
            data: validExp.map(exp => ({
                expediente: exp,
                titulo: "Nuevo comunicado",
                mensaje: asunto.trim(),
                tipo: "comunicado",
            })),
        }),
    ]);

    return NextResponse.json({ id: envio.id, totalEnvios: validExp.length, invalid });
}
