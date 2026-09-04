export const SOLICITUDES_SUBTABS = [
    { key: "solicitudes:Certificado", label: "Certificados" },
    { key: "solicitudes:SISFE", label: "SISFE" },
    { key: "solicitudes:CATASTRO", label: "CATASTRO / SIGIT" },
    { key: "solicitudes:Jurisprudencia", label: "Jurisprudencia" },
] as const;

export const ADMIN_SECCIONES = [
    // Trámites
    { key: "solicitudes:Certificado", label: "Certificados de Matriculación", group: "Trámites" },
    { key: "solicitudes:SISFE",       label: "SISFE",                         group: "Trámites" },
    { key: "solicitudes:CATASTRO",    label: "CATASTRO / SIGIT",               group: "Trámites" },
    { key: "solicitudes:Jurisprudencia", label: "Jurisprudencia",              group: "Trámites" },
    // Secciones generales
    { key: "usuarios",       label: "Usuarios",                    group: "" },
    { key: "legajo",         label: "Legajo",                      group: "" },
    { key: "cursos",         label: "Cursos",                      group: "" },
    { key: "noticias",       label: "Actividades Institucionales",  group: "" },
    { key: "biblioteca",     label: "Biblioteca",                   group: "" },
    { key: "ventas",         label: "Ventas",                       group: "" },
    { key: "calendario",     label: "Calendario",                   group: "" },
    { key: "faq",            label: "Preguntas Frecuentes",         group: "" },
    { key: "mensajes",       label: "Mensajes Privados",            group: "" },
    { key: "envios",         label: "Envíos Masivos",               group: "" },
    { key: "email-marketing", label: "Email Marketing",             group: "" },
    { key: "firmas",         label: "Firmas de Autoridades",        group: "" },
    { key: "adhesiones",     label: "Débito Automático",            group: "" },
    { key: "suspensiones",   label: "Suspensiones",                 group: "" },
    { key: "certificados-manuales", label: "Certificados Manuales", group: "" },
    { key: "cambios-datos",  label: "Modificaciones de Datos",      group: "" },
    { key: "pagos",          label: "Estado de Pagos",              group: "" },
    { key: "transferencias", label: "Transferencias",               group: "" },
    { key: "fiadores",       label: "Fiadores",                     group: "" },
    { key: "cuentas",        label: "Cuentas Registradas",          group: "" },
    { key: "tribunal-etica", label: "Tribunal de Ética",            group: "" },
    { key: "repositorio",    label: "Repositorio de Archivos",      group: "" },
    { key: "boletas",        label: "Importar Boletas de Pago",         group: "" },
    { key: "tutoriales",     label: "Tutoriales",                   group: "" },
    // Importar — sub-permisos granulares
    { key: "importar:matriculados",        label: "Matriculados",        group: "Importar" },
    { key: "importar:nuevos-matriculados", label: "Nuevos Matriculados", group: "Importar" },
    { key: "importar:financiero",   label: "Financiero",      group: "Importar" },
    { key: "importar:banelco",      label: "Home Banking",    group: "Importar" },
    { key: "importar:fiadores",     label: "Fiadores",        group: "Importar" },
    { key: "importar:adhesiones",   label: "Débito Aut.",     group: "Importar" },
    { key: "importar:usuarios",     label: "Usuarios",        group: "Importar" },
    { key: "importar:suspensiones", label: "Suspensiones / Tribunal", group: "Importar" },
    // Auditoría
    { key: "logs", label: "Registro de Actividad", group: "Auditoría" },
] as const;

export type SeccionKey = typeof ADMIN_SECCIONES[number]["key"];

export function tienePermiso(permisos: string[] | undefined, key: string, accessLevel: string): boolean {
    if (accessLevel === "superadmin") return true;
    if (!permisos) return false;
    // Legacy: "solicitudes" da acceso a todos los tipos
    if (key.startsWith("solicitudes:") && permisos.includes("solicitudes")) return true;
    // Legacy: "importar" (sin sub-clave) da acceso a todos los sub-tabs
    if (key.startsWith("importar:") && permisos.includes("importar")) return true;
    return permisos.includes(key);
}

/** Devuelve true si el admin tiene acceso al sidebar de importar (cualquier sub-permiso) */
export function tieneAccesoImportar(permisos: string[] | null): boolean {
    if (permisos === null) return true; // superadmin
    return permisos.some(p => p === "importar" || p.startsWith("importar:"));
}
