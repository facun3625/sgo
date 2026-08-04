"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    ShieldCheck, ShieldOff, Loader2, ChevronLeft, ChevronRight,
    ArrowLeft, Upload, CheckCircle2, AlertTriangle, FileText,
    CreditCard, Library, ExternalLink, Clock, XCircle, Info,
    Banknote, X,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dato {
    nombre: string; apellido: string; expediente?: string;
    tomo?: string; folio?: string;
    fechaMatriculacion?: string;
    domicilioLegal?: string; telefonosLegal?: string; movilLegal?: string;
    localidadLegal?: string; postalLegal?: string;
    domicilioReal?: string; telefonosReal?: string; movilReal?: string;
    localidadReal?: string; postalReal?: string;
}

interface Solicitud {
    id: number; estado: string; pasoActual: number;
    deudaOriginal?: number;
    p1Ok: boolean; p1Metodo?: string; p1Comprobante?: string;
    p2Ok: boolean; p2Desde?: string; p2Razon?: string;
    p3Ok: boolean; p3Pdf?: string;
    p4Ok: boolean; p4Tipo?: string;
    p5Ok: boolean; p5JusAmount?: number; p5Pesos?: number; p5Metodo?: string;
    respuesta?: string; adminNombre?: string;
}

interface Context {
    dato: Dato | null;
    deudaTotal: number;
    deudas: { id: number; monto: number }[];
    jusValor: number;
    motivoCobra: boolean;
    motivoNombre: string | null;
    costoJus: number;
    costoPesos: number;
    userStatus: string;
    paso5Habilitado: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function FileDropzone({ label, accept, file, onChange }: {
    label: string; accept: string; file: File | null;
    onChange: (f: File) => void;
}) {
    return (
        <div className="space-y-1.5">
            <p className="text-[12px] font-black text-slate-700 uppercase tracking-widest">{label}</p>
            <label className="relative group block cursor-pointer">
                <input type="file" accept={accept} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }} />
                <div className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all
                    ${file ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-900/10"
                           : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 group-hover:border-[#063f68]"}`}>
                    {file
                        ? <><CheckCircle2 size={22} className="text-emerald-500" /><p className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[180px] px-2">{file.name}</p></>
                        : <><Upload size={22} className="text-slate-300 group-hover:text-[#063f68] transition-colors" /><p className="text-[12px] text-slate-700 font-medium">Seleccionar archivo</p></>
                    }
                </div>
            </label>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RehabilitacionPage() {
    const [loading, setLoading] = useState(true);
    const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
    const [ultimaRechazada, setUltimaRechazada] = useState<Solicitud | null>(null);
    const [ctx, setCtx] = useState<Context>({
        dato: null, deudaTotal: 0, deudas: [], jusValor: 0,
        motivoCobra: false, motivoNombre: null, costoJus: 1.5, costoPesos: 0, userStatus: "active", paso5Habilitado: true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [mpLoading, setMpLoading] = useState(false);

    // Paso 1
    const [p1Metodo, setP1Metodo] = useState<"mercadopago" | "transferencia" | "">("");
    const [p1File, setP1File] = useState<File | null>(null);

    // Paso 2
    const [p2Desde, setP2Desde] = useState("");
    const [p2Razon, setP2Razon] = useState("");

    // Paso 3
    const [p3File, setP3File] = useState<File | null>(null);

    // Paso 4 sub-steps
    const [s4Step, setS4Step] = useState(1);
    const [p4Tipo, setP4Tipo] = useState<"CBU" | "Tarjeta" | "">("");
    const [p4Scrolled, setP4Scrolled] = useState(false);
    const [p4Accepted, setP4Accepted] = useState(false);
    const [p4Dni, setP4Dni] = useState<File | null>(null);
    const [p4Doc, setP4Doc] = useState<File | null>(null);

    // Paso 5
    const [p5Metodo, setP5Metodo] = useState<"mercadopago" | "transferencia" | "">("");
    const [p5File, setP5File] = useState<File | null>(null);

    const termsRef = useRef<HTMLDivElement>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch("/api/user/rehabilitacion");
            const data = await res.json();
            setSolicitud(data.solicitud ?? null);
            setUltimaRechazada(data.ultimaRechazada ?? null);
            setCtx({
                dato: data.dato, deudaTotal: data.deudaTotal, deudas: data.deudas ?? [],
                jusValor: data.jusValor, motivoCobra: data.motivoCobra, motivoNombre: data.motivoNombre,
                costoJus: data.costoJus, costoPesos: data.costoPesos, userStatus: data.userStatus,
                paso5Habilitado: data.paso5Habilitado !== false,
            });
        } finally { setLoading(false); }
    }

    async function iniciar() {
        setSaving(true); setError("");
        try {
            const res = await fetch("/api/user/rehabilitacion", { method: "POST" });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Error"); return; }
            setSolicitud(data.solicitud);
        } finally { setSaving(false); }
    }

    async function cancelar() {
        if (!confirm("¿Cancelar la solicitud? Tendrás que iniciar el trámite de nuevo.")) return;
        setSaving(true); setError("");
        try {
            const res = await fetch("/api/user/rehabilitacion", { method: "DELETE" });
            if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
            setSolicitud(null);
        } finally { setSaving(false); }
    }

    async function submitPaso(paso: number, extra: Record<string, string> = {}, files: Record<string, File | null> = {}) {
        setSaving(true); setError("");
        try {
            const fd = new FormData();
            fd.append("paso", String(paso));
            for (const [k, v] of Object.entries(extra)) fd.append(k, v);
            for (const [k, f] of Object.entries(files)) { if (f) fd.append(k, f); }
            const res = await fetch("/api/user/rehabilitacion/paso", { method: "PATCH", body: fd });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Error"); return; }
            setSolicitud(data.solicitud);
            // Reset sub-state
            if (paso === 4) { setS4Step(1); setP4Tipo(""); setP4Accepted(false); setP4Scrolled(false); setP4Dni(null); setP4Doc(null); }
        } finally { setSaving(false); }
    }

    async function pagarConMP() {
        if (!solicitud) return;
        setMpLoading(true); setError("");
        try {
            const res = await fetch("/api/payments/create-preference", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tipo: "rehab_costo", ref: String(solicitud.id) }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Error al generar el pago"); return; }
            window.location.href = data.init_point;
        } finally { setMpLoading(false); }
    }

    // ── Render helpers ──

    const paso = solicitud?.pasoActual ?? 1;
    const totalPasos = 5;

    const PASOS = ["Deuda Vencida", "Formulario", "Reincidencia", "Adhesión", "Pago rehab."];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 size={28} className="animate-spin text-slate-300" />
        </div>
    );

    // ── Estado pendiente ──
    if (solicitud?.estado === "pendiente") return (
        <PageShell>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                    <Clock size={28} className="text-amber-500" />
                </div>
                <h2 className="text-[18px] font-bold text-slate-800 dark:text-white">Solicitud en revisión</h2>
                <p className="text-[14px] text-slate-700 dark:text-slate-400 leading-relaxed max-w-md">
                    Completaste todos los pasos. El Consejo revisará tu solicitud y recibirás una notificación con la resolución.
                </p>
                {error && <p className="text-[13px] text-rose-500">{error}</p>}
                <button onClick={cancelar} disabled={saving}
                    className="text-[12px] text-slate-700 hover:text-rose-500 transition-colors underline underline-offset-2 disabled:opacity-50">
                    {saving ? "Cancelando..." : "Cancelar solicitud y reiniciar"}
                </button>
            </div>
        </PageShell>
    );

    // ── Estado aprobada ──
    if (solicitud?.estado === "aprobada") return (
        <PageShell>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={28} className="text-emerald-500" />
                </div>
                <h2 className="text-[18px] font-bold text-slate-800 dark:text-white">¡Rehabilitación aprobada!</h2>
                {solicitud.respuesta && (
                    <p className="text-[14px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 text-left max-w-md">
                        {solicitud.respuesta}
                    </p>
                )}
                <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[14px] font-bold transition-all">
                    <ShieldCheck size={14} /> Ir al inicio
                </Link>
            </div>
        </PageShell>
    );

    // ── Sin solicitud activa ──
    if (!solicitud) return (
        <PageShell>
            <div className="space-y-6">
                {ultimaRechazada && (
                    <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl">
                        <XCircle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[14px] font-bold text-rose-700 dark:text-rose-400">Solicitud anterior rechazada</p>
                            {ultimaRechazada.respuesta && <p className="text-[13px] text-rose-600/70 dark:text-rose-400/60 mt-0.5">{ultimaRechazada.respuesta}</p>}
                            <p className="text-[12px] text-rose-500/60 mt-1">Podés iniciar una nueva solicitud.</p>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                        <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">El proceso consta de <strong>5 pasos</strong>:</p>
                        <ol className="space-y-2">
                            {[
                                "Regularización de deuda vencida (si corresponde)",
                                "Aceptación del formulario de solicitud",
                                "Adjuntar certificado de antecedentes penales",
                                "Adhesión a débito automático",
                                "Pago del costo de rehabilitación",
                            ].map((s, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-[14px] text-slate-600 dark:text-slate-300">
                                    <span className="w-5 h-5 rounded-full bg-[#063f68]/10 text-[#063f68] dark:bg-blue-400/10 dark:text-blue-400 text-[11px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                    {s}
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                            {ctx.deudaTotal > 0 && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[13px] text-amber-700 dark:text-amber-400">
                                        Tenés una deuda de <strong>{fmt(ctx.deudaTotal)}</strong>. Podés adjuntar comprobante de pago durante el trámite o abonar previamente por MercadoPago.
                                    </p>
                                </div>
                            )}
                            <p className="text-[13px] text-slate-700 leading-relaxed">
                                Al iniciar el trámite se registrará el estado actual de tu deuda. Tenés que completar todos los pasos para que la solicitud llegue al Consejo.
                            </p>
                        </div>
                        {error && <p className="text-[13px] text-rose-500 flex items-center gap-1"><AlertTriangle size={12} /> {error}</p>}
                        <button onClick={iniciar} disabled={saving}
                            className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[14px] disabled:opacity-50 transition-all">
                            {saving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                            Iniciar trámite de rehabilitación
                        </button>
                    </div>
                </div>
            </div>
        </PageShell>
    );

    // ── Flujo multi-paso (borrador) ──
    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#02182b]">
            {/* Header sticky */}
            <div className="sticky top-16 z-10 bg-white/80 dark:bg-[#02182b]/80 backdrop-blur-md flex items-center justify-between px-8 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <BackLink />
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={18} className="text-emerald-500" />
                        <h2 className="text-[16px] font-bold text-slate-800 dark:text-white">Solicitud de Rehabilitación</h2>
                    </div>
                </div>
                {/* Cancelar + Barra de progreso */}
                <div className="hidden md:flex items-center gap-4">
                <button onClick={cancelar} disabled={saving}
                    className="text-[12px] text-slate-700 hover:text-rose-500 transition-colors flex items-center gap-1 disabled:opacity-50">
                    <X size={11} /> Cancelar
                </button>
                <div className="flex items-center gap-1">
                    {PASOS.map((label, i) => {
                        const n = i + 1;
                        const done = paso > n;
                        const active = paso === n;
                        return (
                            <div key={n} className="flex items-center">
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all
                                        ${done ? "bg-emerald-500 text-white" : active ? "bg-[#063f68] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700"}`}>
                                        {done ? <CheckCircle2 size={12} /> : n}
                                    </div>
                                    <span className={`text-[12px] font-bold uppercase tracking-wider ${active ? "text-slate-800 dark:text-white" : "text-slate-700"}`}>{label}</span>
                                </div>
                                {i < PASOS.length - 1 && <div className={`w-8 h-px mx-2 ${done ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`} />}
                            </div>
                        );
                    })}
                </div>
                </div>
            </div>

            <div className="p-6 md:p-10 space-y-6">
            {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl text-[13px] text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={13} /> {error}
                </div>
            )}

            {/* ── PASO 1: Deuda ── */}
            {paso === 1 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                    <div>
                        <h2 className="text-[16px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Banknote size={16} className="text-amber-500" /> Regularización de deuda vencida
                        </h2>
                        <p className="text-[13px] text-slate-700 mt-0.5">Deuda vencida registrada al iniciar el trámite: <strong>{fmt(solicitud.deudaOriginal ?? 0)}</strong></p>
                    </div>

                    {(solicitud.deudaOriginal ?? 0) === 0 ? (
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                            <CheckCircle2 size={18} className="text-emerald-500" />
                            <p className="text-[14px] text-emerald-700 dark:text-emerald-400 font-medium">Sin deuda vencida. Este paso se completa automáticamente.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-[13px] text-blue-700 dark:text-blue-400">
                                    Si abonaste la deuda vencida por MercadoPago, seleccioná esa opción y verificaremos automáticamente.
                                    Si pagaste por transferencia o efectivo, adjuntá el comprobante.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setP1Metodo("mercadopago")}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${p1Metodo === "mercadopago" ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                    <p className="text-[14px] font-bold text-slate-800 dark:text-white">MercadoPago</p>
                                    <p className="text-[12px] text-slate-700 mt-0.5">Ya lo pagué por MP</p>
                                </button>
                                <button onClick={() => setP1Metodo("transferencia")}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${p1Metodo === "transferencia" ? "border-amber-500 bg-amber-50/50 dark:bg-amber-900/10" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                                    <p className="text-[14px] font-bold text-slate-800 dark:text-white">Transferencia / Efectivo</p>
                                    <p className="text-[12px] text-slate-700 mt-0.5">Adjuntar comprobante</p>
                                </button>
                            </div>
                            {p1Metodo === "transferencia" && (
                                <FileDropzone label="Comprobante de pago" accept="image/*,application/pdf" file={p1File} onChange={setP1File} />
                            )}
                            <button
                                onClick={() => submitPaso(1, { metodo: p1Metodo }, p1Metodo === "transferencia" ? { comprobante: p1File } : {})}
                                disabled={saving || !p1Metodo || (p1Metodo === "transferencia" && !p1File)}
                                className="w-full h-11 flex items-center justify-center gap-2 bg-[#063f68] hover:bg-[#0a4d7a] text-white rounded-xl font-bold text-[14px] disabled:opacity-40 transition-all">
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                                Continuar
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── PASO 2: Formulario ── */}
            {paso === 2 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                    <div>
                        <h2 className="text-[16px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <FileText size={16} className="text-blue-500" /> Formulario de rehabilitación
                        </h2>
                        <p className="text-[13px] text-slate-700 mt-0.5">Revisá el texto auto-completado, completá los campos marcados y aceptá.</p>
                    </div>

                    {/* Carta formal */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 font-mono">
                        <p className="text-right">Santa Fe, {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                        <div className="mt-4 space-y-1">
                            <p>Señor Presidente del Colegio de Abogados</p>
                            <p>de la Primera Circunscripción Judicial</p>
                            <p>Dr. ........................................</p>
                            <p>S.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;D</p>
                        </div>
                        <div className="mt-4">
                            <p>
                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;El/La que suscribe{" "}
                                <strong>{ctx.dato ? `${ctx.dato.apellido}, ${ctx.dato.nombre}` : "........................................"}</strong>,
                                Abogado/a inscripto/a en la matrícula respectiva de este Colegio,
                                al Tomo <strong>{ctx.dato?.tomo ?? "......"}</strong>, Folio Nº{" "}
                                <strong>{ctx.dato?.folio ?? "......"}</strong> Expte.Nº{" "}
                                <strong>{solicitud.deudaOriginal !== undefined ? ctx.dato?.expediente ?? "" : ""}</strong>{" "}
                                de fecha <strong>{ctx.dato?.fechaMatriculacion ? new Date(ctx.dato.fechaMatriculacion).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "..."}</strong>{" "}
                                con domicilio legal en:
                            </p>
                            <p className="mt-1">{ctx.dato?.domicilioLegal ?? "......................................................................"}</p>
                            <p>Tel. {ctx.dato?.telefonosLegal ?? "............"} Cel. {ctx.dato?.movilLegal ?? "............"} localidad {ctx.dato?.localidadLegal ?? "............"} C.P. ({ctx.dato?.postalLegal ?? "..."})</p>
                            <p className="mt-2">y domicilio real en:</p>
                            <p className="mt-1">{ctx.dato?.domicilioReal ?? "......................................................................"}</p>
                            <p>Tel. {ctx.dato?.telefonosReal ?? "............"} Cel. {ctx.dato?.movilReal ?? "............"} localidad {ctx.dato?.localidadReal ?? "............"} C.P. ({ctx.dato?.postalReal ?? "..."})</p>
                        </div>
                        <div className="mt-3">
                            <p>
                                estando al día con las cuotas sociales de esta Institución, solicita tenga a bien proceder a la
                                rehabilitación de mi matrícula profesional a partir de{" "}
                                <input
                                    value={p2Desde}
                                    onChange={e => setP2Desde(e.target.value)}
                                    placeholder="completar fecha..."
                                    className="inline-block border-b border-[#063f68] bg-transparent text-[#063f68] dark:text-blue-400 font-semibold focus:outline-none px-1 min-w-[140px]"
                                />
                            </p>
                            <p className="mt-2">
                                en razón de{" "}
                                <input
                                    value={p2Razon}
                                    onChange={e => setP2Razon(e.target.value)}
                                    placeholder="completar motivo..."
                                    className="inline-block border-b border-[#063f68] bg-transparent text-[#063f68] dark:text-blue-400 font-semibold focus:outline-none px-1 min-w-[200px]"
                                />
                            </p>
                        </div>
                        <p className="mt-4 text-center">Sin otro particular, saluda a Ud. muy atentamente.-</p>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => { setError(""); setSolicitud(s => s ? { ...s, pasoActual: 1 } : s); }}
                            className="flex items-center gap-1.5 px-4 h-10 border border-slate-200 dark:border-slate-700 text-slate-700 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <ArrowLeft size={13} /> Atrás
                        </button>
                        <button
                            onClick={() => submitPaso(2, { desde: p2Desde, razon: p2Razon })}
                            disabled={saving || !p2Desde.trim() || !p2Razon.trim()}
                            className="flex-1 h-10 flex items-center justify-center gap-2 bg-[#063f68] hover:bg-[#0a4d7a] text-white rounded-xl font-bold text-[14px] disabled:opacity-40 transition-all">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} /> Aceptar y continuar</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── PASO 3: Reincidencia ── */}
            {paso === 3 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                    <div>
                        <h2 className="text-[16px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <FileText size={16} className="text-purple-500" /> Registro Nacional de Reincidencia
                        </h2>
                        <p className="text-[13px] text-slate-700 mt-0.5">Descargá el formulario, completalo y adjuntalo en PDF.</p>
                    </div>
                    <a
                        href="https://www.argentina.gob.ar/justicia/reincidencia/antecedentespenales"
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#063f68] transition-all group">
                        <div className="w-9 h-9 rounded-lg bg-[#063f68]/10 flex items-center justify-center flex-shrink-0">
                            <ExternalLink size={16} className="text-[#063f68] dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[14px] font-bold text-slate-700 dark:text-white group-hover:text-[#063f68] dark:group-hover:text-blue-400 transition-colors">
                                Formulario — Antecedentes Penales
                            </p>
                            <p className="text-[12px] text-slate-700">argentina.gob.ar · Registro Nacional de Reincidencia</p>
                        </div>
                    </a>
                    <FileDropzone label="PDF del formulario completado" accept=".pdf,application/pdf" file={p3File} onChange={setP3File} />
                    <div className="flex gap-3">
                        <button onClick={() => setSolicitud(s => s ? { ...s, pasoActual: 2 } : s)}
                            className="flex items-center gap-1.5 px-4 h-10 border border-slate-200 dark:border-slate-700 text-slate-700 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <ArrowLeft size={13} /> Atrás
                        </button>
                        <button onClick={() => submitPaso(3, {}, { pdf: p3File })} disabled={saving || !p3File}
                            className="flex-1 h-10 flex items-center justify-center gap-2 bg-[#063f68] hover:bg-[#0a4d7a] text-white rounded-xl font-bold text-[14px] disabled:opacity-40 transition-all">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                            Continuar
                        </button>
                    </div>
                </div>
            )}

            {/* ── PASO 4: Adhesión ── */}
            {paso === 4 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                    <div>
                        <h2 className="text-[16px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Banknote size={16} className="text-cyan-500" /> Adhesión a débito automático
                        </h2>
                        <p className="text-[13px] text-slate-700 mt-0.5">Sub-paso {s4Step} de 3</p>
                    </div>

                    {/* Sub-paso 1: selección tipo */}
                    {s4Step === 1 && (
                        <div className="space-y-4">
                            <p className="text-[14px] text-slate-600 dark:text-slate-300">Seleccioná el método de débito automático.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setP4Tipo("CBU")}
                                    className={`p-5 rounded-xl border-2 text-left transition-all ${p4Tipo === "CBU" ? "border-[#063f68] bg-blue-50/50 dark:bg-blue-900/10" : "border-slate-200 dark:border-slate-700"}`}>
                                    <Library size={22} className={p4Tipo === "CBU" ? "text-[#063f68] dark:text-blue-400" : "text-slate-700"} />
                                    <p className="text-[14px] font-bold text-slate-800 dark:text-white mt-3">Débito en cuenta</p>
                                    <p className="text-[12px] text-slate-700 mt-0.5">CBU de cualquier banco</p>
                                </button>
                                <button onClick={() => setP4Tipo("Tarjeta")}
                                    className={`p-5 rounded-xl border-2 text-left transition-all ${p4Tipo === "Tarjeta" ? "border-[#063f68] bg-blue-50/50 dark:bg-blue-900/10" : "border-slate-200 dark:border-slate-700"}`}>
                                    <CreditCard size={22} className={p4Tipo === "Tarjeta" ? "text-[#063f68] dark:text-blue-400" : "text-slate-700"} />
                                    <p className="text-[14px] font-bold text-slate-800 dark:text-white mt-3">Tarjeta de crédito</p>
                                    <p className="text-[12px] text-slate-700 mt-0.5">Visa débito directo</p>
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setSolicitud(s => s ? { ...s, pasoActual: 3 } : s)}
                                    className="flex items-center gap-1.5 px-4 h-10 border border-slate-200 dark:border-slate-700 text-slate-700 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    <ArrowLeft size={13} /> Atrás
                                </button>
                                <button onClick={() => setS4Step(2)} disabled={!p4Tipo}
                                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-[#063f68] hover:bg-[#0a4d7a] text-white rounded-xl font-bold text-[14px] disabled:opacity-40 transition-all">
                                    <ChevronRight size={14} /> Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sub-paso 2: términos */}
                    {s4Step === 2 && (
                        <div className="space-y-4">
                            <div className="relative">
                                <div ref={termsRef}
                                    onScroll={e => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) setP4Scrolled(true); }}
                                    className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed max-h-52 overflow-y-auto space-y-2">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">Reconozco y acepto en forma irrevocable los términos y condiciones de adhesión débito automático en cuenta bancaria o tarjeta de crédito de las CUOTAS DE MATRÍCULAS MENSUALES del COLEGIO DE PROFESIONALES DE LA ABOGACÍA DE SANTA FE DE LA PRIMERA CIRCUNSCRIPCIÓN (en adelante "CPASF"), devengadas por mi condición de MATRICULADO, que se regirá por las siguientes condiciones y declaraciones:</p>
                                    <ul className="list-disc pl-5 space-y-1.5">
                                        <li>Autorizo a que los importes de "las cuotas" se debiten el día de su vencimiento y en la medida que las mismas sean remitidas por el "CPASF", de la cuenta bancaria y/o tarjeta de crédito denunciada ante el "CPASF" a través del sistema SGO.</li>
                                        <li>Declaro que, a los fines de lograr el efectivo débito de "las cuotas", adjuntaré archivo JPG o PDF de la comunicación digital emitida por el Banco donde poseo la cuenta bancaria informando la CBU para el caso de adhesión en cuenta bancaria, y/o archivo JPG o PDF del anverso y reverso de la tarjeta de crédito, para el caso de adhesión por dicho medio.</li>
                                        <li>Autorizo a presentar el producto bancario para el débito automático ante las entidades financieras y/o sistema de tarjetas de créditos correspondientes para efectivizar los débitos correspondientes de "las cuotas".</li>
                                        <li>Me comprometo de modo irrevocable a adoptar las previsiones necesarias para tener saldo suficiente en mi cuenta bancaria y/o la tarjeta de crédito vigente, el día hábil bancario anterior a cada vencimiento de la fecha para el pago de "las cuotas".</li>
                                        <li>Para el caso de no haber saldo suficiente en mi cuenta bancaria, autorizo a debitar las sumas adeudadas al momento que la cuenta bancaria posea saldo positivo o acreedor.</li>
                                    </ul>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">La presente autorización tiene validez desde la fecha de aceptación hasta tanto medie comunicación fehaciente de mi parte de revocarla.</p>
                                </div>
                                {!p4Scrolled && (
                                    <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none rounded-b-xl bg-gradient-to-t from-slate-100 dark:from-slate-900 to-transparent flex items-end justify-center pb-1.5">
                                        <span className="text-[10px] font-bold text-slate-700 animate-bounce">▼ Desplazá para leer todo</span>
                                    </div>
                                )}
                            </div>
                            <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${p4Scrolled ? "border-slate-200 dark:border-slate-700" : "opacity-50 cursor-not-allowed border-slate-100 dark:border-slate-800"}`}>
                                <input type="checkbox" checked={p4Accepted} disabled={!p4Scrolled} onChange={e => p4Scrolled && setP4Accepted(e.target.checked)} className="w-4 h-4 accent-[#063f68]" />
                                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">He leído y acepto los términos irrevocablemente</span>
                            </label>
                            <div className="flex gap-3">
                                <button onClick={() => setS4Step(1)} className="flex items-center gap-1.5 px-4 h-10 border border-slate-200 dark:border-slate-700 text-slate-700 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    <ArrowLeft size={13} /> Atrás
                                </button>
                                <button onClick={() => setS4Step(3)} disabled={!p4Accepted}
                                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-[#063f68] hover:bg-[#0a4d7a] text-white rounded-xl font-bold text-[14px] disabled:opacity-40 transition-all">
                                    <ChevronRight size={14} /> Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sub-paso 3: documentos */}
                    {s4Step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <Info size={14} className="text-blue-500 flex-shrink-0" />
                                <p className="text-[13px] text-blue-700 dark:text-blue-400">
                                    Adjuntá tu DNI (frontal) y {p4Tipo === "CBU" ? "la constancia de CBU (home banking)" : "la foto frontal de la tarjeta Visa"}.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FileDropzone label="Foto DNI frontal" accept="image/*,application/pdf" file={p4Dni} onChange={setP4Dni} />
                                <FileDropzone
                                    label={p4Tipo === "CBU" ? "Constancia CBU" : "Foto tarjeta (frente)"}
                                    accept="image/*,application/pdf" file={p4Doc} onChange={setP4Doc}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setS4Step(2)} className="flex items-center gap-1.5 px-4 h-10 border border-slate-200 dark:border-slate-700 text-slate-700 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                    <ArrowLeft size={13} /> Atrás
                                </button>
                                <button
                                    onClick={() => submitPaso(4, { tipo: p4Tipo }, { dni: p4Dni, doc: p4Doc })}
                                    disabled={saving || !p4Dni || !p4Doc}
                                    className="flex-1 h-10 flex items-center justify-center gap-2 bg-[#063f68] hover:bg-[#0a4d7a] text-white rounded-xl font-bold text-[14px] disabled:opacity-40 transition-all">
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    Confirmar adhesión
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── PASO 5: Pago (o presencial) ── */}
            {paso === 5 && !ctx.paso5Habilitado && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                    <div>
                        <h2 className="text-[16px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <ShieldOff size={16} className="text-amber-500" /> Finalización del trámite
                        </h2>
                        <p className="text-[13px] text-slate-700 mt-0.5">Último paso para enviar tu solicitud.</p>
                    </div>

                    <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl space-y-3 text-center">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center mx-auto">
                            <Library size={22} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <p className="text-[15px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide leading-snug">
                            DEBEN ASISTIR EN FORMA PRESENCIAL AL COLEGIO, AL ÁREA DE MATRICULACIÓN, PARA FINALIZAR EL TRÁMITE DE REHABILITACIÓN, SINO DICHO TRÁMITE NO ESTARÁ COMPLETO
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setSolicitud(s => s ? { ...s, pasoActual: 4 } : s)}
                            className="flex items-center gap-1.5 px-4 h-10 border border-slate-200 dark:border-slate-700 text-slate-700 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <ArrowLeft size={13} /> Atrás
                        </button>
                        <button
                            onClick={() => submitPaso(5, { metodo: "presencial" })}
                            disabled={saving}
                            className="flex-1 h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[14px] disabled:opacity-40 transition-all">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Entendido — Enviar solicitud
                        </button>
                    </div>
                </div>
            )}

            {paso === 5 && ctx.paso5Habilitado && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                    <div>
                        <h2 className="text-[16px] font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <CreditCard size={16} className="text-emerald-500" /> Pago del costo de rehabilitación
                        </h2>
                        <p className="text-[13px] text-slate-700 mt-0.5">Último paso para enviar tu solicitud.</p>
                    </div>

                    {/* Costo */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-slate-700">Costo de rehabilitación</span>
                            <span className="text-[16px] font-black text-slate-800 dark:text-white">{solicitud.p5JusAmount} JUS = {fmt(solicitud.p5Pesos ?? 0)}</span>
                        </div>
                        {ctx.motivoCobra && (
                            <p className="text-[12px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle size={11} /> Costo diferencial aplicado por suspensión con deuda (motivo: {ctx.motivoNombre ?? "registrado"})
                            </p>
                        )}
                        {!ctx.motivoCobra && (
                            <p className="text-[12px] text-slate-700">Tarifa estándar de 1,5 JUS.</p>
                        )}
                    </div>

                    {/* Método */}
                    <div className="space-y-3">
                        <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Seleccioná método de pago</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setP5Metodo("mercadopago")}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${p5Metodo === "mercadopago" ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10" : "border-slate-200 dark:border-slate-700"}`}>
                                <p className="text-[14px] font-bold text-slate-800 dark:text-white">MercadoPago</p>
                                <p className="text-[12px] text-slate-700 mt-0.5">Pago online inmediato</p>
                            </button>
                            <button onClick={() => setP5Metodo("transferencia")}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${p5Metodo === "transferencia" ? "border-amber-500 bg-amber-50/50 dark:bg-amber-900/10" : "border-slate-200 dark:border-slate-700"}`}>
                                <p className="text-[14px] font-bold text-slate-800 dark:text-white">Transferencia</p>
                                <p className="text-[12px] text-slate-700 mt-0.5">Adjuntar comprobante</p>
                            </button>
                        </div>
                        {p5Metodo === "transferencia" && (
                            <FileDropzone label="Comprobante de transferencia" accept="image/*,application/pdf" file={p5File} onChange={setP5File} />
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setSolicitud(s => s ? { ...s, pasoActual: 4 } : s)}
                            className="flex items-center gap-1.5 px-4 h-10 border border-slate-200 dark:border-slate-700 text-slate-700 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <ArrowLeft size={13} /> Atrás
                        </button>
                        {p5Metodo === "mercadopago" && (
                            <button onClick={pagarConMP} disabled={mpLoading}
                                className="flex-1 h-10 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-[14px] disabled:opacity-40 transition-all">
                                {mpLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                                Pagar con MercadoPago
                            </button>
                        )}
                        {p5Metodo === "transferencia" && (
                            <button onClick={() => submitPaso(5, { metodo: "transferencia" }, { comprobante: p5File })} disabled={saving || !p5File}
                                className="flex-1 h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[14px] disabled:opacity-40 transition-all">
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                Enviar solicitud
                            </button>
                        )}
                        {!p5Metodo && (
                            <div className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-[13px] text-slate-700">
                                Seleccioná un método
                            </div>
                        )}
                    </div>
                </div>
            )}
            </div>{/* /p-6 */}
        </div>
    );
}

function BackLink() {
    return (
        <Link href="/dashboard"
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group">
            <ChevronLeft size={20} className="text-slate-700 group-hover:text-black dark:group-hover:text-white transition-colors" />
        </Link>
    );
}

function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#02182b]">
            <div className="sticky top-16 z-10 bg-white/80 dark:bg-[#02182b]/80 backdrop-blur-md flex items-center gap-4 px-8 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <BackLink />
                <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    <h1 className="text-[16px] font-bold text-slate-800 dark:text-white">Solicitud de Rehabilitación</h1>
                </div>
            </div>
            <div className="p-6 md:p-10">
                {children}
            </div>
        </div>
    );
}
