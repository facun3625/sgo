import * as XLSX from "xlsx";

export interface CobroExportable {
    tipo: "cuota_mensual" | "matricula_anual" | "deuda";
    expediente: string;
    nombre: string;
    apellido: string;
    monto: number;
    fecha: string | null;
    comprobante: string | null;
}

const LABEL_TIPO: Record<CobroExportable["tipo"], string> = {
    cuota_mensual: "Cuota mensual",
    matricula_anual: "Matrícula anual",
    deuda: "Deuda vencida",
};

// Export simple para uso propio de la dependencia/admin — no es el formato de
// Tango (ese vive en /admin/pagos → Contabilidad → Descargar).
export function exportarCobrosExcel(cobros: CobroExportable[], filename: string) {
    const filas = cobros.map((c) => ({
        "Apellido y Nombre": `${c.apellido}, ${c.nombre}`,
        "Expediente": c.expediente,
        "Tipo": LABEL_TIPO[c.tipo],
        "Fecha": c.fecha ? new Date(c.fecha).toLocaleDateString("es-AR") : "",
        "N° Comprobante": c.comprobante || "",
        "Monto": c.monto,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Cobros");
    XLSX.writeFile(wb, filename);
}
