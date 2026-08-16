"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, Clock, MapPin, Loader2, CheckCircle2, AlertCircle, Building2, GraduationCap, Search } from "lucide-react";
import GuestMpPayButton from "@/components/cursos-publicos/GuestMpPayButton";
import GuestTransferenciaPayButton from "@/components/cursos-publicos/GuestTransferenciaPayButton";
import CursoFlyerButton from "@/components/cursos-publicos/CursoFlyerButton";
import PaywayCardForm, { PaywayTokenResult } from "@/components/pagos/PaywayCardForm";

interface Opcion {
    id: number;
    nombre: string;
    precio: number;
    cupo: number;
    inscritos: number;
    disponible: boolean;
}

interface Curso {
    id: number;
    titulo: string;
    descripcion: string;
    organizador: string | null;
    fecha: string;
    fechaFin: string | null;
    hora: string | null;
    lugar: string | null;
    imagen: string | null;
    modalidad: string;
    fechaLimiteInscripcion: string | null;
    opciones: Opcion[];
}

const UTC = { timeZone: "UTC" } as const;

function formatFecha(fecha: string, fechaFin: string | null): string {
    const ini = new Date(fecha);
    if (!fechaFin) return ini.toLocaleDateString("es-AR", { ...UTC, weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const fin = new Date(fechaFin);
    return `${ini.toLocaleDateString("es-AR", { ...UTC, day: "numeric", month: "long" })} al ${fin.toLocaleDateString("es-AR", { ...UTC, day: "numeric", month: "long", year: "numeric" })}`;
}

export default function CursoPublicoDetailPage() {
    const params = useParams();
    const [curso, setCurso] = useState<Curso | null>(null);
    const [transferenciaHabilitada, setTransferenciaHabilitada] = useState(false);
    const [mpDisponible, setMpDisponible] = useState(false);
    const [paywayHabilitado, setPaywayHabilitado] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [opcionSeleccionada, setOpcionSeleccionada] = useState<number | null>(null);
    const [form, setForm] = useState({ nombre: "", apellido: "", dni: "", email: "", telefono: "", direccion: "", localidad: "", provincia: "" });
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");
    const [inscripcion, setInscripcion] = useState<{ id: number; estado: string; monto: number } | null>(null);
    const [metodoPago, setMetodoPago] = useState<"elegir" | "payway">("elegir");
    const [paywayProcesando, setPaywayProcesando] = useState(false);
    const [paywayError, setPaywayError] = useState<string | null>(null);

    const [consultaDni, setConsultaDni] = useState("");
    const [consultando, setConsultando] = useState(false);
    const [consultaResult, setConsultaResult] = useState<{ inscripto: boolean; estado?: string; opcion?: string | null; comprobanteEnviado?: boolean } | null>(null);
    const [consultaError, setConsultaError] = useState("");

    useEffect(() => {
        fetch("/api/cursos")
            .then(r => r.json())
            .then((data: { cursos: Curso[]; transferenciaHabilitada: boolean; mpDisponible: boolean; paywayHabilitado: boolean }) => {
                setTransferenciaHabilitada(!!data.transferenciaHabilitada);
                setMpDisponible(!!data.mpDisponible);
                setPaywayHabilitado(!!data.paywayHabilitado);
                const found = data.cursos.find(c => c.id === Number(params.id));
                if (!found) { setNotFound(true); return; }
                setCurso(found);
                if (found.opciones.length === 1) setOpcionSeleccionada(found.opciones[0].id);
            })
            .finally(() => setLoading(false));
    }, [params.id]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!curso || !opcionSeleccionada) return;
        setError("");
        setEnviando(true);
        try {
            const res = await fetch("/api/cursos/inscribirse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cursoId: curso.id, opcionId: opcionSeleccionada, ...form }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Error al inscribirse"); return; }
            setInscripcion(data);
        } catch {
            setError("Error de conexión. Intentá de nuevo.");
        } finally {
            setEnviando(false);
        }
    }

    async function handlePaywayToken(result: PaywayTokenResult) {
        if (!inscripcion) return;
        setPaywayError(null);
        setPaywayProcesando(true);
        try {
            const res = await fetch("/api/cursos/pago/payway", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inscripcionId: inscripcion.id, ...result }),
            });
            const data = await res.json();
            if (!res.ok) { setPaywayError(data.error || "No se pudo procesar el pago."); return; }
            if (!data.aprobado) { setPaywayError(data.mensaje || "El pago fue rechazado."); return; }
            setInscripcion(prev => prev ? { ...prev, estado: "confirmada" } : prev);
        } catch {
            setPaywayError("Error de conexión. Intentá de nuevo.");
        } finally {
            setPaywayProcesando(false);
        }
    }

    async function handleConsultar(e: React.FormEvent) {
        e.preventDefault();
        if (!curso || !consultaDni.trim()) return;
        setConsultaError("");
        setConsultando(true);
        setConsultaResult(null);
        try {
            const res = await fetch(`/api/cursos/inscribirse?cursoId=${curso.id}&dni=${encodeURIComponent(consultaDni.trim())}`);
            const data = await res.json();
            if (!res.ok) { setConsultaError(data.error || "Error al consultar"); return; }
            setConsultaResult(data);
        } catch {
            setConsultaError("Error de conexión. Intentá de nuevo.");
        } finally {
            setConsultando(false);
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
            <Loader2 size={28} className="animate-spin text-slate-300" />
        </div>
    );

    if (notFound || !curso) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-3 px-4 text-center">
            <p className="text-slate-600 font-medium">Curso no encontrado o no disponible para inscripción pública.</p>
            <Link href="/cursos" className="text-[#063f68] text-sm font-semibold">Volver a cursos</Link>
        </div>
    );

    const opcionActual = curso.opciones.find(o => o.id === opcionSeleccionada);
    const vencida = curso.fechaLimiteInscripcion && new Date() > new Date(curso.fechaLimiteInscripcion);
    const formCompleto = form.nombre.trim() && form.apellido.trim() && form.dni.trim() && form.email.trim()
        && form.telefono.trim() && form.direccion.trim() && form.localidad.trim() && form.provincia.trim();

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="bg-[#063f68] px-6 py-6">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center p-1 shrink-0">
                        <Image src="/sgo_nuevo.png" alt="CPASF" width={36} height={36} className="object-contain" />
                    </div>
                    <p className="text-white font-bold text-[15px]">Colegio de la Abogacía · Santa Fe</p>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-8 space-y-5 pb-16">
                <Link href="/cursos" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-[14px] font-medium">
                    <ArrowLeft size={15} /> Volver a cursos
                </Link>

                {curso.imagen && (
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-slate-100">
                        <img src={curso.imagen} alt={curso.titulo} className="w-full h-full object-cover" />
                        <CursoFlyerButton imagen={curso.imagen} titulo={curso.titulo} />
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#063f68]/10 text-[#063f68] text-[11px] font-bold uppercase tracking-wider">
                        {curso.modalidad}
                    </span>
                    <h1 className="text-[19px] font-bold text-slate-800 leading-snug">{curso.titulo}</h1>
                    {curso.organizador && (
                        <p className="text-[13px] text-slate-500 flex items-center gap-1.5"><Building2 size={12} /> {curso.organizador}</p>
                    )}
                    <p className="text-[14px] text-slate-600 leading-relaxed">{curso.descripcion}</p>
                    <div className="grid sm:grid-cols-2 gap-2 pt-1">
                        <p className="flex items-center gap-2 text-[13px] text-slate-600"><Calendar size={13} className="text-[#063f68]" /> {formatFecha(curso.fecha, curso.fechaFin)}</p>
                        {curso.hora && <p className="flex items-center gap-2 text-[13px] text-slate-600"><Clock size={13} className="text-[#063f68]" /> {curso.hora} hs</p>}
                        {curso.lugar && <p className="flex items-center gap-2 text-[13px] text-slate-600"><MapPin size={13} className="text-[#063f68]" /> {curso.lugar}</p>}
                    </div>
                </div>

                {!inscripcion && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                        <h2 className="text-[13px] font-bold text-slate-700">¿Ya te habías inscripto? Consultá con tu DNI</h2>
                        <form onSubmit={handleConsultar} className="flex gap-2">
                            <input placeholder="DNI" value={consultaDni} onChange={e => { setConsultaDni(e.target.value); setConsultaResult(null); setConsultaError(""); }}
                                className="flex-1 h-10 px-4 rounded-xl border border-slate-200 text-[14px] text-slate-800 focus:ring-2 focus:ring-[#063f68] outline-none" />
                            <button type="submit" disabled={!consultaDni.trim() || consultando}
                                className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold transition-all disabled:opacity-50 flex items-center gap-1.5">
                                {consultando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Consultar
                            </button>
                        </form>
                        {consultaError && (
                            <p className="text-[12px] text-rose-500 flex items-center gap-1.5"><AlertCircle size={12} /> {consultaError}</p>
                        )}
                        {consultaResult && (
                            consultaResult.inscripto ? (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[13px] text-emerald-700">
                                    <CheckCircle2 size={14} className="flex-shrink-0" />
                                    Sí, estás inscripto ({consultaResult.opcion}) — {
                                        consultaResult.estado === "confirmada"
                                            ? "tu inscripción está confirmada."
                                            : consultaResult.comprobanteEnviado
                                                ? "recibimos tu comprobante y está pendiente de confirmación por el Colegio."
                                                : "todavía falta que completes el pago."
                                    }
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[13px] text-slate-500">
                                    <AlertCircle size={14} className="flex-shrink-0" /> No encontramos una inscripción con ese DNI para este curso.
                                </div>
                            )
                        )}
                    </div>
                )}

                {inscripcion ? (
                    inscripcion.estado === "confirmada" ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                            <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
                            <p className="text-[16px] font-black text-emerald-800">¡Listo, ya sos parte del curso! 🎉</p>
                            <p className="text-[13px] text-emerald-700">Te enviamos la confirmación a {form.email}. ¡Nos vemos ahí!</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Monto a abonar</p>
                                    <p className="text-2xl font-black text-slate-900">${inscripcion.monto.toLocaleString("es-AR")}</p>
                                </div>
                                {metodoPago === "elegir" && (
                                    <div className="flex flex-col gap-2 w-full sm:w-auto items-stretch mt-3 sm:mt-0">
                                        {mpDisponible && (
                                            <GuestMpPayButton
                                                inscripcionId={inscripcion.id}
                                                label="Pagar con Mercado Pago"
                                                className="w-full h-11 px-6 bg-[#063f68] hover:bg-[#0a4d7a] text-white rounded-xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            />
                                        )}
                                        {paywayHabilitado && (
                                            <button type="button" onClick={() => setMetodoPago("payway")}
                                                className="w-full h-11 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-[14px] transition-all flex items-center justify-center gap-2">
                                                Pagar con tarjeta
                                            </button>
                                        )}
                                        {transferenciaHabilitada && (
                                            <GuestTransferenciaPayButton
                                                inscripcionId={inscripcion.id}
                                                monto={inscripcion.monto}
                                                label="Pagar con transferencia"
                                                className="w-full h-11 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-[14px] transition-all flex items-center justify-center gap-2"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            {metodoPago === "payway" && (
                                <div className="space-y-2">
                                    <button type="button" onClick={() => { setMetodoPago("elegir"); setPaywayError(null); }}
                                        className="text-[12px] font-semibold text-slate-400 hover:text-slate-600">
                                        ← Elegir otro medio de pago
                                    </button>
                                    <PaywayCardForm
                                        seccion="curso"
                                        onToken={handlePaywayToken}
                                        procesando={paywayProcesando}
                                        error={paywayError}
                                        montoLabel={`$${inscripcion.monto.toLocaleString("es-AR")}`}
                                        facturacionInicial={{ direccion: form.direccion, ciudad: form.localidad, provincia: form.provincia }}
                                    />
                                </div>
                            )}

                            <p className="text-[12px] text-slate-500">Apenas se confirme el pago te avisamos por email.</p>
                        </div>
                    )
                ) : vencida ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-600">
                        <AlertCircle size={15} /> El período de inscripción ha cerrado.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                        <h2 className="text-[14px] font-bold text-slate-700">Tus datos</h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <input required placeholder="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                                className="h-11 px-4 rounded-xl border border-slate-200 text-[14px] text-slate-800 focus:ring-2 focus:ring-[#063f68] outline-none" />
                            <input required placeholder="Apellido" value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))}
                                className="h-11 px-4 rounded-xl border border-slate-200 text-[14px] text-slate-800 focus:ring-2 focus:ring-[#063f68] outline-none" />
                            <input required placeholder="DNI" value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))}
                                className="h-11 px-4 rounded-xl border border-slate-200 text-[14px] text-slate-800 focus:ring-2 focus:ring-[#063f68] outline-none" />
                            <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                className="h-11 px-4 rounded-xl border border-slate-200 text-[14px] text-slate-800 focus:ring-2 focus:ring-[#063f68] outline-none" />
                            <input required type="tel" placeholder="Celular" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                                className="h-11 px-4 rounded-xl border border-slate-200 text-[14px] text-slate-800 focus:ring-2 focus:ring-[#063f68] outline-none" />
                            <input required placeholder="Dirección" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
                                className="h-11 px-4 rounded-xl border border-slate-200 text-[14px] text-slate-800 focus:ring-2 focus:ring-[#063f68] outline-none" />
                            <input required placeholder="Localidad" value={form.localidad} onChange={e => setForm(f => ({ ...f, localidad: e.target.value }))}
                                className="h-11 px-4 rounded-xl border border-slate-200 text-[14px] text-slate-800 focus:ring-2 focus:ring-[#063f68] outline-none" />
                            <input required placeholder="Provincia" value={form.provincia} onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))}
                                className="h-11 px-4 rounded-xl border border-slate-200 text-[14px] text-slate-800 focus:ring-2 focus:ring-[#063f68] outline-none" />
                        </div>

                        {curso.opciones.length > 1 && (
                            <div className="space-y-2">
                                <h2 className="text-[14px] font-bold text-slate-700">Seleccioná una opción</h2>
                                {curso.opciones.map(op => (
                                    <button type="button" key={op.id}
                                        onClick={() => op.disponible && setOpcionSeleccionada(op.id)}
                                        disabled={!op.disponible}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${!op.disponible
                                            ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                                            : opcionSeleccionada === op.id ? "border-[#063f68] bg-[#063f68]/5" : "border-slate-200 hover:border-slate-300"}`}>
                                        <span className="text-[14px] font-semibold text-slate-700">{op.nombre}</span>
                                        <span className="text-[14px] font-bold text-slate-700">{op.precio === 0 ? "Gratuito" : `$${op.precio.toLocaleString("es-AR")}`}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-600">
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <button type="submit" disabled={!formCompleto || !opcionSeleccionada || enviando}
                            className="w-full h-11 bg-[#063f68] text-white rounded-xl text-[14px] font-bold hover:bg-[#0a4d7a] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {enviando ? (<><Loader2 size={15} className="animate-spin" /> Enviando...</>) : (
                                <><GraduationCap size={15} /> {opcionActual ? `Inscribirme${opcionActual.precio > 0 ? ` · $${opcionActual.precio.toLocaleString("es-AR")}` : " · Gratis"}` : "Inscribirme"}</>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
