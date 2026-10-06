import React from "react";
import { Text, Button, Dialog, Portal, RadioButton } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { ToolsScreenState } from "../hooks/useToolsScreen";

/**
 * Import/Export dialog (issue #885, A3a - step 5). Extracted from ToolsDialogs
 * so the import/export mode-switch uses early returns instead of a nested
 * ternary + fragment. Zero behavior changes.
 */
export default function ImportExportDialog({ s }: { s: ToolsScreenState }) {
    const { t } = useTranslation();
    const mode = s.importExportDialog?.mode;

    return (
        <Portal>
            <Dialog visible={s.importExportDialog !== null} onDismiss={() => s.setImportExportDialog(null)}>
                <Dialog.Title>{mode === "import" ? t("tools.importTitle") : t("tools.exportTitle")}</Dialog.Title>
                <Dialog.Content>
                    {!s.isOnline && (
                        <Text variant="bodyMedium" style={{ color: s.theme.colors.error, marginBottom: 12 }}>
                            {t("tools.requiresConnection")}
                        </Text>
                    )}
                    {mode === "import" ? importHint(s) : exportFields(s)}
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => s.setImportExportDialog(null)}>{t("common.cancel")}</Button>
                    <Button onPress={mode === "import" ? s.executeImport : s.executeExport} loading={s.importExportBusy} disabled={s.importExportBusy || !s.isOnline}>
                        {mode === "import" ? t("tools.importAction") : t("tools.exportAction")}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}

function importHint(s: ToolsScreenState) {
    const { t } = useTranslation();
    return (
        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
            {t("tools.importHint")}
        </Text>
    );
}

function exportFields(s: ToolsScreenState) {
    const { t } = useTranslation();
    return (
        <>
            <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                {t("tools.exportHint", { name: s.importExportDialog?.pdfName || "" })}
            </Text>
            <RadioButton.Group
                onValueChange={(val) => s.setExportFormat(val as string)}
                value={s.exportFormat}
            >
                <RadioButton.Item label="txt" value="txt" />
                <RadioButton.Item label="png" value="png" />
                <RadioButton.Item label="jpg" value="jpg" />
                <RadioButton.Item label="svg" value="svg" />
            </RadioButton.Group>
        </>
    );
}