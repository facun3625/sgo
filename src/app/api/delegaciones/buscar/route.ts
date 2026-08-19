import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Matriculados visibles para la cuenta de delegación logueada — acotado a
// su zona (Delegacion.zona comparado contra Dato.subzona, tomados del
// último import de deudas — cada Delegación representa una localidad
// puntual, que en el Excel de deudas es la SUBZONA, no la zona general).
// Si la delegación no tiene zona configurada, no ve a nadie: falla
// cerrado en vez de mostrar todo por defecto.
export async function GET() {
    const session = await getSession();
    if (!session || !session.delegacionId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const delegacion = await prisma.delegacion.findUnique({ where: { id: session.delegacionId }, select: { zona: true } });
    if (!delegacion?.zona) return NextResponse.json({ usuarios: [], sinZonaConfigurada: true });

    const datos = await prisma.dato.findMany({
        where: { subzona: delegacion.zona },
        select: { cod: true, expediente: true, nombre: true, apellido: true },
        orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    });

    const expedientes = datos.map(d => d.expediente).filter((e): e is string => !!e);
    const deudas = expedientes.length > 0
        ? await prisma.deuda.findMany({ where: { expediente: { in: expedientes } }, select: { expediente: true, monto: true } })
        : [];
    const deudaMap = new Map<string, number>();
    for (const d of deudas) deudaMap.set(d.expediente, (deudaMap.get(d.expediente) ?? 0) + d.monto);

    const usuarios = datos.map(d => ({ ...d, deudaTotal: d.expediente ? (deudaMap.get(d.expediente) ?? 0) : 0 }));

    return NextResponse.json({ usuarios, sinZonaConfigurada: false });
}
