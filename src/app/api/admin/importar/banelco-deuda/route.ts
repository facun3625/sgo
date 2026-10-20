import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";
import { aplicarPagoFifoComprobantes, confirmarPagoComprobantes, obtenerTodosLosIdsDeuda } from "@/lib/pagoDeuda";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

function parseFecha(val: string): Date | null {
    if (!val) return null;
    const m1 = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m1) {
        let [, d, mo, y] = m1;
        if (y.length === 2) y = `20${y}`;
        const date = new Date(Date.UTC(parseInt(y), parseInt(mo) - 1, parseInt(d)));
        if (!isNaN(date.getTime())) return date;
    }
    const m2 = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) {
        const date = new Date(Date.UTC(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3])));
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

function getCol(row: Record<string, string>, ...keys: string[]): string {
    for (const k of keys) {
        const val = row[k] ?? row[k.toLowerCase()] ?? "";
        if (val) return val.trim();
    }
    return "";
}

const BATCH = 100;

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

    // 1. cod→expediente en bulk
    const datos = await prisma.dato.findMany({
        where: { cod: { in: clientesUnicos } },
        select: { cod: true, expediente: true },
    });
    const mapCodExp = new Map(datos.map(d => [d.cod, d.expediente ?? ""]));
    const expedientesDelArchivo = [...new Set([...mapCodExp.values()].filter(Boolean))];

    // 2. Deudas en bulk
    const deudasExistentes = await prisma.deuda.findMany({
        where: { expediente: { in: expedientesDelArchivo } },
        select: { id: true, expediente: true, monto: true },
    });
    const mapExpDeuda = new Map(deudasExistentes.map(d => [d.expediente, d]));

    const sinExpediente: string[] = [];
    const sinDeuda: string[] = [];
    const errores: string[] = [];

    type DeudaRecord = { id: number; expediente: string; monto: number };
    type PagoParcial = { deuda: DeudaRecord; montoPagado: number; fechaPago: Date; nroComprobante: string };
    type PagoTotal = { deuda: DeudaRecord; fechaPago: Date; nroComprobante: string };

    const pagosTotal: PagoTotal[] = [];
    const pagosParciales: PagoParcial[] = [];

    for (const row of registros) {
        const cliente = getCol(row, "cliente", "Cliente");
        if (!cliente) continue;

        const nroComprobante = getCol(row, "número comprobante", "numero comprobante", "Número comprobante", "nro comprobante");
        const fechaStr = getCol(row, "fecha cobro", "Fecha cobro", "fecha_cobro");
        const fechaPago = parseFecha(fechaStr) ?? ahora;

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
        if (!expediente) { sinExpediente.push(`Cliente ${cliente}: no encontrado en el padrón.`); continue; }

        const deuda = mapExpDeuda.get(expediente);
        if (!deuda) { sinDeuda.push(`Cliente ${cliente} (exp. ${expediente}): sin deuda registrada.`); continue; }

        if (deuda.monto - montoPagado <= 0) {
            pagosTotal.push({ deuda, fechaPago, nroComprobante });
        } else {
            pagosParciales.push({ deuda, montoPagado, fechaPago, nroComprobante });
        }
    }

    // 3. Batch pagos totales (vía módulo compartido: limpia también DeudaComprobante)
    for (let i = 0; i < pagosTotal.length; i += BATCH) {
        const lote = pagosTotal.slice(i, i + BATCH);
        await Promise.all(lote.map(async ({ deuda, nroComprobante }) => {
            const ids = await obtenerTodosLosIdsDeuda(deuda.expediente);
            await confirmarPagoComprobantes(deuda.expediente, ids, {
                metodoPago: "banelco", mpPaymentId: nroComprobante || undefined,
            });
        }));
        await Promise.all(lote.map(({ deuda, nroComprobante }) =>
            crearNotificacion(deuda.expediente, "Deuda saldada",
                `Tu pago vía Banelco/Home Banking fue registrado y la deuda ha sido cancelada. Comprobante: ${nroComprobante || "N/D"}.`, "pago")
        ));
    }

    // 4. Batch pagos parciales (update deuda + create deudaPagada, igual que
    // antes; se suma la imputación FIFO del pago a los comprobantes del
    // expediente, ver lib/pagoDeuda.ts)
    for (let i = 0; i < pagosParciales.length; i += BATCH) {
        const lote = pagosParciales.slice(i, i + BATCH);
        await Promise.all(lote.map(({ deuda, montoPagado, fechaPago, nroComprobante }) =>
            Promise.all([
                prisma.deuda.update({ where: { id: deuda.id }, data: { monto: deuda.monto - montoPagado } }),
                prisma.deudaPagada.create({
                    data: { expediente: deuda.expediente, monto: montoPagado, metodoPago: "banelco", fechaPago, mpPaymentId: nroComprobante || null },
                }),
                aplicarPagoFifoComprobantes(deuda.expediente, montoPagado),
            ])
        ));
        await Promise.all(lote.map(({ deuda, montoPagado, nroComprobante }) =>
            crearNotificacion(deuda.expediente, "Pago parcial de deuda registrado",
                `Se registró un pago parcial de $${montoPagado.toLocaleString("es-AR")} vía Banelco/Home Banking. Comprobante: ${nroComprobante || "N/D"}.`, "pago")
        ));
    }

    return NextResponse.json({
        procesados: pagosTotal.length + pagosParciales.length,
        sinExpediente: sinExpediente.length,
        sinDeuda: sinDeuda.length,
        errores: [...sinExpediente, ...sinDeuda, ...errores],
    });
}
