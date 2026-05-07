"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
    Search,
    Download,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    X,
    Check,
    Loader2,
} from "lucide-react";

const AVAILABLE_COLS = [
    { key: "documento", label: "DNI" },
    { key: "cuil", label: "CUIL" },
    { key: "emailLegal", label: "Email Legal" },
    { key: "emailReal", label: "Email Real" },
    { key: "telefonosLegal", label: "Teléfono Legal" },
    { key: "movilLegal", label: "Móvil Legal" },
    { key: "telefonosReal", label: "Teléfono Real" },
    { key: "movilReal", label: "Móvil Real" },
    { key: "domicilioLegal", label: "Domicilio Legal" },
    { key: "postalLegal", label: "CP Legal" },
    { key: "localidadLegal", label: "Localidad Legal" },
    { key: "domicilioReal", label: "Domicilio Real" },
    { key: "postalReal", label: "CP Real" },
    { key: "localidadReal", label: "Localidad Real" },
    { key: "folio", label: "Folio" },
    { key: "tomo", label: "Tomo" },
    { key: "tipo", label: "Tipo" },
    { key: "fechaMatriculacion", label: "Fecha Matric." },
    { key: "status", label: "Estado" },
] as const;

type ColKey = (typeof AVAILABLE_COLS)[number]["key"];

const STORAGE_KEY = "legajo_cols_v1";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    active: { label: "Activo", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    suspended: { label: "Suspendido", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    cancelled: { label: "Cancelado", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
};

interface Row {
    id: number;
    expediente: string | null;
    cod: string;
    apellido: string;
    nombre: string;
    documento: string | null;
    cuil: string | null;
    emailLegal: string | null;
    emailReal: string | null;
    telefonosLegal: string | null;
    movilLegal: string | null;
    telefonosReal: string | null;
    movilReal: string | null;
    domicilioLegal: string | null;
    postalLegal: string | null;
    localidadLegal: string | null;
    domicilioReal: string | null;
    postalReal: string | null;
    localidadReal: string | null;
    folio: string | null;
    tomo: string | null;
    tipo: string | null;
    fechaMatriculacion: string | null;
    status: string | null;
}

export default function LegajoPage() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState<Row[]>([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selectedCols, setSelectedCols] = useState<ColKey[]>([]);
    const [colPickerOpen, setColPickerOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const colPickerRef = useRef<HTMLDivElement>(null);

    // Load saved cols from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setSelectedCols(JSON.parse(saved));
        } catch {}
    }, []);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    // Close col picker on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
                setColPickerOpen(false);
            }
        }
        if (colPickerOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [colPickerOpen]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                ...(debouncedSearch && { search: debouncedSearch }),
            });
            const res = await fetch(`/api/admin/legajo?${params}`);
            const data = await res.json();
            setRows(data.rows ?? []);
            setTotal(data.total ?? 0);
            setPages(data.pages ?? 1);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => { fetchData(); }, [fetchData]);

    function toggleCol(key: ColKey) {
        setSelectedCols((prev) => {
            const next = prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }

    function handleExport() {
        setExporting(true);
        const params = new URLSearchParams({
            ...(debouncedSearch && { search: debouncedSearch }),
            ...(selectedCols.length && { cols: selectedCols.join(",") }),
        });
        window.location.href = `/api/admin/legajo/export?${params}`;
        setTimeout(() => setExporting(false), 2000);
    }

    const visibleCols = AVAILABLE_COLS.filter((c) => selectedCols.includes(c.key));

    function cellValue(row: Row, key: ColKey): string {
        if (key === "fechaMatriculacion" && row.fechaMatriculacion) {
            return new Date(row.fechaMatriculacion).toLocaleDateString("es-AR");
        }
        const val = row[key as keyof Row];
        return val != null ? String(val) : "—";
    }

    const linkKey = (row: Row) => row.expediente ?? row.cod;

    return (
        <div className="flex flex-col min-h-screen bg-white dark:bg-[#02182b]">
            {/* Header */}
            <div className="sticky top-16 z-10 bg-white/80 dark:bg-[#02182b]/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 md:px-10 py-3.5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[15px] font-bold text-slate-800 dark:text-white">Legajo</h1>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            {loading ? "Cargando..." : `${total.toLocaleString()} registros`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Column picker */}
                        <div className="relative" ref={colPickerRef}>
                            <button
                                onClick={() => setColPickerOpen((v) => !v)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
                                    colPickerOpen
                                        ? "bg-[#063f68] text-white border-[#063f68]"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#063f68] dark:hover:border-[#063f68]"
                                }`}
                            >
                                <SlidersHorizontal size={14} />
                                Columnas
                                {selectedCols.length > 0 && (
                                    <span className="ml-1 bg-[#063f68] text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                                        {selectedCols.length}
                                    </span>
                                )}
                            </button>
                            {colPickerOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1">
                                        Columnas adicionales
                                    </p>
                                    <div className="space-y-0.5 max-h-72 overflow-y-auto">
                                        {AVAILABLE_COLS.map((col) => {
                                            const active = selectedCols.includes(col.key);
                                            return (
                                                <button
                                                    key={col.key}
                                                    onClick={() => toggleCol(col.key)}
                                                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-[12px] transition-all ${
                                                        active
                                                            ? "bg-[#063f68]/10 text-[#063f68] dark:text-blue-400"
                                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${active ? "bg-[#063f68] border-[#063f68]" : "border-slate-300 dark:border-slate-600"}`}>
                                                        {active && <Check size={10} className="text-white" />}
                                                    </div>
                                                    {col.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedCols.length > 0 && (
                                        <button
                                            onClick={() => { setSelectedCols([]); localStorage.removeItem(STORAGE_KEY); }}
                                            className="w-full mt-1 flex items-center gap-2 px-2 py-1.5 rounded-xl text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                        >
                                            <X size={12} /> Limpiar selección
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Export */}
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-60"
                        >
                            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Exportar Excel
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por expediente, apellido, nombre o DNI..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-[13px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-[#063f68]/30 focus:border-[#063f68] text-slate-700 dark:text-white placeholder-slate-400 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 p-6 md:p-10 pt-6">
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Expediente</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Apellido</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Nombre</th>
                                    {visibleCols.map((col) => (
                                        <th key={col.key} className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Legajo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4 + visibleCols.length} className="py-20 text-center">
                                            <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={4 + visibleCols.length} className="py-20 text-center text-slate-400 text-[13px]">
                                            No se encontraron registros
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[12px] whitespace-nowrap">
                                                {row.expediente ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                                                {row.apellido}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {row.nombre}
                                            </td>
                                            {visibleCols.map((col) => (
                                                <td key={col.key} className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[200px] truncate">
                                                    {col.key === "status" && row.status ? (
                                                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[11px] font-semibold ${STATUS_BADGE[row.status]?.cls ?? ""}`}>
                                                            {STATUS_BADGE[row.status]?.label ?? row.status}
                                                        </span>
                                                    ) : (
                                                        cellValue(row, col.key)
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                {linkKey(row) ? (
                                                    <Link
                                                        href={`/admin/legajo/${linkKey(row)}`}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-[#063f68] dark:text-blue-400 hover:bg-[#063f68]/10 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        Ver legajo <ExternalLink size={11} />
                                                    </Link>
                                                ) : (
                                                    <span className="text-slate-300 text-[11px]">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {pages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-[12px] text-slate-400">
                            Página {page} de {pages} · {total.toLocaleString()} registros
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
                            </button>
                            {Array.from({ length: Math.min(7, pages) }, (_, i) => {
                                let p: number;
                                if (pages <= 7) p = i + 1;
                                else if (page <= 4) p = i + 1;
                                else if (page >= pages - 3) p = pages - 6 + i;
                                else p = page - 3 + i;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`min-w-[32px] h-8 px-2 rounded-xl text-[12px] font-semibold transition-all ${
                                            p === page
                                                ? "bg-[#063f68] text-white"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                disabled={page === pages}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                            >
                                <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
