"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function CuilGate() {
    const pathname = usePathname();

    if (pathname === "/dashboard/mis-datos") return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-md">
            <div className="max-w-md w-full mx-4 bg-white dark:bg-[#0a2540] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center flex-shrink-0">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <h2 className="text-[17px] font-bold text-black dark:text-white tracking-tight">
                            Completá tu CUIL para continuar
                        </h2>
                        <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                            Acción requerida antes de usar la plataforma
                        </p>
                    </div>
                </div>

                <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Para continuar usando el sistema necesitamos que completes tu número de CUIL.
                    Aprovechá también para verificar que tus datos de contacto estén correctos y actualizados.
                </p>

                <Link
                    href="/dashboard/mis-datos"
                    className="flex items-center justify-center gap-2 w-full h-12 bg-[#063f68] dark:bg-blue-600 text-white rounded-2xl font-bold text-[13px] hover:bg-[#0a4d7a] dark:hover:bg-blue-500 transition-all active:scale-95"
                >
                    Completar mis datos →
                </Link>
            </div>
        </div>
    );
}
