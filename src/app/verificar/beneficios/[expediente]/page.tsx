import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, ShieldCheck, CreditCard } from "lucide-react";
import Image from "next/image";

export default async function VerificarBeneficiosPage({ params }: { params: Promise<{ expediente: string }> }) {
    const { expediente: rawExpediente } = await params;
    const expediente = decodeURIComponent(rawExpediente);

    const [user, deuda] = await Promise.all([
        prisma.user.findFirst({ where: { expediente } }),
        prisma.deuda.findFirst({ where: { expediente } }),
    ]);

    if (!user || user.status !== "active") {
        notFound();
    }

    const habilitada = !deuda;

    const now = new Date().toLocaleDateString("es-AR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4 py-12">

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

                {/* Header institucional */}
                <div className="bg-[#063f68] px-8 py-6 flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1.5 shrink-0">
                        <Image src="/sgo_nuevo.png" alt="CPASF" width={44} height={44} className="object-contain" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-[15px] leading-tight">Tarjeta de Beneficios</p>
                        <p className="text-white/60 text-[11px] font-semibold uppercase tracking-widest">Colegio de la Abogacía · CPASF</p>
                    </div>
                </div>

                {/* Badge de estado */}
                <div className="mx-6 py-5 flex items-center gap-3 border-b border-slate-100">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${habilitada ? "bg-emerald-50" : "bg-rose-50"}`}>
                        {habilitada
                            ? <CheckCircle2 size={26} className="text-emerald-500" />
                            : <XCircle size={26} className="text-rose-500" />
                        }
                    </div>
                    <div>
                        <p className={`text-[13px] font-black uppercase tracking-tight ${habilitada ? "text-emerald-600" : "text-rose-600"}`}>
                            {habilitada ? "Tarjeta Habilitada" : "Tarjeta Inhabilitada"}
                        </p>
                        <p className="text-slate-400 text-[11px] font-medium">
                            {habilitada
                                ? "Acceso a beneficios exclusivos vigente"
                                : "El titular posee deuda pendiente"
                            }
                        </p>
                    </div>
                </div>

                {/* Foto y nombre */}
                <div className="px-6 pt-5 pb-4 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {user.image ? (
                            <img src={user.image} alt="Foto" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl font-black text-slate-300">
                                {user.nombre[0]}{user.apellido[0]}
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-[18px] font-bold text-slate-900 leading-tight">
                            {user.apellido}, {user.nombre}
                        </h1>
                        <p className="text-[12px] text-slate-400 font-medium mt-0.5">Matrícula {user.expediente}</p>
                    </div>
                </div>

                {/* Info tarjeta */}
                <div className="px-6 pb-4">
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${habilitada ? "bg-emerald-50" : "bg-rose-50"}`}>
                        <CreditCard size={16} className={habilitada ? "text-emerald-500 shrink-0" : "text-rose-400 shrink-0"} />
                        <p className={`text-[12px] font-semibold ${habilitada ? "text-emerald-700" : "text-rose-600"}`}>
                            {habilitada
                                ? "Este profesional puede utilizar su tarjeta de beneficios en los comercios adheridos al CPASF."
                                : "La tarjeta de este profesional se encuentra temporalmente inhabilitada."
                            }
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mx-6 mb-6 p-4 rounded-2xl bg-[#063f68]/5 border border-[#063f68]/10 flex items-start gap-3">
                    <ShieldCheck size={16} className="text-[#063f68] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#063f68]/70 font-medium leading-relaxed">
                        Verificación oficial emitida por el Sistema de Gestión Operativa del Colegio de la Abogacía de Santa Fe. Estado actualizado en tiempo real.
                    </p>
                </div>
            </div>

            <p className="mt-6 text-[11px] text-slate-400 text-center">
                Consulta realizada el {now}
            </p>
        </div>
    );
}
