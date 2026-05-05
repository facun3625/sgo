"use client";

import { useState, useEffect } from "react";
import {
    ShieldCheck, ShieldOff, Loader2, Send, Clock,
    CheckCircle2, XCircle, AlertTriangle, ChevronLeft,
} from "lucide-react";
import Link from "next/link";

interface Solicitud {
    id: number;
    expediente: string;
    mensaje: string;
    estado: string;
    respuesta: string | null;
    adminNombre: string | null;
    createdAt: string;
}

function fmtFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function RehabilitacionPage() {
    const [solicitud, setSolicitud] = useState<Solicitud | null | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");
    const [enviado, setEnviado] = useState(false);

    useEffect(() => {
        fetch("/api/user/rehabilitacion")
            .then(r => r.json())
            .then(data => setSolicitud(data.solicitud ?? null))
            .finally(() => setLoading(false));
    }, []);

    async function enviar() {
        if (!mensaje.trim()) return;
        setEnviando(true);
        setError("");
        try {
            const res = await fetch("/api/user/rehabilitacion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mensaje }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Error al enviar"); return; }
            setSolicitud(data.solicitud);
            setEnviado(true);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6 md:p-10 space-y-8">

            {/* Header */}
            <div>
                <Link href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mb-4 transition-colors">
                    <ChevronLeft size={14} /> Volver al inicio
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <ShieldCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Solicitud de Rehabilitación</h1>
                        <p className="text-[12px] text-slate-400 mt-0.5">Rehabilitación de matrícula profesional</p>
                    </div>
                </div>
            </div>

            {/* Banner suspensión */}
            <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl">
                <ShieldOff size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-[13px] font-bold text-rose-700 dark:text-rose-400">Tu matrícula se encuentra suspendida</p>
                    <p className="text-[12px] text-rose-600/70 dark:text-rose-400/60 mt-0.5">
                        Podés solicitar la rehabilitación explicando tu situación. El Consejo evaluará tu solicitud y te notificará la resolución.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-slate-300" />
                </div>
            ) : (
                <>
                    {/* Estado de solicitud existente */}
                    {solicitud ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Estado de tu solicitud</p>
                            </div>
                            <div className="p-6 space-y-5">
                                {/* Estado badge */}
                                <div className="flex items-center gap-3">
                                    {solicitud.estado === "pendiente" && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                            <Clock size={14} className="text-amber-500" />
                                            <span className="text-[12px] font-bold text-amber-700 dark:text-amber-400">En revisión</span>
                                        </div>
                                    )}
                                    {solicitud.estado === "aprobada" && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                            <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">Aprobada</span>
                                        </div>
                                    )}
                                    {solicitud.estado === "rechazada" && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                                            <XCircle size={14} className="text-rose-500" />
                                            <span className="text-[12px] font-bold text-rose-700 dark:text-rose-400">Rechazada</span>
                                        </div>
                                    )}
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                        <Clock size={10} /> {fmtFecha(solicitud.createdAt)}
                                    </span>
                                </div>

                                {/* Tu mensaje */}
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Tu mensaje</p>
                                    <p className="text-[13px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-xl p-4 leading-relaxed">
                                        {solicitud.mensaje}
                                    </p>
                                </div>

                                {/* Respuesta del consejo */}
                                {solicitud.respuesta && (
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                                            Respuesta del Consejo
                                            {solicitud.adminNombre && <span className="font-normal normal-case ml-1">— {solicitud.adminNombre}</span>}
                                        </p>
                                        <p className={`text-[13px] rounded-xl p-4 leading-relaxed border
                                            ${solicitud.estado === "aprobada"
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800"
                                                : "bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 border-rose-100 dark:border-rose-800"}`}>
                                            {solicitud.respuesta}
                                        </p>
                                    </div>
                                )}

                                {/* Pendiente — info */}
                                {solicitud.estado === "pendiente" && (
                                    <div className="flex items-start gap-2 text-[11px] text-slate-400">
                                        <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                                        Tu solicitud está siendo evaluada. Recibirás una notificación cuando haya novedades.
                                    </div>
                                )}

                                {/* Rechazada — permitir nueva solicitud */}
                                {solicitud.estado === "rechazada" && (
                                    <div className="pt-2 border-t border-slate-50 dark:border-slate-800">
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">
                                            Tu solicitud fue rechazada. Podés presentar una nueva solicitud si tu situación cambió.
                                        </p>
                                        <FormNuevaSolicitud
                                            mensaje={mensaje}
                                            setMensaje={setMensaje}
                                            enviando={enviando}
                                            error={error}
                                            onEnviar={enviar}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Sin solicitud — mostrar formulario */
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                            <div>
                                <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">Nueva solicitud</h2>
                                <p className="text-[12px] text-slate-400 mt-0.5">
                                    Explicá tu situación y los motivos por los que solicitás la rehabilitación de tu matrícula.
                                </p>
                            </div>
                            {enviado ? (
                                <div className="flex flex-col items-center py-8 gap-3">
                                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <CheckCircle2 size={28} className="text-emerald-500" />
                                    </div>
                                    <p className="text-[14px] font-bold text-slate-800 dark:text-white">Solicitud enviada</p>
                                    <p className="text-[12px] text-slate-400 text-center max-w-xs">
                                        Tu solicitud fue recibida. Te notificaremos cuando el Consejo la resuelva.
                                    </p>
                                </div>
                            ) : (
                                <FormNuevaSolicitud
                                    mensaje={mensaje}
                                    setMensaje={setMensaje}
                                    enviando={enviando}
                                    error={error}
                                    onEnviar={enviar}
                                />
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function FormNuevaSolicitud({ mensaje, setMensaje, enviando, error, onEnviar }: {
    mensaje: string;
    setMensaje: (v: string) => void;
    enviando: boolean;
    error: string;
    onEnviar: () => void;
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                    Explicación <span className="text-rose-500">*</span>
                </label>
                <textarea
                    value={mensaje}
                    onChange={e => setMensaje(e.target.value)}
                    rows={6}
                    placeholder="Explicá los motivos de la suspensión y por qué solicitás la rehabilitación. Incluí toda la información que consideres relevante (regularización de deudas, documentación presentada, etc.)."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-400 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-slate-400">{mensaje.length} caracteres</p>
            </div>
            {error && (
                <p className="text-[12px] text-rose-500 flex items-center gap-1">
                    <AlertTriangle size={12} /> {error}
                </p>
            )}
            <button
                onClick={onEnviar}
                disabled={enviando || !mensaje.trim()}
                className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[13px] disabled:opacity-50 transition-all">
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {enviando ? "Enviando..." : "Enviar solicitud"}
            </button>
        </div>
    );
}
