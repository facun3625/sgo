"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
    CreditCard,
    Search,
    ArrowRight,
    ChevronRight,
    History
} from "lucide-react";

interface SessionPayload {
    id: number;
    expediente: string;
    nombre: string;
    apellido: string;
    accessLevel: string;
}

export default function DashboardClient({ session }: { session: SessionPayload }) {
    const router = useRouter();

    return (
        <div className="space-y-8 animate-fade-in pl-4 pr-4">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#063f68] tracking-tight">
                        Hola, {session.nombre} 👋
                    </h1>
                    <p className="text-gray-400 mt-1 flex items-center gap-2">
                        Bienvenido al portal del <span className="text-[#063f68]/70 font-semibold tracking-wide">COLEGIO DE ABOGADOS DE SANTA FE</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-5 py-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-gray-700">Matrícula Activa</span>
                    </div>
                </div>
            </div>

            {/* Main Grid Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Big Card - Benefits */}
                <div className="lg:col-span-2 bg-[#063f68] rounded-[32px] p-10 text-white relative overflow-hidden group hover:shadow-2xl hover:shadow-[#063f68]/30 transition-all duration-500 min-h-[300px] flex flex-col justify-between">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-500"></div>

                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                            <CreditCard size={28} />
                        </div>
                        <h2 className="text-3xl font-bold mb-3">Tarjeta de Beneficios</h2>
                        <p className="text-blue-100/80 max-w-md text-lg leading-relaxed">
                            Accedé a descuentos exclusivos y beneficios para colegiados en comercios adheridos de toda la provincia.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-4 mt-8">
                        <button className="bg-white text-[#063f68] px-8 py-3.5 rounded-2xl font-bold text-sm shadow-xl hover:scale-105 transition-transform flex items-center gap-2">
                            Descubrir ahora <ArrowRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Search Card */}
                <div className="bg-white rounded-[32px] p-8 border border-gray-100 flex flex-col justify-between hover:shadow-xl transition-all duration-500">
                    <div>
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-[#063f68]">
                            <Search size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Consulta de Padrones</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Buscá colegas por nombre, apellido o número de matrícula rápidamente.
                        </p>
                    </div>

                    <div className="mt-8 space-y-4">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Nombre o Matrícula..."
                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#063f68]/10 transition-all"
                            />
                            <button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#063f68] text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { title: "Credencial Digital", icon: "🆔", color: "bg-blue-50 text-blue-600" },
                    { title: "Mis Pagos", icon: "💳", color: "bg-green-50 text-green-600" },
                    { title: "Certificados", icon: "📄", color: "bg-amber-50 text-amber-600" },
                    { title: "Calendario", icon: "📅", color: "bg-purple-50 text-purple-600" },
                ].map((item, idx) => (
                    <div
                        key={idx}
                        className="bg-white p-6 rounded-3xl border border-gray-50 hover:shadow-lg hover:border-[#063f68]/10 transition-all duration-300 cursor-pointer flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${item.color}`}>
                                {item.icon}
                            </div>
                            <span className="font-semibold text-gray-700 text-sm">{item.title}</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-[#063f68] transition-colors" />
                    </div>
                ))}
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 border-dashed">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                            <History size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Actividad Reciente</h3>
                    </div>
                    <button className="text-xs font-semibold text-[#063f68] hover:underline">Ver todo</button>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-2xl px-4 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center font-bold text-xs uppercase">
                                Pag
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Cuota Colegial - Septiembre 2024</p>
                                <p className="text-xs text-gray-400">Hace 2 días • Online</p>
                            </div>
                        </div>
                        <span className="text-sm font-bold text-gray-800">$12.450,00</span>
                    </div>

                    <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-2xl px-4 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xs uppercase">
                                Cert
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Certificado de Matrícula - Solicitado</p>
                                <p className="text-xs text-gray-400">Ayer a las 10:30</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                            En proceso
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
