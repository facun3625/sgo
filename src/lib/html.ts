// Contenido "viejo" se guardó como texto plano; el nuevo viene como HTML del editor.
export function esHtml(contenido: string): boolean {
    return /^\s*<[a-z][\s\S]*>/i.test(contenido);
}

// Preview en texto plano para listados/popups: saca tags y decodifica entities (&gt;, &amp;, etc.)
export function htmlPreview(contenido: string): string {
    if (!esHtml(contenido)) return contenido;
    return contenido
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
}
