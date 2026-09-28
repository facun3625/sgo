function detectarSeparador(text: string): "," | ";" {
    let comas = 0;
    let puntoComas = 0;
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (quoted && text[i + 1] === '"') i++;
            else quoted = !quoted;
        } else if (!quoted && (c === "\n" || c === "\r")) {
            break;
        } else if (!quoted && c === ",") comas++;
        else if (!quoted && c === ";") puntoComas++;
    }
    return puntoComas > comas ? ";" : ",";
}

// Parser compartido por el import manual y el automático. Respeta comillas,
// comillas escapadas, separadores dentro de campos y saltos de línea citados.
export function parseCsv(textValue: string): Record<string, string>[] {
    const text = textValue.replace(/^\uFEFF/, "");
    const sep = detectarSeparador(text);
    const table: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;

    const pushRow = () => {
        row.push(field.trim());
        field = "";
        if (row.some(v => v !== "")) table.push(row);
        row = [];
    };

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (quoted && text[i + 1] === '"') {
                field += '"';
                i++;
            } else {
                quoted = !quoted;
            }
        } else if (c === sep && !quoted) {
            row.push(field.trim());
            field = "";
        } else if ((c === "\n" || c === "\r") && !quoted) {
            if (c === "\r" && text[i + 1] === "\n") i++;
            pushRow();
        } else {
            field += c;
        }
    }

    if (quoted) throw new Error("El CSV termina dentro de un campo entre comillas.");
    if (field !== "" || row.length > 0) pushRow();
    if (table.length < 2) return [];

    const headers = table[0].map(h => h.toLowerCase().trim());
    return table.slice(1).map((values, index) => {
        if (values.length !== headers.length)
            throw new Error(`La fila ${index + 2} del CSV tiene ${values.length} columnas; se esperaban ${headers.length}.`);
        return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
    });
}
