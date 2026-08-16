import prisma from "@/lib/prisma";

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

async function getPaywayConfig() {
    const configs = await prisma.config.findMany({
        where: { clave: { in: ["paywaySiteId", "paywayPublicKey", "paywaySecretKey", "paywayAmbiente", ...Object.values(CLAVE_SECCION)] } },
    });
    const map = Object.fromEntries(configs.map((c) => [c.clave, c.valor]));
    return {
        siteId: map.paywaySiteId ?? "",
        publicKey: map.paywayPublicKey ?? "",
        secretKey: map.paywaySecretKey ?? "",
        ambiente: (map.paywayAmbiente === "production" ? "production" : "developer") as Ambiente,
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

// payment_method_id confirmados a mano contra la sandbox real de esta cuenta
// (14/08/2026) — Payway asigna estos códigos por comercio, no son universales.
// Cabal quedó pendiente: se probaron 27, 63, 67, 97, 107, 120, 134 y ninguno
// autorizó completo (63 fue el más cercano, rechazado por "bin" inválido).
export const PAYWAY_PAYMENT_METHOD_ID: Record<string, number> = {
    visa: 1,
    mastercard: 104,
};

export function marcaSoportadaPayway(marca: string): boolean {
    return marca.toLowerCase() in PAYWAY_PAYMENT_METHOD_ID;
}

// Cybersource exige el código de provincia (no el nombre) en bill_to/ship_to.state.
// Tabla confirmada contra el README oficial del SDK de Payway.
const PROVINCIA_CODIGO: Record<string, string> = {
    "caba": "C", "ciudad autonoma de buenos aires": "C", "ciudad autónoma de buenos aires": "C",
    "buenos aires": "B", "catamarca": "K", "chaco": "H", "chubut": "U",
    "cordoba": "X", "córdoba": "X", "corrientes": "W", "entre rios": "R", "entre ríos": "R",
    "formosa": "P", "jujuy": "Y", "la pampa": "L", "la rioja": "F", "mendoza": "M",
    "misiones": "N", "neuquen": "Q", "neuquén": "Q", "rio negro": "R", "río negro": "R",
    "salta": "A", "san juan": "J", "san luis": "D", "santa cruz": "Z", "santa fe": "S",
    "santiago del estero": "G", "tierra del fuego": "V", "tucuman": "T", "tucumán": "T",
};

function normalizar(s: string): string {
    return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Cybersource rechaza nombres/ciudades con acentos o ñ ("Martín", "Núñez"). Se
// sanitiza sin tocar lo que el usuario ve — esto es solo para la request a la API.
function sinAcentos(s: string): string {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ñ/gi, m => (m === "ñ" ? "n" : "N"));
}

export function codigoProvincia(provincia: string): string {
    const normalizada = normalizar(provincia);
    for (const [nombre, codigo] of Object.entries(PROVINCIA_CODIGO)) {
        if (normalizar(nombre) === normalizada) return codigo;
    }
    // Si ya vino como código de 1 letra o no matcheó, se manda tal cual (mejor
    // esfuerzo — Cybersource lo rechazará explícitamente si está mal).
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
