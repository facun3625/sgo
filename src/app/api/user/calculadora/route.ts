import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const BCRA = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias";

function addDays(date: string, days: number): string {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

async function getLastValue(variable: number, desde: string, hasta: string): Promise<{ fecha: string; valor: number } | null> {
    const res = await fetch(`${BCRA}/${variable}?desde=${desde}&hasta=${hasta}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const detalle: { fecha: string; valor: number }[] = data?.results?.[0]?.detalle ?? [];
    if (!detalle.length) return null;
    // API devuelve orden descendente, el primero es el más reciente
    return detalle[0];
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const capital = parseFloat(searchParams.get("capital") ?? "0");
    const desde = searchParams.get("desde") ?? "";
    const hasta = searchParams.get("hasta") ?? "";

    if (!capital || capital <= 0 || !desde || !hasta) {
        return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    if (desde >= hasta) {
        return NextResponse.json({ error: "La fecha desde debe ser anterior a la fecha hasta" }, { status: 400 });
    }

    // Necesitamos el valor del día ANTERIOR al inicio y el del día final
    const prevDesde = addDays(desde, -15);
    const desdeMinus1 = addDays(desde, -1);
    const hastaBuffer = addDays(hasta, -15);

    const [tasaInicio, tasaFin, cerInicio, cerFin] = await Promise.all([
        getLastValue(1198, prevDesde, desdeMinus1),   // tasa pasiva día anterior al inicio
        getLastValue(1198, hastaBuffer, hasta),        // tasa pasiva día fin
        getLastValue(30, prevDesde, desdeMinus1),      // CER día anterior al inicio
        getLastValue(30, hastaBuffer, hasta),          // CER día fin
    ]);

    if (!tasaInicio || !tasaFin) {
        return NextResponse.json({ error: "No hay datos de tasa pasiva disponibles para el período seleccionado" }, { status: 404 });
    }
    if (!cerInicio || !cerFin) {
        return NextResponse.json({ error: "No hay datos de CER disponibles para el período seleccionado" }, { status: 404 });
    }

    const dias = Math.round(
        (new Date(hasta + "T00:00:00Z").getTime() - new Date(desde + "T00:00:00Z").getTime()) / 86400000
    );

    // Tasa pasiva Ley 27.802: capital × (índice_fin / índice_inicio - 1)
    const ratioTasa = tasaFin.valor / tasaInicio.valor;
    const interesesTasa = capital * (ratioTasa - 1);

    // CER puro
    const ratioCer = cerFin.valor / cerInicio.valor;

    // CER + 3% anual: índice CER × (1 + 0.03)^(días/365)
    const ratioCer3 = ratioCer * Math.pow(1.03, dias / 365);
    const interesesCer3 = capital * (ratioCer3 - 1);

    // 67% de (CER + 3%)
    const interesesCer3_67 = interesesCer3 * 0.67;

    return NextResponse.json({
        capital,
        desde,
        hasta,
        dias,
        tasaPasiva: {
            label: "Tasa Pasiva Ley 27.802",
            intereses: interesesTasa,
            total: capital + interesesTasa,
            ratio: ratioTasa,
            fechaInicio: tasaInicio.fecha,
            fechaFin: tasaFin.fecha,
        },
        cer3: {
            label: "CER + 3% anual",
            intereses: interesesCer3,
            total: capital + interesesCer3,
            ratio: ratioCer3,
            fechaInicio: cerInicio.fecha,
            fechaFin: cerFin.fecha,
        },
        cer3_67: {
            label: "67% de CER + 3%",
            intereses: interesesCer3_67,
            total: capital + interesesCer3_67,
            ratio: ratioCer * Math.pow(1.03, dias / 365) * 0.67 + (1 - 0.67),
        },
    });
}
