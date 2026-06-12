"use client";

import { useState, useEffect, useMemo } from "react";
import { BookOpen, FileText, Search, Heart, ExternalLink, Download, Loader2, Library, Star, TrendingUp, Eye, Grid3x3, X, Globe, Scale } from "lucide-react";
import Link from "next/link";

interface BibliotecaItem {
    id: number;
    tipo: string;
    titulo: string;
    autor: string;
    categoria: string;
    tags: string[];
    archivo: string;
    portada: string | null;
    destacado: boolean;
    vistas: number;
    createdAt: string;
    esFavorito: boolean;
}

function ItemCard({ item, onToggleFav, togglingId, onView }: {
    item: BibliotecaItem;
    onToggleFav: (id: number) => void;
    togglingId: number | null;
    onView: (id: number) => void;
}) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col hover:shadow-md transition-all group">
            <div className="h-44 bg-slate-50 dark:bg-slate-800 relative flex-shrink-0">
                {item.portada ? (
                    <img src={item.portada} alt={item.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        {item.tipo === "libro"
                            ? <BookOpen size={36} className="text-slate-200 dark:text-slate-700" />
                            : <FileText size={36} className="text-slate-200 dark:text-slate-700" />}
                    </div>
                )}
                <span className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-white
                    ${item.tipo === "libro" ? "bg-blue-500" : "bg-purple-500"}`}>
                    {item.tipo === "libro" ? "Libro" : "Jurisprudencia"}
                </span>
                {item.vistas > 0 && (
                    <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 text-white text-[11px] font-medium">
                        <Eye size={9} /> {item.vistas}
                    </span>
                )}
                <button
                    onClick={() => onToggleFav(item.id)}
                    disabled={togglingId === item.id}
                    className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 shadow hover:scale-110 transition-all">
                    <Heart size={14}
                        className={item.esFavorito ? "text-rose-500" : "text-slate-700"}
                        fill={item.esFavorito ? "currentColor" : "none"} />
                </button>
            </div>

            <div className="p-4 flex flex-col flex-1 gap-1.5">
                <p className="text-[11px] text-slate-700 font-semibold uppercase tracking-wide">{item.categoria}</p>
                <h3 className="font-bold text-slate-800 dark:text-white text-[14px] leading-snug line-clamp-2">{item.titulo}</h3>
                <p className="text-[13px] text-slate-700 italic">{item.autor}</p>

                {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {item.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 rounded text-[11px]">{tag}</span>
                        ))}
                        {item.tags.length > 3 && <span className="text-[11px] text-slate-700">+{item.tags.length - 3}</span>}
                    </div>
                )}

                <div className="mt-auto pt-3 flex gap-2">
                    <a href={item.archivo} target="_blank" rel="noopener noreferrer"
                        onClick={() => onView(item.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all">
                        <ExternalLink size={12} /> Ver
                    </a>
                    <a href={item.archivo} download
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 border border-[#063f68] text-[#063f68] dark:text-blue-400 dark:border-blue-400/50 rounded-xl text-[13px] font-bold hover:bg-[#063f68]/5 transition-all">
                        <Download size={12} /> Descargar
                    </a>
                </div>
            </div>
        </div>
    );
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
                {icon}
                <h2 className="text-[16px] font-bold text-slate-800 dark:text-white">{title}</h2>
            </div>
            {subtitle && <span className="text-[13px] text-slate-700">{subtitle}</span>}
        </div>
    );
}

type Seccion = "biblioteca" | "sistema" | "jurisprudencia";

export default function BibliotecaPage() {
    const [seccion, setSeccion] = useState<Seccion>("biblioteca");
    const [items, setItems] = useState<BibliotecaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tipoFiltro, setTipoFiltro] = useState<"todos" | "libro" | "jurisprudencia">("todos");
    const [soloFavoritos, setSoloFavoritos] = useState(false);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [showGrid, setShowGrid] = useState(false);

    useEffect(() => {
        fetch("/api/user/biblioteca", { cache: "no-store" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setItems(data); })
            .finally(() => setLoading(false));
    }, []);

    async function toggleFavorito(id: number) {
        setTogglingId(id);
        const res = await fetch("/api/user/biblioteca/favoritos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bibliotecaId: id }),
        });
        const data = await res.json();
        setItems(prev => prev.map(item => item.id === id ? { ...item, esFavorito: data.favorito } : item));
        setTogglingId(null);
    }

    function trackView(id: number) {
        setItems(prev => prev.map(item => item.id === id ? { ...item, vistas: item.vistas + 1 } : item));
        fetch("/api/user/biblioteca/vista", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bibliotecaId: id }),
        }).catch(() => {});
    }

    const destacados = useMemo(() => items.filter(i => i.destacado), [items]);
    const masConsultados = useMemo(() => [...items].sort((a, b) => b.vistas - a.vistas).filter(i => i.vistas > 0).slice(0, 8), [items]);

    const isFiltering = search.trim() !== "" || tipoFiltro !== "todos" || soloFavoritos;

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return items.filter(item => {
            if (tipoFiltro !== "todos" && item.tipo !== tipoFiltro) return false;
            if (soloFavoritos && !item.esFavorito) return false;
            if (!q) return true;
            return (
                item.titulo.toLowerCase().includes(q) ||
                item.autor.toLowerCase().includes(q) ||
                item.categoria.toLowerCase().includes(q) ||
                item.tags.some(t => t.toLowerCase().includes(q))
            );
        });
    }, [items, search, tipoFiltro, soloFavoritos]);

    const cardProps = { onToggleFav: toggleFavorito, togglingId, onView: trackView };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Library size={20} className="text-[#063f68] dark:text-blue-400" /> Biblioteca
                </h1>
                <p className="text-slate-700 text-sm mt-0.5">Libros y jurisprudencia del CPASF</p>
            </div>

            {/* Tabs desplazables */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {([
                    { key: "biblioteca", label: "Biblioteca Digital", icon: <Library size={14} /> },
                    { key: "sistema", label: "Sistema de Biblioteca", icon: <Globe size={14} /> },
                    { key: "jurisprudencia", label: "Solicitar Jurisprudencia", icon: <Scale size={14} /> },
                ] as { key: Seccion; label: string; icon: React.ReactNode }[]).map(tab => (
                    <button key={tab.key} onClick={() => setSeccion(tab.key)}
                        className={`flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all border flex-shrink-0
                            ${seccion === tab.key
                                ? "bg-[#063f68] border-[#063f68] text-white dark:bg-blue-600 dark:border-blue-600"
                                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Sección: Sistema de Biblioteca */}
            {seccion === "sistema" && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-[#063f68]/10 dark:bg-blue-400/10 flex items-center justify-center">
                        <Globe size={36} className="text-[#063f68] dark:text-blue-400" />
                    </div>
                    <div className="text-center space-y-2 max-w-md">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Sistema de Biblioteca CASF</h2>
                        <p className="text-sm text-slate-700 dark:text-slate-400">Accedé al catálogo completo y los servicios de la biblioteca del Colegio de Abogados de Santa Fe.</p>
                    </div>
                    <a href="https://www.casf.org.ar/colegio/biblioteca/" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 h-12 px-8 bg-[#063f68] hover:bg-[#0a4d7a] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all">
                        <ExternalLink size={16} /> Ir al Sistema de Biblioteca
                    </a>
                </div>
            )}

            {/* Sección: Solicitar Jurisprudencia */}
            {seccion === "jurisprudencia" && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                        <Scale size={36} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="text-center space-y-2 max-w-md">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Solicitud de Jurisprudencia</h2>
                        <p className="text-sm text-slate-700 dark:text-slate-400">Solicitá búsquedas de jurisprudencia específica. El equipo de biblioteca te enviará los resultados a la brevedad.</p>
                    </div>
                    <Link href="/dashboard/solicitudes/jurisprudencia"
                        className="flex items-center gap-2 h-12 px-8 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-sm transition-all">
                        <Scale size={16} /> Solicitar Jurisprudencia
                    </Link>
                </div>
            )}

            {seccion === "biblioteca" && (<>

            {/* Barra de búsqueda y filtros */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por título, autor, categoría o tag..."
                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {(["todos", "libro", "jurisprudencia"] as const).map(t => (
                        <button key={t} onClick={() => setTipoFiltro(t)}
                            className={`px-3 h-10 rounded-xl text-[13px] font-semibold transition-all border
                                ${tipoFiltro === t
                                    ? "bg-[#063f68] border-[#063f68] text-white"
                                    : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                            {t === "todos" ? "Todos" : t === "libro" ? "Libros" : "Jurisprudencia"}
                        </button>
                    ))}
                    <button onClick={() => setSoloFavoritos(!soloFavoritos)}
                        className={`flex items-center gap-1.5 px-3 h-10 rounded-xl text-[13px] font-semibold transition-all border
                            ${soloFavoritos
                                ? "bg-rose-500 border-rose-500 text-white"
                                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                        <Heart size={13} fill={soloFavoritos ? "white" : "none"} /> Favoritos
                    </button>
                    {(isFiltering || showGrid) && (
                        <button onClick={() => { setSearch(""); setTipoFiltro("todos"); setSoloFavoritos(false); setShowGrid(false); }}
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
            ) : isFiltering ? (
                /* Vista de resultados de búsqueda/filtro */
                <>
                    <p className="text-[13px] text-slate-700">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
                    {filtered.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                            <Library size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-700 font-medium">Sin resultados</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {filtered.map(item => <ItemCard key={item.id} item={item} {...cardProps} />)}
                        </div>
                    )}
                </>
            ) : showGrid ? (
                /* Todos los documentos */
                <>
                    <div className="flex items-center justify-between">
                        <SectionTitle icon={<Grid3x3 size={16} className="text-slate-700" />} title="Todos los documentos" subtitle={`${items.length} disponibles`} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {items.map(item => <ItemCard key={item.id} item={item} {...cardProps} />)}
                    </div>
                </>
            ) : (
                /* Vista principal: Destacados + Más consultados */
                <div className="space-y-8">
                    {/* Destacados */}
                    {destacados.length > 0 && (
                        <section>
                            <SectionTitle
                                icon={<Star size={16} className="text-amber-500 fill-amber-500" />}
                                title="Destacados"
                                subtitle="Seleccionados por el CPASF"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {destacados.map(item => <ItemCard key={item.id} item={item} {...cardProps} />)}
                            </div>
                        </section>
                    )}

                    {/* Más consultados */}
                    {masConsultados.length > 0 && (
                        <section>
                            <SectionTitle
                                icon={<TrendingUp size={16} className="text-emerald-500" />}
                                title="Más consultados"
                                subtitle="Los más vistos por los matriculados"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {masConsultados.map(item => <ItemCard key={item.id} item={item} {...cardProps} />)}
                            </div>
                        </section>
                    )}

                    {/* CTA para ver todos */}
                    {items.length > 0 && (
                        <section>
                            <button
                                onClick={() => setShowGrid(true)}
                                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-500 hover:border-[#063f68]/40 hover:text-[#063f68] dark:hover:text-blue-400 dark:hover:border-blue-400/40 transition-all text-[14px] font-semibold group">
                                <Grid3x3 size={15} className="group-hover:scale-110 transition-transform" />
                                Ver todos los documentos ({items.length})
                            </button>
                        </section>
                    )}

                    {items.length === 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                            <Library size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-700 font-medium">No hay documentos disponibles</p>
                        </div>
                    )}
                </div>
            )}
            </>)}
        </div>
    );
}
