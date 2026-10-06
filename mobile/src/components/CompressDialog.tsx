import React from "react";
import { Text, Button, Dialog, Portal, TextInput, RadioButton } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { ToolsScreenState } from "../hooks/useToolsScreen";

/**
 * Compress dialog — choose quality and output name (issue #885, A3a - step 6).
 * Extracted from ToolsDialogs to reduce nesting. Zero behavior changes.
 */
export default function CompressDialog({ s }: { s: ToolsScreenState }) {
    const { t } = useTranslation();
    const theme = s.theme;

    return (
        <Portal>
            <Dialog visible={s.compressDialog !== null} onDismiss={() => s.setCompressDialog(null)}>
                <Dialog.Title>{t("tools.compressTitle")}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                        {t("tools.compressHint", { name: s.compressDialog?.pdfName || "" })}
                    </Text>
                    {!s.isOnline && (
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                            {t("tools.compressOfflineHint")}
                        </Text>
                    )}
                    <RadioButton.Group
                        onValueChange={(val) => s.setCompressQuality(val as "low" | "medium" | "high")}
                        value={s.compressQuality}
                    >
                        <RadioButton.Item label={t("tools.compressLow")} value="low" />
                        <RadioButton.Item label={t("tools.compressMedium")} value="medium" />
                        <RadioButton.Item label={t("tools.compressHigh")} value="high" />
                    </RadioButton.Group>
                    <TextInput
                        label={t("tools.fileNameOptional")}
                        mode="outlined"
                        value={s.compressNameInput}
                        onChangeText={s.setCompressNameInput}
                        style={{ marginTop: 12 }}
                    />
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => s.setCompressDialog(null)}>{t("common.cancel")}</Button>
                    <Button onPress={() => {
                        const fileName = s.compressNameInput.trim() || undefined;
                        s.setCompressDialog(null);
                        s.setCompressNameInput("");
                        s.executeCompress(fileName);
                    }}>{t("common.save")}</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}