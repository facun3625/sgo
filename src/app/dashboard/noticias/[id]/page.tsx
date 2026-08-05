"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Calendar, Newspaper, X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { esHtml } from "@/lib/html";

interface Noticia {
    id: number;
    titulo: string;
    contenido: string;
    imagen: string | null;
    imagenes: string[];
    destacada: boolean;
    createdAt: string;
}

export default function NoticiaDetailPage() {
    const params = useParams();
    const [noticia, setNoticia] = useState<Noticia | null>(null);
    const [loading, setLoading] = useState(true);
    const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });

    useEffect(() => {
        fetch("/api/user/noticias")
            .then(r => r.json())
            .then((data: Noticia[]) => {
                const found = data.find(n => n.id === Number(params.id));
                if (found) setNoticia(found);
            })
            .finally(() => setLoading(false));
    }, [params.id]);

    useEffect(() => {
        if (!lightbox.open) return;
        function onKey(e: KeyboardEvent) {
            if (!noticia) return;
            if (e.key === "ArrowRight") setLightbox(l => ({ open: true, index: Math.min(l.index + 1, noticia!.imagenes.length - 1) }));
            if (e.key === "ArrowLeft") setLightbox(l => ({ open: true, index: Math.max(l.index - 1, 0) }));
            if (e.key === "Escape") setLightbox({ open: false, index: 0 });
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightbox.open, noticia]);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-slate-300" />
        </div>
    );

    if (!noticia) return (
        <div className="p-8 text-center">
            <p className="text-slate-700">Noticia no encontrada.</p>
            <Link href="/dashboard/noticias" className="text-[#063f68] text-sm font-semibold mt-2 inline-block">Volver</Link>
        </div>
    );

    // Split by double newline for paragraphs; collapse single newlines within a paragraph
    // (solo se usa para noticias viejas en texto plano; las nuevas se renderizan como HTML)
    const paragraphs = noticia.contenido
        .split(/\n\n+/)
        .map(block => block.replace(/\n/g, " ").trim())
        .filter(Boolean);

    const hasGallery = noticia.imagenes && noticia.imagenes.length > 0;

    return (
        <>
            <div className="p-4 md:p-8 pb-12">
                {/* Back */}
                <Link href="/dashboard/noticias"
                    className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-600 dark:hover:text-slate-300 text-[14px] font-medium transition-colors mb-5">
                    <ArrowLeft size={14} /> Volver a noticias
                </Link>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    {/* Imagen */}
                    {noticia.imagen ? (
                        <div className="w-full h-56 md:h-80 overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <img src={noticia.imagen} alt={noticia.titulo} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-full h-32 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                            <Newspaper size={36} className="text-slate-200 dark:text-slate-700" />
                        </div>
                    )}

                    <div className="p-6 md:p-10">
                        {/* Meta */}
                        <div className="flex items-center gap-2 text-[12px] text-slate-700 font-medium uppercase tracking-wider mb-3">
                            <Calendar size={12} />
                            {new Date(noticia.createdAt).toLocaleDateString("es-AR", {
                                timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"
                            })}
                        </div>

                        {/* Título */}
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white leading-tight mb-6">
                            {noticia.titulo}
                        </h1>

                        {/* Separador */}
                        <div className="w-12 h-1 bg-[#063f68] rounded-full mb-6" />

                        {/* Cuerpo */}
                        {esHtml(noticia.contenido) ? (
                            <div className="prose prose-sm md:prose-base max-w-none text-[16px] text-slate-600 dark:text-slate-300 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: noticia.contenido }} />
                        ) : (
                            <div className="space-y-4">
                                {paragraphs.map((p, i) => (
                                    <p key={i} className="text-[16px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {p}
                                    </p>
                                ))}
                            </div>
                        )}

                        {/* Volver */}
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <Link href="/dashboard/noticias"
                                className="inline-flex items-center gap-1.5 text-[#063f68] dark:text-blue-400 text-[14px] font-semibold hover:underline underline-offset-2 transition-colors">
                                <ArrowLeft size={14} /> Volver a noticias
                            </Link>
                        </div>

                        {/* Galería */}
                        {hasGallery && (
                            <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-4">
                                    <Images size={15} className="text-slate-700" />
                                    <h2 className="text-[13px] font-bold text-slate-700 uppercase tracking-widest">
                                        Galería · {noticia.imagenes.length} {noticia.imagenes.length === 1 ? "foto" : "fotos"}
                                    </h2>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {noticia.imagenes.map((url, i) => (
                                        <button key={i} onClick={() => setLightbox({ open: true, index: i })}
                                            className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 group relative">
                                            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightbox.open && noticia.imagenes.length > 0 && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
                    onClick={() => setLightbox({ open: false, index: 0 })}>
                    <button onClick={e => { e.stopPropagation(); setLightbox({ open: false, index: 0 }); }}
                        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10">
                        <X size={18} />
                    </button>
                    {lightbox.index > 0 && (
                        <button onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, index: l.index - 1 })); }}
                            className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    {lightbox.index < noticia.imagenes.length - 1 && (
                        <button onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, index: l.index + 1 })); }}
                            className="absolute right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10">
                            <ChevronRight size={20} />
                        </button>
                    )}
                    <img src={noticia.imagenes[lightbox.index]} alt={`Foto ${lightbox.index + 1}`}
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
                        onClick={e => e.stopPropagation()} />
                    <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-[13px]">
                        {lightbox.index + 1} / {noticia.imagenes.length}
                    </p>
                </div>
            )}
        </>
    );
}
