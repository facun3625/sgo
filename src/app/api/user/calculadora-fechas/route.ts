import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

interface FeriadoAPI {
    mes: number;
    dia: number;
    motivo: string;
}

interface Feriado {
    fecha: string;
    motivo: string;
}

async function getFeriadosAno(year: number): Promise<Feriado[]> {
    try {
        const res = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`, {
            next: { revalidate: 86400 },
        });
        if (!res.ok) return [];
        const data: FeriadoAPI[] = await res.json();
        return data.map((f) => ({
            fecha: `${year}-${String(f.mes).padStart(2, "0")}-${String(f.dia).padStart(2, "0")}`,
            motivo: f.motivo ?? "",
        }));
    } catch {
        return [];
    }
}

function isWeekend(date: Date): boolean {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const desde = searchParams.get("desde");
    const diasStr = searchParams.get("dias");
    const tipo = searchParams.get("tipo") ?? "habiles";

    if (!desde || !diasStr) {
        return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const dias = parseInt(diasStr);
    if (isNaN(dias) || dias <= 0) {
        return NextResponse.json({ error: "Cantidad de días inválida" }, { status: 400 });
    }

    const startDate = new Date(desde + "T00:00:00Z");
    if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    const startYear = startDate.getUTCFullYear();
    const years = new Set<number>();
    for (let i = 0; i <= 4; i++) years.add(startYear + i);

    const feriadosArrays = await Promise.all([...years].map(getFeriadosAno));
    const allFeriados: Feriado[] = feriadosArrays.flat();
    const feriadosSet = new Set(allFeriados.map((f) => f.fecha));

    const current = new Date(startDate);

    if (tipo === "corridos") {
        current.setUTCDate(current.getUTCDate() + dias);
    } else {
        let remaining = dias;
        while (remaining > 0) {
            current.setUTCDate(current.getUTCDate() + 1);
            const dateStr = current.toISOString().slice(0, 10);
            if (!isWeekend(current) && !feriadosSet.has(dateStr)) {
                remaining--;
            }
        }
    }

    const resultado = current.toISOString().slice(0, 10);

    const feriadosEnPeriodo = allFeriados
        .filter((f) => f.fecha > desde && f.fecha <= resultado)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

    return NextResponse.json({ desde, dias, tipo, resultado, feriadosEnPeriodo });
}
