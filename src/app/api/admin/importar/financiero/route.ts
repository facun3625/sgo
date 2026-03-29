import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

type TipoFinanciero = "deudas" | "pagoAnual";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { tipo, registros }: { tipo: TipoFinanciero; registros: Record<string, string>[] } = await req.json();

    if (!tipo || !Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Tipo o registros inválidos" }, { status: 400 });

    const tiposValidos: TipoFinanciero[] = ["deudas", "pagoAnual"];
    if (!tiposValidos.includes(tipo))
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    const expedientes = registros.map(r => String(r.expediente ?? "").trim()).filter(Boolean);
    if (expedientes.length === 0)
        return NextResponse.json({ error: "Sin expedientes válidos" }, { status: 400 });

    if (tipo === "deudas") {
        await prisma.deuda.deleteMany({ where: { expediente: { in: expedientes } } });
        const data = registros
            .filter(r => r.expediente && r.monto)
            .map(r => ({ expediente: String(r.expediente).trim(), monto: parseFloat(r.monto) }))
            .filter(r => !isNaN(r.monto));
        await prisma.deuda.createMany({ data });
        return NextResponse.json({ actualizados: data.length });
    }

    if (tipo === "pagoAnual") {
        await prisma.pagoAnual.deleteMany({ where: { expediente: { in: expedientes } } });
        const data = registros
            .filter(r => r.expediente)
            .map(r => ({ expediente: String(r.expediente).trim() }));
        await prisma.pagoAnual.createMany({ data });
        return NextResponse.json({ actualizados: data.length });
    }

    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
}
