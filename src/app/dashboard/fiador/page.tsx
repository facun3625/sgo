"use client";

import { useState, useEffect } from "react";
import { HandshakeIcon, Loader2, User, ChevronLeft } from "lucide-react";
import Link from "next/link";

interface FiadorPersona {
    expediente: string;
    apellido: string | null;
    nombre: string | null;
}

interface FiadorData {
    misFiador: FiadorPersona | null;
    avalaA: FiadorPersona[];
}

function PersonaCard({ persona }: { persona: FiadorPersona }) {
    const tieneNombre = persona.apellido && persona.nombre;
    return (
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <div className="w-10 h-10 rounded-xl bg-[#063f68]/8 dark:bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-[#063f68] dark:text-blue-400" />
            </div>
            <div>
                <p className="text-[14px] font-bold text-slate-800 dark:text-white">
                    {tieneNombre ? `${persona.apellido}, ${persona.nombre}` : "Sin datos en el sistema"}
                </p>
                <p className="text-[12px] text-slate-400 mt-0.5">Expediente {persona.expediente}</p>
            </div>
        </div>
    );
}

function EmptyState({ texto }: { texto: string }) {
    return (
        <div className="flex flex-col items-center gap-2 py-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-3xl">
            <HandshakeIcon size={20} className="text-slate-300" />
            <p className="text-[12px] text-slate-400">{texto}</p>
        </div>
    );
}

export default function FiadorPage() {
    const [data, setData] = useState<FiadorData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/fiador")
            .then((r) => r.json())
            .then((d) => {
                if (d.misFiador !== undefined) setData(d);
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex flex-col h-auto">
            {/* Header sticky */}
            <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-4 md:px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                    >
                        <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <HandshakeIcon size={18} className="text-slate-500" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Fiadores</h2>
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
                        {/* Tu fiador */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <HandshakeIcon size={15} className="text-slate-400" />
                                <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                                    Tu fiador
                                </h2>
                            </div>
                            <div className="max-w-3xl">
                                {data?.misFiador ? (
                                    <PersonaCard persona={data.misFiador} />
                                ) : (
                                    <EmptyState texto="No tenés fiador asignado." />
                                )}
                            </div>
                        </section>

                        {/* Sos fiador de */}
                        <section className="space-y-3">
                            <div className="flex items-center gap-2">
                                <HandshakeIcon size={15} className="text-slate-400" />
                                <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                                    Sos fiador de
                                </h2>
                                {(data?.avalaA.length ?? 0) > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-[#063f68]/10 dark:bg-blue-400/10 text-[#063f68] dark:text-blue-400 text-[10px] font-bold rounded-full">
                                        {data!.avalaA.length}
                                    </span>
                                )}
                            </div>
                            <div className="max-w-3xl space-y-3">
                                {(data?.avalaA.length ?? 0) === 0 ? (
                                    <EmptyState texto="No avala a ningún matriculado." />
                                ) : (
                                    data!.avalaA.map((p) => (
                                        <PersonaCard key={p.expediente} persona={p} />
                                    ))
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
