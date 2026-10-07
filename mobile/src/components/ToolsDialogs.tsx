import React from "react";
import { View } from "react-native";
import { Text, Button, Dialog, Portal, IconButton, TextInput, RadioButton } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { ToolsScreenState } from "../hooks/useToolsScreen";
import PageGrid from "./PageGrid";
import ImportExportDialog from "./ImportExportDialog";
import ReorderDialog from "./ReorderDialog";
import PasswordDialog from "./PasswordDialog";
import CompressDialog from "./CompressDialog";

/** Renders every ToolsScreen modal dialog (issue #885, A3a - step 2). */
export default function ToolsDialogs({ s }: { s: ToolsScreenState }) {
    const { t } = useTranslation();

    return (
        <>
            {/* Split Dialog — choose pages to extract */}
            <Portal>
                <Dialog visible={s.splitDialog !== null} onDismiss={() => s.setSplitDialog(null)}>
                    <Dialog.Title>{t("tools.splitTitle", { name: s.splitDialog?.pdfName || "" })}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            {t("tools.splitSelectPages")}
                        </Text>
                        {s.splitDialog && (
                            <PageGrid
                                totalPages={s.splitDialog.totalPages}
                                selectedPages={s.splitDialog.selectedPages}
                                onTogglePage={s.toggleSplitPage}
                                selectedColor={s.theme.colors.primary}
                                unselectedColor={s.theme.colors.surfaceVariant}
                                textColor="#fff"
                                unselectedTextColor={s.theme.colors.onSurface}
                            />
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => s.setSplitDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={() => { if (s.splitDialog) { const data = { ...s.splitDialog }; s.setSplitDialog(null); s.setNameDialog({ type: "split", data }); } }} disabled={!s.splitDialog || s.splitDialog.selectedPages.length === 0}>
                            {t("tools.splitExtract", { count: s.splitDialog?.selectedPages.length || 0 })}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Reorder Dialog — move pages up/down */}
            <ReorderDialog s={s} />

            {/* Remove Pages Dialog — choose pages to remove */}
            <Portal>
                <Dialog visible={s.removeDialog !== null} onDismiss={() => s.setRemoveDialog(null)}>
                    <Dialog.Title>{t("tools.removeTitle", { name: s.removeDialog?.pdfName || "" })}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            {t("tools.removeSelectPages")}
                        </Text>
                        {s.removeDialog && (
                            <PageGrid
                                totalPages={s.removeDialog.totalPages}
                                selectedPages={s.removeDialog.selectedPages}
                                onTogglePage={s.toggleRemovePage}
                                selectedColor={s.theme.colors.error}
                                unselectedColor={s.theme.colors.surfaceVariant}
                                textColor="#fff"
                                unselectedTextColor={s.theme.colors.onSurface}
                            />
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => s.setRemoveDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={() => { if (s.removeDialog) { const data = { ...s.removeDialog }; s.setRemoveDialog(null); s.setNameDialog({ type: "remove", data }); } }} disabled={!s.removeDialog || s.removeDialog.selectedPages.length === 0}>
                            {t("tools.removeAction", { count: s.removeDialog?.selectedPages.length || 0 })}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Metadata Dialog — edit title and author */}
            <Portal>
                <Dialog visible={s.metadataDialog !== null} onDismiss={() => s.setMetadataDialog(null)}>
                    <Dialog.Title>{t("tools.metadataTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput label={t("tools.metadataLabelTitle")} value={s.metadataDialog?.title || ""} onChangeText={(v) => s.setMetadataDialog((prev) => prev ? { ...prev, title: v } : null)} mode="outlined" style={{ marginBottom: 12 }} />
                        <TextInput label={t("tools.metadataLabelAuthor")} value={s.metadataDialog?.author || ""} onChangeText={(v) => s.setMetadataDialog((prev) => prev ? { ...prev, author: v } : null)} mode="outlined" />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => s.setMetadataDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={s.saveMetadata}>{t("common.save")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Compress Dialog — choose quality and output name */}
            <CompressDialog s={s} />

            {/* Import/Export Dialog — requires connection */}
            <ImportExportDialog s={s} />

            {/* Password Dialog — protect or unlock */}
            <PasswordDialog s={s} />

            {/* Name Dialog — ask for file name before executing */}
            <Portal>
                <Dialog visible={s.nameDialog !== null} onDismiss={() => s.setNameDialog(null)}>
                    <Dialog.Title>{t("tools.namePdfTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label={t("tools.fileNameOptional")}
                            mode="outlined"
                            autoFocus
                            value={s.nameInput}
                            onChangeText={s.setNameInput}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => s.setNameDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={() => {
                            const type = s.nameDialog?.type;
                            const data = s.nameDialog?.data;
                            const fileName = s.nameInput.trim() || undefined;
                            s.setNameDialog(null);
                            s.setNameInput("");
                            if (type === "merge") s.executeMerge(fileName);
                            else if (type === "split") s.executeSplit(fileName);
                            else if (type === "reorder") s.executeReorder(fileName);
                            else if (type === "remove") s.executeRemove(fileName);
                        }}>{t("common.save")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Rename Dialog — offered right after sign/annotate/OCR results */}
            <Portal>
                <Dialog visible={s.renamePdf !== null} onDismiss={() => { s.setRenamePdf(null); s.setRenameInput(""); s.setRenameSelection(undefined); }}>
                    <Dialog.Title>{t("tools.renamePdfTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            ref={s.renameInputRef}
                            label={t("tools.renamePdfLabel")}
                            mode="outlined"
                            value={s.renameInput}
                            onChangeText={s.setRenameInput}
                            selection={s.renameSelection}
                            onSelectionChange={(e) => s.setRenameSelection(e.nativeEvent.selection)}
                            autoCorrect={false}
                            spellCheck={false}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => { s.setRenamePdf(null); s.setRenameInput(""); s.setRenameSelection(undefined); }}>{t("tools.renameSkip")}</Button>
                        <Button onPress={s.submitRename}>{t("common.save")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </>
    );
}