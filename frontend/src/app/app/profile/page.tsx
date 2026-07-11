"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import AppLayout from "../../components/AppLayout";

export default function ProfilePage() {
    const t = useTranslations("profile");
    const { user, loading, setUser } = useAuth();
    const [editName, setEditName] = React.useState(user?.full_name || "");
    const [saving, setSaving] = React.useState(false);
    const [message, setMessage] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!loading && !user) {
            window.location.href = "/login";
        }
    }, [loading, user]);

    const handleSaveName = async () => {
        if (!editName.trim() || editName === user?.full_name) return;
        setSaving(true);
        setMessage(null);
        try {
            const updated = await api.updateProfile({ full_name: editName });
            setUser({ ...user!, ...updated });
            setMessage(t("saved"));
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage(t("error"));
        } finally {
            setSaving(false);
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
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
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                                <button
                                    onClick={handleSaveName}
                                    disabled={saving || editName === user.full_name}
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

                {/* Back to Editor */}
                <div className="text-center">
                    <a href="/app" className="text-orange-500 hover:underline">&larr; {t("backToEditor")}</a>
                </div>
            </div>
        </div>
    );
}