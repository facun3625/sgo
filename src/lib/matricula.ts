function mesesDesde(fecha: Date | string | null | undefined): number | null {
    if (!fecha) return null;
    const f = new Date(fecha);
    if (isNaN(f.getTime())) return null;
    const ahora = new Date();
    return (ahora.getFullYear() - f.getFullYear()) * 12 + (ahora.getMonth() - f.getMonth());
}

// < 60 meses (5 años)
export function esMatriculadoJoven(fechaMatriculacion: Date | string | null | undefined): boolean {
    const m = mesesDesde(fechaMatriculacion);
    return m !== null && m < 60;
}

// 40 a 49 años (480–599 meses)
export function esMatriculadoVeterano(fechaMatriculacion: Date | string | null | undefined): boolean {
    const m = mesesDesde(fechaMatriculacion);
    return m !== null && m >= 480 && m < 600;
}

// 50+ años (600+ meses)
export function esMatriculadoExento(fechaMatriculacion: Date | string | null | undefined): boolean {
    const m = mesesDesde(fechaMatriculacion);
    return m !== null && m >= 600;
}

export function montoConDescuento(monto: number, aplicaDescuento: boolean): number {
    return aplicaDescuento ? Math.round(monto / 2) : monto;
}
