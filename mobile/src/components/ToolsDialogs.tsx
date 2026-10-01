import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text, Button, Dialog, Portal, IconButton, TextInput, RadioButton } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { ToolsScreenState } from "../hooks/useToolsScreen";

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
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                            {s.splitDialog && Array.from({ length: s.splitDialog.totalPages }, (_, i) => i + 1).map((page) => (
                                <TouchableOpacity
                                    key={page}
                                    onPress={() => s.toggleSplitPage(page)}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 8,
                                        backgroundColor: s.splitDialog!.selectedPages.includes(page)
                                            ? s.theme.colors.primary
                                            : s.theme.colors.surfaceVariant,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        margin: 2,
                                    }}
                                >
                                    <Text style={{ color: s.splitDialog!.selectedPages.includes(page) ? "#fff" : s.theme.colors.onSurface }}>
                                        {page}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
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
            <Portal>
                <Dialog visible={s.reorderDialog !== null} onDismiss={() => s.setReorderDialog(null)}>
                    <Dialog.Title>{t("tools.reorderTitle", { name: s.reorderDialog?.pdfName || "" })}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            {t("tools.reorderInstructions")}
                        </Text>
                        {s.reorderDialog && s.reorderDialog.pageOrder.map((page, index) => (
                            <View key={page} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                                <Text style={{ width: 30, fontWeight: "600" }}>{page}</Text>
                                <IconButton icon="arrow-up" size={16} onPress={() => s.movePageUp(index)} disabled={index === 0} />
                                <IconButton icon="arrow-down" size={16} onPress={() => s.movePageDown(index)} disabled={index >= s.reorderDialog!.pageOrder.length - 1} />
                            </View>
                        ))}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => s.setReorderDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={() => { if (s.reorderDialog) { const data = { ...s.reorderDialog }; s.setReorderDialog(null); s.setNameDialog({ type: "reorder", data }); } }}>{t("tools.reorder")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Remove Pages Dialog — choose pages to remove */}
            <Portal>
                <Dialog visible={s.removeDialog !== null} onDismiss={() => s.setRemoveDialog(null)}>
                    <Dialog.Title>{t("tools.removeTitle", { name: s.removeDialog?.pdfName || "" })}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            {t("tools.removeSelectPages")}
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                            {s.removeDialog && Array.from({ length: s.removeDialog.totalPages }, (_, i) => i + 1).map((page) => (
                                <TouchableOpacity
                                    key={page}
                                    onPress={() => s.toggleRemovePage(page)}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 8,
                                        backgroundColor: s.removeDialog!.selectedPages.includes(page)
                                            ? s.theme.colors.error
                                            : s.theme.colors.surfaceVariant,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        margin: 2,
                                    }}
                                >
                                    <Text style={{ color: s.removeDialog!.selectedPages.includes(page) ? "#fff" : s.theme.colors.onSurface }}>
                                        {page}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
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
            <Portal>
                <Dialog visible={s.compressDialog !== null} onDismiss={() => s.setCompressDialog(null)}>
                    <Dialog.Title>{t("tools.compressTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            {t("tools.compressHint", { name: s.compressDialog?.pdfName || "" })}
                        </Text>
                        {!s.isOnline && (
                            <Text variant="bodyMedium" style={{ color: s.theme.colors.onSurfaceVariant, marginBottom: 12 }}>
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

            {/* Import/Export Dialog — requires connection */}
            <Portal>
                <Dialog visible={s.importExportDialog !== null} onDismiss={() => s.setImportExportDialog(null)}>
                    <Dialog.Title>{s.importExportDialog?.mode === "import" ? t("tools.importTitle") : t("tools.exportTitle")}</Dialog.Title>
                    <Dialog.Content>
                        {!s.isOnline && (
                            <Text variant="bodyMedium" style={{ color: s.theme.colors.error, marginBottom: 12 }}>
                                {t("tools.requiresConnection")}
                            </Text>
                        )}
                        {s.importExportDialog?.mode === "import" ? (
                            <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                                {t("tools.importHint")}
                            </Text>
                        ) : (
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
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => s.setImportExportDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={s.importExportDialog?.mode === "import" ? s.executeImport : s.executeExport} loading={s.importExportBusy} disabled={s.importExportBusy || !s.isOnline}>
                            {s.importExportDialog?.mode === "import" ? t("tools.importAction") : t("tools.exportAction")}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Password Dialog — protect or unlock */}
            <Portal>
                <Dialog visible={s.passwordDialog !== null} onDismiss={() => s.setPasswordDialog(null)}>
                    <Dialog.Title>{s.passwordDialog?.mode === "protect" ? t("tools.protectTitle") : t("tools.unlockTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                            {s.passwordDialog?.mode === "protect"
                                ? t("tools.passwordProtectHint", { name: s.passwordDialog?.pdfName || "" })
                                : t("tools.passwordUnlockHint", { name: s.passwordDialog?.pdfName || "" })}
                        </Text>
                        <TextInput
                            label={t("tools.passwordHint")}
                            value={s.passwordInput}
                            onChangeText={s.setPasswordInput}
                            mode="outlined"
                            secureTextEntry
                            style={{ marginBottom: 12 }}
                        />
                        {s.passwordDialog?.mode === "protect" && (
                            <TextInput
                                label={t("tools.confirmPassword")}
                                value={s.passwordConfirm}
                                onChangeText={s.setPasswordConfirm}
                                mode="outlined"
                                secureTextEntry
                            />
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => s.setPasswordDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={s.passwordDialog?.mode === "protect" ? s.executeProtect : s.executeUnlock}>
                            {s.passwordDialog?.mode === "protect" ? t("tools.protect") : t("tools.unlockAction")}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

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