import prisma from "@/lib/prisma";
import { PROVINCIAS_AR } from "@/lib/provincias-ar";

type Ambiente = "developer" | "production";

// Igual patrón que las secciones de transferencia bancaria: un toggle por flujo,
// no un único interruptor global.
export type PaywaySeccion = "matricula_mensual" | "matricula_anual" | "deuda" | "curso" | "ventas";
const CLAVE_SECCION: Record<PaywaySeccion, string> = {
    matricula_mensual: "payway_matricula_mensual",
    matricula_anual: "payway_matricula_anual",
    deuda: "payway_deuda",
    curso: "payway_curso",
    ventas: "payway_ventas",
};

// Credenciales guardadas por-ambiente (paywaySiteId_developer / _production, etc.)
// — antes había una sola clave compartida sin importar el ambiente elegido, lo
// que llevaba a mezclar credenciales de sandbox con producción sin darse cuenta.
// Las claves viejas (paywaySiteId/paywayPublicKey/paywaySecretKey, sin sufijo)
// quedan como fallback de migración: si todavía no se guardó nada bajo la
// clave nueva del ambiente activo, se usa el valor viejo tal cual.
async function getPaywayConfig() {
    const configs = await prisma.config.findMany({
        where: {
            clave: {
                in: [
                    "paywayAmbiente",
                    "paywaySiteId", "paywayPublicKey", "paywaySecretKey",
                    "paywaySiteId_developer", "paywayPublicKey_developer", "paywaySecretKey_developer",
                    "paywaySiteId_production", "paywayPublicKey_production", "paywaySecretKey_production",
                    ...Object.values(CLAVE_SECCION),
                ],
            },
        },
    });
    const map = Object.fromEntries(configs.map((c) => [c.clave, c.valor]));
    const ambiente = (map.paywayAmbiente === "production" ? "production" : "developer") as Ambiente;
    return {
        siteId: map[`paywaySiteId_${ambiente}`] ?? map.paywaySiteId ?? "",
        publicKey: map[`paywayPublicKey_${ambiente}`] ?? map.paywayPublicKey ?? "",
        secretKey: map[`paywaySecretKey_${ambiente}`] ?? map.paywaySecretKey ?? "",
        ambiente,
        secciones: Object.fromEntries(
            (Object.keys(CLAVE_SECCION) as PaywaySeccion[]).map((s) => [s, map[CLAVE_SECCION[s]] === "1"])
        ) as Record<PaywaySeccion, boolean>,
    };
}

function baseUrl(ambiente: Ambiente) {
    // Confirmado en el SDK oficial (lib/utils/constants.js de sdk-node-payway):
    // sandbox = developers.decidir.com, producción = ventasonline.payway.com.ar
    // (NO live.decidir.com, que es de otro producto de la misma empresa).
    return ambiente === "production"
        ? "https://ventasonline.payway.com.ar/api/v2"
        : "https://developers.decidir.com/api/v2";
}

// PayWay está disponible para una sección solo si las 3 credenciales están
// cargadas Y el admin prendió esa sección puntual.
export async function paywayDisponibleParaSeccion(seccion: PaywaySeccion): Promise<boolean> {
    const cfg = await getPaywayConfig();
    return !!(cfg.siteId && cfg.publicKey && cfg.secretKey && cfg.secciones[seccion]);
}

// Config pública para que el checkout inicialice decidir.js en el navegador — nunca
// incluye la secret key. Devuelve null si esa sección no está disponible.
export async function getPaywayFrontendConfig(seccion: PaywaySeccion): Promise<{ publicKey: string; apiUrl: string } | null> {
    const cfg = await getPaywayConfig();
    if (!cfg.publicKey || !cfg.secciones[seccion]) return null;
    return { publicKey: cfg.publicKey, apiUrl: baseUrl(cfg.ambiente) };
}

// payment_method_id confirmados a mano contra la cuenta real (GET /payment-methods/all
// con la public key) — Payway asigna estos códigos por comercio, no son universales,
// y además distingue crédito de débito con IDs completamente distintos: mandar el
// de crédito para una tarjeta de débito lo rechaza como "invalid_param: bin" (el
// bin no corresponde a ese medio de pago), no como marca no soportada.
// Cabal quedó pendiente: se probaron 27, 63, 67, 97, 107, 120, 134 y ninguno
// autorizó completo (63 fue el más cercano, rechazado por "bin" inválido).
export const PAYWAY_PAYMENT_METHOD_ID: Record<string, number> = {
    visa: 1,
    visa_debito: 31,
    mastercard: 104,
    mastercard_debito: 105,
};

export function marcaSoportadaPayway(marca: string): boolean {
    return marca.toLowerCase() in PAYWAY_PAYMENT_METHOD_ID;
}

function normalizar(s: string): string {
    return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Cybersource rechaza nombres/ciudades con acentos o ñ ("Martín", "Núñez"). Se
// sanitiza sin tocar lo que el usuario ve — esto es solo para la request a la API.
function sinAcentos(s: string): string {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ñ/gi, m => (m === "ñ" ? "n" : "N"));
}

// El "Id operación" que se ve en el export de Payway es, tal cual, el
// site_transaction_id que mandamos nosotros al cobrar — no hay forma de
// cambiarlo retroactivamente para pagos ya hechos, pero si lo armamos legible
// de acá en adelante, el export sirve para identificar el pago sin cruzar con
// la base. Se mantiene tipo + id técnico al principio (sigue siendo única y
// parseable) y se agrega una descripción corta sanitizada (sin espacios/acentos,
// no hay doc oficial de un límite de longitud para este campo, así que se
// recorta conservador).
function slugPayway(texto: string, maxLen = 30): string {
    return sinAcentos(texto)
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, maxLen);
}

export function construirSiteTransactionId(tipo: string, idRef: string | number, descripcion: string): string {
    const slug = slugPayway(descripcion);
    return `${tipo}_${idRef}_${slug}_${Date.now()}`;
}

// Cybersource exige el código de provincia de 1 letra (no el nombre) en
// bill_to/ship_to.state. El formulario de pago manda uno de los nombres exactos
// de PROVINCIAS_AR (es un <select>, no texto libre), así que esto siempre matchea
// — el fallback normalizado queda solo por las dudas de llamadas viejas/directas.
export function codigoProvincia(provincia: string): string {
    const exacto = PROVINCIAS_AR.find((p) => p.nombre === provincia);
    if (exacto) return exacto.codigo;
    const normalizada = normalizar(provincia);
    const porNormalizado = PROVINCIAS_AR.find((p) => normalizar(p.nombre) === normalizada);
    if (porNormalizado) return porNormalizado.codigo;
    return provincia.trim().length <= 2 ? provincia.trim().toUpperCase() : provincia.trim();
}

export interface DatosFacturacionPayway {
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string;
    direccion: string;
    ciudad: string;
    provincia: string;
    codigoPostal: string;
    clienteId: string; // expediente para matriculados, email para invitados
    esInvitado: boolean;
}

export interface PagoPaywayResultado {
    aprobado: boolean;
    paymentId: number | null;
    status: string;
    motivoRechazo: string | null;
    raw: unknown;
}

export async function autorizarPagoPayway(params: {
    siteTransactionId: string;
    token: string;
    marca: string; // "visa" | "mastercard" — validar con marcaSoportadaPayway antes
    bin: string;
    amount: number; // en pesos (con decimales) — se convierte a centavos acá
    descripcion: string;
    itemNombre: string;
    facturacion: DatosFacturacionPayway;
}): Promise<PagoPaywayResultado> {
    const cfg = await getPaywayConfig();
    // El chequeo de si la sección puntual está habilitada lo hace el endpoint que
    // llama a esta función (paywayDisponibleParaSeccion) — acá solo se valida que
    // las credenciales existan.
    if (!cfg.secretKey) throw new Error("PAYWAY_NOT_CONFIGURED");

    const paymentMethodId = PAYWAY_PAYMENT_METHOD_ID[params.marca.toLowerCase()];
    if (!paymentMethodId) throw new Error(`PAYWAY_MARCA_NO_SOPORTADA:${params.marca}`);

    const amountCents = Math.round(params.amount * 100);
    const f = params.facturacion;

    const body = {
        site_transaction_id: params.siteTransactionId,
        token: params.token,
        payment_method_id: paymentMethodId,
        bin: params.bin,
        amount: amountCents,
        currency: "ARS",
        installments: 1,
        description: params.descripcion,
        payment_type: "single",
        sub_payments: [],
        // Esta cuenta tiene Cybersource obligatorio y configurado en la vertical
        // "Retail" (pide datos de "envío") aunque no enviemos nada físico — se
        // completa con la dirección de facturación real que carga el usuario.
        fraud_detection: {
            send_to_cs: true,
            channel: "web",
            bill_to: {
                city: sinAcentos(f.ciudad),
                country: "AR",
                // Cybersource rechaza el customer_id si es un email — nunca pasar el mail acá.
                customer_id: f.clienteId,
                email: f.email,
                first_name: sinAcentos(f.nombre),
                last_name: sinAcentos(f.apellido),
                phone_number: f.telefono || "",
                postal_code: f.codigoPostal,
                state: codigoProvincia(f.provincia),
                street1: sinAcentos(f.direccion),
            },
            purchase_totals: { currency: "ARS", amount: amountCents },
            customer_in_site: { days_in_site: 0, is_guest: f.esInvitado, num_of_transactions: 0 },
            retail_transaction_data: {
                dispatch_method: "homeDelivery",
                days_to_delivery: "0",
                ship_to: {
                    city: sinAcentos(f.ciudad),
                    country: "AR",
                    email: f.email,
                    first_name: sinAcentos(f.nombre),
                    last_name: sinAcentos(f.apellido),
                    postal_code: f.codigoPostal,
                    state: codigoProvincia(f.provincia),
                    street1: sinAcentos(f.direccion),
                },
                items: [{
                    code: "SGO",
                    description: params.itemNombre,
                    name: params.itemNombre,
                    sku: "SGO",
                    total_amount: amountCents,
                    quantity: 1,
                    unit_price: amountCents,
                }],
            },
        },
    };

    const res = await fetch(`${baseUrl(cfg.ambiente)}/payments`, {
        method: "POST",
        headers: { apikey: cfg.secretKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json();

    const aprobado = data.status === "approved";
    return {
        aprobado,
        paymentId: data.id ?? null,
        status: data.status ?? "error",
        motivoRechazo: aprobado
            ? null
            : (data.status_details?.error?.type ?? data.error_type ?? data.validation_errors?.[0]?.param ?? "rechazado"),
        raw: data,
    };
}
