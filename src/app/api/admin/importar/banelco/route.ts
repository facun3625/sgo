import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

function parseFecha(val: string): Date | null {
    if (!val) return null;
    // DD/MM/YYYY o DD/MM/YY
    const m1 = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m1) {
        let [, d, mo, y] = m1;
        if (y.length === 2) y = `20${y}`;
        const date = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
        if (!isNaN(date.getTime())) return date;
    }
    // YYYY-MM-DD
    const m2 = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) {
        const date = new Date(val);
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

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registros } = await req.json() as { registros: Record<string, string>[] };
    if (!Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Sin registros" }, { status: 400 });

    // Período = mes actual
    const ahora = new Date();
    const periodoActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;

    // Extraer clientes únicos
    const clientesUnicos = [...new Set(
        registros.map((r) => getCol(r, "cliente", "Cliente")).filter(Boolean)
    )];

    if (clientesUnicos.length === 0)
        return NextResponse.json({ error: "No se encontró la columna 'Cliente' con datos válidos." }, { status: 400 });

    // Lookup cod → expediente
    const datos = await prisma.dato.findMany({
        where: { cod: { in: clientesUnicos } },
        select: { cod: true, expediente: true },
    });
    const mapCodExp = new Map(datos.map((d) => [d.cod, d.expediente ?? ""]));

    const pagados: string[] = [];
    const duplicados: { cliente: string; expediente: string; comprobante: string }[] = [];
    const sinExpediente: string[] = [];
    const sinCuota: string[] = [];

    for (const row of registros) {
        const cliente = getCol(row, "cliente", "Cliente");
        if (!cliente) continue;

        const nroComprobante = getCol(row, "número comprobante", "numero comprobante", "Número comprobante", "Numero comprobante", "nro comprobante");
        const fechaStr = getCol(row, "fecha cobro", "Fecha cobro", "fecha_cobro");
        const fechaPago = parseFecha(fechaStr) ?? ahora;

        const expediente = mapCodExp.get(cliente);
        if (!expediente) {
            sinExpediente.push(`Cliente ${cliente}: no encontrado en el padrón.`);
            continue;
        }

        const cuota = await prisma.cuotaMensual.findFirst({
            where: { expediente, periodo: periodoActual },
        });

        if (!cuota) {
            sinCuota.push(`Cliente ${cliente} (exp. ${expediente}): sin cuota generada para ${periodoActual}.`);
            continue;
        }

        if (cuota.estado === "pagado") {
            duplicados.push({ cliente, expediente, comprobante: nroComprobante });
            continue;
        }

        await prisma.cuotaMensual.update({
            where: { id: cuota.id },
            data: {
                estado: "pagado",
                metodoPago: "banelco",
                fechaPago,
                mpPaymentId: nroComprobante || null,
            },
        });

        await crearNotificacion(
            expediente,
            "Cuota acreditada",
            `Tu pago de la cuota ${periodoActual} fue registrado vía Banelco/Home Banking. Comprobante: ${nroComprobante || "N/D"}.`,
            "pago"
        );

        pagados.push(cliente);
    }

    return NextResponse.json({
        pagados: pagados.length,
        duplicados,
        sinExpediente: sinExpediente.length,
        sinCuota: sinCuota.length,
        errores: [...sinExpediente, ...sinCuota],
        periodo: periodoActual,
    });
}
