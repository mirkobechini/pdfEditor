"use client";

import React from "react";
import Image from "next/image";

interface MonkeyLogoProps {
    className?: string;
}

export default function MonkeyLogo({ className = "" }: MonkeyLogoProps) {
    const [showFallback, setShowFallback] = React.useState(false);

    if (showFallback) {
        return (
            <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 flex items-center justify-center text-white text-sm font-bold ${className}`}
            >
                P
            </div>
        );
    }

    return (
        <Image
            src="/orange-monkey_logo.png"
            alt="PdfEditor Logo"
            width={32}
            height={32}
            className={`rounded-lg ${className}`}
            priority
            onError={() => setShowFallback(true)}
        />
    );
}