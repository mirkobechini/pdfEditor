"use client";

import React from "react";
import Link from "next/link";

const IUBENDA_PRIVACY_ID =
    process.env.NEXT_PUBLIC_IUBENDA_PRIVACY_ID || "76778813";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
                <Link href="/landing" className="flex items-center gap-2 hover:opacity-75">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">P</div>
                    <span className="font-bold">PdfEditor</span>
                </Link>
            </header>
            <div className="max-w-3xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
                <div className="w-full min-h-[60vh]">
                    <a
                        href={`https://www.iubenda.com/privacy-policy/${IUBENDA_PRIVACY_ID}`}
                        className="iubenda-white iubenda-noiframe iubenda-embed"
                        title="Privacy Policy"
                    >
                        Privacy Policy
                    </a>
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `
                                (function (w,d) {
                                    var loader = function () {
                                        var s = d.createElement("script"),
                                            tag = d.getElementsByTagName("script")[0];
                                        s.src="https://cdn.iubenda.com/iubenda.js";
                                        tag.parentNode.insertBefore(s,tag);
                                    };
                                    if(w.addEventListener){
                                        w.addEventListener("load", loader, false);
                                    } else if(w.attachEvent){
                                        w.attachEvent("onload", loader);
                                    } else {
                                        w.onload = loader;
                                    }
                                })(window, document);
                            `,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
