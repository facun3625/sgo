"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Loader2 } from "lucide-react";

interface TurneroItem {
    id: number;
    titulo: string;
    archivo: string;
    createdAt: string;
}

export default function TurneroFiscalesPage() {
    const [items, setItems] = useState<TurneroItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/turnero-fiscales")
            .then(r => r.ok ? r.json() : [])
            .then(setItems)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <FileText size={20} className="text-[#063f68]" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Turnero de Fiscales</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Documentos y turnos disponibles para descarga</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={20} className="animate-spin text-slate-300" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <FileText size={22} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300">Sin documentos disponibles</p>
                        <p className="text-[13px] text-slate-400 max-w-xs">Por el momento no hay turnos de fiscales publicados.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map(item => (
                            <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                    <FileText size={18} className="text-red-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[15px] font-semibold text-slate-800 dark:text-white">{item.titulo}</p>
                                </div>
                                <a
                                    href={item.archivo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#063f68] hover:bg-[#052d4a] text-white text-[13px] font-semibold transition-all flex-shrink-0">
                                    <Download size={14} /> Descargar
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
