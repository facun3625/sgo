import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowLeft, Camera, ShieldCheck, User as UserIcon } from "lucide-react";
import Link from "next/link";
import ProfileForm from "@/components/dashboard/ProfileForm";

export default async function PerfilPage() {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: {
            expediente: session.expediente
        }
    });

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="bg-white p-0 pb-12">
            <div className="w-full pt-0">

                {/* SECCIÓN PERFIL */}
                <div className="bg-white">

                    {/* Header Compacto Unificado Sticky */}
                    <div className="sticky top-16 z-10 bg-white flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9]">
                        <div className="flex items-center gap-6">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 text-black hover:text-slate-700 transition-all duration-300 group"
                            >
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                <span className="text-[12px] font-medium tracking-tight">Volver</span>
                            </Link>
                            <div className="h-4 w-px bg-slate-200"></div>
                            <h1 className="text-[14px] font-medium text-black tracking-tight">Mi Perfil</h1>
                        </div>
                    </div>

                    <div className="p-8 md:p-12">
                        <ProfileForm initialUser={{
                            nombre: user.nombre,
                            apellido: user.apellido,
                            expediente: user.expediente || "",
                            image: user.image,
                            signature: user.signature
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
