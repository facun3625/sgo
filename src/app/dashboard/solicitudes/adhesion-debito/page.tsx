"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Library,
    CheckCircle2,
    FileText,
    ShieldCheck,
    Upload,
    Loader2,
    ArrowLeft,
    Info,
    AlertCircle,
    Clock,
    Banknote
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdhesionDebitoPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [existingAdhesion, setExistingAdhesion] = useState<{ pending: boolean; approved: boolean; cancelacionPendiente: boolean; rejected: boolean; motivoRechazo: string | null }>({ pending: false, approved: false, cancelacionPendiente: false, rejected: false, motivoRechazo: null });
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [showChangeForm, setShowChangeForm] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch("/api/user/pagos");
                const data = await res.json();
                setExistingAdhesion({
                    pending: data.hasDebitoEnTramite,
                    approved: data.hasDebitoAutomatico,
                    cancelacionPendiente: data.hasCancelacionPendiente ?? false,
                    rejected: data.hasDebitoRechazado ?? false,
                    motivoRechazo: data.motivoRechazoDebito ?? null,
                });
            } catch (error) {
                console.error("Error checking status:", error);
            } finally {
                setLoadingInitial(false);
            }
        };
        checkStatus();
    }, []);

    // Form state
    const [tipoAdhesion, setTipoAdhesion] = useState("");
    const [terminosAceptados, setTerminosAceptados] = useState(false);
    const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
    const [showScrollWarning, setShowScrollWarning] = useState(false);

    // Files state
    const [dniFrontal, setDniFrontal] = useState<File | null>(null);
    const [constanciaCbu, setConstanciaCbu] = useState<File | null>(null);
    const [frontalTarjeta, setFrontalTarjeta] = useState<File | null>(null);

    // Previews
    const [previews, setPreviews] = useState<{ [key: string]: string }>({});

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (key === "dni") setDniFrontal(file);
            if (key === "cbu") setConstanciaCbu(file);
            if (key === "tarjeta") setFrontalTarjeta(file);

            if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
                // PDFs can't be previewed as images — store a sentinel
                setPreviews(prev => ({ ...prev, [key]: "__pdf__" }));
            } else {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviews(prev => ({ ...prev, [key]: reader.result as string }));
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("tipoAdhesion", tipoAdhesion);
            formData.append("terminosAceptados", String(terminosAceptados));

            if (dniFrontal) formData.append("dniFrontal", dniFrontal);
            if (constanciaCbu) formData.append("constanciaCbu", constanciaCbu);
            if (frontalTarjeta) formData.append("frontalTarjeta", frontalTarjeta);

            const res = await fetch("/api/user/adhesion-debito", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                setSubmitted(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error("Error al enviar adhesión:", error);
            alert("Error de conexión. Reintente por favor.");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 1 && !tipoAdhesion) return;
        if (step === 2 && !terminosAceptados) return;
        setStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const prevStep = () => {
        setStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (submitted) {
        return (
            <div className="bg-white dark:bg-[#02182b] transition-colors duration-300">
                <div className="p-6 md:p-12 animate-fade-in text-center space-y-8">
                    <div className="w-24 h-24 bg-emerald-500 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                        <CheckCircle2 size={48} />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">¡Solicitud Registrada!</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
                            Tu adhesión al débito automático para {tipoAdhesion} ha sido enviada con éxito y está pendiente de revisión.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="px-10 h-14 bg-[#063f68] dark:bg-blue-600 text-white rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#02182b] pb-20 transition-colors duration-300">
            {/* Header Sticky */}
            <div className="sticky top-16 z-10 bg-white/80 dark:bg-[#02182b]/80 backdrop-blur-md flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                    >
                        <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Banknote size={18} className="text-cyan-500" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Adhesión a Débito Automático</h2>
                    </div>
                </div>

                {/* Visual Steps Indicator */}
                <div className="hidden md:flex items-center gap-6">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step === s ? "bg-[#063f68] text-white" :
                                step > s ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                }`}>
                                {step > s ? <CheckCircle2 size={12} /> : s}
                            </div>
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${step === s ? "text-black dark:text-white" : "text-slate-400"
                                }`}>
                                {s === 1 ? "Adhesión" : s === 2 ? "Términos" : "Datos"}
                            </span>
                            {s < 3 && <div className="w-8 h-[1px] bg-slate-100 dark:bg-slate-800" />}
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-6 md:p-10 animate-fade-in w-full">

                {loadingInitial && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 size={32} className="text-[#063f68] animate-spin" />
                        <p className="text-slate-500 font-medium">Verificando estado de adhesión...</p>
                    </div>
                )}

                {!loadingInitial && existingAdhesion.pending && (
                    <div className="mb-10 p-8 rounded-[32px] bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex flex-col md:flex-row items-center gap-6 animate-slide-up">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                            <Clock size={32} />
                        </div>
                        <div className="space-y-1 text-center md:text-left">
                            <h3 className="text-amber-900 dark:text-amber-400 font-bold text-xl tracking-tight">Solicitud en Trámite</h3>
                            <p className="text-amber-700/70 dark:text-amber-400/60 text-sm font-medium">Usted ya posee una solicitud de adhesión a débito automático en proceso de aprobación. Le notificaremos cuando el trámite se complete.</p>
                        </div>
                    </div>
                )}

                {!loadingInitial && existingAdhesion.rejected && (
                    <div className="mb-10 p-8 rounded-[32px] bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex flex-col md:flex-row items-start gap-6 animate-slide-up">
                        <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                            <AlertCircle size={32} />
                        </div>
                        <div className="space-y-2 flex-1">
                            <h3 className="text-rose-900 dark:text-rose-400 font-bold text-xl tracking-tight">Solicitud Rechazada</h3>
                            <p className="text-rose-700/70 dark:text-rose-400/60 text-sm font-medium">
                                Tu última solicitud de adhesión fue rechazada.
                                {existingAdhesion.motivoRechazo && (
                                    <span className="block mt-1 font-semibold text-rose-800 dark:text-rose-300">
                                        Motivo: {existingAdhesion.motivoRechazo}
                                    </span>
                                )}
                            </p>
                            <p className="text-rose-600/60 dark:text-rose-400/50 text-sm">Podés enviar una nueva solicitud a continuación.</p>
                        </div>
                    </div>
                )}

                {!loadingInitial && existingAdhesion.approved && !showChangeForm && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="p-8 rounded-[32px] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex flex-col md:flex-row items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                                <CheckCircle2 size={32} />
                            </div>
                            <div className="space-y-1 text-center md:text-left flex-1">
                                <h3 className="text-emerald-900 dark:text-emerald-400 font-bold text-xl tracking-tight">Ya se encuentra Adherido</h3>
                                <p className="text-emerald-700/70 dark:text-emerald-400/60 text-sm font-medium">Actualmente se encuentra adherido al débito automático.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowChangeForm(true)}
                            className="w-full md:w-auto p-6 rounded-[24px] border-2 border-[#063f68]/20 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 hover:border-[#063f68] dark:hover:border-blue-500 text-left transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#063f68] text-white flex items-center justify-center mb-4">
                                <CreditCard size={20} />
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Cambiar método de pago</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Actualizá tu CBU o tarjeta vinculada.</p>
                        </button>
                    </div>
                )}

                {!loadingInitial && !existingAdhesion.pending && (!existingAdhesion.approved || showChangeForm || existingAdhesion.rejected) && (
                    <>
                        {/* Step 1: Selección de Medio */}
                        {step === 1 && (
                            <div className="space-y-8 animate-slide-up">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Adhiero mediante</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Seleccione el método por el cual desea realizar el débito automático de sus cuotas.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button
                                        onClick={() => setTipoAdhesion("CBU")}
                                        className={`group p-8 rounded-[32px] border-2 text-left transition-all ${tipoAdhesion === "CBU"
                                            ? "border-[#063f68] bg-blue-50/50 dark:border-blue-500 dark:bg-blue-500/5"
                                            : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                                            }`}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all ${tipoAdhesion === "CBU" ? "bg-[#063f68] text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                                            }`}>
                                            <Library size={28} />
                                        </div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">Débito en cuenta bancaria</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Uso de CBU de cualquier banco de la red.</p>
                                    </button>

                                    <button
                                        onClick={() => setTipoAdhesion("Tarjeta")}
                                        className={`group p-8 rounded-[32px] border-2 text-left transition-all ${tipoAdhesion === "Tarjeta"
                                            ? "border-[#063f68] bg-blue-50/50 dark:border-blue-500 dark:bg-blue-500/5"
                                            : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                                            }`}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all ${tipoAdhesion === "Tarjeta" ? "bg-[#063f68] text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                                            }`}>
                                            <CreditCard size={28} />
                                        </div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">Debito Tarjeta de Credito Visa</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Débito directo sobre el resumen de cuenta.</p>
                                    </button>
                                </div>

                                <div className="flex justify-end pt-8">
                                    <button
                                        onClick={nextStep}
                                        disabled={!tipoAdhesion}
                                        className="h-14 px-10 bg-[#063f68] dark:bg-blue-600 disabled:opacity-30 text-white rounded-2xl font-bold text-sm flex items-center gap-3 transition-all transform active:scale-95"
                                    >
                                        Siguiente
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Términos y Condiciones */}
                        {step === 2 && (
                            <div className="space-y-4 animate-slide-up">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Términos y Condiciones</h3>
                                    <div className="relative">
                                    <div
                                        className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[12px] leading-relaxed max-h-[220px] overflow-y-auto font-medium space-y-3 custom-scrollbar"
                                        onScroll={(e) => {
                                            const el = e.currentTarget;
                                            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
                                            if (atBottom) setHasScrolledTerms(true);
                                        }}
                                    >
                                        <p className="font-bold text-slate-900 dark:text-slate-200">Reconozco y acepto en forma irrevocable los términos y condiciones de adhesión débito automático en cuenta bancaria o tarjeta de crédito de las CUOTAS DE MATRICULAS MENSUALES del COLEGIO DE PROFESIONALES DE LA ABOGACÍA DE SANTA FE DE LA PRIMERA CIRCUNSCRIPCIÓN (en adelante "CPASF"), devengadas por mi condición de MATRICULADO, que se regirá por las siguientes condiciones y declaraciones:</p>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li>Autorizo a que los importes de "las cuotas" se debiten el día de su vencimiento y en la medida que las mismas sean remitidas por el "CPASF", de la cuenta bancaria y/o tarjeta de crédito denunciada ante el "CPASF" a través del sistema SGO.</li>
                                            <li>Declaro que, a los fines de lograr el efectivo débito de "las cuotas", adjuntaré archivo JPG o PDF de la comunicación digital emitida por el Banco donde poseo la cuenta bancaria informando la CBU para el caso de adhesión en cuenta bancaria, y/o archivo JPG o PDF del anverso y reverso de la tarjeta de crédito, para el caso de adhesión por dicho medio.</li>
                                            <li>Autorizo a presentar el producto bancario para el débito automático ante las entidades financieras y/o sistema de tarjetas de créditos correspondientes para efectivizar los débitos correspondientes de "las cuotas".</li>
                                            <li>Declaro que para el caso que el producto bancario denunciado no sea de mi titularidad, me comprometo a solicitar al titular de dicho producto que remita un mail al "CPASF" autorizando expresamente la utilización de dicho producto bancario, a los fines del pago de "las cuotas" devengadas por mi condición de MATRICULADO.</li>
                                            <li>Me comprometo de modo irrevocable a adoptar las previsiones necesarias para tener saldo suficiente en mi cuenta bancaria y/o la tarjeta de crédito vigente, el día hábil bancario anterior a cada vencimiento de la fecha para el pago de "las cuotas", sin perjuicio de la efectiva recepción o no de la/s misma/s.</li>
                                            <li>Para el caso de no haber saldo suficiente en mi cuenta bancaria, autorizo a debitar las sumas adeudadas al momento que la cuenta bancaria posea saldo positivo o acreedor y/o me comprometo a abonar en forma personal "las cuotas", no canceladas, en la Tesorería del "CPASF".</li>
                                            <li>Me comprometo a informar, con la suficiente antelación y por medio fehaciente de comunicación, cualquier modificación de la tarjeta de crédito por renovación del plástico, a los efectos de garantizar el débito de "las cuotas" y/ o abonar en forma personal "las cuotas", no canceladas, en la Tesorería del "CPASF".</li>
                                        </ul>
                                        <p className="font-bold text-slate-900 dark:text-slate-200 text-[13px]">Manifiesto conocer y aceptar las condiciones de suspensión y/o reversión de débitos que se detallan a continuación:</p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>a) La suspensión de un débito puede ordenarse al Banco donde reside la cuenta de débito hasta el día hábil anterior - inclusive - a la fecha de vencimiento y la alternativa de revertir débitos por el total de cada operación.</li>
                                            <li>b) Dentro de los 30 días corridos, contados desde la fecha del débito, se podrá solicitar la reversión.</li>
                                        </ul>
                                        <p>La presente autorización tiene validez desde la fecha de la aceptación de los presentes términos y condiciones a través de firma electrónica por el Sistema SGO, hasta tanto medie comunicación fehaciente de mi parte de revocarla.</p>
                                    </div>
                                    {/* Indicador de scroll */}
                                    {!hasScrolledTerms && (
                                        <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none rounded-b-2xl bg-gradient-to-t from-slate-100 dark:from-slate-900 to-transparent flex items-end justify-center pb-2">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 animate-bounce">
                                                <ChevronRight size={12} className="rotate-90" /> Desplazá para leer todo
                                            </span>
                                        </div>
                                    )}
                                    </div>
                                </div>

                                <label
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                        hasScrolledTerms
                                            ? "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer"
                                            : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 cursor-not-allowed opacity-60"
                                    }`}
                                    onClick={(e) => {
                                        if (!hasScrolledTerms) {
                                            e.preventDefault();
                                            setShowScrollWarning(true);
                                        }
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={terminosAceptados}
                                        disabled={!hasScrolledTerms}
                                        onChange={(e) => {
                                            if (hasScrolledTerms) setTerminosAceptados(e.target.checked);
                                        }}
                                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-[#063f68] focus:ring-[#063f68] disabled:cursor-not-allowed"
                                    />
                                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">He leído y acepto los términos y condiciones irrevocablemente</span>
                                </label>
                                {showScrollWarning && !hasScrolledTerms && (
                                    <p className="text-[12px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-2">
                                        <AlertCircle size={14} />
                                        Debés leer todos los términos antes de aceptar.
                                    </p>
                                )}

                                <div className="flex justify-between pt-4">
                                    <button
                                        onClick={prevStep}
                                        className="h-12 px-6 border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-black dark:hover:text-white rounded-xl font-bold text-xs flex items-center gap-3 transition-all"
                                    >
                                        <ArrowLeft size={16} />
                                        Atrás
                                    </button>
                                    <button
                                        onClick={nextStep}
                                        disabled={!terminosAceptados}
                                        className="h-12 px-8 bg-[#063f68] dark:bg-blue-600 disabled:opacity-30 text-white rounded-xl font-bold text-xs flex items-center gap-3 transition-all transform active:scale-95"
                                    >
                                        Siguiente
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Datos y Archivos */}
                        {step === 3 && (
                            <div className="space-y-8 animate-slide-up">
                                <div className="p-6 rounded-[32px] bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 flex items-center gap-4">
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-blue-500 shadow-sm shrink-0">
                                        <Info size={20} />
                                    </div>
                                    <p className="text-sm text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                                        Por favor, adjunte la documentación requerida para procesar su adhesión mediante <strong>{tipoAdhesion === "CBU" ? "cuenta bancaria" : "tarjeta Visa"}</strong>.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* DNI Frontal - Siempre necesario */}
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto DNI frontal</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*,application/pdf"
                                                onChange={(e) => handleFileChange(e, "dni")}
                                                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                            />
                                            <div className={`h-40 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${dniFrontal ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                                                }`}>
                                                {previews.dni === "__pdf__" ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                        <FileText size={32} className="text-blue-400" />
                                                        <span className="text-[11px] font-bold text-emerald-600">{dniFrontal?.name}</span>
                                                    </div>
                                                ) : previews.dni ? (
                                                    <div className="w-full h-full p-2 relative">
                                                        <img src={previews.dni} className="w-full h-full object-cover rounded-2xl" alt="DNI Preview" />
                                                        <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Upload size={24} className="text-white drop-shadow-lg" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Upload size={24} className="text-slate-300 group-hover:text-[#063f68] transition-colors" />
                                                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">Seleccionar archivo</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {dniFrontal && <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> {dniFrontal.name}</p>}
                                    </div>

                                    {/* Condicional según medio */}
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                            {tipoAdhesion === "CBU" ? "Constancia de CBU (Home Banking)" : "Foto frontal de la tarjeta"}
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*,application/pdf"
                                                onChange={(e) => handleFileChange(e, tipoAdhesion === "CBU" ? "cbu" : "tarjeta")}
                                                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                            />
                                            <div className={`h-40 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${(constanciaCbu || frontalTarjeta) ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                                                }`}>
                                                {previews[tipoAdhesion === "CBU" ? "cbu" : "tarjeta"] === "__pdf__" ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                        <FileText size={32} className="text-blue-400" />
                                                        <span className="text-[11px] font-bold text-emerald-600">{(constanciaCbu || frontalTarjeta)?.name}</span>
                                                    </div>
                                                ) : previews[tipoAdhesion === "CBU" ? "cbu" : "tarjeta"] ? (
                                                    <div className="w-full h-full p-2 relative">
                                                        <img src={previews[tipoAdhesion === "CBU" ? "cbu" : "tarjeta"]} className="w-full h-full object-cover rounded-2xl" alt="File Preview" />
                                                        <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Upload size={24} className="text-white drop-shadow-lg" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Upload size={24} className="text-slate-300 group-hover:text-[#063f68] transition-colors" />
                                                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">Seleccionar archivo</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {(constanciaCbu || frontalTarjeta) && (
                                            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                <CheckCircle2 size={10} /> {(constanciaCbu || frontalTarjeta)?.name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between pt-8">
                                    <button
                                        onClick={prevStep}
                                        className="h-14 px-8 border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-black dark:hover:text-white rounded-2xl font-bold text-sm flex items-center gap-3 transition-all"
                                    >
                                        <ArrowLeft size={18} />
                                        Atrás
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading || !dniFrontal || (!constanciaCbu && !frontalTarjeta)}
                                        className="h-14 px-12 bg-[#063f68] dark:bg-blue-600 disabled:opacity-30 text-white rounded-2xl font-bold text-sm flex items-center gap-3 transition-all transform active:scale-95 shadow-xl shadow-blue-500/10"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Registrando adhesión...
                                            </>
                                        ) : (
                                            <>
                                                Confirmar Adhesión
                                                <CheckCircle2 size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
