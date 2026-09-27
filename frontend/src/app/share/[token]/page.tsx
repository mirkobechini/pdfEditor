import React from "react";
import Link from "next/link";
import ShareViewer from "./ShareViewer";

// Required for static export (output: "export") — generates the dynamic route.
export function generateStaticParams() {
    return [{ token: "sample" }];
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = React.use(params);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                <Link href="/landing" className="flex items-center gap-2 hover:opacity-75">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">P</div>
                    <span className="font-bold">PdfEditor</span>
                </Link>
            </header>
            <ShareViewer token={token} />
        </div>
    );
}