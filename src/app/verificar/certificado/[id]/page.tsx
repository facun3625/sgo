import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldCheck, Calendar, FileText, Building2 } from "lucide-react";
import Image from "next/image";

export default async function VerificarCertificadoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    if (isNaN(id)) notFound();

    const solicitud = await prisma.solicitud.findUnique({ where: { id } });
    if (!solicitud || solicitud.tipo !== "Certificado de Matriculación" || solicitud.estado !== "completada") {
        notFound();
    }

    const detalles = solicitud.detalles as Record<string, any> | null;
    const firmante = detalles?.firmante as { cargo: string; nombre?: string; firma?: string } | null;
    const sanciones = (detalles?.sanciones ?? []) as { texto: string; inicio: string; fin: string }[];

    const user = await prisma.user.findUnique({ where: { expediente: solicitud.expediente } });
    if (!user) notFound();

    const dato = await prisma.dato.findFirst({ where: { expediente: solicitud.expediente } });

    const fechaEmision = new Date(solicitud.fecha).toLocaleDateString("es-AR", {
        day: "2-digit", month: "long", year: "numeric"
    });

    const now = new Date().toLocaleDateString("es-AR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

                {/* Header */}
                <div className="bg-[#063f68] px-8 py-6 flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1.5 shrink-0">
                        <Image src="/sgo_nuevo.png" alt="CPASF" width={44} height={44} className="object-contain" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-[15px] leading-tight">Certificado de Matriculación</p>
                        <p className="text-white/60 text-[11px] font-semibold uppercase tracking-widest">Colegio de la Abogacía · CPASF</p>
                    </div>
                </div>

                {/* Badge válido */}
                <div className="mx-6 py-5 flex items-center gap-3 border-b border-slate-100">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={26} className="text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[13px] font-black uppercase tracking-tight text-emerald-600">Certificado Válido y Auténtico</p>
                        <p className="text-slate-400 text-[11px] font-medium">Emitido oficialmente por el CPASF</p>
                    </div>
                </div>

                {/* Foto y nombre */}
                <div className="px-6 pt-5 pb-4 flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {user.image ? (
                            <img src={user.image} alt="Foto" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl font-black text-slate-300">{user.nombre[0]}{user.apellido[0]}</span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-[18px] font-bold text-slate-900 leading-tight">{user.apellido}, {user.nombre}</h1>
                        <p className="text-[12px] text-slate-400 font-medium mt-0.5">Abogado/a · Mat. {user.expediente}</p>
                    </div>
                </div>

                {/* Datos */}
                <div className="px-6 pb-4 space-y-2.5">
                    {dato?.folio && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                            <FileText size={14} className="text-slate-400 shrink-0" />
                            <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Folio / Tomo</span>
                                <span className="text-[13px] font-bold text-slate-800">{dato.folio} / {dato.tomo || "--"}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fecha de emisión</span>
                            <span className="text-[12px] font-bold text-slate-800">{fechaEmision}</span>
                        </div>
                    </div>
                    {solicitud.presentarAnte && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                            <Building2 size={14} className="text-slate-400 shrink-0 mt-0.5" />
                            <div className="w-full">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Presentado ante</span>
                                <span className="text-[12px] font-bold text-slate-800">{solicitud.presentarAnte}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sanciones Tribunal de Ética */}
                {sanciones.length > 0 && (
                    <div className="mx-6 mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2 flex items-center gap-1.5">
                            <span>⚖</span> Observaciones del Tribunal de Ética
                        </p>
                        {sanciones.map((s, i) => (
                            <p key={i} className="text-[12px] text-rose-800 leading-relaxed font-medium">{s.texto}</p>
                        ))}
                    </div>
                )}

                {/* Firmante */}
                {firmante && (
                    <div className="mx-6 mb-4 flex flex-col items-center gap-2 py-4 border-t border-slate-100">
                        {firmante.firma && (
                            <img src={firmante.firma} alt="Firma" className="max-h-16 max-w-[160px] object-contain mix-blend-multiply" />
                        )}
                        <div className="text-center border-t border-slate-200 pt-2 w-40">
                            <p className="text-[11px] font-bold text-slate-800">{firmante.cargo}</p>
                            {firmante.nombre && <p className="text-[10px] text-slate-500 mt-0.5">{firmante.nombre}</p>}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mx-6 mb-6 p-4 rounded-2xl bg-[#063f68]/5 border border-[#063f68]/10 flex items-start gap-3">
                    <ShieldCheck size={16} className="text-[#063f68] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#063f68]/70 font-medium leading-relaxed">
                        Este certificado fue emitido por el Sistema de Gestión Operativa del Colegio de la Abogacía de Santa Fe. Su autenticidad está garantizada digitalmente.
                    </p>
                </div>
            </div>

            <p className="mt-6 text-[11px] text-slate-400 text-center">Consulta realizada el {now}</p>
        </div>
    );
}
