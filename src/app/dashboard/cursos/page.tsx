"use client";

import React, { useState, useEffect } from "react";
import {
    ChevronLeft,
    GraduationCap,
    Calendar,
    Clock,
    Users,
    CheckCircle2,
    Lock,
    Loader2,
    ArrowRight,
    MapPin,
    Tag
} from "lucide-react";
import Link from "next/link";

interface Curso {
    id: number;
    titulo: string;
    descripcion: string;
    fecha: string;
    hora: string | null;
    cupo: number;
    inscritos: number;
    precio: string | null;
    modalidad: string;
    isEnrolled: boolean;
    isFull: boolean;
}

export default function CursosPage() {
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [loading, setLoading] = useState(true);
    const [enrollingId, setEnrollingId] = useState<number | null>(null);

    const fetchCursos = async () => {
        try {
            const res = await fetch("/api/user/cursos");
            const data = await res.json();
            if (Array.isArray(data)) {
                setCursos(data);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCursos();
    }, []);

    const handleInscripcion = async (cursoId: number) => {
        setEnrollingId(cursoId);
        try {
            const res = await fetch("/api/user/cursos/inscribirse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cursoId })
            });

            const data = await res.json();

            if (res.ok) {
                // Refresh courses to update status
                fetchCursos();
            } else {
                alert(data.error || "Error al inscribirse");
            }
        } catch (error) {
            console.error("Error enrolling:", error);
            alert("Error de conexión");
        } finally {
            setEnrollingId(null);
        }
    };

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
                        <GraduationCap size={18} className="text-pink-500" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Cursos y Capacitaciones</h2>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 md:p-10 animate-fade-in">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 size={40} className="text-[#063f68] animate-spin" />
                        <p className="text-slate-500 font-medium">Cargando cursos...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {cursos.map((curso) => (
                            <div
                                key={curso.id}
                                className="group relative flex flex-col bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all duration-500"
                            >
                                {/* Modalidad Badge */}
                                <div className="absolute top-6 left-6 z-10">
                                    <span className="px-4 py-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-[#063f68] dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-100 dark:border-slate-700 shadow-sm">
                                        {curso.modalidad}
                                    </span>
                                </div>

                                <div className="p-8 flex-1 flex flex-col pt-20">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4 group-hover:text-[#063f68] dark:group-hover:text-blue-400 transition-colors">
                                        {curso.titulo}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-3 mb-8">
                                        {curso.descripcion}
                                    </p>

                                    <div className="mt-auto space-y-4">
                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                <Calendar size={14} className="text-[#063f68] dark:text-blue-400" />
                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{curso.fecha}</span>
                                            </div>
                                            {curso.hora && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                                                    <Clock size={14} className="text-[#063f68] dark:text-blue-400" />
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{curso.hora}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                    <Users size={16} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lugares</span>
                                                    <span className="text-[13px] font-bold text-slate-900 dark:text-white">
                                                        {curso.cupo - curso.inscritos} de {curso.cupo}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Inversión</span>
                                                <span className="text-[13px] font-bold text-[#063f68] dark:text-blue-400">
                                                    {curso.precio || "Gratuito"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 pt-0">
                                    <button
                                        onClick={() => handleInscripcion(curso.id)}
                                        disabled={enrollingId === curso.id || curso.isEnrolled || curso.isFull}
                                        className={`w-full h-14 rounded-[22px] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] ${curso.isEnrolled
                                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                            : curso.isFull
                                                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                                : "bg-[#063f68] dark:bg-blue-600 text-white hover:bg-[#0a4d7a] shadow-lg shadow-blue-500/10"
                                            }`}
                                    >
                                        {enrollingId === curso.id ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : curso.isEnrolled ? (
                                            <>
                                                Inscrito <CheckCircle2 size={18} />
                                            </>
                                        ) : curso.isFull ? (
                                            <>
                                                Cupo Lleno <Lock size={18} />
                                            </>
                                        ) : (
                                            <>
                                                Inscribirse <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {cursos.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
                                <GraduationCap size={48} className="text-slate-300" />
                                <div className="space-y-1">
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">No hay cursos disponibles</h4>
                                    <p className="text-sm text-slate-500 font-medium">Por el momento no se han publicado nuevos cursos.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
