"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, UserCheck, UserX,
    Play, Square, Loader2, CheckCircle2, Users, CalendarDays, Camera, Keyboard,
} from "lucide-react";

interface Dia { id: number; fecha: string; nombre: string | null; orden: number }
interface Curso {
    id: number; titulo: string;
    tipoAsistencia: string;
    porcentajeMin: number | null;
    diasMinimos: number | null;
    dias: Dia[];
}
interface Inscripcion {
    id: number; expediente: string; opcion: { nombre: string } | null;
    esInvitado?: boolean; guestNombre?: string | null; guestApellido?: string | null; guestDni?: string | null;
}
interface Asistencia { id: number; expediente: string }
interface Sesion { id: number; token: string; activa: boolean; diaId: number | null; asistencias: Asistencia[] }

function QrScanner({ onScan }: { onScan: (text: string) => void }) {
    const divRef = useRef<HTMLDivElement>(null);
    const scannerRef = useRef<unknown>(null);

    useEffect(() => {
        let cancelled = false;
        let scanner: { stop: () => Promise<void> } | null = null;

        async function start() {
            const { Html5Qrcode } = await import("html5-qrcode");
            if (cancelled || !divRef.current) return;
            const s = new Html5Qrcode("qr-reader");
            scannerRef.current = s;
            scanner = s;
            await s.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (text: string) => { onScan(text); },
                undefined
            );
        }

        start().catch(() => {});

        return () => {
            cancelled = true;
            scanner?.stop().catch(() => {});
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "4/3" }}>
            <div id="qr-reader" ref={divRef} className="w-full h-full" />
        </div>
    );
}

export default function AsistenciaPage() {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [curso, setCurso] = useState<Curso | null>(null);
    const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
    const [sesiones, setSesiones] = useState<Sesion[]>([]);
    const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);
    const [modo, setModo] = useState<"camara" | "manual">("camara");
    const [manualInput, setManualInput] = useState("");
    const manualRef = useRef<HTMLInputElement>(null);
    const [scanFeedback, setScanFeedback] = useState<{ exp: string; ok: boolean } | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);
    const [startingSession, setStartingSession] = useState(false);
    // evita procesar el mismo QR dos veces seguidas
    const lastScan = useRef("");

    useEffect(() => {
        fetch(`/api/admin/cursos/${id}/asistencia`)
            .then(r => r.json())
            .then(data => {
                setCurso(data.curso);
                setInscripciones(data.inscripciones);
                setSesiones(data.sesiones);
                if (data.curso.dias?.length > 0) setDiaSeleccionado(data.curso.dias[0].id);
            })
            .finally(() => setLoading(false));
    }, [id]);

    const sesionActiva = sesiones.find(s =>
        s.activa && (curso?.tipoAsistencia === "global" ? s.diaId === null : s.diaId === diaSeleccionado)
    ) ?? null;

    const sesionesDelDia = sesiones.filter(s =>
        curso?.tipoAsistencia === "global" ? true : s.diaId === diaSeleccionado
    );

    const presentesActivos = new Set(sesionActiva?.asistencias.map(a => a.expediente) ?? []);
    const presentesHistorico = new Set(sesionesDelDia.flatMap(s => s.asistencias.map(a => a.expediente)));

    async function toggleSesion() {
        setStartingSession(true);
        if (sesionActiva) {
            const res = await fetch(`/api/admin/cursos/${id}/asistencia/sesion/${sesionActiva.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activa: false }),
            });
            const updated = await res.json();
            setSesiones(prev => prev.map(s => s.id === updated.id ? updated : s));
        } else {
            const res = await fetch(`/api/admin/cursos/${id}/asistencia/sesion`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ diaId: curso?.tipoAsistencia === "por_dia" ? diaSeleccionado : null }),
            });
            const nueva = await res.json();
            setSesiones(prev => [nueva, ...prev]);
        }
        setStartingSession(false);
    }

    async function marcarAsistencia(expediente: string, presente: boolean) {
        if (!sesionActiva) return;
        setToggling(expediente);
        await fetch(`/api/admin/cursos/${id}/asistencia/sesion/${sesionActiva.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expediente, presente }),
        });
        setSesiones(prev => prev.map(s => {
            if (s.id !== sesionActiva.id) return s;
            return {
                ...s,
                asistencias: presente
                    ? [...s.asistencias, { id: Date.now(), expediente }]
                    : s.asistencias.filter(a => a.expediente !== expediente),
            };
        }));
        setToggling(null);
    }

    const procesarExpediente = useCallback(async (exp: string) => {
        if (!sesionActiva || !exp) return;
        if (exp === lastScan.current) return; // evita doble scan
        lastScan.current = exp;
        setTimeout(() => { lastScan.current = ""; }, 3000);

        const inscripto = inscripciones.find(i => i.expediente === exp);
        if (!inscripto) {
            setScanFeedback({ exp, ok: false });
            setTimeout(() => setScanFeedback(null), 2500);
            return;
        }
        if (!presentesActivos.has(exp)) await marcarAsistencia(exp, true);
        setScanFeedback({ exp, ok: true });
        setTimeout(() => setScanFeedback(null), 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sesionActiva, inscripciones, presentesActivos]);

    function handleManual(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key !== "Enter") return;
        const exp = manualInput.trim();
        setManualInput("");
        procesarExpediente(exp);
    }

    if (loading) return (
        <div className="p-10 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
    );

    if (!curso || curso.tipoAsistencia === "ninguna") return (
        <div className="p-6 md:p-10 space-y-6">
            <div className="flex items-center gap-3">
                <Link href={`/admin/cursos/${id}`}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    <ArrowLeft size={16} className="text-slate-500" />
                </Link>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">Asistencia</h1>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
                <UserCheck size={28} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-[13px] font-medium">Este curso no tiene control de asistencia configurado.</p>
                <Link href={`/admin/cursos/${id}`} className="mt-4 inline-block text-[12px] text-[#063f68] hover:underline">
                    Ir a configuración del curso
                </Link>
            </div>
        </div>
    );

    return (
        <div className="p-6 md:p-10 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href={`/admin/cursos/${id}`}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    <ArrowLeft size={16} className="text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Asistencia</h1>
                    <p className="text-[12px] text-slate-400 mt-0.5">{curso.titulo}</p>
                </div>
            </div>

            {/* Selector de día */}
            {curso.tipoAsistencia === "por_dia" && curso.dias.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">Día</label>
                    <div className="flex flex-wrap gap-2">
                        {curso.dias.map(dia => {
                            const fecha = new Date(dia.fecha);
                            const presentesDia = new Set(
                                sesiones.filter(s => s.diaId === dia.id).flatMap(s => s.asistencias.map(a => a.expediente))
                            ).size;
                            return (
                                <button key={dia.id} type="button"
                                    onClick={() => setDiaSeleccionado(dia.id)}
                                    className={`flex flex-col items-start px-4 py-2.5 rounded-xl border text-left transition-all ${
                                        diaSeleccionado === dia.id
                                            ? "border-[#063f68] bg-[#063f68]/5 text-[#063f68] dark:text-blue-400"
                                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                    }`}>
                                    <span className="text-[12px] font-bold">
                                        {dia.nombre || fecha.toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "short" })}
                                    </span>
                                    <span className="text-[10px] opacity-60">
                                        {dia.nombre ? fecha.toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "short" }) : ""}
                                        {presentesDia > 0 ? `${dia.nombre ? " · " : ""}${presentesDia} presentes` : ""}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sesión */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${sesionActiva ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                            {sesionActiva ? "Tomando asistencia" : "Asistencia no iniciada"}
                        </span>
                    </div>
                    <button onClick={toggleSesion} disabled={startingSession}
                        className={`flex items-center gap-2 px-4 h-9 rounded-xl text-[12px] font-bold transition-all disabled:opacity-60 ${
                            sesionActiva
                                ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100"
                                : "bg-emerald-500 text-white hover:bg-emerald-600"
                        }`}>
                        {startingSession ? <Loader2 size={13} className="animate-spin" /> : sesionActiva ? <Square size={13} /> : <Play size={13} />}
                        {sesionActiva ? "Finalizar" : "Tomar asistencia"}
                    </button>
                </div>

                {sesionActiva && (
                    <div className="space-y-3">
                        {/* Modo toggle */}
                        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button type="button" onClick={() => setModo("camara")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                                    modo === "camara" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm" : "text-slate-500"
                                }`}>
                                <Camera size={13} /> Cámara
                            </button>
                            <button type="button" onClick={() => { setModo("manual"); setTimeout(() => manualRef.current?.focus(), 50); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                                    modo === "manual" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm" : "text-slate-500"
                                }`}>
                                <Keyboard size={13} /> Manual
                            </button>
                        </div>

                        {modo === "camara" ? (
                            <QrScanner onScan={procesarExpediente} />
                        ) : (
                            <div>
                                <input
                                    ref={manualRef}
                                    value={manualInput}
                                    onChange={e => setManualInput(e.target.value)}
                                    onKeyDown={handleManual}
                                    placeholder="Ingresar expediente y Enter"
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                                />
                            </div>
                        )}

                        {scanFeedback && (
                            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold ${
                                scanFeedback.ok
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                    : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            }`}>
                                {scanFeedback.ok ? <CheckCircle2 size={14} /> : <UserX size={14} />}
                                {scanFeedback.ok
                                    ? `✓ ${scanFeedback.exp} — asistencia registrada`
                                    : `${scanFeedback.exp} — no está inscripto en este curso`
                                }
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lista de alumnos */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Users size={15} className="text-slate-400" />
                        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                            Inscriptos ({inscripciones.length})
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[12px] text-emerald-600 font-semibold">{presentesHistorico.size} presentes</span>
                        {inscripciones.length > 0 && (
                            <span className="text-[12px] text-slate-400">{inscripciones.length - presentesHistorico.size} ausentes</span>
                        )}
                    </div>
                </div>

                {inscripciones.length === 0 ? (
                    <div className="py-12 text-center">
                        <Users size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-[13px] text-slate-400">No hay inscriptos confirmados</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {inscripciones.map(insc => {
                            const presente = presentesActivos.has(insc.expediente);
                            const presenteHistorico = !presente && presentesHistorico.has(insc.expediente);
                            const isToggling = toggling === insc.expediente;
                            return (
                                <div key={insc.id} className="flex items-center gap-3 px-5 py-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        presente ? "bg-emerald-100 dark:bg-emerald-900/30" :
                                        presenteHistorico ? "bg-blue-50 dark:bg-blue-900/20" :
                                        "bg-slate-100 dark:bg-slate-800"
                                    }`}>
                                        {presente ? (
                                            <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                                        ) : presenteHistorico ? (
                                            <CalendarDays size={14} className="text-blue-400" />
                                        ) : (
                                            <UserX size={14} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {insc.esInvitado ? (
                                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                                                {insc.guestApellido}, {insc.guestNombre} <span className="text-[10px] font-normal text-slate-400">· DNI {insc.guestDni}</span>
                                            </p>
                                        ) : (
                                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{insc.expediente}</p>
                                        )}
                                        {insc.opcion && <p className="text-[11px] text-slate-400">{insc.opcion.nombre}</p>}
                                    </div>
                                    {presenteHistorico && (
                                        <span className="text-[10px] text-blue-400 font-semibold mr-2">sesión anterior</span>
                                    )}
                                    {sesionActiva ? (
                                        <button
                                            onClick={() => marcarAsistencia(insc.expediente, !presente)}
                                            disabled={isToggling}
                                            className={`px-3 h-8 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 ${
                                                presente
                                                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600"
                                            }`}>
                                            {isToggling ? <Loader2 size={12} className="animate-spin" /> : presente ? "Presente" : "Marcar"}
                                        </button>
                                    ) : (
                                        <span className={`text-[11px] font-semibold ${presenteHistorico ? "text-blue-400" : "text-slate-300"}`}>
                                            {presenteHistorico ? "Asistió" : "—"}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
