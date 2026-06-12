"use client";

import { useState, useEffect } from "react";
import {
    ShieldOff, ShieldCheck, Scale, Clock, Loader2,
    ChevronLeft, AlertTriangle, Info,
} from "lucide-react";
import Link from "next/link";

interface HistorialItem {
    id: number;
    accion: string;
    comentario: string;
    adminNombre: string | null;
    createdAt: string;
}

interface Apercibimiento {
    id: number;
    texto: string;
    inicio: string;
    fin: string;
    createdAt: string;
}

function fmtFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function fmtSolo(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
        day: "2-digit", month: "long", year: "numeric",
    });
}

function isVigente(fin: string) {
    return new Date(fin) >= new Date();
}

export default function HistorialMatriculaPage() {
    const [historial, setHistorial] = useState<HistorialItem[]>([]);
    const [apercibimientos, setApercibimientos] = useState<Apercibimiento[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/historial-matricula")
            .then(r => r.json())
            .then(data => {
                setHistorial(data.historial ?? []);
                setApercibimientos(data.apercibimientos ?? []);
            })
            .finally(() => setLoading(false));
    }, []);

    const vigentes = apercibimientos.filter(a => isVigente(a.fin));
    const vencidos = apercibimientos.filter(a => !isVigente(a.fin));

    return (
        <div className="flex flex-col h-auto">
            {/* Header sticky */}
            <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-4 md:px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group">
                        <ChevronLeft size={20} className="text-slate-700 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Scale size={18} className="text-slate-700" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Historial de Matrícula</h2>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 p-6 md:p-10 w-full space-y-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-slate-300" />
                    </div>
                ) : (
                    <>
                        {/* Apercibimientos */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Scale size={15} className="text-rose-500" />
                                <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                                    Apercibimientos del Tribunal de Ética
                                </h2>
                                {vigentes.length > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full">
                                        {vigentes.length} vigente{vigentes.length > 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>

                            {apercibimientos.length === 0 ? (
                                <EmptyState icon={<Scale size={20} className="text-slate-300" />} texto="Sin apercibimientos registrados" />
                            ) : (
                                <div className="space-y-3 max-w-3xl">
                                    {vigentes.map(a => <ApercibimientoCard key={a.id} a={a} vigente />)}
                                    {vencidos.map(a => <ApercibimientoCard key={a.id} a={a} vigente={false} />)}
                                </div>
                            )}
                        </section>

                        {/* Historial de estado */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Clock size={15} className="text-slate-700" />
                                <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                                    Historial de Estado de Matrícula
                                </h2>
                            </div>

                            {historial.length === 0 ? (
                                <EmptyState icon={<ShieldCheck size={20} className="text-slate-300" />} texto="Sin registros de suspensiones o habilitaciones" />
                            ) : (
                                <div className="relative pl-5 max-w-3xl">
                                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-100 dark:bg-slate-800" />
                                    <div className="space-y-4">
                                        {historial.map(item => (
                                            <div key={item.id} className="relative flex gap-4">
                                                <div className={`absolute -left-5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#02182b] mt-1 flex-shrink-0
                                                    ${item.accion === "suspension" ? "bg-rose-400" : "bg-emerald-400"}`} />
                                                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {item.accion === "suspension" ? (
                                                            <>
                                                                <ShieldOff size={13} className="text-rose-500 flex-shrink-0" />
                                                                <span className="text-[12px] font-bold text-rose-600 dark:text-rose-400">Suspensión</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ShieldCheck size={13} className="text-emerald-500 flex-shrink-0" />
                                                                <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">Habilitación</span>
                                                            </>
                                                        )}
                                                        <span className="text-[10px] text-slate-700 ml-auto">{fmtFecha(item.createdAt)}</span>
                                                    </div>
                                                    <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{item.comentario}</p>
                                                    {item.adminNombre && (
                                                        <p className="text-[10px] text-slate-700">Registrado por: {item.adminNombre}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

function ApercibimientoCard({ a, vigente }: { a: Apercibimiento; vigente: boolean }) {
    return (
        <div className={`rounded-2xl border p-4 space-y-2
            ${vigente
                ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"}`}>
            <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    {vigente
                        ? <AlertTriangle size={13} className="text-rose-500 flex-shrink-0" />
                        : <Info size={13} className="text-slate-700 flex-shrink-0" />
                    }
                    <span className={`text-[11px] font-bold uppercase tracking-wide ${vigente ? "text-rose-600 dark:text-rose-400" : "text-slate-700"}`}>
                        {vigente ? "Vigente" : "Vencido"}
                    </span>
                </div>
                <span className={`text-[10px] ${vigente ? "text-rose-500/70" : "text-slate-700"}`}>
                    {fmtSolo(a.inicio)} → {fmtSolo(a.fin)}
                </span>
            </div>
            <p className={`text-[13px] leading-relaxed ${vigente ? "text-rose-800 dark:text-rose-300" : "text-slate-600 dark:text-slate-400"}`}>
                {a.texto}
            </p>
        </div>
    );
}

function EmptyState({ icon, texto }: { icon: React.ReactNode; texto: string }) {
    return (
        <div className="flex flex-col items-center gap-2 py-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-3xl">
            {icon}
            <p className="text-[12px] text-slate-700">{texto}</p>
        </div>
    );
}
