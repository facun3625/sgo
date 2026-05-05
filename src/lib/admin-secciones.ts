export const SOLICITUDES_SUBTABS = [
    { key: "solicitudes:Certificado", label: "Certificados" },
    { key: "solicitudes:SISFE", label: "SISFE" },
    { key: "solicitudes:CATASTRO", label: "CATASTRO / SIGIT" },
    { key: "solicitudes:Jurisprudencia", label: "Jurisprudencia" },
] as const;

export const ADMIN_SECCIONES = [
    { key: "solicitudes", label: "Gestión de Trámites" },
    { key: "usuarios", label: "Usuarios" },
    { key: "cursos", label: "Cursos" },
    { key: "noticias", label: "Actividades Institucionales" },
    { key: "biblioteca", label: "Biblioteca" },
    { key: "ventas", label: "Ventas" },
    { key: "calendario", label: "Calendario" },
    { key: "faq", label: "Preguntas Frecuentes" },
    { key: "mensajes", label: "Mensajes Privados" },
    { key: "envios", label: "Envíos Masivos" },
    { key: "firmas", label: "Firmas de Autoridades" },
    { key: "adhesiones", label: "Débito Automático" },
    { key: "suspensiones", label: "Suspensiones" },
    { key: "cambios-datos", label: "Modificaciones de Datos" },
    { key: "pagos", label: "Estado de Pagos" },
    { key: "transferencias", label: "Transferencias" },
    { key: "importar", label: "Importar Datos" },
    { key: "tribunal-etica", label: "Tribunal de Ética" },
    { key: "repositorio", label: "Repositorio de Archivos" },
] as const;

export type SeccionKey = typeof ADMIN_SECCIONES[number]["key"];

export function tienePermiso(permisos: string[] | undefined, key: string, accessLevel: string): boolean {
    if (accessLevel === "superadmin") return true;
    if (!permisos) return false;
    return permisos.includes(key);
}
