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
        <div className="bg-white dark:bg-[#02182b] p-0 pb-12 transition-colors duration-300">
            <div className="w-full pt-0">

                {/* SECCIÓN INICIO */}
                <div className="bg-white dark:bg-[#02182b]">

                    {/* Header Compacto Unificado Sticky */}
                    <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                        <div className="flex items-center gap-6">
                            <h1 className="text-[14px] font-medium text-black dark:text-white tracking-tight uppercase">Inicio</h1>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 animate-fade-in">
                        {/* Contenido que se agregará después */}
                        <div className="max-w-4xl">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Bienvenido, {session.nombre}!</h2>
                            <p className="text-gray-500 dark:text-slate-400 font-medium">Desde aquí puedes gestionar tu matrícula y acceder a todos los servicios del Colegio.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
