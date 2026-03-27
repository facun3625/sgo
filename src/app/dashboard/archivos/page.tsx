import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
    ChevronLeft,
    FolderOpen,
    Search,
    Filter,
    FileText,
    Download,
    Eye
} from "lucide-react";
import Link from "next/link";

export default async function RepositorioPage() {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="bg-white dark:bg-[#02182b] min-h-screen pb-12 transition-colors duration-300">
            <div className="w-full pt-0">

                {/* Header Compacto Sticky */}
                <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                        >
                            <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <FolderOpen size={18} className="text-indigo-500" />
                            <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Repositorio Digital</h2>
                        </div>
                    </div>

                    {/* Search Bar (Visual only for now) */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl w-64 transition-all focus-within:border-indigo-500/50">
                        <Search size={14} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar documentos..."
                            className="bg-transparent border-none text-[12px] focus:outline-none text-slate-600 dark:text-slate-300 w-full font-medium"
                        />
                    </div>
                </div>

                <div className="p-8 md:p-12 w-full animate-fade-in">

                    {/* Empty State Premium */}
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-[40px] bg-slate-50/30 dark:bg-slate-900/10">
                        <div className="w-24 h-24 rounded-[32px] bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-8 relative">
                            <FolderOpen size={40} />
                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-[#02182b] border-4 border-slate-50 dark:border-indigo-900/20 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Repositorio en construcción</h3>
                        <p className="text-slate-400 dark:text-slate-500 text-sm max-w-md font-medium leading-relaxed">
                            Próximamente podrás acceder a todos tus documentos, normativas, y archivos digitales de forma centralizada y segura.
                        </p>

                        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mx-auto">
                            <div className="p-6 rounded-[28px] bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <FileText size={18} />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Documentos</p>
                                <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">Acceso a expedientes digitales</p>
                            </div>
                            <div className="p-6 rounded-[28px] bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                    <Download size={18} />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Descargas</p>
                                <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">Material de apoyo y plantillas</p>
                            </div>
                            <div className="p-6 rounded-[28px] bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                    <Eye size={18} />
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Seguridad</p>
                                <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">Verificación con firma digital</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
