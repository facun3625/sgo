"use client";

import { createContext, useContext } from "react";

interface PermisosContextValue {
    permisos: string[] | null; // null = superadmin
    isSuperAdmin: boolean;
    tiene: (key: string) => boolean;
}

const PermisosContext = createContext<PermisosContextValue>({
    permisos: null,
    isSuperAdmin: true,
    tiene: () => true,
});

export function PermisosProvider({ permisos, children }: { permisos: string[] | null; children: React.ReactNode }) {
    const isSuperAdmin = permisos === null;
    const tiene = (key: string) => {
        if (isSuperAdmin) return true;
        if (!permisos) return false;
        if (key.startsWith("importar:") && permisos.includes("importar")) return true;
        if (key.startsWith("solicitudes:") && permisos.includes("solicitudes")) return true;
        return permisos.includes(key);
    };
    return (
        <PermisosContext.Provider value={{ permisos, isSuperAdmin, tiene }}>
            {children}
        </PermisosContext.Provider>
    );
}

export function usePermisos() {
    return useContext(PermisosContext);
}
