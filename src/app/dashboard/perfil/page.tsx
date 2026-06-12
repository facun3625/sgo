import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChevronLeft, Camera, ShieldCheck, User as UserIcon } from "lucide-react";
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
        <div className="bg-white dark:bg-[#02182b] p-0 pb-12 transition-colors duration-300">
            <div className="w-full pt-0">

                {/* SECCIÓN PERFIL */}
                <div className="bg-white dark:bg-[#02182b]">

                    {/* Header Compacto Unificado Sticky */}
                    <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-4 md:px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group"
                            >
                                <ChevronLeft size={20} className="text-slate-700 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            </Link>
                            <h2 className="text-[16px] font-bold text-black dark:text-white tracking-tight">Mi Perfil Profesional</h2>
                        </div>
                    </div>

                    <div className="p-4 md:p-12">
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
