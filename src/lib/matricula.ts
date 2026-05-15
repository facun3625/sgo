// Retorna true si el matriculado lleva menos de 60 meses desde su fecha de matriculación
export function esMatriculadoJoven(fechaMatriculacion: Date | string | null | undefined): boolean {
    if (!fechaMatriculacion) return false;
    const fecha = new Date(fechaMatriculacion);
    if (isNaN(fecha.getTime())) return false;
    const ahora = new Date();
    const meses =
        (ahora.getFullYear() - fecha.getFullYear()) * 12 +
        (ahora.getMonth() - fecha.getMonth());
    return meses < 60;
}

export function montoConDescuento(monto: number, esJoven: boolean): number {
    return esJoven ? Math.round(monto / 2) : monto;
}
