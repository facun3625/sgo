// Mantenido para filtrado en la página de solicitudes admin
export const SOLICITUDES_SUBTABS = [
    { key: "solicitudes:Certificado", label: "Certificados" },
    { key: "solicitudes:SISFE", label: "SISFE" },
    { key: "solicitudes:CATASTRO", label: "CATASTRO / SIGIT" },
    { key: "solicitudes:Jurisprudencia", label: "Jurisprudencia" },
] as const;

export const ADMIN_SECCIONES = [
    // Trámites — permisos individuales por tipo
    { key: "solicitudes:Certificado", label: "Certificados de Matriculación", group: "Trámites" },
    { key: "solicitudes:SISFE", label: "SISFE", group: "Trámites" },
    { key: "solicitudes:CATASTRO", label: "CATASTRO / SIGIT", group: "Trámites" },
    { key: "solicitudes:Jurisprudencia", label: "Jurisprudencia", group: "Trámites" },
    // Resto
    { key: "usuarios", label: "Usuarios", group: "" },
    { key: "cursos", label: "Cursos", group: "" },
    { key: "noticias", label: "Actividades Institucionales", group: "" },
    { key: "biblioteca", label: "Biblioteca", group: "" },
    { key: "ventas", label: "Ventas", group: "" },
    { key: "calendario", label: "Calendario", group: "" },
    { key: "faq", label: "Preguntas Frecuentes", group: "" },
    { key: "mensajes", label: "Mensajes Privados", group: "" },
    { key: "envios", label: "Envíos Masivos", group: "" },
    { key: "firmas", label: "Firmas de Autoridades", group: "" },
    { key: "adhesiones", label: "Débito Automático", group: "" },
    { key: "suspensiones", label: "Suspensiones", group: "" },
    { key: "cambios-datos", label: "Modificaciones de Datos", group: "" },
    { key: "pagos", label: "Estado de Pagos", group: "" },
    { key: "transferencias", label: "Transferencias", group: "" },
    { key: "importar", label: "Importar Datos", group: "" },
    { key: "fiadores", label: "Fiadores", group: "" },
    { key: "cuentas", label: "Cuentas Registradas", group: "" },
    { key: "tribunal-etica", label: "Tribunal de Ética", group: "" },
    { key: "repositorio", label: "Repositorio de Archivos", group: "" },
] as const;

export type SeccionKey = typeof ADMIN_SECCIONES[number]["key"];

export function tienePermiso(permisos: string[] | undefined, key: string, accessLevel: string): boolean {
    if (accessLevel === "superadmin") return true;
    if (!permisos) return false;
    // Compatibilidad: "solicitudes" legacy da acceso a todos los tipos
    if (key.startsWith("solicitudes:") && permisos.includes("solicitudes")) return true;
    return permisos.includes(key);
}
