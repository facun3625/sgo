export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function calcularJus(deudaOriginal: number, jusValor: number, motivoCobra: boolean): number {
    if (!motivoCobra || jusValor === 0) return 1.5;
    const enJus = deudaOriginal / jusValor;
    if (enJus <= 1) return 0.25;
    if (enJus <= 1.5) return 0.5;
    return 1.5;
}

export async function GET() {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const expediente = session.expediente;

    const [solicitud, dato, deudas, jusConfig, user, lastSusp] = await Promise.all([
        prisma.solicitudRehabilitacion.findFirst({
            where: { expediente, estado: { in: ["borrador", "pendiente"] } },
            orderBy: { createdAt: "desc" },
        }),
        prisma.dato.findFirst({ where: { expediente } }),
        prisma.deuda.findMany({ where: { expediente } }),
        prisma.config.findUnique({ where: { clave: "jus" } }),
        prisma.user.findUnique({ where: { expediente }, select: { status: true } }),
        prisma.historialMatricula.findFirst({
            where: { expediente, accion: { in: ["suspension", "cancelacion"] } },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    // También traer la última solicitud rechazada
    const ultimaRechazada = await prisma.solicitudRehabilitacion.findFirst({
        where: { expediente, estado: "rechazada" },
        orderBy: { createdAt: "desc" },
    });

    const deudaTotal = deudas.reduce((acc, d) => acc + d.monto, 0);
    const jusValor = jusConfig ? parseFloat(jusConfig.valor) : 0;
    const motivoCobra = lastSusp?.motivoCobra ?? false;
    const costoJus = calcularJus(deudaTotal, jusValor, motivoCobra);

    return NextResponse.json({
        solicitud,
        ultimaRechazada,
        dato,
        deudaTotal,
        deudas,
        jusValor,
        motivoCobra,
        motivoNombre: lastSusp?.motivoNombre ?? null,
        costoJus,
        costoPesos: jusValor * costoJus,
        userStatus: user?.status ?? "active",
    });
}

export async function DELETE() {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const expediente = session.expediente;

    const solicitud = await prisma.solicitudRehabilitacion.findFirst({
        where: { expediente, estado: { in: ["borrador", "pendiente"] } },
        orderBy: { createdAt: "desc" },
    });
    if (!solicitud) return NextResponse.json({ error: "Sin solicitud activa" }, { status: 404 });

    await prisma.solicitudRehabilitacion.update({
        where: { id: solicitud.id },
        data: { estado: "cancelada" },
    });

    return NextResponse.json({ ok: true });
}

export async function POST() {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const expediente = session.expediente;

    const user = await prisma.user.findUnique({ where: { expediente } });
    if (!user || (user.status !== "suspended" && user.status !== "cancelled")) {
        return NextResponse.json({ error: "Solo usuarios suspendidos pueden solicitar rehabilitación" }, { status: 403 });
    }

    const existing = await prisma.solicitudRehabilitacion.findFirst({
        where: { expediente, estado: { in: ["borrador", "pendiente"] } },
    });
    if (existing) return NextResponse.json({ error: "Ya tenés una solicitud activa" }, { status: 400 });

    const [deudas, jusConfig, lastSusp] = await Promise.all([
        prisma.deuda.findMany({ where: { expediente } }),
        prisma.config.findUnique({ where: { clave: "jus" } }),
        prisma.historialMatricula.findFirst({
            where: { expediente, accion: { in: ["suspension", "cancelacion"] } },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const deudaOriginal = deudas.reduce((acc, d) => acc + d.monto, 0);
    const jusValor = jusConfig ? parseFloat(jusConfig.valor) : 0;
    const motivoCobra = lastSusp?.motivoCobra ?? false;
    const p5JusAmount = calcularJus(deudaOriginal, jusValor, motivoCobra);
    const p5Pesos = jusValor * p5JusAmount;

    // Si no tiene deuda, el paso 1 se auto-completa
    const sinDeuda = deudaOriginal === 0;

    const solicitud = await prisma.solicitudRehabilitacion.create({
        data: {
            expediente,
            deudaOriginal,
            p5JusAmount,
            p5Pesos,
            p1Ok: sinDeuda,
            p1Metodo: sinDeuda ? "sin_deuda" : undefined,
            pasoActual: sinDeuda ? 2 : 1,
        },
    });

    return NextResponse.json({ solicitud });
}
