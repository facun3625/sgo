import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

function parseFecha(val: string): Date | null {
    if (!val) return null;
    const m1 = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m1) {
        let [, d, mo, y] = m1;
        if (y.length === 2) y = `20${y}`;
        const date = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
        if (!isNaN(date.getTime())) return date;
    }
    const m2 = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) { const date = new Date(val); if (!isNaN(date.getTime())) return date; }
    return null;
}

function getCol(row: Record<string, string>, ...keys: string[]): string {
    for (const k of keys) {
        const val = row[k] ?? row[k.toLowerCase()] ?? "";
        if (val) return val.trim();
    }
    return "";
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registros } = await req.json() as { registros: Record<string, string>[] };
    if (!Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Sin registros" }, { status: 400 });

    const ahora = new Date();

    const clientesUnicos = [...new Set(
        registros.map(r => getCol(r, "cliente", "Cliente")).filter(Boolean)
    )];
    if (clientesUnicos.length === 0)
        return NextResponse.json({ error: "No se encontró la columna 'Cliente'" }, { status: 400 });

    const datos = await prisma.dato.findMany({
        where: { cod: { in: clientesUnicos } },
        select: { cod: true, expediente: true },
    });
    const mapCodExp = new Map(datos.map(d => [d.cod, d.expediente ?? ""]));

    let procesados = 0;
    const sinExpediente: string[] = [];
    const sinDeuda: string[] = [];
    const errores: string[] = [];

    for (const row of registros) {
        const cliente = getCol(row, "cliente", "Cliente");
        if (!cliente) continue;

        const nroComprobante = getCol(row, "número comprobante", "numero comprobante", "Número comprobante", "nro comprobante");
        const fechaStr = getCol(row, "fecha cobro", "Fecha cobro", "fecha_cobro");
        const fechaPago = parseFecha(fechaStr) ?? ahora;

        // Monto pagado: búsqueda por nombre exacto o por clave que contenga "importe"/"monto"
        let montoRaw = getCol(row, "importe", "monto", "total", "saldo", "importe en $", "importe en pesos");
        if (!montoRaw) {
            const found = Object.entries(row).find(([k]) => k.toLowerCase().includes("importe") || k.toLowerCase().includes("monto"));
            montoRaw = found?.[1] ?? "";
        }
        const montoPagado = parseFloat(String(montoRaw).replace(/\./g, "").replace(",", "."));
        if (isNaN(montoPagado) || montoPagado <= 0) {
            errores.push(`Cliente ${cliente}: monto inválido (${montoRaw})`);
            continue;
        }

        const expediente = mapCodExp.get(cliente);
        if (!expediente) {
            sinExpediente.push(`Cliente ${cliente}: no encontrado en el padrón.`);
            continue;
        }

        const deuda = await prisma.deuda.findFirst({ where: { expediente } });
        if (!deuda) {
            sinDeuda.push(`Cliente ${cliente} (exp. ${expediente}): sin deuda registrada.`);
            continue;
        }

        const montoRestante = deuda.monto - montoPagado;

        if (montoRestante <= 0) {
            // Pago total — eliminar deuda
            await Promise.all([
                prisma.deuda.delete({ where: { id: deuda.id } }),
                prisma.deudaPagada.create({
                    data: { expediente, monto: deuda.monto, metodoPago: "banelco", fechaPago, mpPaymentId: nroComprobante || null },
                }),
            ]);
            await crearNotificacion(expediente, "Deuda saldada",
                `Tu pago vía Banelco/Home Banking fue registrado y la deuda ha sido cancelada. Comprobante: ${nroComprobante || "N/D"}.`, "pago");
        } else {
            // Pago parcial — reducir monto
            await Promise.all([
                prisma.deuda.update({ where: { id: deuda.id }, data: { monto: montoRestante } }),
                prisma.deudaPagada.create({
                    data: { expediente, monto: montoPagado, metodoPago: "banelco", fechaPago, mpPaymentId: nroComprobante || null },
                }),
            ]);
            await crearNotificacion(expediente, "Pago parcial de deuda registrado",
                `Se registró un pago parcial de $${montoPagado.toLocaleString("es-AR")} vía Banelco/Home Banking. Comprobante: ${nroComprobante || "N/D"}.`, "pago");
        }

        procesados++;
    }

    return NextResponse.json({
        procesados,
        sinExpediente: sinExpediente.length,
        sinDeuda: sinDeuda.length,
        errores: [...sinExpediente, ...sinDeuda, ...errores],
    });
}
