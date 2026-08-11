"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import LandingNavbar from "../components/landing/LandingNavbar";

interface ReleaseAsset {
    name: string;
    browser_download_url: string;
}

interface ReleaseInfo {
    tag_name: string;
    name: string;
    body: string;
    assets: ReleaseAsset[];
}

const GITHUB_API = "https://api.github.com/repos/mirkobechini/pdfEditor/releases";

export default function DownloadPage() {
    const t = useTranslations("download");
    const [latestDesktop, setLatestDesktop] = useState<ReleaseInfo | null>(null);
    const [latestMobile, setLatestMobile] = useState<ReleaseInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchReleases() {
            try {
                const res = await fetch(GITHUB_API);
                const releases: any[] = await res.json();
                // Latest non-mobile (desktop)
                const desktop = releases.find((r) => !r.tag_name.includes("-mobile"));
                if (desktop) {
                    setLatestDesktop({
                        tag_name: desktop.tag_name,
                        name: desktop.name,
                        body: desktop.body || "",
                        assets: desktop.assets.map((a: any) => ({
                            name: a.name,
                            browser_download_url: a.browser_download_url,
                        })),
                    });
                }
                // Latest mobile
                const mobile = releases.find((r) => r.tag_name.includes("-mobile"));
                if (mobile) {
                    setLatestMobile({
                        tag_name: mobile.tag_name,
                        name: mobile.name,
                        body: mobile.body || "",
                        assets: mobile.assets.map((a: any) => ({
                            name: a.name,
                            browser_download_url: a.browser_download_url,
                        })),
                    });
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        }
        fetchReleases();
    }, []);

    function getDesktopAsset(suffix: string): ReleaseAsset | undefined {
        return latestDesktop?.assets.find((a) => a.name.includes(suffix));
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <LandingNavbar />

            <main className="pt-16 max-w-5xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold mb-4">Download PdfEditor</h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                        Available on desktop (Windows, macOS, Linux) and mobile (Android).
                        All platforms are free and open source.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading releases...</div>
                ) : (
                    <>
                        {/* ─── Desktop Section ─── */}
                        {latestDesktop && (
                            <section className="mb-20">
                                <div className="flex items-center gap-3 mb-8">
                                    <span className="text-3xl">🖥️</span>
                                    <h2 className="text-2xl font-bold">Desktop App</h2>
                                    <span className="text-sm px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-medium">
                                        {latestDesktop.tag_name}
                                    </span>
                                </div>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {/* Windows */}
                                    <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <div className="text-4xl mb-3">🪟</div>
                                        <h3 className="text-lg font-semibold mb-2">Windows</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Windows 10 / 11, 64-bit</p>
                                        {getDesktopAsset("x64-setup.exe") ? (
                                            <a
                                                href={getDesktopAsset("x64-setup.exe")!.browser_download_url}
                                                className="block text-center py-2 px-4 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                                            >
                                                Download Installer
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center">Not available</p>
                                        )}
                                        {getDesktopAsset("x64_en-US.msi") && (
                                            <a
                                                href={getDesktopAsset("x64_en-US.msi")!.browser_download_url}
                                                className="block text-center mt-2 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                Download MSI
                                            </a>
                                        )}
                                    </div>

                                    {/* macOS */}
                                    <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <div className="text-4xl mb-3">🍎</div>
                                        <h3 className="text-lg font-semibold mb-2">macOS</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">macOS 10.15+, Apple Silicon</p>
                                        {getDesktopAsset("aarch64.dmg") ? (
                                            <a
                                                href={getDesktopAsset("aarch64.dmg")!.browser_download_url}
                                                className="block text-center py-2 px-4 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                                            >
                                                Download DMG
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center">Not available</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2 text-center">Intel Macs: use the DMG or build from source</p>
                                    </div>

                                    {/* Linux */}
                                    <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <div className="text-4xl mb-3">🐧</div>
                                        <h3 className="text-lg font-semibold mb-2">Linux</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">AppImage & DEB, 64-bit</p>
                                        {getDesktopAsset("AppImage") ? (
                                            <a
                                                href={getDesktopAsset("AppImage")!.browser_download_url}
                                                className="block text-center py-2 px-4 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity mb-2"
                                            >
                                                Download AppImage
                                            </a>
                                        ) : null}
                                        {getDesktopAsset("amd64.deb") ? (
                                            <a
                                                href={getDesktopAsset("amd64.deb")!.browser_download_url}
                                                className="block text-center py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                Download DEB
                                            </a>
                                        ) : null}
                                        {!getDesktopAsset("AppImage") && !getDesktopAsset("amd64.deb") && (
                                            <p className="text-sm text-gray-400 text-center">Not available</p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ─── Mobile Section ─── */}
                        {latestMobile && (
                            <section className="mb-20">
                                <div className="flex items-center gap-3 mb-8">
                                    <span className="text-3xl">📱</span>
                                    <h2 className="text-2xl font-bold">Mobile App</h2>
                                    <span className="text-sm px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-medium">
                                        {latestMobile.tag_name}
                                    </span>
                                </div>
                                <div className="max-w-sm">
                                    <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <div className="text-4xl mb-3">🤖</div>
                                        <h3 className="text-lg font-semibold mb-2">Android</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">APK — Android 8+</p>
                                        {latestMobile.assets.find((a) => a.name.endsWith(".apk")) ? (
                                            <a
                                                href={latestMobile.assets.find((a) => a.name.endsWith(".apk"))!.browser_download_url}
                                                className="block text-center py-2 px-4 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                                            >
                                                Download APK
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-400 text-center">Not available</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2 text-center">iOS: coming soon</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ─── Web Section ─── */}
                        <section className="mb-20">
                            <div className="flex items-center gap-3 mb-8">
                                <span className="text-3xl">🌐</span>
                                <h2 className="text-2xl font-bold">Web App</h2>
                            </div>
                            <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <p className="text-gray-600 dark:text-gray-300 mb-4">
                                    Use PdfEditor directly in your browser. No installation required.
                                </p>
                                <Link
                                    href="/login"
                                    className="inline-block text-center py-2 px-6 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                                >
                                    Open Web App
                                </Link>
                            </div>
                        </section>

                        {/* ─── Recent Changes ─── */}
                        <section className="mb-20">
                            <div className="flex items-center gap-3 mb-8">
                                <span className="text-3xl">📋</span>
                                <h2 className="text-2xl font-bold">{t("recentChanges")}</h2>
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Desktop Changelog */}
                                {latestDesktop && (
                                    <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-lg">🖥️</span>
                                            <h3 className="text-lg font-semibold">{t("desktopTitle")} {latestDesktop.tag_name}</h3>
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                            {latestDesktop.body || t("noChangelog")}
                                        </div>
                                    </div>
                                )}
                                {/* Mobile Changelog */}
                                {latestMobile && (
                                    <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-lg">📱</span>
                                            <h3 className="text-lg font-semibold">{t("mobileTitle")} {latestMobile.tag_name}</h3>
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                            {latestMobile.body || t("noChangelog")}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ─── Feature Comparison Table ─── */}
                        <section>
                            <div className="flex items-center gap-3 mb-8">
                                <span className="text-3xl">⚖️</span>
                                <h2 className="text-2xl font-bold">Feature Comparison</h2>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-sm bg-white dark:bg-gray-800">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                            <th className="px-4 py-3 text-left font-semibold">Feature</th>
                                            <th className="px-4 py-3 text-center font-semibold">🌐 Web</th>
                                            <th className="px-4 py-3 text-center font-semibold">🖥️ Desktop</th>
                                            <th className="px-4 py-3 text-center font-semibold">📱 Mobile</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { name: "Upload PDF", w: "✅", d: "✅", m: "✅" },
                                            { name: "Download PDF", w: "✅", d: "✅", m: "✅" },
                                            { name: "Merge PDFs", w: "✅", d: "✅", m: "✅" },
                                            { name: "Split PDF", w: "✅", d: "✅", m: "✅" },
                                            { name: "Reorder Pages", w: "✅", d: "✅", m: "✅" },
                                            { name: "Remove Pages", w: "✅", d: "✅", m: "✅" },
                                            { name: "Password Protect", w: "✅", d: "✅", m: "✅" },
                                            { name: "Unlock PDF", w: "✅", d: "✅", m: "✅" },
                                            { name: "Edit Metadata", w: "✅", d: "✅", m: "✅" },
                                            { name: "Replace Text", w: "❌", d: "❌", m: "❌" },
                                            { name: "Extract Text", w: "✅", d: "✅", m: "❌" },
                                            { name: "Import/Export", w: "✅", d: "✅", m: "❌" },
                                            { name: "Undo/Redo", w: "✅", d: "✅", m: "❌" },
                                            { name: "Google OAuth", w: "✅", d: "❌", m: "❌" },
                                            { name: "Camera Scanner", w: "❌", d: "❌", m: "✅" },
                                            { name: "Share PDF", w: "❌", d: "❌", m: "✅" },
                                        ].map((row) => (
                                            <tr key={row.name} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                <td className="px-4 py-3 font-medium">{row.name}</td>
                                                <td className="px-4 py-3 text-center">{row.w}</td>
                                                <td className="px-4 py-3 text-center">{row.d}</td>
                                                <td className="px-4 py-3 text-center">{row.m}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-gray-400 mt-3 text-center">
                                Features marked ❌ are planned for future releases.
                            </p>
                        </section>
                    </>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-sm text-gray-500">
                <p>PdfEditor is open source — available on GitHub</p>
            </footer>
        </div>
    );
}