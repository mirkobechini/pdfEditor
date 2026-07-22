"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../lib/auth";
import { api, BugReport } from "../../lib/api";
import HeaderControls from "../../components/HeaderControls";

export default function ProfilePage() {
    const t = useTranslations("profile");
    const { user, loading, setUser } = useAuth();
    const nameRef = React.useRef<HTMLInputElement>(null);
    const [saving, setSaving] = React.useState(false);
    const [message, setMessage] = React.useState<string | null>(null);
    const [bugs, setBugs] = React.useState<BugReport[]>([]);
    const [bugsLoading, setBugsLoading] = React.useState(true);
    const [unlinkPassword, setUnlinkPassword] = React.useState("");
    const [showUnlinkModal, setShowUnlinkModal] = React.useState(false);
    const [unlinking, setUnlinking] = React.useState(false);
    const [unlinkError, setUnlinkError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!loading && !user) {
            window.location.href = "/login";
        }
    }, [loading, user]);

    React.useEffect(() => {
        if (user) {
            api.listMyBugReports()
                .then(setBugs)
                .catch(() => { })
                .finally(() => setBugsLoading(false));
        }
    }, [user]);

    const handleSaveName = async () => {
        const newName = nameRef.current?.value.trim() ?? "";
        if (!newName || newName === user?.full_name) return;
        setSaving(true);
        setMessage(null);
        try {
            const updated = await api.updateProfile({ full_name: newName });
            setUser({ ...user!, ...updated });
            setMessage(t("saved"));
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage(t("error"));
        } finally {
            setSaving(false);
        }
    };

    const handleUnlinkGoogle = async () => {
        if (!unlinkPassword) return;
        setUnlinking(true);
        setUnlinkError(null);
        try {
            const updated = await api.unlinkGoogle(unlinkPassword);
            setUser({ ...user!, ...updated });
            setShowUnlinkModal(false);
            setUnlinkPassword("");
        } catch (err) {
            setUnlinkError(err instanceof Error ? err.message : "Failed to unlink");
        } finally {
            setUnlinking(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <p className="text-gray-500 dark:text-gray-400">{t("loading")}</p>
            </div>
        );
    }

    return (
        <>
            <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
                <Link href="/app" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
                    <Image
                        src="/orange-monkey_logo.png"
                        alt="PdfEditor Logo"
                        width={32}
                        height={32}
                        className="rounded-lg"
                        priority
                    />
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">PdfEditor</span>
                </Link>
                <div className="flex items-center gap-3">
                    <Link
                        href="/app"
                        className="px-3 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                    >
                        &larr; {t("backToEditor")}
                    </Link>
                    <HeaderControls />
                </div>
            </header>
            <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50 dark:bg-gray-900 p-6">
                <div className="max-w-2xl mx-auto space-y-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t("title")}</h1>

                    {/* Personal Info */}
                    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{t("personalInfo")}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t("email")}</label>
                                <input
                                    type="email"
                                    value={user.email}
                                    disabled
                                    className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t("fullName")}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        ref={nameRef}
                                        defaultValue={user.full_name}
                                        className="flex-1 px-3 py-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                    <button
                                        onClick={handleSaveName}
                                        disabled={saving}
                                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 font-medium"
                                    >
                                        {saving ? t("saving") : t("save")}
                                    </button>
                                </div>
                            </div>
                            {message && (
                                <div className="p-2 text-sm text-green-700 bg-green-100 dark:bg-green-900/30 rounded">{message}</div>
                            )}
                        </div>
                    </section>

                    {/* Account Info */}
                    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{t("accountInfo")}</h2>
                        <dl className="space-y-3">
                            <div className="flex justify-between">
                                <dt className="font-medium text-gray-600 dark:text-gray-400">{t("licenseTier")}</dt>
                                <dd className="font-semibold text-blue-600">{user.license_tier.toUpperCase()}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="font-medium text-gray-600 dark:text-gray-400">{t("licenseSource")}</dt>
                                <dd className="text-gray-900 dark:text-gray-100">{user.license_tier_source}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="font-medium text-gray-600 dark:text-gray-400">{t("joinedDate")}</dt>
                                <dd className="text-gray-900 dark:text-gray-100">{new Date(user.created_at).toLocaleDateString()}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="font-medium text-gray-600 dark:text-gray-400">{t("status")}</dt>
                                <dd className={user.is_active ? "text-green-600" : "text-red-600"}>
                                    {user.is_active ? t("active") : t("inactive")}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {/* Connected Services */}
                    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{t("connectedServices")}</h2>
                        <div className="space-y-4">
                            {/* Google */}
                            <div className="flex items-center justify-between p-3 border dark:border-gray-700 rounded">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🔵</span>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">Google</p>
                                        {user.google_id ? (
                                            <p className="text-sm text-green-600">{t("googleLinked")}</p>
                                        ) : (
                                            <p className="text-sm text-gray-400">{t("googleNotLinked")}</p>
                                        )}
                                    </div>
                                </div>
                                {user.google_id ? (
                                    <button
                                        onClick={() => setShowUnlinkModal(true)}
                                        className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-medium"
                                    >
                                        {t("unlink")}
                                    </button>
                                ) : (
                                    <span className="text-xs text-gray-400">{t("notAvailable")}</span>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Unlink Confirmation Modal */}
                    {showUnlinkModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">{t("unlinkGoogleTitle")}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t("unlinkGoogleDescription")}</p>
                                <input
                                    type="password"
                                    placeholder={t("enterPassword")}
                                    value={unlinkPassword}
                                    onChange={(e) => setUnlinkPassword(e.target.value)}
                                    className="w-full px-3 py-2 border rounded mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                                {unlinkError && (
                                    <p className="text-sm text-red-600 mb-3">{unlinkError}</p>
                                )}
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            setShowUnlinkModal(false);
                                            setUnlinkPassword("");
                                            setUnlinkError(null);
                                        }}
                                        className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                                    >
                                        {t("cancel")}
                                    </button>
                                    <button
                                        onClick={handleUnlinkGoogle}
                                        disabled={unlinking || !unlinkPassword}
                                        className="px-4 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 font-medium"
                                    >
                                        {unlinking ? t("unlinking") : t("confirmUnlink")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bug Reports */}
                    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{t("myBugReports")}</h2>
                        {bugsLoading ? (
                            <p className="text-sm text-gray-400">{t("loading")}</p>
                        ) : bugs.length === 0 ? (
                            <p className="text-sm text-gray-400">{t("noBugs")}</p>
                        ) : (
                            <div className="space-y-3">
                                {bugs.map((bug) => (
                                    <div key={bug.id} className="border dark:border-gray-700 rounded p-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-sm">{bug.title}</span>
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${bug.status === "open" ? "bg-red-100 text-red-700" : bug.status === "resolved" ? "bg-green-100 text-green-700" : bug.status === "in_progress" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
                                                {bug.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-1">{bug.description}</p>
                                        <p className="text-xs text-gray-400">{new Date(bug.created_at).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}