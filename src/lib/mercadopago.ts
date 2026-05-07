import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import prisma from "@/lib/prisma";

// ─── Cliente dinámico — lee el token desde la DB ─────────────────────────────
// Se instancia por request para usar siempre el token actualizado desde admin.
export async function getMpClients(): Promise<{ preference: Preference; payment: Payment }> {
    const row = await prisma.config.findUnique({ where: { clave: "mpAccessToken" } });
    const token = row?.valor ?? process.env.MP_ACCESS_TOKEN ?? "";

    if (!token) throw new Error("MP_NOT_CONFIGURED");

    const client = new MercadoPagoConfig({ accessToken: token });
    return { preference: new Preference(client), payment: new Payment(client) };
}

// ─── Tipos de pago soportados ─────────────────────────────────────────────────
export type TipoPago =
    | "matricula_mensual"  // ref = cuotaId
    | "matricula_anual"    // ref = expediente
    | "curso"              // ref = inscripcionId
    | "producto"           // ref = productoId, extra = cantidad
    | "deuda"              // ref = IDs de deudas separados por coma
    | "rehab_costo";       // ref = solicitudRehabilitacionId

export interface PreferenceRef {
    tipo: TipoPago;
    expediente: string;
    ref: string;
    extra?: string;
}

export function encodeRef(data: PreferenceRef): string {
    return `${data.tipo}|${data.expediente}|${data.ref}|${data.extra ?? ""}`;
}

export function decodeRef(raw: string): PreferenceRef {
    const [tipo, expediente, ref, extra] = raw.split("|");
    return { tipo: tipo as TipoPago, expediente, ref, extra };
}
