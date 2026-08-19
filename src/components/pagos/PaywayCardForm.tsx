"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import { PROVINCIAS_AR } from "@/lib/provincias-ar";

declare global {
    interface Window {
        Decidir: new (apiUrl: string) => DecidirInstance;
    }
}

interface DecidirInstance {
    setPublishableKey: (key: string) => void;
    setTimeout: (ms: number) => void;
    createToken: (form: HTMLFormElement, cb: (status: number, response: { id?: string; token?: string; error?: { error: { message: string } }[] }) => void) => void;
    cardType?: (cardNumber: string) => string | null;
}

export interface PaywayFacturacion {
    direccion: string;
    ciudad: string;
    provincia: string;
    codigoPostal: string;
}

export interface PaywayTokenResult {
    token: string;
    marca: string; // "visa" | "mastercard" (en minúscula)
    bin: string;
    facturacion: PaywayFacturacion;
}

interface Props {
    seccion: "matricula_mensual" | "matricula_anual" | "deuda" | "curso" | "ventas";
    onToken: (result: PaywayTokenResult) => void;
    procesando?: boolean;
    error?: string | null;
    montoLabel?: string;
    facturacionInicial?: Partial<PaywayFacturacion>;
}

// Marcas soportadas hoy — deben coincidir con las claves de PAYWAY_PAYMENT_METHOD_ID
// en src/lib/payway.ts (crédito y débito son códigos distintos para Payway).
const MARCAS_SOPORTADAS = ["visa", "visa_debito", "mastercard", "mastercard_debito"];

// decidir.cardType() puede devolver variantes como "Visa Débito" o "Visa
// Electron" — hay que preservar si es débito (Payway usa un payment_method_id
// totalmente distinto al de crédito; mandar el de crédito para una tarjeta de
// débito la rechaza con "invalid_param: bin", no como marca no soportada).
function normalizarMarca(raw: string | null): string | null {
    if (!raw) return null;
    const s = raw.toLowerCase();
    const esDebito = s.includes("debit") || s.includes("débit");
    if (s.includes("visa")) return esDebito ? "visa_debito" : "visa";
    if (s.includes("master")) return esDebito ? "mastercard_debito" : "mastercard";
    return null;
}

export default function PaywayCardForm({ seccion, onToken, procesando, error, montoLabel, facturacionInicial }: Props) {
    const formRef = useRef<HTMLFormElement>(null);
    const decidirRef = useRef<DecidirInstance | null>(null);
    const [scriptListo, setScriptListo] = useState(false);
    const [publicConfig, setPublicConfig] = useState<{ publicKey: string; apiUrl: string } | null>(null);
    const [cardNumber, setCardNumber] = useState("");
    const [marcaDetectada, setMarcaDetectada] = useState<string | null>(null);
    const [tokenizando, setTokenizando] = useState(false);
    const [errorLocal, setErrorLocal] = useState("");
    const [facturacion, setFacturacion] = useState<PaywayFacturacion>({
        direccion: facturacionInicial?.direccion ?? "",
        ciudad: facturacionInicial?.ciudad ?? "",
        // Si el valor precargado no matchea exacto una opción del desplegable
        // (viene de un campo de texto libre en otro formulario), se deja vacío
        // para que el usuario elija — mejor eso que mandar un valor inválido.
        provincia: PROVINCIAS_AR.some(p => p.nombre === facturacionInicial?.provincia) ? facturacionInicial!.provincia! : "",
        codigoPostal: facturacionInicial?.codigoPostal ?? "",
    });

    useEffect(() => {
        fetch(`/api/payway/config?seccion=${seccion}`)
            .then(r => r.json())
            .then(d => { if (d.disponible) setPublicConfig({ publicKey: d.publicKey, apiUrl: d.apiUrl }); });
    }, [seccion]);

    const [decidirListo, setDecidirListo] = useState(false);

    useEffect(() => {
        if (!scriptListo || !publicConfig || decidirRef.current) return;
        const decidir = new window.Decidir(publicConfig.apiUrl);
        decidir.setPublishableKey(publicConfig.publicKey);
        decidir.setTimeout(8000);
        decidirRef.current = decidir;
        setDecidirListo(true);
    }, [scriptListo, publicConfig]);

    // Depende también de decidirListo: si el usuario escribe la tarjeta antes de que
    // decidir.js termine de inicializar, hay que re-detectar apenas esté listo.
    useEffect(() => {
        const clean = cardNumber.replace(/\s/g, "");
        if (clean.length < 6) { setMarcaDetectada(null); return; }
        const detectada = normalizarMarca(decidirRef.current?.cardType?.(clean) ?? null);
        setMarcaDetectada(detectada);
    }, [cardNumber, decidirListo]);

    if (!publicConfig) return null; // PayWay no configurado — no se muestra la opción

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorLocal("");
        if (!decidirRef.current || !formRef.current) return;

        const clean = cardNumber.replace(/\s/g, "");
        const marca = marcaDetectada;
        if (!marca || !MARCAS_SOPORTADAS.includes(marca)) {
            setErrorLocal("Por ahora solo aceptamos Visa y Mastercard con esta opción de pago.");
            return;
        }
        if (!facturacion.direccion.trim() || !facturacion.ciudad.trim() || !facturacion.provincia.trim() || !facturacion.codigoPostal.trim()) {
            setErrorLocal("Completá los datos de facturación.");
            return;
        }

        setTokenizando(true);
        decidirRef.current.createToken(formRef.current, (status, response) => {
            setTokenizando(false);
            if (status !== 200 && status !== 201 || !(response.id || response.token)) {
                setErrorLocal(response.error?.[0]?.error?.message || "Datos de tarjeta inválidos. Revisalos e intentá de nuevo.");
                return;
            }
            onToken({
                token: (response.id || response.token) as string,
                marca,
                bin: clean.slice(0, 6),
                facturacion,
            });
        });
    }

    const disabled = tokenizando || procesando;

    return (
        <>
            <Script src="https://ventasonline.payway.com.ar/static/v2.6.4/decidir.js" strategy="afterInteractive" onReady={() => setScriptListo(true)} />

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 bg-white dark:bg-slate-900">
                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><CreditCard size={15} /> Tarjeta de crédito/débito</p>

                <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Número de tarjeta</label>
                    <input data-decidir="card_number" required inputMode="numeric" placeholder="XXXX XXXX XXXX XXXX"
                        value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#063f68] outline-none" />
                    {marcaDetectada && <p className="text-[11px] text-slate-400 dark:text-slate-500">Detectada: {marcaDetectada.replace("_debito", " Débito").replace(/^\w/, c => c.toUpperCase())}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Nombre del titular (como figura en la tarjeta)</label>
                    <input data-decidir="card_holder_name" required placeholder="NOMBRE APELLIDO"
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#063f68] outline-none" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Mes venc.</label>
                        <input data-decidir="card_expiration_month" required inputMode="numeric" maxLength={2} placeholder="MM"
                            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#063f68] outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Año venc.</label>
                        <input data-decidir="card_expiration_year" required inputMode="numeric" maxLength={2} placeholder="AA"
                            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#063f68] outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">CVV</label>
                        <input data-decidir="security_code" required inputMode="numeric" maxLength={4} placeholder="XXX"
                            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#063f68] outline-none" />
                    </div>
                </div>

                <input type="hidden" data-decidir="card_holder_doc_type" value="dni" />
                <input type="hidden" data-decidir="card_holder_doc_number" value="0" />

                <div className="space-y-3 pt-1">
                    <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">Datos de facturación</p>
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Dirección</label>
                        <input required placeholder="Calle y número" value={facturacion.direccion}
                            onChange={e => setFacturacion(f => ({ ...f, direccion: e.target.value }))}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#063f68] outline-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <input required placeholder="Ciudad" value={facturacion.ciudad}
                            onChange={e => setFacturacion(f => ({ ...f, ciudad: e.target.value }))}
                            className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#063f68] outline-none" />
                        <select required value={facturacion.provincia}
                            onChange={e => setFacturacion(f => ({ ...f, provincia: e.target.value }))}
                            className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] text-slate-800 dark:text-white focus:ring-2 focus:ring-[#063f68] outline-none">
                            <option value="" disabled>Provincia</option>
                            {PROVINCIAS_AR.map(p => <option key={p.codigo} value={p.nombre}>{p.nombre}</option>)}
                        </select>
                        <input required placeholder="C.P." value={facturacion.codigoPostal}
                            onChange={e => setFacturacion(f => ({ ...f, codigoPostal: e.target.value }))}
                            className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-[#063f68] outline-none" />
                    </div>
                </div>

                {(errorLocal || error) && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl text-[13px] text-red-600 dark:text-red-400">
                        <AlertCircle size={14} className="flex-shrink-0" /> {errorLocal || error}
                    </div>
                )}

                <button type="submit" disabled={disabled}
                    className="w-full h-11 bg-[#063f68] text-white rounded-xl text-[14px] font-bold hover:bg-[#0a4d7a] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                    {disabled ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                    {tokenizando ? "Validando tarjeta..." : procesando ? "Procesando pago..." : `Pagar${montoLabel ? ` ${montoLabel}` : ""} con tarjeta`}
                </button>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">El pago se procesa al confirmar. Tu tarjeta se tokeniza en el navegador — nunca viaja a nuestros servidores.</p>
            </form>
        </>
    );
}
