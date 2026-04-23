import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, ShieldCheck, Calendar, BookOpen, Hash, AlertTriangle } from "lucide-react";
import Image from "next/image";

export default async function VerificarPage({ params }: { params: Promise<{ expediente: string }> }) {
    const { expediente: rawExpediente } = await params;
    const expediente = decodeURIComponent(rawExpediente);

    const [user, dato, deuda] = await Promise.all([
        prisma.user.findFirst({ where: { expediente } }),
        prisma.dato.findFirst({ where: { expediente } }),
        prisma.deuda.findFirst({ where: { expediente } }),
    ]);

    if (!user) {
        notFound();
    }

    const isSuspended = user.status === "suspended";
    const isActive = !isSuspended && !deuda;
    const fechaMatriculacion = dato?.fechaMatriculacion
        ? new Date(dato.fechaMatriculacion).toLocaleDateString("es-AR", {
            day: "2-digit", month: "long", year: "numeric"
        })
        : null;

    const now = new Date().toLocaleDateString("es-AR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4 py-12">

            {/* Card de verificación */}
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

                {/* Header institucional */}
                <div className="bg-[#063f68] px-8 py-6 flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1.5 shrink-0">
                        <Image src="/sgo.png" alt="CPASF" width={44} height={44} className="object-contain" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-[15px] leading-tight">Colegio de la Abogacía</p>
                        <p className="text-white/60 text-[11px] font-semibold uppercase tracking-widest">Santa Fe · 1ª Circ.</p>
                    </div>
                </div>

                {/* Badge de estado */}
                {isSuspended && (
                    <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 bg-rose-50 border-2 border-rose-400 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                            <AlertTriangle size={22} className="text-rose-500" />
                        </div>
                        <div>
                            <p className="text-[14px] font-black uppercase tracking-tight text-rose-600">Matrícula Suspendida</p>
                            <p className="text-rose-400 text-[11px] font-semibold">No habilitado/a para ejercer la profesión</p>
                        </div>
                    </div>
                )}

                <div className={`mx-6 py-4 flex items-center gap-3 border-b border-slate-100 ${isSuspended ? "opacity-50" : ""}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-50" : "bg-rose-50"}`}>
                        {isActive
                            ? <CheckCircle2 size={26} className="text-emerald-500" />
                            : <XCircle size={26} className="text-rose-500" />
                        }
                    </div>
                    <div>
                        <p className={`text-[13px] font-black uppercase tracking-tight ${isActive ? "text-emerald-600" : "text-rose-600"}`}>
                            {isActive ? "Matrícula Activa y Vigente" : isSuspended ? "Matrícula Suspendida" : "Matrícula con Restricciones"}
                        </p>
                        <p className="text-slate-400 text-[11px] font-medium">
                            {isActive ? "Habilitado/a para ejercer la profesión" : "Verificar estado con el Colegio"}
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
                        <p className="text-[12px] text-slate-400 font-medium mt-0.5">Abogado/a · CPASF</p>
                    </div>
                </div>

                {/* Datos de matrícula */}
                <div className="px-6 pb-4 space-y-2.5">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <Hash size={14} className="text-slate-400 shrink-0" />
                        <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expediente</span>
                            <span className="text-[13px] font-bold text-slate-800">{user.expediente}</span>
                        </div>
                    </div>

                    {dato?.folio && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                            <BookOpen size={14} className="text-slate-400 shrink-0" />
                            <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Folio / Tomo</span>
                                <span className="text-[13px] font-bold text-slate-800">{dato.folio} / {dato.tomo || "--"}</span>
                            </div>
                        </div>
                    )}

                    {fechaMatriculacion && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                            <Calendar size={14} className="text-slate-400 shrink-0" />
                            <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Matriculado/a desde</span>
                                <span className="text-[12px] font-bold text-slate-800">{fechaMatriculacion}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mx-6 mb-6 p-4 rounded-2xl bg-[#063f68]/5 border border-[#063f68]/10 flex items-start gap-3">
                    <ShieldCheck size={16} className="text-[#063f68] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#063f68]/70 font-medium leading-relaxed">
                        Verificación oficial emitida por el Sistema de Gestión Operativa del Colegio de la Abogacía de Santa Fe. Datos actualizados en tiempo real.
                    </p>
                </div>
            </div>

            {/* Timestamp */}
            <p className="mt-6 text-[11px] text-slate-400 text-center">
                Consulta realizada el {now}
            </p>
        </div>
    );
}
