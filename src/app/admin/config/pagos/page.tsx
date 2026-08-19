"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Loader2, KeyRound, Eye, EyeOff, Landmark, ToggleLeft, ToggleRight } from "lucide-react";

type Msg = { tipo: "success" | "error"; texto: string } | null;

const SECCIONES = [
    { key: "transferencia_matricula_mensual", label: "Cuota mensual" },
    { key: "transferencia_matricula_anual",   label: "Matrícula anual" },
    { key: "transferencia_deuda",             label: "Deudas Vencidas" },
    { key: "transferencia_curso",             label: "Cursos" },
    { key: "transferencia_ventas",            label: "Ventas (productos)" },
];

const SECCIONES_PAYWAY = [
    { key: "payway_matricula_mensual", label: "Cuota mensual" },
    { key: "payway_matricula_anual",   label: "Matrícula anual" },
    { key: "payway_deuda",             label: "Deudas Vencidas" },
    { key: "payway_curso",             label: "Cursos" },
    { key: "payway_ventas",            label: "Ventas (productos)" },
];

type Tab = "mp" | "payway" | "transferencia";

// Un campo de credencial de PayWay con su propio guardado — se usa dos veces
// (sandbox y producción) por cada uno de los 3 campos (Site ID/Public/Secret).
function PaywayCredencialField({ clave, label, hint, configurado, secreto, onSaved }: {
    clave: string; label: string; hint?: string; configurado: boolean; secreto?: boolean; onSaved: () => void;
}) {
    const [valor, setValor] = useState("");
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<Msg>(null);

    const guardar = async () => {
        setSaving(true); setMsg(null);
        try {
            const res = await fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave, valor: valor.trim() }) });
            if (res.ok) { setValor(""); setMsg({ tipo: "success", texto: "Guardado." }); onSaved(); }
            else setMsg({ tipo: "error", texto: "Error al guardar." });
        } catch { setMsg({ tipo: "error", texto: "Error de conexión." }); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                    {label} {hint && <span className="font-normal text-slate-400">— {hint}</span>}
                </span>
                <span className={`flex items-center gap-1 text-[11px] font-semibold ${configurado ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {configurado ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {configurado ? "Configurada" : "Falta"}
                </span>
            </div>
            <div className="relative">
                <input type={secreto && !show ? "password" : "text"} value={valor} onChange={(e) => setValor(e.target.value)}
                    placeholder={configurado ? "Pegá un valor nuevo para reemplazar" : label}
                    className="w-full h-10 px-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-slate-400" />
                {secreto && (
                    <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        {show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                )}
            </div>
            {msg && <div className={`flex items-center gap-2 text-[11px] font-bold ${msg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>{msg.tipo === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}{msg.texto}</div>}
            <button onClick={guardar} disabled={saving || !valor.trim()}
                className="flex items-center gap-2 px-4 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[12px] font-bold disabled:opacity-40 transition-all active:scale-95">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                {saving ? "Guardando..." : "Guardar"}
            </button>
        </div>
    );
}

export default function ConfigPagosPage() {
    const [tab, setTab] = useState<Tab>("mp");
    const [loading, setLoading] = useState(true);
    // MP
    const [mpTokenConfigurado, setMpTokenConfigurado] = useState(false);
    const [mpToken, setMpToken] = useState("");
    const [showMpToken, setShowMpToken] = useState(false);
    const [savingMpToken, setSavingMpToken] = useState(false);
    const [mpTokenMsg, setMpTokenMsg] = useState<Msg>(null);
    const [mpPublicKeyConfigurado, setMpPublicKeyConfigurado] = useState(false);
    const [mpPublicKey, setMpPublicKey] = useState("");
    const [showMpPublicKey, setShowMpPublicKey] = useState(false);
    const [savingMpPublicKey, setSavingMpPublicKey] = useState(false);
    const [mpPublicKeyMsg, setMpPublicKeyMsg] = useState<Msg>(null);
    // PayWay — credenciales separadas por ambiente (antes había una sola clave
    // compartida sin importar sandbox/producción, lo que generaba confusión).
    const [paywayConfigurado, setPaywayConfigurado] = useState({
        siteIdSandbox: false, publicKeySandbox: false, secretKeySandbox: false,
        siteIdProduccion: false, publicKeyProduccion: false, secretKeyProduccion: false,
    });
    const [paywayAmbiente, setPaywayAmbiente] = useState<"developer" | "production">("developer");
    const [savingPaywayAmbiente, setSavingPaywayAmbiente] = useState(false);
    // Transferencia
    const [cbu, setCbu] = useState("");
    const [alias, setAlias] = useState("");
    const [savingBanco, setSavingBanco] = useState(false);
    const [bancoMsg, setBancoMsg] = useState<Msg>(null);
    const [secciones, setSecciones] = useState<Record<string, boolean>>({});
    const [togglingKey, setTogglingKey] = useState<string | null>(null);

    const cargarConfig = () =>
        fetch("/api/admin/config/pagos")
            .then((r) => r.json())
            .then((d) => {
                setMpTokenConfigurado(!!d.mpTokenConfigurado);
                setMpPublicKeyConfigurado(!!d.mpPublicKeyConfigurado);
                setPaywayConfigurado({
                    siteIdSandbox: !!d.paywaySiteIdConfiguradoSandbox,
                    publicKeySandbox: !!d.paywayPublicKeyConfiguradoSandbox,
                    secretKeySandbox: !!d.paywaySecretKeyConfiguradoSandbox,
                    siteIdProduccion: !!d.paywaySiteIdConfiguradoProduccion,
                    publicKeyProduccion: !!d.paywayPublicKeyConfiguradoProduccion,
                    secretKeyProduccion: !!d.paywaySecretKeyConfiguradoProduccion,
                });
                setPaywayAmbiente(d.paywayAmbiente === "production" ? "production" : "developer");
                setCbu(d.cbu ?? "");
                setAlias(d.alias ?? "");
                const s: Record<string, boolean> = {};
                [...SECCIONES, ...SECCIONES_PAYWAY].forEach(({ key }) => { s[key] = !!d[key]; });
                setSecciones(s);
            });

    useEffect(() => { cargarConfig().finally(() => setLoading(false)); }, []);

    const saveKey = async (clave: string, valor: string, setSaving: (v: boolean) => void, setMsg: (m: Msg) => void, onSuccess?: () => void) => {
        setSaving(true); setMsg(null);
        try {
            const res = await fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave, valor: valor.trim() }) });
            if (res.ok) { onSuccess?.(); setMsg({ tipo: "success", texto: "Guardado correctamente." }); }
            else setMsg({ tipo: "error", texto: "Error al guardar." });
        } catch { setMsg({ tipo: "error", texto: "Error de conexión." }); }
        finally { setSaving(false); }
    };

    const saveBanco = async () => {
        setSavingBanco(true); setBancoMsg(null);
        try {
            const [r1, r2] = await Promise.all([
                fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: "cbu", valor: cbu.trim() }) }),
                fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: "alias", valor: alias.trim() }) }),
            ]);
            if (r1.ok && r2.ok) setBancoMsg({ tipo: "success", texto: "Datos bancarios guardados." });
            else setBancoMsg({ tipo: "error", texto: "Error al guardar." });
        } catch { setBancoMsg({ tipo: "error", texto: "Error de conexión." }); }
        finally { setSavingBanco(false); }
    };

    const toggleSeccion = async (key: string, current: boolean) => {
        setTogglingKey(key);
        const nuevo = current ? "0" : "1";
        const res = await fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: key, valor: nuevo }) });
        if (res.ok) setSecciones((prev) => ({ ...prev, [key]: !current }));
        setTogglingKey(null);
    };

    const paywayCredencialesCompletas = paywayAmbiente === "production"
        ? paywayConfigurado.siteIdProduccion && paywayConfigurado.publicKeyProduccion && paywayConfigurado.secretKeyProduccion
        : paywayConfigurado.siteIdSandbox && paywayConfigurado.publicKeySandbox && paywayConfigurado.secretKeySandbox;
    const paywayAnySeccionHabilitada = SECCIONES_PAYWAY.some(({ key }) => secciones[key]);

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-400" /></div>;

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#009ee3]/10 flex items-center justify-center">
                    <KeyRound size={20} className="text-[#009ee3]" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Métodos de Pago</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">MercadoPago, PayWay y transferencia bancaria</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 -mt-4">
                {([
                    { key: "mp" as Tab, label: "Mercado Pago", activo: mpTokenConfigurado },
                    { key: "payway" as Tab, label: "PayWay", activo: paywayAnySeccionHabilitada },
                    { key: "transferencia" as Tab, label: "Transferencia", activo: Object.values(secciones).some(Boolean) },
                ]).map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 h-11 text-[13px] font-bold border-b-2 transition-all -mb-px ${tab === t.key
                            ? "border-[#063f68] text-[#063f68] dark:text-blue-400 dark:border-blue-400"
                            : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                        {t.label}
                        {t.activo && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Activo" />}
                    </button>
                ))}
            </div>

            {/* ── MERCADO PAGO ─────────────────────────────────────────────── */}
            {tab === "mp" && (
            <div className="space-y-4">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                    Mercado Pago
                    <span className="w-4 h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                </h2>

                {/* Access Token */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Access Token</label>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Requerido para procesar pagos. Usá <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">TEST-...</code> para sandbox o <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">APP_USR-...</code> para producción.
                        </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold w-fit ${mpTokenConfigurado ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"}`}>
                        {mpTokenConfigurado ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {mpTokenConfigurado ? "Configurado" : "Sin token — pagos deshabilitados"}
                    </div>
                    <div className="relative">
                        <input type={showMpToken ? "text" : "password"} value={mpToken} onChange={(e) => setMpToken(e.target.value)}
                            placeholder={mpTokenConfigurado ? "Pegá un nuevo token para reemplazar" : "TEST-xxxx... o APP_USR-xxxx..."}
                            className="w-full h-11 px-4 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#009ee3]/40" />
                        <button type="button" onClick={() => setShowMpToken((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {showMpToken ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {mpTokenMsg && <div className={`flex items-center gap-2 text-[12px] font-bold ${mpTokenMsg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>{mpTokenMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{mpTokenMsg.texto}</div>}
                    <button onClick={() => saveKey("mpAccessToken", mpToken, setSavingMpToken, setMpTokenMsg, () => { setMpTokenConfigurado(true); setMpToken(""); })}
                        disabled={savingMpToken || !mpToken.trim()}
                        className="flex items-center gap-2 px-5 h-10 bg-[#009ee3] hover:bg-[#007eb5] text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95">
                        {savingMpToken ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                        {savingMpToken ? "Guardando..." : "Guardar Access Token"}
                    </button>
                </div>

                {/* Public Key */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            Public Key <span className="text-slate-300 dark:text-slate-600 normal-case font-normal">(opcional)</span>
                        </label>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Necesaria solo para Checkout Bricks. Por ahora no es requerida con Checkout Pro.</p>
                    </div>
                    {mpPublicKeyConfigurado && <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold w-fit bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={14} /> Configurada</div>}
                    <div className="relative">
                        <input type={showMpPublicKey ? "text" : "password"} value={mpPublicKey} onChange={(e) => setMpPublicKey(e.target.value)}
                            placeholder={mpPublicKeyConfigurado ? "Pegá una nueva key para reemplazar" : "TEST-xxxx... o APP_USR-xxxx... (opcional)"}
                            className="w-full h-11 px-4 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#009ee3]/40" />
                        <button type="button" onClick={() => setShowMpPublicKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {showMpPublicKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {mpPublicKeyMsg && <div className={`flex items-center gap-2 text-[12px] font-bold ${mpPublicKeyMsg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>{mpPublicKeyMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{mpPublicKeyMsg.texto}</div>}
                    <button onClick={() => saveKey("mpPublicKey", mpPublicKey, setSavingMpPublicKey, setMpPublicKeyMsg, () => { setMpPublicKeyConfigurado(!!mpPublicKey.trim()); setMpPublicKey(""); })}
                        disabled={savingMpPublicKey || !mpPublicKey.trim()}
                        className="flex items-center gap-2 px-5 h-10 bg-[#009ee3] hover:bg-[#007eb5] text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95">
                        {savingMpPublicKey ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                        {savingMpPublicKey ? "Guardando..." : "Guardar Public Key"}
                    </button>
                </div>
            </div>
            )}

            {/* ── PAYWAY ─────────────────────────────────────────────── */}
            {tab === "payway" && (
            <div className="space-y-4">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                    PayWay
                    <span className="w-4 h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                </h2>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 -mt-2">
                    Alternativa a MercadoPago: aparece junto a MercadoPago como opción de pago para el usuario.
                </p>

                {/* Ambiente — bien arriba y bien visible, es lo primero que hay que mirar */}
                <div className={`rounded-2xl border p-6 space-y-4 ${paywayAmbiente === "production" ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40" : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"}`}>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ambiente activo ahora mismo</label>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Define contra qué servidor de Payway se procesan los pagos reales, y cuál de las dos credenciales de abajo se usa.
                            </p>
                        </div>
                        <span className={`flex-shrink-0 text-[12px] font-black uppercase tracking-wide px-3 py-1 rounded-full ${paywayAmbiente === "production" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
                            {paywayAmbiente === "production" ? "Producción" : "Sandbox"}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={async () => {
                            setSavingPaywayAmbiente(true);
                            const res = await fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: "paywayAmbiente", valor: "developer" }) });
                            if (res.ok) setPaywayAmbiente("developer");
                            setSavingPaywayAmbiente(false);
                        }} disabled={savingPaywayAmbiente}
                            className={`flex-1 h-11 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50 ${paywayAmbiente === "developer" ? "bg-amber-500 text-white" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"}`}>
                            Sandbox (pruebas)
                        </button>
                        <button onClick={async () => {
                            setSavingPaywayAmbiente(true);
                            const res = await fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: "paywayAmbiente", valor: "production" }) });
                            if (res.ok) setPaywayAmbiente("production");
                            setSavingPaywayAmbiente(false);
                        }} disabled={savingPaywayAmbiente}
                            className={`flex-1 h-11 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50 ${paywayAmbiente === "production" ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"}`}>
                            Producción
                        </button>
                    </div>
                    {!paywayCredencialesCompletas && (
                        <p className="text-[12px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                            <AlertCircle size={13} /> Faltan credenciales de {paywayAmbiente === "production" ? "producción" : "sandbox"} — completalas abajo antes de habilitar secciones.
                        </p>
                    )}
                </div>

                {/* Credenciales — sandbox y producción por separado, cada una con lo suyo */}
                {([
                    { amb: "developer" as const, titulo: "Credenciales Sandbox", sufijo: "developer", color: "amber" as const,
                      config: { siteId: paywayConfigurado.siteIdSandbox, publicKey: paywayConfigurado.publicKeySandbox, secretKey: paywayConfigurado.secretKeySandbox } },
                    { amb: "production" as const, titulo: "Credenciales Producción", sufijo: "production", color: "emerald" as const,
                      config: { siteId: paywayConfigurado.siteIdProduccion, publicKey: paywayConfigurado.publicKeyProduccion, secretKey: paywayConfigurado.secretKeyProduccion } },
                ]).map(({ amb, titulo, sufijo, color, config }) => {
                    const activa = paywayAmbiente === amb;
                    return (
                        <div key={amb} className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 space-y-5 ${activa ? (color === "emerald" ? "border-emerald-200 dark:border-emerald-900/50" : "border-amber-200 dark:border-amber-900/50") : "border-slate-100 dark:border-slate-800 opacity-70"}`}>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{titulo}</label>
                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Te las da Payway al adherirte a venta online.</p>
                                </div>
                                <span className={`flex-shrink-0 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${activa ? (color === "emerald" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white") : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                                    {activa ? "● En uso ahora" : "Inactiva"}
                                </span>
                            </div>

                            <div className="pb-5 border-b border-slate-50 dark:border-slate-800">
                                <PaywayCredencialField clave={`paywaySiteId_${sufijo}`} label="Site ID" configurado={config.siteId} onSaved={cargarConfig} />
                            </div>
                            <div className="pb-5 border-b border-slate-50 dark:border-slate-800">
                                <PaywayCredencialField clave={`paywayPublicKey_${sufijo}`} label="Public Key" hint="tokeniza la tarjeta en el navegador" configurado={config.publicKey} secreto onSaved={cargarConfig} />
                            </div>
                            <PaywayCredencialField clave={`paywaySecretKey_${sufijo}`} label="Secret Key" hint="autoriza el pago desde el servidor" configurado={config.secretKey} secreto onSaved={cargarConfig} />
                        </div>
                    );
                })}

                {/* Secciones habilitadas — mismo patrón que transferencia bancaria */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Secciones habilitadas</label>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {paywayCredencialesCompletas
                                ? "Activá PayWay por sección. Por defecto todo está deshabilitado."
                                : `Completá las credenciales de ${paywayAmbiente === "production" ? "producción" : "sandbox"} de arriba para poder activar alguna sección.`}
                        </p>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {SECCIONES_PAYWAY.map(({ key, label }) => {
                            const enabled = secciones[key] ?? false;
                            const toggling = togglingKey === key;
                            const bloqueado = !paywayCredencialesCompletas && !enabled;
                            return (
                                <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                                    <button onClick={() => toggleSeccion(key, enabled)} disabled={toggling || bloqueado}
                                        title={bloqueado ? "Completá las credenciales primero" : undefined}
                                        className="flex items-center gap-2 text-[12px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                        {toggling ? <Loader2 size={18} className="animate-spin text-slate-400" /> :
                                            enabled
                                                ? <ToggleRight size={28} className="text-emerald-500" />
                                                : <ToggleLeft size={28} className="text-slate-300 dark:text-slate-600" />
                                        }
                                        <span className={enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                                            {enabled ? "Habilitado" : "Deshabilitado"}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            )}

            {/* ── TRANSFERENCIA ─────────────────────────────────────────────── */}
            {tab === "transferencia" && (
            <div className="space-y-4">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                    Transferencia bancaria
                    <span className="w-4 h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                </h2>

                {/* CBU y Alias */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <Landmark size={16} className="text-slate-400" />
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Datos bancarios</label>
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">El CBU y alias se mostrarán al usuario cuando elija pagar por transferencia.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold block mb-1.5">CBU</label>
                            <input type="text" value={cbu} onChange={(e) => setCbu(e.target.value)} placeholder="0000000000000000000000"
                                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-slate-400" />
                        </div>
                        <div>
                            <label className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold block mb-1.5">Alias</label>
                            <input type="text" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="MI.ENTIDAD.ALIAS"
                                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-slate-400" />
                        </div>
                    </div>
                    {bancoMsg && <div className={`flex items-center gap-2 text-[12px] font-bold ${bancoMsg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>{bancoMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{bancoMsg.texto}</div>}
                    <button onClick={saveBanco} disabled={savingBanco || (!cbu.trim() && !alias.trim())}
                        className="flex items-center gap-2 px-5 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95">
                        {savingBanco ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
                        {savingBanco ? "Guardando..." : "Guardar datos bancarios"}
                    </button>
                </div>

                {/* Toggles por sección */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Secciones habilitadas</label>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Activá la opción de transferencia por sección. Por defecto todo está deshabilitado.</p>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {SECCIONES.map(({ key, label }) => {
                            const enabled = secciones[key] ?? false;
                            const toggling = togglingKey === key;
                            return (
                                <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                                    <button onClick={() => toggleSeccion(key, enabled)} disabled={toggling}
                                        className="flex items-center gap-2 text-[12px] font-bold transition-colors disabled:opacity-50">
                                        {toggling ? <Loader2 size={18} className="animate-spin text-slate-400" /> :
                                            enabled
                                                ? <ToggleRight size={28} className="text-emerald-500" />
                                                : <ToggleLeft size={28} className="text-slate-300 dark:text-slate-600" />
                                        }
                                        <span className={enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                                            {enabled ? "Habilitado" : "Deshabilitado"}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}
