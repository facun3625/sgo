import Sidebar from "@/components/dashboard/Sidebar";
import TopNav from "@/components/dashboard/TopNav";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    const dbUser = await prisma.user.findUnique({
        where: { expediente: session.expediente }
    });

    if (!dbUser) {
        redirect("/login");
    }

    const hasDeuda = await prisma.deuda.findFirst({
        where: { expediente: session.expediente }
    });

    const user = {
        nombre: dbUser.nombre,
        apellido: dbUser.apellido,
        expediente: dbUser.expediente || "",
        image: dbUser.image,
        hasDebt: !!hasDeuda
    };

    return (
        <div className="flex min-h-screen bg-white dark:bg-[#02182b] transition-colors duration-300">
            <Sidebar user={user} />
            <div className="flex-1 flex flex-col">
                <TopNav user={user} />
                <main className="p-0 animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
