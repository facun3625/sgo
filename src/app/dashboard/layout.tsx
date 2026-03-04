import Sidebar from "@/components/dashboard/Sidebar";
import TopNav from "@/components/dashboard/TopNav";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    const user = {
        nombre: session.nombre,
        apellido: session.apellido,
        expediente: session.expediente,
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <TopNav user={user} />
                <main className="p-8 animate-fade-in overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
