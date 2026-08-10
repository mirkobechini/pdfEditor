import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { Dialog, Portal, Text, Button, useTheme, RadioButton, Chip } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { SyncConflict } from "../hooks/useCloudSync";

type ConflictResolution = "local" | "cloud";

interface ConflictDialogProps {
    visible: boolean;
    conflicts: SyncConflict[];
    onDismiss: () => void;
    onResolve: (resolutions: Record<string, ConflictResolution>) => void;
}

export default function ConflictDialog({
    visible,
    conflicts,
    onDismiss,
    onResolve,
}: ConflictDialogProps) {
    const theme = useTheme();
    const { t } = useTranslation();
    const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
    const [detailedView, setDetailedView] = useState(false);

    function formatDate(iso: string): string {
        try {
            return new Date(iso).toLocaleDateString() + " " + new Date(iso).toLocaleTimeString();
        } catch {
            return iso;
        }
    }

    function formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // Reset resolutions when dialog opens with new conflicts
    React.useEffect(() => {
        if (visible) {
            setResolutions({});
            setDetailedView(false);
        }
    }, [visible, conflicts]);

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: "80%" }}>
                <Dialog.Title>
                    {t("conflict.title", { count: conflicts.length })}
                </Dialog.Title>
                <Dialog.Content>
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 }}>
                        <Chip onPress={() => setDetailedView(!detailedView)}>
                            {detailedView ? t("conflict.simpleView") : t("conflict.detailedView")}
                        </Chip>
                    </View>
                    <ScrollView style={{ maxHeight: 300 }}>
                        {conflicts.map((conflict) => {
                            const selected = resolutions[conflict.pdfId] || "local";
                            return (
                                <View
                                    key={conflict.pdfId}
                                    style={{
                                        marginBottom: 12,
                                        padding: 12,
                                        borderRadius: 8,
                                        backgroundColor: theme.colors.surfaceVariant,
                                    }}
                                >
                                    <Text variant="titleSmall" style={{ fontWeight: "700", marginBottom: 4 }}>
                                        {conflict.pdfName}
                                    </Text>

                                    {detailedView ? (
                                        <View style={{ marginBottom: 8 }}>
                                            <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                                                {t("conflict.localVersion")}
                                            </Text>
                                            <Text variant="bodySmall">
                                                {formatDate(conflict.local.updated_at)} • {formatSize(conflict.local.file_size)}
                                            </Text>
                                            <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
                                                {t("conflict.cloudVersion")}
                                            </Text>
                                            <Text variant="bodySmall">
                                                {formatDate(conflict.cloud.updated_at)} • {formatSize(conflict.cloud.file_size)}
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                                            {t("conflict.chooseVersion")}
                                        </Text>
                                    )}

                                    <RadioButton.Group
                                        onValueChange={(val) =>
                                            setResolutions((prev) => ({ ...prev, [conflict.pdfId]: val as ConflictResolution }))
                                        }
                                        value={selected}
                                    >
                                        <RadioButton.Item
                                            label={`${t("conflict.keepLocal")}${detailedView ? "" : ""}`}
                                            value="local"
                                        />
                                        <RadioButton.Item
                                            label={`${t("conflict.keepCloud")}`}
                                            value="cloud"
                                        />
                                    </RadioButton.Group>
                                </View>
                            );
                        })}
                    </ScrollView>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss}>{t("common.cancel")}</Button>
                    <Button
                        mode="contained"
                        onPress={() => {
                            onResolve(resolutions);
                            onDismiss();
                        }}
                    >
                        {t("conflict.applyAll")}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}
