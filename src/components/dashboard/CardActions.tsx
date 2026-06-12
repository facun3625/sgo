"use client";

import { Printer, Download } from "lucide-react";
import { useState } from "react";

interface CardActionsProps {
    targetId?: string;
    targetIds?: string[];  // multiple pages in one PDF
    fileName: string;
    title: string;
    disabled?: boolean;
}

export default function CardActions({ targetId, targetIds, fileName, title, disabled = false }: CardActionsProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handlePrint = () => window.print();

    const handleDownloadPDF = async () => {
        const ids = targetIds ?? (targetId ? [targetId] : []);
        if (ids.length === 0) return;

        try {
            setIsDownloading(true);

            const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
                import("html2canvas-pro"),
                import("jspdf"),
            ]);

            const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < ids.length; i++) {
                const element = document.getElementById(ids[i]);
                if (!element) continue;

                const canvas = await html2canvas(element, {
                    scale: 3,
                    useCORS: true,
                    logging: false,
                    backgroundColor: null,
                });

                const imgData = canvas.toDataURL("image/png");
                const imgProps = pdf.getImageProperties(imgData);

                // fit inside page with margins, centered
                const margin = 15;
                const maxW = pdfWidth - margin * 2;
                const maxH = pdfHeight - margin * 2;
                const imgRatio = imgProps.width / imgProps.height;
                const pageRatio = maxW / maxH;

                let finalW = maxW;
                let finalH = maxW / imgRatio;
                if (finalH > maxH) {
                    finalH = maxH;
                    finalW = maxH * imgRatio;
                }

                const x = (pdfWidth - finalW) / 2;
                const y = (pdfHeight - finalH) / 2;

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, "PNG", x, y, finalW, finalH);
            }

            pdf.save(`${fileName}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-row lg:flex-col gap-3 no-print">
            <button
                onClick={handlePrint}
                disabled={disabled}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-[13px] font-bold group bg-white dark:bg-slate-900 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <Printer size={15} className="group-hover:scale-110 transition-transform opacity-90" />
                Imprimir
            </button>
            <button
                onClick={handleDownloadPDF}
                disabled={isDownloading || disabled}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#063f68] text-white hover:bg-[#0a4d7a] transition-all text-[13px] font-medium group shadow-lg shadow-[#063f68]/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
                {isDownloading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Download size={15} className="group-hover:translate-y-0.5 transition-transform opacity-90" />
                )}
                {isDownloading ? "Procesando..." : "Descargar PDF"}
            </button>
        </div>
    );
}
