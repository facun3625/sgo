"use client";

import React, { useState } from "react";
import {
    ChevronLeft,
    Wrench,
    Plus,
    Calendar,
    Type,
    AlignLeft,
    Tag,
    Loader2,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DebugCreateEventPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        titulo: "Conferencia de Ética Profesional",
        descripcion: "Disertación obligatoria sobre los nuevos lineamientos de ética en el ejercicio de la abogacía. Entrega de certificados al finalizar.",
        fecha: new Date().toISOString().split('T')[0],
        tipo: "institucional"
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/debug/create-event-v2", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => router.push("/dashboard/calendario"), 2000);
            } else {
                const data = await res.json();
                alert(data.error || "Error al crear evento");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#02182b] min-h-screen pb-20">
            <div className="sticky top-16 z-20 bg-white/80 dark:bg-[#02182b]/80 backdrop-blur-md flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/calendario" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group">
                        <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Wrench size={18} className="text-blue-500" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Debug Panel - Generador de Eventos</h2>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-10 animate-fade-in">
                <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-[40px] p-10 space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Crear Evento</h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Herramienta de depuración para inyectar eventos directamente.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#063f68] dark:text-blue-400 ml-2">Título del Evento</label>
                            <div className="relative">
                                <Type className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="text"
                                    value={formData.titulo}
                                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                    placeholder="Ej: Asamblea Ordinaria"
                                    className="w-full h-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-16 pr-6 text-sm font-bold focus:ring-2 focus:ring-[#063f68] outline-none transition-all dark:text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#063f68] dark:text-blue-400 ml-2">Fecha</label>
                            <div className="relative">
                                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="date"
                                    value={formData.fecha}
                                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                    className="w-full h-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-16 pr-6 text-sm font-bold focus:ring-2 focus:ring-[#063f68] outline-none transition-all dark:text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#063f68] dark:text-blue-400 ml-2">Tipo de Evento</label>
                            <div className="relative">
                                <Tag className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <select
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                    className="w-full h-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-16 pr-6 text-sm font-bold focus:ring-2 focus:ring-[#063f68] outline-none transition-all dark:text-white appearance-none"
                                >
                                    <option value="institucional">Institucional</option>
                                    <option value="social">Social</option>
                                    <option value="feriado">Feriado</option>
                                    <option value="curso">Curso</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#063f68] dark:text-blue-400 ml-2">Descripción</label>
                            <div className="relative">
                                <AlignLeft className="absolute left-6 top-6 text-slate-300" size={18} />
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Detalles del evento..."
                                    className="w-full min-h-[140px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-16 pr-6 py-6 text-sm font-medium focus:ring-2 focus:ring-[#063f68] outline-none transition-all dark:text-white resize-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || success}
                            className={`w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all ${success
                                    ? "bg-emerald-500 text-white"
                                    : "bg-[#063f68] hover:bg-[#0a4d7a] text-white shadow-xl shadow-blue-500/10 active:scale-[0.98]"
                                }`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> :
                                success ? <>Evento Creado <CheckCircle2 size={20} /></> :
                                    <>Inyectar Evento <Plus size={20} /></>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
