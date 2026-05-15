import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ expediente: string }> }
) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { expediente } = await params;

    const [dato, user, cambioDatos, historialMatricula, tribunalEtica, fiadorRel, soyFiadorDe] = await Promise.all([
        prisma.dato.findFirst({ where: { expediente } }),
        prisma.user.findUnique({
            where: { expediente },
            select: { status: true, createdAt: true, registered: true },
        }),
        prisma.cambioDatos.findMany({
            where: { expediente },
            orderBy: { createdAt: "desc" },
        }),
        prisma.historialMatricula.findMany({
            where: { expediente },
            orderBy: { createdAt: "desc" },
        }),
        prisma.tribunalEtica.findMany({
            where: { expediente },
            orderBy: { createdAt: "desc" },
        }),
        prisma.fiador.findUnique({ where: { expediente } }),
        prisma.fiador.findMany({ where: { fiadorExpediente: expediente } }),
    ]);

    let misFiador = null;
    if (fiadorRel) {
        const datoFiador = await prisma.dato.findFirst({
            where: { expediente: fiadorRel.fiadorExpediente },
            select: { expediente: true, apellido: true, nombre: true },
        });
        misFiador = {
            id: fiadorRel.id,
            expediente: fiadorRel.fiadorExpediente,
            apellido: datoFiador?.apellido ?? null,
            nombre: datoFiador?.nombre ?? null,
        };
    }

    const avalaA = await Promise.all(
        soyFiadorDe.map(async (rel) => {
            const datoAvalado = await prisma.dato.findFirst({
                where: { expediente: rel.expediente },
                select: { expediente: true, apellido: true, nombre: true },
            });
            return {
                id: rel.id,
                expediente: rel.expediente,
                apellido: datoAvalado?.apellido ?? null,
                nombre: datoAvalado?.nombre ?? null,
            };
        })
    );

    return NextResponse.json({ dato, user, cambioDatos, historialMatricula, tribunalEtica, fiador: { misFiador, avalaA } });
}
