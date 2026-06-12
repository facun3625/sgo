"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, Calendar, MapPin, Loader2, ChevronRight, Clock } from "lucide-react";

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
    inscripcion: { cursoId: number; opcionId: number | null; estado: string } | null;
}

const UTC = { timeZone: "UTC" } as const;

function formatFecha(fecha: string, fechaFin: string | null): string {
    const ini = new Date(fecha);
    if (!fechaFin) {
        return ini.toLocaleDateString("es-AR", { ...UTC, day: "2-digit", month: "long", year: "numeric" });
    }
    const fin = new Date(fechaFin);
    const mismoMes = ini.getUTCMonth() === fin.getUTCMonth() && ini.getUTCFullYear() === fin.getUTCFullYear();
    if (mismoMes) {
        return `${ini.getUTCDate()} al ${fin.toLocaleDateString("es-AR", { ...UTC, day: "numeric", month: "long", year: "numeric" })}`;
    }
    return `${ini.toLocaleDateString("es-AR", { ...UTC, day: "numeric", month: "short" })} al ${fin.toLocaleDateString("es-AR", { ...UTC, day: "numeric", month: "short", year: "numeric" })}`;
}


const estadoBadge: Record<string, { label: string; cls: string }> = {
    confirmada: { label: "Inscripto", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    pendiente_pago: { label: "Pendiente de pago", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

export default function CursosPage() {
    const [cursos, setCursos] = useState<Curso[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/cursos", { cache: "no-store" })
            .then(r => r.json())
            .then(data => {
                const list = Array.isArray(data) ? data : (data.cursos ?? []);
                setCursos(list);
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-4 md:p-8 space-y-5">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">Cursos y Capacitaciones</h1>
                <p className="text-slate-700 text-sm mt-0.5">Actividades formativas del Colegio</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
            ) : cursos.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-14 text-center">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <GraduationCap size={26} className="text-slate-300" />
                    </div>
                    <p className="text-slate-700 font-medium">No hay cursos disponibles</p>
                    <p className="text-slate-700 text-sm mt-1">Próximamente se publicarán nuevas actividades.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cursos.map(curso => {
                        const inscBadge = curso.inscripcion ? estadoBadge[curso.inscripcion.estado] : null;
                        const vencida = curso.fechaLimiteInscripcion && new Date() > new Date(curso.fechaLimiteInscripcion);

                        return (
                            <Link key={curso.id} href={`/dashboard/cursos/${curso.id}`}
                                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all flex flex-col">

                                {/* Imagen */}
                                <div className="h-36 bg-slate-100 dark:bg-slate-800 relative flex-shrink-0">
                                    {curso.imagen ? (
                                        <img src={curso.imagen} alt={curso.titulo} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <GraduationCap size={32} className="text-slate-300" />
                                        </div>
                                    )}
                                    {/* Modalidad */}
                                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#063f68]/90 text-white text-[10px] font-bold uppercase tracking-wider">
                                        {curso.modalidad}
                                    </div>
                                    {/* Estado inscripción */}
                                    {inscBadge && (
                                        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold ${inscBadge.cls}`}>
                                            {inscBadge.label}
                                        </div>
                                    )}
                                </div>

                                {/* Contenido */}
                                <div className="p-4 flex flex-col flex-1 gap-3">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[14px] leading-snug line-clamp-2 group-hover:text-[#063f68] dark:group-hover:text-blue-400 transition-colors">
                                        {curso.titulo}
                                    </h3>

                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-2 text-[11px] text-slate-700">
                                            <Calendar size={12} />
                                            {formatFecha(curso.fecha, curso.fechaFin)}
                                            {curso.hora && <><Clock size={11} />{curso.hora}</>}
                                        </div>
                                        {curso.lugar && (
                                            <div className="flex items-center gap-2 text-[11px] text-slate-700">
                                                <MapPin size={12} />
                                                {curso.lugar}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex items-center gap-1 text-[12px] font-semibold text-[#063f68] dark:text-blue-400 group-hover:underline underline-offset-2 transition-colors">
                                        {vencida && !curso.inscripcion ? "Inscripción cerrada" : curso.inscripcion ? "Ver detalle" : "Ver e inscribirme"}
                                        <ChevronRight size={13} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
