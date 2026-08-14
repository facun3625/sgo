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

export default function ConfigPagosPage() {
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
    // PayWay
    const [paywaySiteIdConfigurado, setPaywaySiteIdConfigurado] = useState(false);
    const [paywaySiteId, setPaywaySiteId] = useState("");
    const [savingPaywaySiteId, setSavingPaywaySiteId] = useState(false);
    const [paywaySiteIdMsg, setPaywaySiteIdMsg] = useState<Msg>(null);
    const [paywayPublicKeyConfigurado, setPaywayPublicKeyConfigurado] = useState(false);
    const [paywayPublicKey, setPaywayPublicKey] = useState("");
    const [showPaywayPublicKey, setShowPaywayPublicKey] = useState(false);
    const [savingPaywayPublicKey, setSavingPaywayPublicKey] = useState(false);
    const [paywayPublicKeyMsg, setPaywayPublicKeyMsg] = useState<Msg>(null);
    const [paywaySecretKeyConfigurado, setPaywaySecretKeyConfigurado] = useState(false);
    const [paywaySecretKey, setPaywaySecretKey] = useState("");
    const [showPaywaySecretKey, setShowPaywaySecretKey] = useState(false);
    const [savingPaywaySecretKey, setSavingPaywaySecretKey] = useState(false);
    const [paywaySecretKeyMsg, setPaywaySecretKeyMsg] = useState<Msg>(null);
    const [paywayAmbiente, setPaywayAmbiente] = useState<"developer" | "production">("developer");
    const [savingPaywayAmbiente, setSavingPaywayAmbiente] = useState(false);
    // Transferencia
    const [cbu, setCbu] = useState("");
    const [alias, setAlias] = useState("");
    const [savingBanco, setSavingBanco] = useState(false);
    const [bancoMsg, setBancoMsg] = useState<Msg>(null);
    const [secciones, setSecciones] = useState<Record<string, boolean>>({});
    const [togglingKey, setTogglingKey] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/config/pagos")
            .then((r) => r.json())
            .then((d) => {
                setMpTokenConfigurado(!!d.mpTokenConfigurado);
                setMpPublicKeyConfigurado(!!d.mpPublicKeyConfigurado);
                setPaywaySiteIdConfigurado(!!d.paywaySiteIdConfigurado);
                setPaywayPublicKeyConfigurado(!!d.paywayPublicKeyConfigurado);
                setPaywaySecretKeyConfigurado(!!d.paywaySecretKeyConfigurado);
                setPaywayAmbiente(d.paywayAmbiente === "production" ? "production" : "developer");
                setCbu(d.cbu ?? "");
                setAlias(d.alias ?? "");
                const s: Record<string, boolean> = {};
                SECCIONES.forEach(({ key }) => { s[key] = !!d[key]; });
                setSecciones(s);
            })
            .finally(() => setLoading(false));
    }, []);

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

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-400" /></div>;

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#009ee3]/10 flex items-center justify-center">
                    <KeyRound size={20} className="text-[#009ee3]" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Métodos de Pago</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">MercadoPago y transferencia bancaria</p>
                </div>
            </div>

            {/* ── MERCADO PAGO ─────────────────────────────────────────────── */}
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

            {/* ── PAYWAY ─────────────────────────────────────────────── */}
            <div className="space-y-4">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                    PayWay
                    <span className="w-4 h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                </h2>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 -mt-2">
                    Alternativa a MercadoPago. Se muestra como opción de pago en todos los flujos (matrícula, deudas, cursos, ventas) apenas estén las tres credenciales configuradas.
                </p>

                {/* Ambiente */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Ambiente</label>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Definí contra qué servidor de Payway se procesan los pagos. Las credenciales de abajo tienen que corresponder al mismo ambiente.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={async () => {
                            setSavingPaywayAmbiente(true);
                            const res = await fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: "paywayAmbiente", valor: "developer" }) });
                            if (res.ok) setPaywayAmbiente("developer");
                            setSavingPaywayAmbiente(false);
                        }} disabled={savingPaywayAmbiente}
                            className={`flex-1 h-11 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50 ${paywayAmbiente === "developer" ? "bg-amber-500 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"}`}>
                            Sandbox (pruebas)
                        </button>
                        <button onClick={async () => {
                            setSavingPaywayAmbiente(true);
                            const res = await fetch("/api/admin/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: "paywayAmbiente", valor: "production" }) });
                            if (res.ok) setPaywayAmbiente("production");
                            setSavingPaywayAmbiente(false);
                        }} disabled={savingPaywayAmbiente}
                            className={`flex-1 h-11 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50 ${paywayAmbiente === "production" ? "bg-emerald-500 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"}`}>
                            Producción
                        </button>
                    </div>
                </div>

                {/* Site ID */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Site ID</label>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Identifica tu comercio en Payway.</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold w-fit ${paywaySiteIdConfigurado ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"}`}>
                        {paywaySiteIdConfigurado ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {paywaySiteIdConfigurado ? "Configurado" : "Sin configurar"}
                    </div>
                    <input type="text" value={paywaySiteId} onChange={(e) => setPaywaySiteId(e.target.value)}
                        placeholder={paywaySiteIdConfigurado ? "Pegá un nuevo Site ID para reemplazar" : "Ej: 00000000000"}
                        className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-slate-400" />
                    {paywaySiteIdMsg && <div className={`flex items-center gap-2 text-[12px] font-bold ${paywaySiteIdMsg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>{paywaySiteIdMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{paywaySiteIdMsg.texto}</div>}
                    <button onClick={() => saveKey("paywaySiteId", paywaySiteId, setSavingPaywaySiteId, setPaywaySiteIdMsg, () => { setPaywaySiteIdConfigurado(true); setPaywaySiteId(""); })}
                        disabled={savingPaywaySiteId || !paywaySiteId.trim()}
                        className="flex items-center gap-2 px-5 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95">
                        {savingPaywaySiteId ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                        {savingPaywaySiteId ? "Guardando..." : "Guardar Site ID"}
                    </button>
                </div>

                {/* Public Key */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Public Key</label>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Se usa en el navegador del usuario para tokenizar la tarjeta.</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold w-fit ${paywayPublicKeyConfigurado ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"}`}>
                        {paywayPublicKeyConfigurado ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {paywayPublicKeyConfigurado ? "Configurada" : "Sin configurar"}
                    </div>
                    <div className="relative">
                        <input type={showPaywayPublicKey ? "text" : "password"} value={paywayPublicKey} onChange={(e) => setPaywayPublicKey(e.target.value)}
                            placeholder={paywayPublicKeyConfigurado ? "Pegá una nueva key para reemplazar" : "Public API Key"}
                            className="w-full h-11 px-4 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-slate-400" />
                        <button type="button" onClick={() => setShowPaywayPublicKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {showPaywayPublicKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {paywayPublicKeyMsg && <div className={`flex items-center gap-2 text-[12px] font-bold ${paywayPublicKeyMsg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>{paywayPublicKeyMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{paywayPublicKeyMsg.texto}</div>}
                    <button onClick={() => saveKey("paywayPublicKey", paywayPublicKey, setSavingPaywayPublicKey, setPaywayPublicKeyMsg, () => { setPaywayPublicKeyConfigurado(true); setPaywayPublicKey(""); })}
                        disabled={savingPaywayPublicKey || !paywayPublicKey.trim()}
                        className="flex items-center gap-2 px-5 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95">
                        {savingPaywayPublicKey ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                        {savingPaywayPublicKey ? "Guardando..." : "Guardar Public Key"}
                    </button>
                </div>

                {/* Secret Key */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Secret Key</label>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Clave privada del servidor para autorizar los pagos. Nunca se expone al navegador.</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold w-fit ${paywaySecretKeyConfigurado ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"}`}>
                        {paywaySecretKeyConfigurado ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {paywaySecretKeyConfigurado ? "Configurada — pagos habilitados" : "Sin configurar — pagos deshabilitados"}
                    </div>
                    <div className="relative">
                        <input type={showPaywaySecretKey ? "text" : "password"} value={paywaySecretKey} onChange={(e) => setPaywaySecretKey(e.target.value)}
                            placeholder={paywaySecretKeyConfigurado ? "Pegá una nueva key para reemplazar" : "Secret / Private API Key"}
                            className="w-full h-11 px-4 pr-11 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-slate-400" />
                        <button type="button" onClick={() => setShowPaywaySecretKey((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            {showPaywaySecretKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {paywaySecretKeyMsg && <div className={`flex items-center gap-2 text-[12px] font-bold ${paywaySecretKeyMsg.tipo === "success" ? "text-emerald-500" : "text-red-500"}`}>{paywaySecretKeyMsg.tipo === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{paywaySecretKeyMsg.texto}</div>}
                    <button onClick={() => saveKey("paywaySecretKey", paywaySecretKey, setSavingPaywaySecretKey, setPaywaySecretKeyMsg, () => { setPaywaySecretKeyConfigurado(true); setPaywaySecretKey(""); })}
                        disabled={savingPaywaySecretKey || !paywaySecretKey.trim()}
                        className="flex items-center gap-2 px-5 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-[13px] font-bold disabled:opacity-40 transition-all active:scale-95">
                        {savingPaywaySecretKey ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                        {savingPaywaySecretKey ? "Guardando..." : "Guardar Secret Key"}
                    </button>
                </div>
            </div>

            {/* ── TRANSFERENCIA ─────────────────────────────────────────────── */}
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
        </div>
    );
}
