import React, { useState, useEffect } from "react";
import { ScrollView, View } from "react-native";
import { Dialog, Portal, Text, Button, useTheme, Checkbox } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { LocalPdf } from "../shared/types";
import { getOrphanPdfs } from "../services/localDb";

interface ImportPdfDialogProps {
    visible: boolean;
    onDismiss: () => void;
    onImport: (pdfIds: string[]) => Promise<void>;
}

export default function ImportPdfDialog({
    visible,
    onDismiss,
    onImport,
}: ImportPdfDialogProps) {
    const theme = useTheme();
    const { t } = useTranslation();
    const [orphanPdfs, setOrphanPdfs] = useState<LocalPdf[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [importing, setImporting] = useState(false);

    // Load orphan PDFs when dialog opens
    useEffect(() => {
        if (visible) {
            (async () => {
                const orphans = await getOrphanPdfs();
                setOrphanPdfs(orphans);
                setSelected(new Set());
            })();
        }
    }, [visible]);

    function toggle(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: "80%" }}>
                <Dialog.Title>{t("importPdf.title")}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                        {t("importPdf.desc")}
                    </Text>

                    {orphanPdfs.length === 0 ? (
                        <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, padding: 16 }}>
                            {t("importPdf.noOrphans")}
                        </Text>
                    ) : (
                        <ScrollView style={{ maxHeight: 300 }}>
                            {orphanPdfs.map((pdf) => (
                                <View
                                    key={pdf.id}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        padding: 8,
                                        borderRadius: 8,
                                        marginBottom: 4,
                                        backgroundColor: theme.colors.surfaceVariant,
                                    }}
                                >
                                    <Checkbox
                                        status={selected.has(pdf.id) ? "checked" : "unchecked"}
                                        onPress={() => toggle(pdf.id)}
                                        color={theme.colors.primary}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text variant="bodyMedium" numberOfLines={1} style={{ fontWeight: "600" }}>
                                            {pdf.original_filename}
                                        </Text>
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                            {formatSize(pdf.file_size)} • {pdf.page_count} p.
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss} disabled={importing}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        mode="contained"
                        disabled={importing || selected.size === 0}
                        loading={importing}
                        onPress={async () => {
                            setImporting(true);
                            try {
                                await onImport(Array.from(selected));
                                onDismiss();
                            } finally {
                                setImporting(false);
                            }
                        }}
                    >
                        {t("importPdf.import", { count: selected.size })}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}
