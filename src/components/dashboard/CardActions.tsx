"use client";

import { Printer, Download, FileText, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useState } from "react";

interface CardActionsProps {
    targetId: string;
    fileName: string;
    title: string;
}

export default function CardActions({ targetId, fileName, title }: CardActionsProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById(targetId);
        if (!element) return;

        try {
            setIsDownloading(true);

            // Use html2canvas to capture the element
            // We use high scale for better quality in the PDF
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: null,
            });

            const imgData = canvas.toDataURL("image/png");

            // PDF orientation depends on element proportions
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4",
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Center image in the PDF page
            const marginX = (pdfWidth - (pdfWidth * 0.8)) / 2;
            const marginY = 20;
            const finalWidth = pdfWidth * 0.8;
            const finalHeight = (imgProps.height * finalWidth) / imgProps.width;

            pdf.addImage(imgData, "PNG", marginX, marginY, finalWidth, finalHeight);
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
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-[12px] font-bold group bg-white dark:bg-slate-900 shadow-sm"
            >
                <Printer size={15} className="group-hover:scale-110 transition-transform opacity-90" />
                Imprimir
            </button>
            <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#063f68] text-white hover:bg-[#0a4d7a] transition-all text-[12px] font-medium group shadow-lg shadow-[#063f68]/10 disabled:opacity-50"
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
