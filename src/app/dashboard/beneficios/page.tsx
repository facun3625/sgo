import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
    ChevronLeft,
    CreditCard,
    AlertCircle,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";
import CardActions from "@/components/dashboard/CardActions";
import QRComponent from "@/components/dashboard/QRComponent";

export default async function BeneficiosPage() {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    const dato = await prisma.dato.findFirst({
        where: {
            expediente: session.expediente
        }
    });

    const hasDebt = await prisma.deuda.findFirst({
        where: {
            expediente: session.expediente
        }
    });

    const isBlocked = !!hasDebt;

    const hdrs = await headers();
    const host = hdrs.get("host") || "localhost:3000";
    const proto = hdrs.get("x-forwarded-proto") || "http";
    const baseUrl = `${proto}://${host}`;
    const verificationUrl = `${baseUrl}/verificar/beneficios/${session.expediente}`;

    return (
        <div className="bg-white dark:bg-[#02182b] p-0 pb-12 transition-colors duration-300">
            <div className="w-full pt-0">

                {/* SECCIÓN BENEFICIOS */}
                <div className="bg-white dark:bg-[#02182b]">

                    {/* Header Compacto Sticky */}
                    <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-4 md:px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                            >
                                <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            </Link>
                            <div className="flex items-center gap-3">
                                <CreditCard size={18} className="text-blue-500" />
                                <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Tarjeta de Beneficios</h2>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-10 border-b border-[#f1f5f9] dark:border-slate-800 animate-fade-in">

                        {isBlocked && (
                            <div className="mb-6 md:mb-10 p-4 md:p-6 rounded-[24px] md:rounded-[32px] bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-slide-up">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                                        <AlertCircle size={22} />
                                    </div>
                                    <div className="space-y-0.5 text-left">
                                        <h3 className="text-rose-900 dark:text-rose-400 font-bold text-sm md:text-lg tracking-tight">Acceso Restringido por Deuda</h3>
                                        <p className="text-rose-700/70 dark:text-rose-400/60 text-xs md:text-sm font-medium">Regularice su situación para volver a disfrutar de los beneficios exclusivos.</p>
                                    </div>
                                </div>
                                <Link
                                    href="/dashboard/pagos"
                                    className="w-full md:w-auto px-6 h-10 md:h-12 bg-rose-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                                >
                                    Ir a Pagos
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        )}

                        {/* Layout de Contenido: Carnet + Acciones Lateral */}
                        <div className="flex flex-col lg:flex-row gap-10 items-start">

                            {/* Columna del Carnet */}
                            <div className="flex-1 w-full max-w-[500px] mx-auto lg:mx-0">
                                <div id="benefits-card" className={`relative w-full aspect-[1.6/1] rounded-[24px] md:rounded-[28px] overflow-hidden text-white p-5 md:p-8 flex flex-col justify-between border border-white/5 shadow-2xl transition-all duration-500 ${isBlocked
                                        ? "bg-gradient-to-br from-slate-700 to-slate-900 grayscale-[0.8] opacity-90"
                                        : "bg-gradient-to-br from-[#063f68] to-[#084a7a]"
                                    }`}>

                                    {/* Capas Estéticas */}
                                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent)]"></div>
                                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/[0.02] rounded-full blur-3xl"></div>

                                    {/* Header Carnet */}
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white flex items-center justify-center border border-white/20 overflow-hidden p-1 md:p-1.5 shadow-xl">
                                                <img src="/sgo.png" alt="CASF" className="w-9 md:w-12 h-auto opacity-100" />
                                            </div>
                                            <div>
                                                <p className="text-base md:text-xl font-bold tracking-tight leading-none mb-1 text-white">CASF</p>
                                                <p className="text-[8px] md:text-[9px] font-semibold tracking-[0.1em] opacity-70 uppercase text-white/70">Colegio de Abogados Santa Fe</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Datos (Finos, sin cursiva ni bold) */}
                                    <div className="relative z-10">
                                        <h2 className="text-base md:text-2xl font-light tracking-[0.02em] text-white/95 mb-3 md:mb-6 opacity-90 leading-tight">
                                            {session.apellido}, <span className="opacity-70">{session.nombre}</span>
                                        </h2>

                                        <div className="flex gap-6 md:gap-10">
                                            <div className="flex flex-col">
                                                <p className="text-[7px] md:text-[8px] font-normal text-white/50 uppercase tracking-[0.2em] mb-1">Matrícula</p>
                                                <p className="text-[11px] md:text-[14px] font-light tracking-[0.1em] md:tracking-[0.15em] text-white">{session.expediente}</p>
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[7px] md:text-[8px] font-normal text-white/50 uppercase tracking-[0.2em] mb-1">Folio</p>
                                                <p className="text-[11px] md:text-[14px] font-light tracking-[0.1em] md:tracking-[0.15em] text-white">{dato?.folio || "--"}</p>
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[7px] md:text-[8px] font-normal text-white/50 uppercase tracking-[0.2em] mb-1">Tomo</p>
                                                <p className="text-[11px] md:text-[14px] font-light tracking-[0.1em] md:tracking-[0.15em] text-white">{dato?.tomo || "--"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Footer */}
                                    <div className="relative z-10 flex justify-between items-end">
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-colors duration-500 ${isBlocked
                                                ? "bg-rose-500/10 border-rose-500/30"
                                                : "bg-white/5 border-white/5"
                                            }`}>
                                            <div className={`w-1 h-1 rounded-full animate-pulse ${isBlocked ? "bg-rose-500" : "bg-green-400"}`}></div>
                                            <span className={`text-[8px] font-black uppercase tracking-[0.12em] ${isBlocked ? "text-rose-400" : "text-white/60"}`}>
                                                {isBlocked ? "Tarjeta de beneficios inhabilitada" : "Tarjeta de beneficios habilitada"}
                                            </span>
                                        </div>
                                        {isBlocked && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07] rotate-[-12deg]">
                                                <span className="text-6xl font-black uppercase tracking-widest text-white border-8 border-white p-4">INHABILITADA</span>
                                            </div>
                                        )}
                                        <div className="bg-white/10 rounded-lg p-0.5">
                                            <QRComponent value={verificationUrl} size={56} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Columna de Acciones Lateral Compacta */}
                            <div className="w-full lg:w-64 space-y-4">
                                <div className="p-5 rounded-[24px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-relaxed">
                                        Presentá esta tarjeta en los comercios adheridos para acceder a los beneficios exclusivos.
                                    </p>
                                </div>

                                <CardActions
                                    targetId="benefits-card"
                                    fileName={`Beneficios - ${session.expediente}`}
                                    title="Tarjeta de Beneficios"
                                    disabled={isBlocked}
                                />
                            </div>
                        </div>

                        <div className="mt-6 md:mt-10 pt-6 md:pt-8 grid grid-cols-2 md:grid-cols-2 gap-6 md:gap-8">
                            <div>
                                <h4 className="text-[10px] font-bold text-black dark:text-white/40 uppercase tracking-widest mb-2 leading-none">Alcance</h4>
                                <p className="text-black dark:text-white/80 text-[11px] font-medium leading-relaxed">
                                    Documento personal de la 1era Circunscripción del CASF.
                                </p>
                            </div>
                            <div className="md:text-right">
                                <h4 className="text-[10px] font-bold text-black dark:text-white/40 uppercase tracking-widest mb-2 leading-none">Actualización</h4>
                                <p className="text-black dark:text-white/80 text-[11px] font-medium leading-relaxed font-mono">
                                    Legajo actualizado en tiempo real.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Estilos Print */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .no-print { display: none!important; }
                    body { background: white!important; padding: 0!important; }
                    .h-screen-not-needed { min-height: auto!important; padding: 0!important; }
                    .max-w-6xl { max-width: none!important; margin: 0!important; }
                    .bg-white { border: none!important; box-shadow: none!important; overflow: visible!important; }
                    #benefits-card {
                        position: absolute;
                        top: 2.5cm;
                        left: 2.5cm;
                        width: 85mm!important;
                        height: 54mm!important;
                        background: #063f68!important;
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
                `
            }} />
        </div>
    );
}
