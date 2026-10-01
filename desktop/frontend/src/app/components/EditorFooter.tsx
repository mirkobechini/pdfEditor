// Footer dell'editor desktop — estratta da app/app/page.tsx (issue #881, T6).

export type EditorFooterProps = {
    te: (k: string, values?: Record<string, string | number | Date>) => string;
    apiBase: string; // es. "http://127.0.0.1:3210"
};

export function EditorFooter(props: EditorFooterProps) {
    const { te, apiBase } = props;
    return (
        <footer className="h-10 shrink-0 border-t border-white/10 bg-[#0b0a09] px-5 text-[10px] text-[#7f7468]">
            <div className="mx-auto flex h-full max-w-[1880px] items-center justify-between">
                <div className="flex items-center gap-5">
                    <span className="text-[#48c769]">●</span>
                    <span>{te("sidecarOnline")} ({apiBase.replace("http://", "")})</span>
                    <span>{te("encoding")}</span>
                    <span>{te("database")}</span>
                </div>
                <div className="flex items-center gap-6">
                    <span>{te("pdfEngine")}</span>
                </div>
            </div>
        </footer>
    );
}