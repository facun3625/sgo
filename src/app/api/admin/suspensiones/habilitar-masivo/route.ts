export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAdmin } from "@/lib/admin-log";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { expedientes } = await req.json() as { expedientes: string[] };
    if (!Array.isArray(expedientes) || expedientes.length === 0)
        return NextResponse.json({ error: "Lista de expedientes vacía" }, { status: 400 });

    const adminNombre = `${session.apellido}, ${session.nombre}`;
    const comentario = "Habilitado por importación masiva";

    let habilitados = 0;
    let yaActivos = 0;
    const noEncontrados: string[] = [];

    for (const exp of expedientes) {
        const trimmed = exp.trim();
        if (!trimmed) continue;

        const user = await prisma.user.findFirst({
            where: { OR: [{ expediente: trimmed }, { cod: trimmed }] },
        });

        if (!user) {
            noEncontrados.push(trimmed);
            continue;
        }

        if (user.status === "active") {
            yaActivos++;
            continue;
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { status: "active", suspendedUntil: null },
            }),
            prisma.historialMatricula.create({
                data: {
                    expediente: user.expediente ?? trimmed,
                    accion: "habilitacion",
                    comentario,
                    motivoNombre: null,
                    motivoId: null,
                    motivoCobra: null,
                    fechaInicio: null,
                    fechaFin: null,
                    adminNombre,
                },
            }),
        ]);

        habilitados++;
    }

    await logAdmin({
        adminId: session.id,
        adminNombre,
        expediente: null,
        modulo: "usuarios",
        accion: "Habilitación masiva de matrículas",
        detalle: { habilitados, yaActivos, noEncontrados: noEncontrados.length },
        req,
    });

    return NextResponse.json({ habilitados, yaActivos, noEncontrados });
}
