import Link from "next/link";
import { ChevronLeft, User } from "lucide-react";
import PersonalDocsForm from "@/components/dashboard/PersonalDocsForm";

export default function MisDatosPage() {
    return (
        <div className="flex flex-col h-auto">
            {/* Cabecera Estilo "Fina" */}
            <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                    >
                        <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <User size={18} className="text-indigo-500" />
                        <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Mis Datos Personales</h2>
                    </div>
                </div>
            </div>

            {/* Contenido del Legajo */}
            <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
                <PersonalDocsForm />
            </div>
        </div>
    );
}
