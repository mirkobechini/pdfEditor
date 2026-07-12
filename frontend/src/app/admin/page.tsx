"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "../lib/auth";
import { api, AdminUser, BugReport } from "../lib/api";
import HeaderControls from "../components/HeaderControls";

type Tab = "users" | "bugs";

const LICENSE_TIERS = ["free", "pro", "enterprise", "admin"] as const;
const BUG_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

const BUG_STATUS_KEYS: Record<string, string> = {
    open: "open",
    in_progress: "inProgress",
    resolved: "resolved",
    closed: "closed",
};

export default function AdminPage() {
    const t = useTranslations("admin");
    const { user, loading } = useAuth();
    const [tab, setTab] = React.useState<Tab>("users");

    // Check auth
    React.useEffect(() => {
        if (!loading && (!user || !user.is_admin)) {
            window.location.href = "/";
        }
    }, [loading, user]);

    if (loading || !user || !user.is_admin) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <p className="text-gray-500 dark:text-gray-400">{t("loading")}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Header */}
            <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold">{t("title")}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="px-3 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        {t("backToApp")}
                    </Link>
                    <HeaderControls />
                </div>
            </header>

            {/* Content */}
            <div className="max-w-6xl mx-auto p-4">
                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b dark:border-gray-700">
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "users"
                            ? "border-blue-500 text-blue-600 dark:text-blue-400"
                            : "border-transparent hover:border-gray-300"
                            }`}
                        onClick={() => setTab("users")}
                    >
                        {t("users")}
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "bugs"
                            ? "border-blue-500 text-blue-600 dark:text-blue-400"
                            : "border-transparent hover:border-gray-300"
                            }`}
                        onClick={() => setTab("bugs")}
                    >
                        {t("bugReports")}
                    </button>
                </div>

                {tab === "users" && <UsersTable />}
                {tab === "bugs" && <BugReportsTable />}
            </div>
        </div>
    );
}

function UsersTable() {
    const t = useTranslations("admin");
    const [users, setUsers] = React.useState<AdminUser[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editTier, setEditTier] = React.useState("");
    const [search, setSearch] = React.useState("");
    const [tierFilter, setTierFilter] = React.useState("");
    const [dateFrom, setDateFrom] = React.useState("");
    const [dateTo, setDateTo] = React.useState("");
    const [resetMsg, setResetMsg] = React.useState<string | null>(null);

    React.useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        setLoading(true);
        try {
            const res = await api.listUsers();
            setUsers(res.items);
        } catch (err) {
            console.error("Failed to load users:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveLicense(userId: string) {
        try {
            await api.updateUserLicense(userId, editTier);
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === userId ? { ...u, license_tier: editTier } : u,
                ),
            );
            setEditingId(null);
        } catch (err) {
            alert("Failed to update license: " + err);
        }
    }

    async function handleSendReset(userId: string) {
        try {
            const resp = await api.adminSendReset(userId);
            setResetMsg(resp.message);
            setTimeout(() => setResetMsg(null), 4000);
        } catch (err) {
            alert("Failed to send reset: " + err);
        }
    }

    const filtered = users.filter((u) => {
        if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
        if (tierFilter && u.license_tier !== tierFilter) return false;
        if (dateFrom) {
            const created = new Date(u.created_at);
            const from = new Date(dateFrom);
            if (created < from) return false;
        }
        if (dateTo) {
            const created = new Date(u.created_at);
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            if (created > to) return false;
        }
        return true;
    });

    if (loading)
        return <p className="text-sm text-gray-400">{t("loading")}</p>;

    return (
        <div>
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                        {t("email")}
                    </label>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cerca per email..."
                        className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-48"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                        {t("licenseTier")}
                    </label>
                    <select
                        value={tierFilter}
                        onChange={(e) => setTierFilter(e.target.value)}
                        className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                    >
                        <option value="">{t("all")}</option>
                        {LICENSE_TIERS.map((tier) => (
                            <option key={tier} value={tier}>
                                {t(`tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`)}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                        {t("createdAt")} da
                    </label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                        {t("createdAt")} a
                    </label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <p className="text-sm text-gray-400">{t("noUsers")}</p>
            ) : (
                <div>
                    {resetMsg && (
                        <div className="mb-3 p-2 text-sm text-green-700 bg-green-100 dark:bg-green-900/30 rounded">
                            {resetMsg}
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b dark:border-gray-700 text-left">
                                    <th className="p-2 font-medium">{t("email")}</th>
                                    <th className="p-2 font-medium">{t("fullName")}</th>
                                    <th className="p-2 font-medium">{t("licenseTier")}</th>
                                    <th className="p-2 font-medium">{t("isAdmin")}</th>
                                    <th className="p-2 font-medium">{t("createdAt")}</th>
                                    <th className="p-2 font-medium">{t("actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <td className="p-2">{u.email}</td>
                                        <td className="p-2">{u.full_name}</td>
                                        <td className="p-2">
                                            {editingId === u.id ? (
                                                <select
                                                    value={editTier}
                                                    onChange={(e) => setEditTier(e.target.value)}
                                                    className="bg-transparent border border-blue-500 rounded px-1 text-sm"
                                                    autoFocus
                                                >
                                                    {LICENSE_TIERS.map((tier) => (
                                                        <option key={tier} value={tier}>
                                                            {t(
                                                                `tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
                                                            )}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span>
                                                    {t(
                                                        `tier${u.license_tier.charAt(0).toUpperCase() + u.license_tier.slice(1)}`,
                                                    )}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2">{u.is_admin ? "✓" : "—"}</td>
                                        <td className="p-2 text-gray-500">
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-2">
                                            {editingId === u.id ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                                                        onClick={() => handleSaveLicense(u.id)}
                                                    >
                                                        {t("save")}
                                                    </button>
                                                    <button
                                                        className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                        onClick={() => setEditingId(null)}
                                                    >
                                                        {t("cancel")}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                    onClick={() => {
                                                        setEditingId(u.id);
                                                        setEditTier(u.license_tier);
                                                    }}
                                                >
                                                    {t("save")}
                                                </button>
                                            )}
                                            <button
                                                className="text-xs px-2 py-1 rounded bg-purple-500 text-white hover:bg-purple-600"
                                                onClick={() => handleSendReset(u.id)}
                                            >
                                                {t("sendReset")}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-xs text-gray-400 mt-2">
                            Mostrati {filtered.length} di {users.length} utenti
                        </p>
                    </div>
            )}
                </div>
            );
}

            function BugReportsTable() {
    const t = useTranslations("admin");
            const [bugs, setBugs] = React.useState<BugReport[]>([]);
            const [loading, setLoading] = React.useState(true);
            const [statusFilter, setStatusFilter] = React.useState<string>("");

                async function loadBugs() {
                    setLoading(true);
                try {
            const res = await api.listBugReports(0, 100, statusFilter || undefined);
                setBugs(res.items);
        } catch (err) {
                    console.error("Failed to load bugs:", err);
        } finally {
                    setLoading(false);
        }
    }

                async function handleFilterChange(newFilter: string) {
                    setStatusFilter(newFilter);
    }

    // Load bugs on mount
    React.useEffect(() => {
                    loadBugs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

                async function handleStatusChange(bugId: string, newStatus: string) {
        try {
                    await api.updateBugReportStatus(bugId, newStatus);
            setBugs((prev) =>
                prev.map((b) => (b.id === bugId ? {...b, status: newStatus } : b)),
                );
        } catch (err) {
                    alert("Failed to update status: " + err);
        }
    }

                if (loading)
                return <p className="text-sm text-gray-400">{t("loading")}</p>;
                if (bugs.length === 0)
                return <p className="text-sm text-gray-400">{t("noBugs")}</p>;

                return (
                <div>
                    {/* Filter */}
                    <div className="mb-4 flex items-center gap-2">
                        <label className="text-sm text-gray-500">
                            {t("filterStatus")}:
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                handleFilterChange(e.target.value);
                                loadBugs();
                            }}
                            className="text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                        >
                            <option value="">{t("all")}</option>
                            {BUG_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {t(BUG_STATUS_KEYS[s])}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b dark:border-gray-700 text-left">
                                    <th className="p-2 font-medium">{t("titleField")}</th>
                                    <th className="p-2 font-medium">{t("userId")}</th>
                                    <th className="p-2 font-medium">{t("platform")}</th>
                                    <th className="p-2 font-medium">{t("appVersion")}</th>
                                    <th className="p-2 font-medium">{t("osInfo")}</th>
                                    <th className="p-2 font-medium">{t("status")}</th>
                                    <th className="p-2 font-medium">{t("createdAt")}</th>
                                    <th className="p-2 font-medium">{t("description")}</th>
                                    <th className="p-2 font-medium">{t("actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bugs.map((b) => (
                                    <tr
                                        key={b.id}
                                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <td className="p-2 font-medium">{b.title}</td>
                                        <td className="p-2 text-gray-500 text-xs">
                                            {b.user_id.slice(0, 8)}...
                                        </td>
                                        <td className="p-2 text-xs">{b.platform || "-"}</td>
                                        <td className="p-2 text-xs">{b.app_version || "-"}</td>
                                        <td className="p-2 text-xs">{b.os_info || "-"}</td>
                                        <td className="p-2">
                                            <span
                                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${b.status === "open"
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                    : b.status === "in_progress"
                                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                        : b.status === "resolved"
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                                    }`}
                                            >
                                                {t(`admin.${b.status}`)}
                                            </span>
                                        </td>
                                        <td className="p-2 text-gray-500">
                                            {new Date(b.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-2 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                            {b.description}
                                        </td>
                                        <td className="p-2">
                                            <select
                                                value={b.status}
                                                onChange={(e) => handleStatusChange(b.id, e.target.value)}
                                                className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5"
                                            >
                                                {BUG_STATUSES.map((s) => (
                                                    <option key={s} value={s}>
                                                        {t(`admin.${s}`)}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                );
}
