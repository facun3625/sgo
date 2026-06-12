"use client";

import { useState, useEffect, useMemo } from "react";
import { HelpCircle, ChevronDown, Search, Loader2, Plus, Minus } from "lucide-react";

interface Faq {
    id: number;
    pregunta: string;
    respuesta: string;
}

interface Categoria {
    id: number;
    nombre: string;
    faqs: Faq[];
}

export default function FaqPage() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [openCats, setOpenCats] = useState<Set<number>>(new Set());
    const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetch("/api/user/faq", { cache: "no-store" })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setCategorias(data); })
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return categorias;
        return categorias.map(cat => ({
            ...cat,
            faqs: cat.faqs.filter(f =>
                f.pregunta.toLowerCase().includes(q) ||
                f.respuesta.toLowerCase().includes(q)
            ),
        })).filter(cat => cat.faqs.length > 0);
    }, [categorias, search]);

    // Al buscar: abrir todas las categorías y preguntas con resultados
    useEffect(() => {
        if (search.trim()) {
            setOpenCats(new Set(filtered.map(c => c.id)));
            setOpenFaqs(new Set(filtered.flatMap(c => c.faqs.map(f => f.id))));
        } else {
            setOpenFaqs(new Set());
        }
    }, [search, filtered]);

    function toggleCat(id: number) {
        setOpenCats(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleFaq(id: number) {
        setOpenFaqs(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    const totalPreguntas = categorias.reduce((a, c) => a + c.faqs.length, 0);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <HelpCircle size={20} className="text-slate-700" /> Preguntas Frecuentes
                </h1>
                <p className="text-slate-700 text-sm mt-0.5">{totalPreguntas} respuestas disponibles</p>
            </div>

            {/* Búsqueda */}
            <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" />
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar en las preguntas frecuentes..."
                    className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68]"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <HelpCircle size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium">{search ? "Sin resultados para tu búsqueda" : "No hay preguntas disponibles aún"}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(cat => {
                        const catOpen = openCats.has(cat.id);
                        return (
                            <div key={cat.id} className={`rounded-2xl border overflow-hidden transition-all duration-200 ${catOpen ? "border-[#063f68]/30 dark:border-blue-500/30 bg-white dark:bg-slate-900" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
                                {/* Header categoría */}
                                <button onClick={() => toggleCat(cat.id)}
                                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left group">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${catOpen ? "bg-[#063f68] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 group-hover:bg-[#063f68]/10 group-hover:text-[#063f68]"}`}>
                                            <HelpCircle size={13} />
                                        </span>
                                        <span className={`text-[15px] font-bold transition-colors duration-200 ${catOpen ? "text-[#063f68] dark:text-blue-400" : "text-slate-800 dark:text-white group-hover:text-[#063f68] dark:group-hover:text-blue-400"}`}>
                                            {cat.nombre}
                                        </span>
                                        <span className="text-[12px] text-slate-700 font-medium">{cat.faqs.length} pregunta{cat.faqs.length !== 1 ? "s" : ""}</span>
                                    </div>
                                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${catOpen ? "bg-[#063f68] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 group-hover:bg-[#063f68]/10 group-hover:text-[#063f68]"}`}>
                                        {catOpen ? <Minus size={11} /> : <Plus size={11} />}
                                    </span>
                                </button>

                                {/* Preguntas */}
                                <div className={`grid transition-all duration-300 ease-in-out ${catOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                    <div className="overflow-hidden">
                                        <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/60">
                                            {cat.faqs.map(faq => {
                                                const isOpen = openFaqs.has(faq.id);
                                                return (
                                                    <div key={faq.id} className={`transition-colors duration-200 ${isOpen ? "bg-[#063f68]/[0.02] dark:bg-blue-900/10" : ""}`}>
                                                        <button onClick={() => toggleFaq(faq.id)}
                                                            className="w-full flex items-center justify-between gap-4 px-6 py-3.5 text-left group">
                                                            <span className={`text-[14px] font-medium leading-snug transition-colors duration-200 ${isOpen ? "text-[#063f68] dark:text-blue-400" : "text-slate-700 dark:text-slate-300 group-hover:text-[#063f68] dark:group-hover:text-blue-400"}`}>
                                                                {faq.pregunta}
                                                            </span>
                                                            <ChevronDown size={14} className={`flex-shrink-0 text-slate-700 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#063f68] dark:text-blue-400" : ""}`} />
                                                        </button>
                                                        <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                                            <div className="overflow-hidden">
                                                                <div className="px-6 pb-4 pt-0">
                                                                    <div className="border-l-2 border-[#063f68]/20 dark:border-blue-400/20 pl-4">
                                                                        <p className="text-[14px] text-slate-700 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                                                            {faq.respuesta}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
