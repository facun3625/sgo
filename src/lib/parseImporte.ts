// Acepta números de Excel y los formatos habituales de Argentina/EE.UU.:
// 1234.56, 1234,56, 1.234,56 y 1,234.56.
export function parseImporte(value: string): number {
    const original = String(value).trim();
    const negativoContable = /^\(.*\)$/.test(original);
    let raw = original.replace(/\s|\u00a0/g, "").replace(/[^\d,.-]/g, "");
    if (!raw) return NaN;

    const comma = raw.lastIndexOf(",");
    const dot = raw.lastIndexOf(".");
    if (comma >= 0 && dot >= 0) {
        const decimal = comma > dot ? "," : ".";
        const miles = decimal === "," ? /\./g : /,/g;
        raw = raw.replace(miles, "").replace(decimal, ".");
    } else if (comma >= 0) {
        const partes = raw.split(",");
        raw = partes.length > 2 || (partes.length === 2 && partes[1].length === 3)
            ? partes.join("")
            : raw.replace(",", ".");
    } else if (dot >= 0) {
        const partes = raw.split(".");
        if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) raw = partes.join("");
    }

    const monto = Number(raw);
    return Number.isFinite(monto) ? (negativoContable ? -Math.abs(monto) : monto) : NaN;
}
