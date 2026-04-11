export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

const TIPO_LABELS: Record<string, string> = {
    matricula_mensual: "Cuota mensual",
    matricula_anual: "Matrícula anual",
    deuda: "Deuda",
    curso: "Curso",
};

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const pagos = await prisma.pagoPendiente.findMany({
        orderBy: { createdAt: "desc" },
    });

    // Enriquecer con info del usuario
    const expedientes = [...new Set(pagos.map((p) => p.expediente))];
    const usuarios = await prisma.user.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, nombre: true, apellido: true },
    });
    const userMap = new Map(usuarios.map((u) => [u.expediente, u]));

    const data = pagos.map((p) => ({
        ...p,
        tipoLabel: TIPO_LABELS[p.tipo] ?? p.tipo,
        usuario: userMap.get(p.expediente) ?? null,
    }));

    return NextResponse.json(data);
}
