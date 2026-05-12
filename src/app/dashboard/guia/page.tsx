"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Phone, Mail, User, Loader2, BookUser, ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Resultado {
    nombre: string;
    apellido: string;
    expediente: string | null;
    telefonosLegal: string | null;
    movilLegal: string | null;
    emailLegal: string | null;
}

export default function GuiaPage() {
    const [query, setQuery] = useState("");
    const [resultados, setResultados] = useState<Resultado[]>([]);
    const [loading, setLoading] = useState(false);
    const [buscado, setBuscado] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function buscar(q: string) {
        if (q.trim().length < 2) { setResultados([]); setBuscado(false); setLoading(false); return; }
        setLoading(true);
        setBuscado(true);
        try {
            const res = await fetch(`/api/user/guia?q=${encodeURIComponent(q.trim())}`);
            const data = await res.json();
            setResultados(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const v = e.target.value;
        setQuery(v);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (v.trim().length < 2) { setResultados([]); setBuscado(false); setLoading(false); return; }
        setLoading(true);
        debounceRef.current = setTimeout(() => buscar(v), 350);
    }

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    return (
        <div className="bg-white dark:bg-[#02182b] pb-20 transition-colors duration-300 min-h-screen">
            {/* Header sticky */}
            <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center gap-4 px-4 md:px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <Link href="/dashboard" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group">
                    <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </Link>
                <div className="flex items-center gap-3">
                    <BookUser size={18} className="text-teal-500" />
                    <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Guía de Abogados</h2>
                </div>
            </div>

            <div className="p-4 md:p-10 animate-fade-in space-y-6">
                {/* Buscador */}
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={query}
                        onChange={handleChange}
                        placeholder="Buscá por apellido o número de expediente..."
                        autoFocus
                        className="w-full h-12 pl-11 pr-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/20 focus:border-[#063f68] dark:focus:border-blue-500 transition-all shadow-sm"
                    />
                    {loading && (
                        <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={28} className="animate-spin text-[#063f68] dark:text-blue-400" />
                        <p className="text-slate-400 text-[13px] font-medium">Buscando...</p>
                    </div>
                )}

                {/* Sin resultados */}
                {!loading && buscado && resultados.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-100 dark:border-slate-800 text-slate-300">
                            <BookUser size={28} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-[15px] font-bold text-slate-700 dark:text-slate-200">Sin resultados</h3>
                            <p className="text-slate-400 text-[12px]">Probá con otro apellido o número de expediente</p>
                        </div>
                    </div>
                )}

                {/* Resultados */}
                {!loading && resultados.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {resultados.length} resultado{resultados.length !== 1 ? "s" : ""}
                        </p>
                        {resultados.map((r, i) => (
                            <div key={i} className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-start gap-4 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                                    <User size={18} className="text-teal-600 dark:text-teal-400" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-white text-[14px]">
                                            {r.apellido}, {r.nombre}
                                        </p>
                                        {r.expediente && (
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Exp. {r.expediente}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        {(r.telefonosLegal || r.movilLegal) ? (
                                            <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
                                                <Phone size={12} className="text-slate-400 flex-shrink-0" />
                                                <span>{[r.telefonosLegal, r.movilLegal].filter(Boolean).join(" / ")}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-[11px] text-slate-300 dark:text-slate-600">
                                                <Phone size={12} className="flex-shrink-0" />
                                                <span>Sin teléfono registrado</span>
                                            </div>
                                        )}
                                        {r.emailLegal ? (
                                            <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
                                                <Mail size={12} className="text-slate-400 flex-shrink-0" />
                                                <a href={`mailto:${r.emailLegal}`} className="hover:text-[#063f68] dark:hover:text-blue-400 transition-colors break-all">
                                                    {r.emailLegal}
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-[11px] text-slate-300 dark:text-slate-600">
                                                <Mail size={12} className="flex-shrink-0" />
                                                <span>Sin email registrado</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Estado inicial */}
                {!buscado && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-100 dark:border-slate-800 text-slate-300">
                            <Search size={28} />
                        </div>
                        <p className="text-slate-400 dark:text-slate-500 text-[13px] font-medium">Ingresá al menos 2 caracteres para buscar</p>
                    </div>
                )}
            </div>
        </div>
    );
}
