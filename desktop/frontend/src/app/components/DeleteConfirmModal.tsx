// Modale di conferma eliminazione — estratta da app/app/page.tsx (issue #881, T6).

export type DeleteConfirmModalProps = {
    te: (k: string, values?: Record<string, string | number | Date>) => string;
    deleteConfirmId: string | null;
    onCancel: () => void;
    onConfirm: (id: string) => void;
};

export function DeleteConfirmModal(props: DeleteConfirmModalProps) {
    const { te, deleteConfirmId, onCancel, onConfirm } = props;
    if (!deleteConfirmId) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#201a15] p-6 shadow-2xl">
                <h2 className="text-base font-bold text-white mb-2">{te("deleteConfirmTitle")}</h2>
                <p className="text-sm text-[#9a8d80] mb-6">
                    {te("deleteConfirmDesc")}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[#9a8d80] transition hover:bg-white/5"
                    >
                        {te("cancel")}
                    </button>
                    <button
                        onClick={() => onConfirm(deleteConfirmId)}
                        className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                        {te("delete")}
                    </button>
                </div>
            </div>
        </div>
    );
}