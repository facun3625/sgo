"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";

export default function CursoFlyerButton({ imagen, titulo }: { imagen: string; titulo: string }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 h-9 bg-white/95 hover:bg-white shadow-md rounded-xl text-[12px] font-bold text-slate-800 transition-all">
                <Maximize2 size={13} /> Ver flyer
            </button>

            {open && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}>
                    <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
                            className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-[13px]">
                            <X size={16} /> Cerrar
                        </button>
                        <img src={imagen} alt={titulo} className="w-full h-auto max-h-[85vh] object-contain rounded-xl" />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
