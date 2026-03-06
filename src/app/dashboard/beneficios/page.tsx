import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CardActions from "@/components/dashboard/CardActions";

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

    return (
        <div className="bg-white dark:bg-[#02182b] p-0 pb-12 transition-colors duration-300">
            <div className="w-full pt-0">

                {/* SECCIÓN BENEFICIOS */}
                <div className="bg-white dark:bg-[#02182b]">

                    {/* Header Compacto Sticky */}
                    <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                        <div className="flex items-center gap-6">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 text-black dark:text-white hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-300 group"
                            >
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                <span className="text-[12px] font-medium tracking-tight">Volver</span>
                            </Link>
                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <h1 className="text-[14px] font-medium text-black dark:text-white tracking-tight uppercase">Tarjeta de Beneficios</h1>
                        </div>
                    </div>

                    <div className="p-6 md:p-10 border-b border-[#f1f5f9] dark:border-slate-800 animate-fade-in">
                        {/* Layout de Contenido: Carnet + Acciones Lateral */}
                        <div className="flex flex-col lg:flex-row gap-10 items-start">

                            {/* Columna del Carnet */}
                            <div className="flex-1 w-full max-w-[500px]">
                                <div id="benefits-card" className="relative w-full aspect-[1.6/1] bg-gradient-to-br from-[#063f68] to-[#084a7a] rounded-[28px] overflow-hidden text-white p-8 flex flex-col justify-between border border-white/5 shadow-2xl">

                                    {/* Capas Estéticas */}
                                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent)]"></div>
                                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/[0.02] rounded-full blur-3xl"></div>

                                    {/* Header Carnet */}
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center border border-white/20 overflow-hidden p-1.5 shadow-xl">
                                                <img src="/sgo.png" alt="CASF" className="w-12 h-auto opacity-100" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold tracking-tight leading-none mb-1 text-white">CASF</p>
                                                <p className="text-[9px] font-semibold tracking-[0.1em] opacity-70 uppercase text-white/70">Colegio de Abogados Santa Fe</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Datos (Finos, sin cursiva ni bold) */}
                                    <div className="relative z-10">
                                        <h2 className="text-xl md:text-2xl font-light tracking-[0.02em] text-white/95 mb-6 opacity-90 leading-tight">
                                            {session.apellido}, <span className="opacity-70">{session.nombre}</span>
                                        </h2>

                                        <div className="flex gap-10">
                                            <div className="flex flex-col">
                                                <p className="text-[8px] font-normal text-white/50 uppercase tracking-[0.2em] mb-1.5">Matrícula</p>
                                                <p className="text-[14px] font-light tracking-[0.15em] text-white">{session.expediente}</p>
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[8px] font-normal text-white/50 uppercase tracking-[0.2em] mb-1.5">Folio</p>
                                                <p className="text-[14px] font-light tracking-[0.15em] text-white">{dato?.folio || "--"}</p>
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[8px] font-normal text-white/50 uppercase tracking-[0.2em] mb-1.5">Tomo</p>
                                                <p className="text-[14px] font-light tracking-[0.15em] text-white">{dato?.tomo || "--"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Footer */}
                                    <div className="relative z-10 flex justify-between items-end">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
                                            <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                                            <span className="text-[8px] font-medium text-white/60 uppercase tracking-[0.12em]">Tarjeta de beneficios habilitada</span>
                                        </div>
                                        <p className="text-[6px] font-light uppercase tracking-[0.3em] opacity-20 text-white/20">SGO Operativa</p>
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
                                    fileName={`Beneficios-${session.expediente}`}
                                    title="Tarjeta de Beneficios"
                                />
                            </div>
                        </div>

                        <div className="mt-10 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
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
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    .min-h-screen { min-height: auto !important; padding: 0 !important; }
                    .max-w-6xl { max-width: none !important; margin: 0 !important; }
                    .bg-white { border: none !important; box-shadow: none !important; overflow: visible !important; }
                    #benefits-card { 
                        position: absolute; 
                        top: 2.5cm; 
                        left: 2.5cm; 
                        width: 85mm !important; 
                        height: 54mm !important; 
                        background: #063f68 !important; 
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}} />
        </div>
    );
}
