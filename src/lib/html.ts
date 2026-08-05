// Contenido "viejo" se guardó como texto plano; el nuevo viene como HTML del editor.
export function esHtml(contenido: string): boolean {
    return /^\s*<[a-z][\s\S]*>/i.test(contenido);
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Preview "enriquecido" para listados/popups: recorta a texto + negrita/cursiva/subrayado
// (saca imágenes, links, listas, etc. y junta todo en un bloque para usar con line-clamp).
// El resultado se debe renderizar con dangerouslySetInnerHTML.
export function htmlPreview(contenido: string): string {
    if (!esHtml(contenido)) return escapeHtml(contenido);
    return contenido
        .replace(/<img[^>]*>/gi, "")
        .replace(/<\/(p|div|li|ul|ol|h[1-6]|blockquote)>/gi, " ")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<(?!\/?(strong|b|em|i|u)\b)[^>]+>/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}
