"use client";

import { useRouter } from "next/navigation";
import {
    CreditCard,
    Search,
    ArrowRight,
    ChevronRight,
    History,
    IdCard
} from "lucide-react";
import Link from "next/link";

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
            {/* Main Featured Row: Benefits & Digital Credential */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 -mt-2">
                {/* Benefits Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#063f68] to-[#0a568c] rounded-[32px] p-10 text-white shadow-2xl group hover:shadow-[#063f68]/30 transition-all duration-500 min-h-[280px] flex flex-col justify-between">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-500"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-white/10">
                            <CreditCard size={32} />
                        </div>
                        <h2 className="text-3xl font-extrabold mb-4 tracking-tight">Tarjeta de Beneficios</h2>
                    </div>

                    <div className="relative z-10 flex items-center gap-4 mt-4">
                        <Link
                            href="/dashboard/beneficios"
                            className="bg-white text-[#063f68] px-10 py-4 rounded-2xl font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            Ver Beneficios <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>

                {/* Digital Credential Card */}
                <div className="relative overflow-hidden bg-white border border-gray-100 rounded-[32px] p-10 text-gray-800 shadow-xl group hover:shadow-2xl hover:border-[#063f68]/10 transition-all duration-500 min-h-[280px] flex flex-col justify-between">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#063f68]/5 rounded-full blur-3xl group-hover:bg-[#063f68]/10 transition-colors duration-500"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-[#063f68]/5 rounded-2xl flex items-center justify-center mb-8 border border-[#063f68]/10 shadow-sm text-[#063f68]">
                            <IdCard size={32} />
                        </div>
                        <h2 className="text-3xl font-extrabold mb-4 tracking-tight text-[#063f68]">Credencial Digital</h2>
                    </div>

                    <div className="relative z-10 flex items-center gap-4 mt-4">
                        <button className="bg-[#063f68] text-white px-10 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-[#063f68]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                            Ver Credencial <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Secondary Row: Padrones & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Search Card */}
                <div className="bg-white rounded-[32px] p-8 border border-gray-100 flex flex-col justify-between hover:shadow-xl transition-all duration-500 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-[#063f68] shadow-inner border border-gray-100">
                            <Search size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Consulta de Padrones</h3>
                        <p className="text-gray-400 text-sm leading-relaxed font-medium">
                            Buscá colegas por nombre o matrícula.
                        </p>
                    </div>

                    <div className="relative z-10 mt-8">
                        <div className="relative group/input">
                            <input
                                type="text"
                                placeholder="Nombre o Matrícula..."
                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#063f68]/10 transition-all font-medium pr-14"
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#063f68] text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all">
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-6">
                    {[
                        { title: "Mis Pagos", icon: "💳", color: "bg-green-50 text-green-600", desc: "Consultá tu estado" },
                        { title: "Certificados", icon: "📄", color: "bg-amber-50 text-amber-600", desc: "Gestioná trámites" },
                        { title: "Calendario", icon: "📅", color: "bg-purple-50 text-purple-600", desc: "Cursos y eventos" },
                        { title: "Archivos", icon: "📁", color: "bg-blue-50 text-blue-600", desc: "Documentación" },
                    ].map((item, idx) => (
                        <div
                            key={idx}
                            className="bg-white p-6 rounded-[28px] border border-gray-50 hover:shadow-xl hover:border-[#063f68]/10 transition-all duration-300 cursor-pointer flex items-center gap-5 group shadow-sm overflow-hidden relative"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl ${item.color} shadow-sm border border-black/5`}>
                                {item.icon}
                            </div>
                            <div className="overflow-hidden">
                                <span className="font-bold text-gray-800 text-sm block truncate">{item.title}</span>
                                <span className="text-[11px] text-gray-400 font-medium">{item.desc}</span>
                            </div>
                            <ChevronRight size={18} className="absolute right-4 text-gray-300 group-hover:text-[#063f68] group-hover:translate-x-1 transition-all" />
                        </div>
                    ))}
                </div>
            </div>

            {/* History Card */}
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 border-dashed">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100">
                            <History size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Actividad Reciente</h3>
                    </div>
                    <button className="text-xs font-bold text-[#063f68] hover:underline uppercase tracking-wider">Ver todo</button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-4 border border-gray-50 hover:bg-gray-50/50 rounded-2xl px-6 transition-all hover:shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                Pag
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Cuota Colegial - Septiembre 2024</p>
                                <p className="text-[11px] text-gray-400 font-medium">Hace 2 días • Online</p>
                            </div>
                        </div>
                        <span className="text-sm font-extrabold text-[#063f68]">$12.450,00</span>
                    </div>

                    <div className="flex items-center justify-between py-4 border border-gray-50 hover:bg-gray-50/50 rounded-2xl px-6 transition-all hover:shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                Cert
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Certificado de Matrícula - Solicitado</p>
                                <p className="text-[11px] text-gray-400 font-medium">Ayer a las 10:30</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-extrabold rounded-full uppercase tracking-wider shadow-sm">
                            En proceso
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
