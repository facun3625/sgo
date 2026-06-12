"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Newspaper, Loader2, ChevronRight, Star } from "lucide-react";

interface Noticia {
    id: number;
    titulo: string;
    contenido: string;
    imagen: string | null;
    destacada: boolean;
    createdAt: string;
}

export default function NoticiasPage() {
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/noticias", { cache: "no-store" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setNoticias(data); })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-4 md:p-8 space-y-5">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">Noticias</h1>
                <p className="text-slate-700 text-sm mt-0.5">Novedades e información institucional</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
            ) : noticias.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-14 text-center">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Newspaper size={26} className="text-slate-300" />
                    </div>
                    <p className="text-slate-700 font-medium">No hay noticias publicadas</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {noticias.map(n => (
                        <Link key={n.id} href={`/dashboard/noticias/${n.id}`}
                            className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all flex flex-col">
                            <div className="h-44 bg-slate-100 dark:bg-slate-800 relative flex-shrink-0">
                                {n.imagen ? (
                                    <img src={n.imagen} alt={n.titulo} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Newspaper size={32} className="text-slate-300" />
                                    </div>
                                )}
                                {n.destacada && (
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-white text-[10px] font-bold uppercase tracking-wider">
                                        <Star size={10} fill="white" /> Destacada
                                    </div>
                                )}
                            </div>
                            <div className="p-4 flex flex-col flex-1 gap-2">
                                <p className="text-[11px] text-slate-700">
                                    {new Date(n.createdAt).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" })}
                                </p>
                                <h3 className="font-bold text-slate-800 dark:text-white text-[14px] leading-snug line-clamp-2 group-hover:text-[#063f68] dark:group-hover:text-blue-400 transition-colors flex-1">
                                    {n.titulo}
                                </h3>
                                <p className="text-[12px] text-slate-700 line-clamp-2">{n.contenido}</p>
                                <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex items-center gap-1 text-[12px] font-semibold text-[#063f68] dark:text-blue-400 group-hover:underline underline-offset-2 transition-colors">
                                    Leer más <ChevronRight size={13} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
