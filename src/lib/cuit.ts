// Formato y validación de CUIT/CUIL — el campo es texto libre que carga cada
// matriculado a mano (ver CuilGate / PersonalDocsForm), así que sin esto
// terminan entrando valores sin guiones, con espacios, con letras, de más o
// de menos dígitos.

export function formatearCuit(valor: string): string {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 11) return valor;
    return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}

// Algoritmo estándar de dígito verificador de CUIT/CUIL (el mismo que usa
// AFIP): valida longitud y que el último dígito cierre la cuenta, no solo
// que "parezca" un CUIT.
export function esCuitValido(valor: string): boolean {
    const digitos = valor.replace(/\D/g, "");
    if (!/^\d{11}$/.test(digitos)) return false;

    const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const suma = multiplicadores.reduce((acc, m, i) => acc + m * Number(digitos[i]), 0);
    const resto = suma % 11;
    const verificador = resto === 0 ? 0 : 11 - resto;
    if (verificador === 10) return false;

    return verificador === Number(digitos[10]);
}
