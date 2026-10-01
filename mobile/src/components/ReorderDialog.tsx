import React from "react";
import { View } from "react-native";
import { Text, Button, Dialog, Portal, IconButton } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { ToolsScreenState } from "../hooks/useToolsScreen";

/**
 * Reorder pages dialog (issue #885, A3a - step 6). Extracted from ToolsDialogs
 * to reduce nesting. Zero behavior changes.
 */
export default function ReorderDialog({ s }: { s: ToolsScreenState }) {
    const { t } = useTranslation();
    const dlg = s.reorderDialog;

    return (
        <Portal>
            <Dialog visible={dlg !== null} onDismiss={() => s.setReorderDialog(null)}>
                <Dialog.Title>{t("tools.reorderTitle", { name: dlg?.pdfName || "" })}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                        {t("tools.reorderInstructions")}
                    </Text>
                    {dlg && dlg.pageOrder.map((page, index) => (
                        <View key={page} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                            <Text style={{ width: 30, fontWeight: "600" }}>{page}</Text>
                            <IconButton icon="arrow-up" size={16} onPress={() => s.movePageUp(index)} disabled={index === 0} />
                            <IconButton icon="arrow-down" size={16} onPress={() => s.movePageDown(index)} disabled={index >= dlg.pageOrder.length - 1} />
                        </View>
                    ))}
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => s.setReorderDialog(null)}>{t("common.cancel")}</Button>
                    <Button onPress={() => { if (s.reorderDialog) { const data = { ...s.reorderDialog }; s.setReorderDialog(null); s.setNameDialog({ type: "reorder", data }); } }}>{t("tools.reorder")}</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}