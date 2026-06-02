function mesesDesde(fecha: Date | string | null | undefined): number | null {
    if (!fecha) return null;
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return null;
    const ahora = new Date();
    return (ahora.getFullYear() - f.getFullYear()) * 12 + (ahora.getMonth() - f.getMonth());
}

type AccionHistorial = { accion: string; createdAt: Date };

// Calcula los meses de suspensión que duran más de 12 meses (a descontar).
// Recibe el historial ordenado por createdAt ASC.
export function calcularMesesSuspendidos(historial: AccionHistorial[]): number {
    const ahora = new Date();
    let mesesADescontar = 0;

    for (let i = 0; i < historial.length; i++) {
        const entry = historial[i];
        if (entry.accion !== "suspension" && entry.accion !== "cancelacion") continue;

        // Buscar el próximo habilitacion
        const sigHab = historial.slice(i + 1).find(e => e.accion === "habilitacion");
        const fin = sigHab ? new Date(sigHab.createdAt) : ahora;
        const inicio = new Date(entry.createdAt);

        const meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth());
        if (meses > 12) mesesADescontar += meses;
    }

    return mesesADescontar;
}

// Registrado en el mes anterior a `periodo` → el mes del periodo ya está pago al matricularse
export function esRecienMatriculado(fechaMatriculacion: Date | string | null | undefined, periodo: string): boolean {
    if (!fechaMatriculacion) return false;
    const f = new Date(fechaMatriculacion);
    if (isNaN(f.getTime())) return false;
    const [year, month] = periodo.split("-").map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return f.getFullYear() === prevYear && f.getMonth() + 1 === prevMonth;
}

// < 60 meses (5 años) — no aplica descuento por suspensiones
export function esMatriculadoJoven(fechaMatriculacion: Date | string | null | undefined): boolean {
    const m = mesesDesde(fechaMatriculacion);
    return m !== null && m < 60;
}

// 40 a 49 años efectivos (480–599 meses)
export function esMatriculadoVeterano(fechaMatriculacion: Date | string | null | undefined, mesesSuspendidos = 0): boolean {
    const m = mesesDesde(fechaMatriculacion);
    if (m === null) return false;
    const efectivos = m - mesesSuspendidos;
    return efectivos >= 480 && efectivos < 600;
}

// 50+ años efectivos (600+ meses)
export function esMatriculadoExento(fechaMatriculacion: Date | string | null | undefined, mesesSuspendidos = 0): boolean {
    const m = mesesDesde(fechaMatriculacion);
    if (m === null) return false;
    const efectivos = m - mesesSuspendidos;
    return efectivos >= 600;
}

export function montoConDescuento(monto: number, aplicaDescuento: boolean): number {
    return aplicaDescuento ? Math.round(monto / 2) : monto;
}
