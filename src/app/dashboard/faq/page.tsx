import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
    ChevronLeft,
    HelpCircle,
    Search,
    MessageCircle,
    BookOpen,
    Mail,
    ExternalLink,
    ChevronDown
} from "lucide-react";
import Link from "next/link";

export default async function FAQPage() {
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
                            <HelpCircle size={18} className="text-emerald-500" />
                            <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Preguntas Frecuentes</h2>
                        </div>
                    </div>
                </div>

                <div className="p-8 md:p-12 w-full animate-fade-in">

                    {/* Hero FAQ */}
                    <div className="text-left mb-16 space-y-4">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">¿Cómo podemos ayudarte?</h1>
                        <p className="text-slate-400 dark:text-slate-500 text-base font-medium">Buscá entre las consultas más comunes de nuestros matriculados.</p>

                        <div className="max-w-2xl mt-8 relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search size={18} className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-[24px] text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all font-medium text-sm"
                                placeholder="Escribí tu pregunta aquí..."
                            />
                        </div>
                    </div>

                    {/* FAQ Items (Full width) */}
                    <div className="space-y-3">
                        {[
                            "¿Cómo descargo mi certificado de matriculación?",
                            "¿Cómo regularizo mi situación de deuda?",
                            "¿Qué beneficios tengo con la tarjeta del CASF?",
                            "¿Cómo actualizo mis datos de contacto?",
                            "¿Dónde puedo consultar la jurisprudencia actualizada?"
                        ].map((q, idx) => (
                            <div
                                key={idx}
                                className="group p-5 rounded-[24px] bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-900/30 hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-4 w-full"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 shadow-sm transition-colors shrink-0">
                                        <BookOpen size={18} />
                                    </div>
                                    <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-200 tracking-tight">{q}</span>
                                </div>
                                <ChevronDown size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                            </div>
                        ))}
                    </div>

                    {/* Support Channels */}
                    <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-8 rounded-[36px] bg-emerald-500 text-white space-y-4 relative overflow-hidden group shadow-xl shadow-emerald-500/20">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                            <Mail size={32} />
                            <h4 className="text-xl font-bold tracking-tight">Escribinos por e-mail</h4>
                            <p className="text-white/80 text-sm font-medium leading-relaxed">Nuestro equipo técnico te responderá en menos de 24hs hábiles.</p>
                            <button className="px-6 py-3 bg-white text-emerald-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-50 transition-colors shadow-lg active:scale-95">
                                Enviar Mensaje
                            </button>
                        </div>

                        <div className="p-8 rounded-[36px] bg-[#063f68] text-white space-y-4 relative overflow-hidden group shadow-xl shadow-[#063f68]/20">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                            <MessageCircle size={32} />
                            <h4 className="text-xl font-bold tracking-tight">Chat de Soporte</h4>
                            <p className="text-white/80 text-sm font-medium leading-relaxed">Conectate con un operador para resolver dudas urgentes.</p>
                            <button className="px-6 py-3 bg-white text-[#063f68] rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-lg active:scale-95">
                                Iniciar Chat
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
