"use client";

import { useState, useEffect, useMemo } from "react";
import {
    FolderOpen, Search, FileText, FileSpreadsheet, Presentation,
    Image, Archive, File, Download, ExternalLink, Loader2, ChevronDown, X
} from "lucide-react";

interface Archivo {
    id: number;
    nombre: string;
    descripcion: string | null;
    archivo: string;
    tipo: string;
    tamano: string | null;
    descargas: number;
    createdAt: string;
}

interface Categoria {
    id: number;
    nombre: string;
    orden: number;
    archivos: Archivo[];
}

const tipoIcon: Record<string, React.ReactNode> = {
    pdf: <FileText size={16} className="text-red-500" />,
    doc: <FileText size={16} className="text-blue-500" />,
    xls: <FileSpreadsheet size={16} className="text-emerald-500" />,
    ppt: <Presentation size={16} className="text-orange-500" />,
    img: <Image size={16} className="text-purple-500" />,
    zip: <Archive size={16} className="text-amber-500" />,
    otro: <File size={16} className="text-slate-700" />,
};

const tipoBg: Record<string, string> = {
    pdf: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/40",
    doc: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40",
    xls: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40",
    ppt: "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/40",
    img: "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/40",
    zip: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40",
    otro: "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800",
};

const tipoLabel: Record<string, string> = {
    pdf: "PDF", doc: "Word", xls: "Excel", ppt: "PPT", img: "Imagen", zip: "ZIP", otro: "Archivo",
};

export default function RepositorioPage() {
    const [cats, setCats] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [openCats, setOpenCats] = useState<Set<number>>(new Set());
    const [catFiltro, setCatFiltro] = useState<number | null>(null);

    useEffect(() => {
        fetch("/api/user/archivos", { cache: "no-store" })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCats(data);
                    setOpenCats(new Set(data.map((c: Categoria) => c.id)));
                }
            })
            .finally(() => setLoading(false));
    }, []);

    function toggleCat(id: number) {
        setOpenCats(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    }

    function trackDownload(id: number) {
        setCats(prev => prev.map(c => ({
            ...c, archivos: c.archivos.map(a => a.id === id ? { ...a, descargas: a.descargas + 1 } : a)
        })));
        fetch("/api/user/archivos/descarga", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        }).catch(() => {});
    }

    const isFiltering = search.trim() !== "" || catFiltro !== null;

    const filteredCats = useMemo(() => {
        const q = search.toLowerCase().trim();
        return cats
            .filter(c => catFiltro === null || c.id === catFiltro)
            .map(c => ({
                ...c,
                archivos: q
                    ? c.archivos.filter(a =>
                        a.nombre.toLowerCase().includes(q) ||
                        (a.descripcion || "").toLowerCase().includes(q)
                    )
                    : c.archivos,
            }))
            .filter(c => c.archivos.length > 0);
    }, [cats, search, catFiltro]);

    const totalArchivos = cats.reduce((a, c) => a + c.archivos.length, 0);
    const totalResultados = filteredCats.reduce((a, c) => a + c.archivos.length, 0);

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <FolderOpen size={20} className="text-indigo-500" /> Repositorio de Archivos
                </h1>
                <p className="text-slate-700 text-sm mt-0.5">{totalArchivos} documento{totalArchivos !== 1 ? "s" : ""} disponible{totalArchivos !== 1 ? "s" : ""}</p>
            </div>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar documentos..."
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-400"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setCatFiltro(null)}
                        className={`px-3 h-10 rounded-xl text-[13px] font-semibold border transition-all
                            ${catFiltro === null ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                        Todas
                    </button>
                    {cats.map(c => (
                        <button key={c.id} onClick={() => setCatFiltro(c.id === catFiltro ? null : c.id)}
                            className={`px-3 h-10 rounded-xl text-[13px] font-semibold border transition-all
                                ${catFiltro === c.id ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                            {c.nombre}
                        </button>
                    ))}
                    {isFiltering && (
                        <button onClick={() => { setSearch(""); setCatFiltro(null); }}
                            className="flex items-center gap-1.5 px-3 h-10 rounded-xl text-[13px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <X size={12} /> Limpiar
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
            ) : cats.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <FolderOpen size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium">No hay documentos disponibles aún</p>
                </div>
            ) : filteredCats.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <Search size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium">Sin resultados para tu búsqueda</p>
                </div>
            ) : (
                <>
                    {isFiltering && (
                        <p className="text-[13px] text-slate-700">{totalResultados} resultado{totalResultados !== 1 ? "s" : ""}</p>
                    )}
                    <div className="space-y-3">
                        {filteredCats.map(cat => {
                            const isOpen = isFiltering || openCats.has(cat.id);
                            return (
                                <div key={cat.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                    {/* Header */}
                                    <button onClick={() => toggleCat(cat.id)}
                                        className="w-full flex items-center gap-3 px-5 py-4 text-left group">
                                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isOpen ? "bg-indigo-600 text-white" : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30"}`}>
                                            <FolderOpen size={14} />
                                        </span>
                                        <span className={`text-[15px] font-bold transition-colors ${isOpen ? "text-indigo-600 dark:text-indigo-400" : "text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400"}`}>
                                            {cat.nombre}
                                        </span>
                                        <span className="text-[12px] text-slate-700">{cat.archivos.length} archivo{cat.archivos.length !== 1 ? "s" : ""}</span>
                                        <ChevronDown size={15} className={`ml-auto text-slate-700 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {/* Archivos grid */}
                                    <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                        <div className="overflow-hidden">
                                            <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                                    {cat.archivos.map(arch => (
                                                        <div key={arch.id} className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm group/card ${tipoBg[arch.tipo] || tipoBg.otro}`}>
                                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-white/80 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                                                                {tipoIcon[arch.tipo] || tipoIcon.otro}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[14px] font-semibold text-slate-800 dark:text-white leading-snug line-clamp-2">{arch.nombre}</p>
                                                                {arch.descripcion && (
                                                                    <p className="text-[12px] text-slate-700 dark:text-slate-400 mt-0.5 line-clamp-1">{arch.descripcion}</p>
                                                                )}
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="text-[11px] font-bold text-slate-700 uppercase">{tipoLabel[arch.tipo] || "Archivo"}</span>
                                                                    {arch.tamano && <span className="text-[11px] text-slate-700">{arch.tamano}</span>}
                                                                </div>
                                                                <div className="flex gap-2 mt-2.5">
                                                                    <a href={arch.archivo} target="_blank" rel="noopener noreferrer"
                                                                        className="flex items-center gap-1 px-2.5 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 transition-all">
                                                                        <ExternalLink size={10} /> Ver
                                                                    </a>
                                                                    <a href={arch.archivo} download onClick={() => trackDownload(arch.id)}
                                                                        className="flex items-center gap-1 px-2.5 h-7 bg-indigo-600 border border-indigo-600 rounded-lg text-[12px] font-semibold text-white hover:bg-indigo-700 transition-all">
                                                                        <Download size={10} /> Descargar
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
