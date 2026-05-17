import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

type TipoFinanciero = "deudas" | "pagoAnual" | "consultor";

function normalizeKey(k: string) {
    return k.toLowerCase().trim().replace(/\s*\(\d+\)$/, "");
}

function getExpediente(row: Record<string, string>): string {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    // Búsqueda exacta primero
    const exacta = r["expediente"] || r["usuario_sistema"] || r["usuario"] || r["exp"] || r["nro"] || r["numero"] || "";
    if (exacta.trim()) return exacta.trim();
    // Fallback: cualquier clave que contenga "expediente"
    const partial = Object.entries(r).find(([k]) => k.includes("expediente"));
    return (partial?.[1] ?? "").trim();
}

function getMonto(row: Record<string, string>): number {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    const raw = r["monto"] || r["importe"] || r["deuda"] || r["valor"] || r["total"] || r["saldo"] || "";
    return parseFloat(String(raw).replace(",", "."));
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { tipo, registros }: { tipo: TipoFinanciero; registros: Record<string, string>[] } = await req.json();

    if (!tipo || !Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Tipo o registros inválidos" }, { status: 400 });

    const tiposValidos: TipoFinanciero[] = ["deudas", "pagoAnual", "consultor"];
    if (!tiposValidos.includes(tipo))
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    if (tipo === "deudas") {
        const data = registros
            .map(r => ({ expediente: getExpediente(r), monto: getMonto(r) }))
            .filter(r => r.expediente && !isNaN(r.monto));
        if (data.length === 0) return NextResponse.json({ error: "Sin registros válidos" }, { status: 400 });
        await prisma.deuda.deleteMany({});
        await prisma.deuda.createMany({ data });
        return NextResponse.json({ actualizados: data.length });
    }

    if (tipo === "pagoAnual") {
        const expedientes = registros.map(r => getExpediente(r)).filter(Boolean);
        if (expedientes.length === 0) return NextResponse.json({ error: "Sin expedientes válidos" }, { status: 400 });
        await prisma.pagoAnual.deleteMany({});
        await prisma.pagoAnual.createMany({ data: expedientes.map(e => ({ expediente: e })) });
        return NextResponse.json({ actualizados: expedientes.length });
    }

    if (tipo === "consultor") {
        const expedientes = registros.map(r => getExpediente(r)).filter(Boolean);
        if (expedientes.length === 0) return NextResponse.json({ error: "Sin expedientes válidos" }, { status: 400 });
        await prisma.dato.updateMany({ where: { tipo: "consultor" }, data: { tipo: null } });
        const res = await prisma.dato.updateMany({ where: { expediente: { in: expedientes } }, data: { tipo: "consultor" } });
        return NextResponse.json({ actualizados: res.count });
    }

    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
}
