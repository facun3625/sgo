"use client";

import { useState, useEffect } from "react";
import { PlayCircle, Loader2, ExternalLink, ChevronLeft, ChevronDown } from "lucide-react";
import Link from "next/link";

interface Tutorial {
    id: number;
    titulo: string;
    descripcion: string | null;
    videoUrl: string;
    tipo: string;
}

function getEmbedUrl(url: string): string | null {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return null;
}

function VideoPlayer({ tutorial }: { tutorial: Tutorial }) {
    if (tutorial.tipo === "embed") {
        return (
            <div
                className="w-full aspect-video bg-black"
                dangerouslySetInnerHTML={{ __html: tutorial.videoUrl }}
            />
        );
    }
    const embedUrl = getEmbedUrl(tutorial.videoUrl);
    if (embedUrl) {
        return (
            <iframe
                src={embedUrl}
                className="w-full aspect-video bg-black"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        );
    }
    return (
        <div className="w-full aspect-video bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
            <a
                href={tutorial.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 h-11 bg-[#063f68] text-white text-[13px] font-bold rounded-xl hover:bg-[#0a4d7a] transition-all active:scale-95"
            >
                <ExternalLink size={15} />
                Ver video
            </a>
        </div>
    );
}

function TutorialItem({ tutorial }: { tutorial: Tutorial }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
            {/* Fila título — siempre visible */}
            <button
                onClick={() => setOpen(p => !p)}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 dark:bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <PlayCircle size={17} className="text-pink-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white text-[13px] leading-snug">{tutorial.titulo}</p>
                    {tutorial.descripcion && (
                        <p className="text-slate-400 text-[11px] mt-0.5 truncate">{tutorial.descripcion}</p>
                    )}
                </div>
                <ChevronDown
                    size={16}
                    className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
            </button>

            {/* Video — se despliega al abrir */}
            {open && (
                <div className="border-t border-slate-100 dark:border-slate-800">
                    <VideoPlayer tutorial={tutorial} />
                </div>
            )}
        </div>
    );
}

export default function TutorialesPage() {
    const [tutoriales, setTutoriales] = useState<Tutorial[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/tutoriales")
            .then(r => r.json())
            .then(data => setTutoriales(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="bg-white dark:bg-[#02182b] pb-20 transition-colors duration-300 min-h-screen">
            {/* Header sticky */}
            <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center gap-4 px-4 md:px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <Link href="/dashboard" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group">
                    <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </Link>
                <div className="flex items-center gap-3">
                    <PlayCircle size={18} className="text-pink-500" />
                    <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Tutoriales</h2>
                </div>
            </div>

            <div className="p-4 md:p-10 animate-fade-in space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 size={28} className="animate-spin text-[#063f68] dark:text-blue-400" />
                        <p className="text-slate-400 text-[13px] font-medium">Cargando tutoriales...</p>
                    </div>
                ) : tutoriales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-100 dark:border-slate-800 text-slate-300">
                            <PlayCircle size={28} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-[15px] font-bold text-slate-700 dark:text-slate-200">Sin tutoriales</h3>
                            <p className="text-slate-400 text-[12px]">Próximamente se publicarán guías de ayuda.</p>
                        </div>
                    </div>
                ) : (
                    tutoriales.map(t => <TutorialItem key={t.id} tutorial={t} />)
                )}
            </div>
        </div>
    );
}
