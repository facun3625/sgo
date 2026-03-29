"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    FileText,
    Clock,
    CheckCircle2,
    XCircle,
    Calendar,
    Loader2,
    Search,
    Paperclip,
    Star,
} from "lucide-react";
import Link from "next/link";

interface Solicitud {
    id: string | number;
    tipo: string;
    fecha: string;
    estado: string;
    presentarAnte: string | null;
    adjunto: string | null;
    isAdhesion?: boolean;
    detalles?: any;
}

const FAV_KEY = "sgo-sol-favoritos";

function loadFavs(): Set<string> {
    try {
        const raw = localStorage.getItem(FAV_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
}

function saveFavs(favs: Set<string>) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch {}
}

export default function SolicitudesEnviadasPage() {
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [favs, setFavs] = useState<Set<string>>(new Set());

    useEffect(() => {
        setFavs(loadFavs());
        fetch("/api/user/solicitudes")
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setSolicitudes(data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    function toggleFav(id: string | number) {
        const key = String(id);
        setFavs(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            saveFavs(next);
            return next;
        });
    }

    const getStatusStyle = (estado: string) => {
        switch (estado.toLowerCase()) {
            case "completada": return {
                bg: "bg-emerald-50 dark:bg-emerald-950/20",
                text: "text-emerald-600 dark:text-emerald-400",
                border: "border-emerald-100 dark:border-emerald-900/30",
                icon: <CheckCircle2 size={14} />
            };
            case "rechazada": return {
                bg: "bg-rose-50 dark:bg-rose-950/20",
                text: "text-rose-600 dark:text-rose-400",
                border: "border-rose-100 dark:border-rose-900/30",
                icon: <XCircle size={14} />
            };
            default: return {
                bg: "bg-amber-50 dark:bg-amber-950/20",
                text: "text-amber-600 dark:text-amber-400",
                border: "border-amber-100 dark:border-amber-900/30",
                icon: <Clock size={14} />
            };
        }
    };

    const filtered = solicitudes.filter(s =>
        s.tipo.toLowerCase().includes(filter.toLowerCase()) ||
        (s.presentarAnte && s.presentarAnte.toLowerCase().includes(filter.toLowerCase()))
    );

    const favoritas = filtered.filter(s => favs.has(String(s.id)));
    const resto = filtered.filter(s => !favs.has(String(s.id)));

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 size={32} className="text-[#063f68] dark:text-blue-500 animate-spin" />
            <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Cargando historial...</p>
        </div>
    );

    return (
        <div className="bg-white dark:bg-[#02182b] pb-20 transition-colors duration-300">
            {/* Header Sticky */}
            <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-4 md:px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group">
                        <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Clock size={18} className="text-orange-500" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Solicitudes Enviadas</h2>
                    </div>
                </div>
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar trámites..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="pl-10 pr-4 h-10 w-64 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-[#063f68]/10 transition-all"
                    />
                </div>
            </div>

            <div className="p-4 md:p-10 animate-fade-in space-y-6">
                {solicitudes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-100 dark:border-slate-800 text-slate-300">
                            <FileText size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Sin Solicitudes</h3>
                            <p className="text-slate-400 dark:text-slate-500 text-sm max-w-xs">Aún no has enviado ninguna solicitud de trámite a través del sistema.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Favoritos */}
                        {favoritas.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-1.5">
                                    <Star size={11} fill="currentColor" /> Favoritos
                                </p>
                                <div className="space-y-2">
                                    {favoritas.map(s => <SolicitudCard key={s.id} s={s} isFav={true} onToggleFav={toggleFav} getStatusStyle={getStatusStyle} />)}
                                </div>
                            </div>
                        )}

                        {/* Resto */}
                        {resto.length > 0 && (
                            <div>
                                {favoritas.length > 0 && (
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Todos los trámites</p>
                                )}
                                <div className="space-y-2">
                                    {resto.map(s => <SolicitudCard key={s.id} s={s} isFav={false} onToggleFav={toggleFav} getStatusStyle={getStatusStyle} />)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function SolicitudCard({ s, isFav, onToggleFav, getStatusStyle }: {
    s: Solicitud;
    isFav: boolean;
    onToggleFav: (id: string | number) => void;
    getStatusStyle: (estado: string) => { bg: string; text: string; border: string; icon: React.ReactNode };
}) {
    const style = getStatusStyle(s.estado);
    return (
        <div className={`group bg-white dark:bg-slate-900/40 border rounded-xl p-4 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-slate-200/10 dark:hover:shadow-none transition-all duration-300 ${isFav ? "border-amber-200 dark:border-amber-800/50" : "border-slate-100 dark:border-slate-800"}`}>
            {/* Fila superior */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-[#063f68]/5 dark:bg-blue-400/5 rounded-lg flex items-center justify-center text-[#063f68] dark:text-blue-400 shrink-0">
                        <FileText size={16} />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-[13px] leading-tight">{s.tipo}</h4>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={e => { e.stopPropagation(); onToggleFav(s.id); }}
                        className={`p-1.5 rounded-lg transition-all ${isFav ? "text-amber-400 hover:text-amber-500" : "text-slate-200 dark:text-slate-700 hover:text-amber-400 dark:hover:text-amber-400"}`}
                        title={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
                    >
                        <Star size={15} fill={isFav ? "currentColor" : "none"} />
                    </button>
                    <div className={`px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border} text-[9px] font-bold uppercase tracking-widest flex items-center gap-1`}>
                        {style.icon}{s.estado}
                    </div>
                </div>
            </div>

            {/* Fila inferior */}
            <div className="mt-3 ml-12 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                    <Calendar size={11} />
                    {new Date(s.fecha).toLocaleDateString("es-AR")}
                </div>
                {s.presentarAnte && (
                    <span className="text-[11px] text-slate-400 italic truncate max-w-[180px]">· "{s.presentarAnte}"</span>
                )}
                {s.isAdhesion ? (
                    <>
                        {s.detalles?.dni && (
                            <a href={s.detalles.dni} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                                <Paperclip size={9} /> DNI
                            </a>
                        )}
                        {(s.detalles?.cbu || s.detalles?.tarjeta) && (
                            <a href={s.detalles.cbu || s.detalles.tarjeta} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                                <Paperclip size={9} /> {s.detalles.tipoAdhesion}
                            </a>
                        )}
                    </>
                ) : (
                    s.adjunto && !s.tipo.includes("Jurisprudencia") && (
                        <a href={s.adjunto} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                            <Paperclip size={9} /> Descargar
                        </a>
                    )
                )}
            </div>

            {/* Respuesta del admin */}
            {s.estado === "completada" && !s.isAdhesion && (
                <div className="mt-3 ml-12">
                    {s.tipo.includes("SISFE") && s.detalles?.respuesta?.clave && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                            <span className="text-[12px] text-emerald-700 dark:text-emerald-300 font-medium">
                                Tu clave SISFE: <strong>{s.detalles.respuesta.clave}</strong>
                            </span>
                        </div>
                    )}
                    {(s.tipo.includes("CATASTRO") || s.tipo.includes("SIGIT")) && s.detalles?.respuesta?.usuario && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                            <span className="text-[12px] text-emerald-700 dark:text-emerald-300 font-medium">
                                Tu usuario CATASTRO: <strong>{s.detalles.respuesta.usuario}</strong>
                            </span>
                        </div>
                    )}
                    {s.tipo.includes("Jurisprudencia") && s.adjunto && (
                        <a href={s.adjunto} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all">
                            <Paperclip size={13} className="text-emerald-500 shrink-0" />
                            <span className="text-[12px] text-emerald-700 dark:text-emerald-300 font-medium">Ver documento adjunto</span>
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
