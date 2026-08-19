"use client";

import React from "react";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";

interface LockUnlockModalProps {
    open: boolean;
    pdfId: string;
    pdfName: string;
    isProtected: boolean;
    onClose: () => void;
    onSaved: (updatedDoc: PdfDocument) => void;
}

export default function LockUnlockModal({ open, pdfId, pdfName, isProtected, onClose, onSaved }: LockUnlockModalProps) {
    const [password, setPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (open) {
            setPassword("");
            setConfirmPassword("");
            setError(null);
        }
    }, [open]);

    async function handleLock() {
        if (!password) { setError("Password is required"); return; }
        if (password.length < 4) { setError("Password must be at least 4 characters"); return; }
        if (password !== confirmPassword) { setError("Passwords do not match"); return; }

        setSaving(true); setError(null);
        try {
            const updated = await api.protectPdf(pdfId, password);
            onSaved(updated);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to lock PDF");
        } finally { setSaving(false); }
    }

    async function handleUnlock() {
        if (!password) { setError("Password is required"); return; }

        setSaving(true); setError(null);
        try {
            const updated = await api.unlockPdf(pdfId, password);
            onSaved(updated);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to unlock PDF");
        } finally { setSaving(false); }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-white">
                        {isProtected ? "Unlock PDF" : "Lock PDF"}
                    </h2>
                    <button onClick={onClose} className="h-8 w-8 rounded-lg text-[#9a8d80] hover:bg-white/10 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                <p className="mb-4 text-xs text-[#8d8175]">{pdfName}</p>

                {isProtected ? (
                    <p className="mb-3 text-[11px] text-[#6f6358]">
                        This PDF is password-protected. Enter the password to unlock it.
                    </p>
                ) : (
                    <p className="mb-3 text-[11px] text-[#6f6358]">
                        Protect this PDF with a password (AES-256 encryption). The password will be cached in memory for 30 minutes.
                    </p>
                )}

                <div className="space-y-3">
                    <div className="relative">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">
                            {isProtected ? "Password" : "New password"}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={isProtected ? "Enter password" : "Enter new password"}
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 pr-10 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8d8175] hover:text-white transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {!isProtected && (
                        <div className="relative">
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#8d8175]">Confirm password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 pr-10 text-sm text-white placeholder-[#5a4f44] outline-none transition focus:border-[#f7871f]/50"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

                <div className="flex gap-3 mt-5">
                    <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] transition hover:bg-white/5">Cancel</button>
                    <button
                        onClick={isProtected ? handleUnlock : handleLock}
                        disabled={saving}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${isProtected ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#f7871f] hover:bg-[#ce5a00]"}`}
                    >
                        {saving
                            ? (isProtected ? "Unlocking..." : "Locking...")
                            : (isProtected ? "Unlock" : "Lock")
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}