"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

interface DashboardShellProps {
    user: {
        nombre: string;
        apellido: string;
        expediente: string;
        image: string | null;
        hasDebt: boolean;
    };
    children: React.ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-white dark:bg-[#02182b] transition-colors duration-300">
            {/* Overlay mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar: drawer en mobile, fijo en desktop */}
            <div className={`fixed md:sticky top-0 left-0 h-screen z-50 transition-transform duration-300 ease-in-out md:transform-none md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
            </div>

            <div className="flex-1 flex flex-col min-w-0">
                <TopNav user={user} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                <main className="p-0 animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
