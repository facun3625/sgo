import Link from "next/link";
import { ChevronLeft, Wallet } from "lucide-react";
import MatriculaStatus from "@/components/dashboard/MatriculaStatus";

export default function PagosPage() {
    return (
        <div className="flex flex-col h-auto">
            {/* Cabecera Estilo "Fina" Estandarizada */}
            <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                    >
                        <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Wallet size={18} className="text-emerald-500" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Estado de Matrícula y Pagos</h2>
                    </div>
                </div>
            </div>

            {/* Contenido de Pagos */}
            <div className="flex-1 p-6 md:p-10 w-full">
                <MatriculaStatus />
            </div>
        </div>
    );
}
