"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRComponentProps {
    value: string;
    size?: number;
}

export default function QRComponent({ value, size = 120 }: QRComponentProps) {
    return (
        <div className="bg-white p-1.5 rounded-xl border border-[#f1f5f9] shadow-sm flex items-center justify-center">
            <QRCodeSVG
                value={value}
                size={size}
                level="M"
                includeMargin={false}
                imageSettings={{
                    src: "/sgo.png",
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                }}
            />
        </div>
    );
}
