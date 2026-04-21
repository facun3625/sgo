"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, MapPin, Users, GraduationCap, Loader2, CheckCircle2, AlertCircle, Building2, ScanLine, Download, Award } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import MpPayButton from "@/components/MpPayButton";
import TransferenciaPayButton from "@/components/TransferenciaPayButton";

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
    tipoAsistencia: string;
    opciones: Opcion[];
    inscripcion: { id: number; cursoId: number; opcionId: number | null; estado: string } | null;
}

function CertificadoCard({ cursoId, onDescargar, descargando }: { cursoId: number; onDescargar: () => void; descargando: boolean }) {
    const [estado, setEstado] = useState<"loading" | "disponible" | "no_disponible">("loading");

    useEffect(() => {
        fetch(`/api/user/cursos/${cursoId}/certificado`)
            .then(r => r.json())
            .then(d => setEstado(d.certificado ? "disponible" : "no_disponible"))
            .catch(() => setEstado("no_disponible"));
    }, [cursoId]);

    if (estado === "loading" || estado === "no_disponible") return null;

    return (
        <div className="flex items-center gap-4 px-4 py-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                <Award size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-emerald-800 dark:text-emerald-300">Certificado disponible</p>
                <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">Tu certificado fue emitido</p>
            </div>
            <button onClick={onDescargar} disabled={descargando}
                className="flex items-center gap-1.5 px-3 h-8 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-all disabled:opacity-60 flex-shrink-0">
                {descargando ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                {descargando ? "Generando..." : "Descargar"}
            </button>
        </div>
    );
}

const UTC = { timeZone: "UTC" } as const;

function formatFecha(fecha: string, fechaFin: string | null): string {
    const ini = new Date(fecha);
    if (!fechaFin) {
        return ini.toLocaleDateString("es-AR", { ...UTC, weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    const fin = new Date(fechaFin);
    const mismoMes = ini.getUTCMonth() === fin.getUTCMonth() && ini.getUTCFullYear() === fin.getUTCFullYear();
    if (mismoMes) {
        return `${ini.getUTCDate()} al ${fin.toLocaleDateString("es-AR", { ...UTC, day: "numeric", month: "long", year: "numeric" })}`;
    }
    return `${ini.toLocaleDateString("es-AR", { ...UTC, day: "numeric", month: "long" })} al ${fin.toLocaleDateString("es-AR", { ...UTC, day: "numeric", month: "long", year: "numeric" })}`;
}

export default function CursoDetailPage() {
    const params = useParams();
    const [curso, setCurso] = useState<Curso | null>(null);
    const [transferenciaHabilitada, setTransferenciaHabilitada] = useState(false);
    const [loading, setLoading] = useState(true);
    const [opcionSeleccionada, setOpcionSeleccionada] = useState<number | null>(null);
    const [inscribiendo, setInscribiendo] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [expediente, setExpediente] = useState("");
    const [descargando, setDescargando] = useState(false);

    useEffect(() => {
        fetch("/api/user/cursos")
            .then(r => r.json())
            .then((data: { cursos: Curso[]; transferenciaHabilitada: boolean; expediente: string }) => {
                setTransferenciaHabilitada(!!data.transferenciaHabilitada);
                setExpediente(data.expediente ?? "");
                const found = data.cursos.find(c => c.id === Number(params.id));
                if (found) {
                    setCurso(found);
                    if (found.opciones.length === 1) setOpcionSeleccionada(found.opciones[0].id);
                }
            })
            .finally(() => setLoading(false));
    }, [params.id]);

    async function handleDescargarCertificado() {
        if (!curso) return;
        setDescargando(true);
        try {
            const res = await fetch(`/api/user/cursos/${curso.id}/certificado`);
            const data = await res.json();
            if (!data.certificado) return;
            const { generarCertificadoPdf } = await import("@/lib/certificadoPdf");
            await generarCertificadoPdf({
                alumno: data.alumno,
                curso: data.curso,
                firmas: data.firmas,
                emitidoAt: data.certificado.emitidoAt,
            });
        } finally {
            setDescargando(false);
        }
    }

    async function handleInscribirse() {
        if (!opcionSeleccionada || !curso) return;
        setError("");
        setInscribiendo(true);
        try {
            const res = await fetch("/api/user/cursos/inscribirse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cursoId: curso.id, opcionId: opcionSeleccionada }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Error al inscribirse");
                return;
            }
            setSuccess(true);
            // Refresh course data
            const updated = await fetch("/api/user/cursos").then(r => r.json());
            const found = updated.cursos?.find((c: Curso) => c.id === Number(params.id));
            if (found) setCurso(found);
        } catch {
            setError("Error de conexión. Intentá de nuevo.");
        } finally {
            setInscribiendo(false);
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-slate-300" />
        </div>
    );

    if (!curso) return (
        <div className="p-8 text-center">
            <p className="text-slate-400">Curso no encontrado.</p>
            <Link href="/dashboard/cursos" className="text-[#063f68] text-sm font-semibold mt-2 inline-block">Volver a cursos</Link>
        </div>
    );

    const vencida = curso.fechaLimiteInscripcion && new Date() > new Date(curso.fechaLimiteInscripcion);
    const yaInscrito = !!curso.inscripcion;
    const opcionActual = curso.opciones.find(o => o.id === opcionSeleccionada);

    const estadoBadge: Record<string, { label: string; cls: string }> = {
        confirmada: { label: "Inscripción confirmada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" },
        pendiente_pago: { label: "Pendiente de pago", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
    };

    return (
        <div className="p-4 md:p-8 space-y-5 pb-10">
            {/* Back */}
            <Link href="/dashboard/cursos"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-[13px] font-medium">
                <ArrowLeft size={15} /> Volver a cursos
            </Link>

            {/* Imagen */}
            {curso.imagen && (
                <div className="w-full h-48 md:h-56 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img src={curso.imagen} alt={curso.titulo} className="w-full h-full object-cover" />
                </div>
            )}

            {/* Info principal */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-start gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#063f68]/10 text-[#063f68] dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                                {curso.modalidad}
                            </span>
                        </div>
                        <h1 className="text-[17px] font-bold text-slate-800 dark:text-white leading-snug">{curso.titulo}</h1>
                        {curso.organizador && (
                            <p className="text-[12px] text-slate-400 mt-1 flex items-center gap-1.5">
                                <Building2 size={12} /> {curso.organizador}
                            </p>
                        )}
                    </div>
                </div>

                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">{curso.descripcion}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-2.5 text-[12px] text-slate-500 dark:text-slate-400">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            <Calendar size={13} className="text-[#063f68] dark:text-blue-400" />
                        </div>
                        {formatFecha(curso.fecha, curso.fechaFin)}
                    </div>
                    {curso.hora && (
                        <div className="flex items-center gap-2.5 text-[12px] text-slate-500 dark:text-slate-400">
                            <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                <Clock size={13} className="text-[#063f68] dark:text-blue-400" />
                            </div>
                            {curso.hora} hs
                        </div>
                    )}
                    {curso.lugar && (
                        <div className="flex items-center gap-2.5 text-[12px] text-slate-500 dark:text-slate-400">
                            <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                <MapPin size={13} className="text-[#063f68] dark:text-blue-400" />
                            </div>
                            {curso.lugar}
                        </div>
                    )}
                    {curso.fechaLimiteInscripcion && (
                        <div className="flex items-center gap-2.5 text-[12px] text-slate-500 dark:text-slate-400">
                            <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                <Users size={13} className="text-[#063f68] dark:text-blue-400" />
                            </div>
                            Inscripción hasta {new Date(curso.fechaLimiteInscripcion).toLocaleDateString("es-AR", { day: "numeric", month: "long" })}
                        </div>
                    )}
                </div>
            </div>

            {/* Estado si ya inscrito */}
            {yaInscrito && curso.inscripcion && (
                <div className="space-y-3">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium ${estadoBadge[curso.inscripcion.estado]?.cls || ""}`}>
                        <CheckCircle2 size={16} />
                        {estadoBadge[curso.inscripcion.estado]?.label || curso.inscripcion.estado}
                        {curso.inscripcion.opcionId && (
                            <span className="ml-auto text-[12px] opacity-70">
                                {curso.opciones.find(o => o.id === curso.inscripcion!.opcionId)?.nombre}
                            </span>
                        )}
                    </div>

                            {/* Certificado */}
                    {curso.inscripcion.estado === "confirmada" && (
                        <CertificadoCard cursoId={curso.id} onDescargar={handleDescargarCertificado} descargando={descargando} />
                    )}

                    {/* QR de asistencia */}
                    {curso.inscripcion.estado === "confirmada" && curso.tipoAsistencia !== "ninguna" && expediente && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <ScanLine size={15} className="text-[#063f68] dark:text-blue-400" />
                                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Tu QR de asistencia</p>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                    <QRCodeSVG value={expediente} size={180} />
                                </div>
                                <p className="text-[11px] text-slate-400 text-center max-w-xs">
                                    Mostrá este QR al momento de registrar tu asistencia. El administrador lo escaneará con el lector.
                                </p>
                            </div>
                        </div>
                    )}

                    {curso.inscripcion.estado === "pendiente_pago" && (() => {
                        const opcion = curso.opciones.find(o => o.id === curso.inscripcion!.opcionId);
                        return (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Monto a abonar</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                                            ${opcion?.precio.toLocaleString("es-AR") ?? "—"}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full sm:w-auto items-stretch mt-3 sm:mt-0">
                                        <MpPayButton
                                            tipo="curso"
                                            ref={String(curso.inscripcion!.id)}
                                            label="Pagar con Mercado Pago"
                                            className="w-full h-11 px-6 bg-[#063f68] hover:bg-[#0a4d7a] text-white rounded-xl font-bold text-[13px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        />
                                        {transferenciaHabilitada && (
                                            <TransferenciaPayButton
                                                tipo="curso"
                                                ref={String(curso.inscripcion!.id)}
                                                monto={opcion?.precio ?? 0}
                                                label="Pagar con transferencia"
                                                className="w-full h-11 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-[13px] transition-all flex items-center justify-center gap-2"
                                            />
                                        )}
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400">Al confirmar el pago, tu inscripción quedará activa automáticamente.</p>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Selector de opciones (solo si no está inscrito) */}
            {!yaInscrito && !vencida && curso.opciones.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-3">
                    <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Seleccioná una opción</h2>
                    <div className="space-y-2">
                        {curso.opciones.map(op => (
                            <button
                                key={op.id}
                                onClick={() => op.disponible && setOpcionSeleccionada(op.id)}
                                disabled={!op.disponible}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${!op.disponible
                                    ? "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 opacity-50 cursor-not-allowed"
                                    : opcionSeleccionada === op.id
                                        ? "border-[#063f68] bg-[#063f68]/5 dark:border-blue-500 dark:bg-blue-900/20"
                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                    }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${opcionSeleccionada === op.id ? "border-[#063f68] dark:border-blue-400" : "border-slate-300 dark:border-slate-600"}`}>
                                        {opcionSeleccionada === op.id && <div className="w-2 h-2 rounded-full bg-[#063f68] dark:bg-blue-400" />}
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{op.nombre}</p>
                                        {op.cupo > 0 && (
                                            <p className="text-[11px] text-slate-400">
                                                {op.disponible ? `${op.cupo - op.inscritos} lugar${op.cupo - op.inscritos !== 1 ? "es" : ""} disponible${op.cupo - op.inscritos !== 1 ? "s" : ""}` : "Sin cupo disponible"}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className={`text-[13px] font-bold ${opcionSeleccionada === op.id ? "text-[#063f68] dark:text-blue-400" : "text-slate-600 dark:text-slate-300"}`}>
                                    {op.precio === 0 ? "Gratuito" : `$${op.precio.toLocaleString("es-AR")}`}
                                </span>
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-[12px] text-red-600 dark:text-red-400">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl text-[12px] text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={14} /> ¡Inscripción realizada exitosamente!
                        </div>
                    )}

                    <button
                        onClick={handleInscribirse}
                        disabled={!opcionSeleccionada || inscribiendo || success}
                        className="w-full h-11 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {inscribiendo ? (
                            <><Loader2 size={15} className="animate-spin" /> Inscribiendo...</>
                        ) : (
                            <>
                                <GraduationCap size={15} />
                                {opcionActual
                                    ? `Inscribirme${opcionActual.precio > 0 ? ` · $${opcionActual.precio.toLocaleString("es-AR")}` : " · Gratis"}`
                                    : "Inscribirme"}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Inscripción cerrada */}
            {!yaInscrito && vencida && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] text-slate-500 dark:text-slate-400">
                    <AlertCircle size={15} />
                    El período de inscripción ha cerrado.
                </div>
            )}
        </div>
    );
}
