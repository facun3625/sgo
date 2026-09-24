"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export interface SidebarSearchItem {
    label: string;
    href: string;
    group?: string;
}

interface Props {
    items: SidebarSearchItem[];
    onNavigate?: () => void;
    placeholder?: string;
}

function normalizar(s: string): string {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Buscador predictivo de secciones del menú — mismo patrón visual que el
// combobox de destinatarios en admin/mensajes (input con ícono + dropdown
// de sugerencias con onMouseDown para que el click gane al blur).
export default function SidebarSearch({ items, onNavigate, placeholder = "Buscar sección..." }: Props) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const resultados = useMemo(() => {
        const q = normalizar(query.trim());
        if (!q) return [];
        return items.filter(i => normalizar(i.label).includes(q)).slice(0, 8);
    }, [query, items]);

    function seleccionar(href: string) {
        router.push(href);
        setQuery("");
        setOpen(false);
        onNavigate?.();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!open || resultados.length === 0) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, resultados.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
        else if (e.key === "Enter") { e.preventDefault(); seleccionar(resultados[activeIndex].href); }
        else if (e.key === "Escape") { setOpen(false); }
    }

    return (
        <div className="relative mb-2">
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIndex(0); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-300/50 transition-all"
                />
            </div>
            {open && query.trim() && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                    {resultados.length === 0 ? (
                        <p className="px-3 py-2.5 text-[12px] text-slate-400">Sin resultados</p>
                    ) : (
                        resultados.map((r, i) => (
                            <button
                                key={r.href + r.label}
                                type="button"
                                onMouseDown={() => seleccionar(r.href)}
                                onMouseEnter={() => setActiveIndex(i)}
                                className={`w-full text-left px-3 py-2 border-b border-slate-50 dark:border-slate-700/50 last:border-0 transition-colors
                                    ${i === activeIndex ? "bg-slate-50 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                            >
                                <span className="block text-[13px] text-slate-700 dark:text-slate-200">{r.label}</span>
                                {r.group && <span className="block text-[10px] text-slate-400">{r.group}</span>}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
