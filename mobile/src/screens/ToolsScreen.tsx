import React from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, Button, useTheme, ActivityIndicator, Dialog, Portal, IconButton, TextInput, Snackbar, RadioButton } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useTranslation } from "react-i18next";
import { useToolsScreen } from "../hooks/useToolsScreen";
import SignFlowDialog from "../components/SignFlowDialog";
import AnnotationFlowDialog from "../components/AnnotationFlowDialog";
import OcrFlowDialog from "../components/OcrFlowDialog";
import ShareFlowDialog from "../components/ShareFlowDialog";
import ToolsPdfListItem from "../components/ToolsPdfListItem";

type ToolsNavProp = NativeStackNavigationProp<RootStackParamList, "Tools">;

export default function ToolsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<ToolsNavProp>();
    void navigation;
    const s = useToolsScreen();
    const { t } = useTranslation();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant }}>
                <Text variant="titleMedium" style={{ marginBottom: 12 }}>{t("tools.title")}</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Button
                        mode={s.operation === "merge" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "merge" ? theme.colors.primary : undefined}
                        textColor={s.operation === "merge" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("merge"); s.setSelectedIds([]); }}
                    >
                        {t("tools.merge")}
                    </Button>
                    <Button
                        mode={s.operation === "split" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "split" ? theme.colors.primary : undefined}
                        textColor={s.operation === "split" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("split"); s.setSelectedIds([]); }}
                    >
                        {t("tools.split")}
                    </Button>
                    <Button
                        mode={s.operation === "compress" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "compress" ? theme.colors.primary : undefined}
                        textColor={s.operation === "compress" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("compress"); s.setSelectedIds([]); }}
                    >
                        {t("tools.compress")}
                    </Button>
                    <Button
                        mode={s.operation === "reorder" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "reorder" ? theme.colors.primary : undefined}
                        textColor={s.operation === "reorder" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("reorder"); s.setSelectedIds([]); }}
                    >
                        {t("tools.reorder")}
                    </Button>
                    <Button
                        mode={s.operation === "remove" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "remove" ? theme.colors.primary : undefined}
                        textColor={s.operation === "remove" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("remove"); s.setSelectedIds([]); }}
                    >
                        {t("tools.remove")}
                    </Button>
                    <Button
                        mode={s.operation === "metadata" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "metadata" ? theme.colors.primary : undefined}
                        textColor={s.operation === "metadata" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("metadata"); s.setSelectedIds([]); }}
                    >
                        {t("tools.metadata")}
                    </Button>
                    <Button
                        mode={s.operation === "protect" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "protect" ? theme.colors.primary : undefined}
                        textColor={s.operation === "protect" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("protect"); s.setSelectedIds([]); }}
                    >
                        {t("tools.password")}
                    </Button>
                    <Button
                        mode={s.operation === "unlock" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "unlock" ? theme.colors.primary : undefined}
                        textColor={s.operation === "unlock" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("unlock"); s.setSelectedIds([]); }}
                    >
                        {t("tools.unlock")}
                    </Button>
                    <Button
                        mode={s.operation === "sign" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "sign" ? theme.colors.primary : undefined}
                        textColor={s.operation === "sign" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("sign"); s.setSelectedIds([]); }}
                    >
                        {t("tools.sign")}
                    </Button>
                    <Button
                        mode={s.operation === "annotate" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "annotate" ? theme.colors.primary : undefined}
                        textColor={s.operation === "annotate" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("annotate"); s.setSelectedIds([]); }}
                    >
                        {t("tools.annotate")}
                    </Button>
                    <Button
                        mode={s.operation === "ocr" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "ocr" ? theme.colors.primary : undefined}
                        textColor={s.operation === "ocr" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("ocr"); s.setSelectedIds([]); }}
                    >
                        {t("tools.ocr")}
                    </Button>
                    <Button
                        mode={s.operation === "share" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "share" ? theme.colors.primary : undefined}
                        textColor={s.operation === "share" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("share"); s.setSelectedIds([]); }}
                    >
                        {t("tools.share")}
                    </Button>
                    <Button
                        mode={s.operation === "import" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "import" ? theme.colors.primary : undefined}
                        textColor={s.operation === "import" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("import"); s.setSelectedIds([]); }}
                    >
                        {t("tools.import")}
                    </Button>
                    <Button
                        mode={s.operation === "export" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "export" ? theme.colors.primary : undefined}
                        textColor={s.operation === "export" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("export"); s.setSelectedIds([]); }}
                    >
                        {t("tools.export")}
                    </Button>
                </View>
            </View>

            {s.operation === "merge" && s.selectedIds.length >= 2 && (
                <View style={{ padding: 16 }}>
                    <Button mode="contained" onPress={s.handleMerge} loading={s.loading} disabled={s.loading}>
                        {t("tools.mergeAction", { count: s.selectedIds.length })}
                    </Button>
                </View>
            )}

            {s.result ? (
                <Portal>
                    <Snackbar
                        visible={s.snackbarVisible}
                        onDismiss={() => s.setSnackbarVisible(false)}
                        duration={3000}
                        action={{ label: t("common.ok"), onPress: () => s.setSnackbarVisible(false) }}
                    >
                        {s.result}
                    </Snackbar>
                </Portal>
            ) : null}

            {!s.operation ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                        {t("tools.selectTool")}
                    </Text>
                </View>
            ) : s.loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    data={s.pdfs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <ToolsPdfListItem
                            item={item}
                            isSelected={s.selectedIds.includes(item.id)}
                            onPress={s.handleItemPress}
                        />
                    )}
                />
            )}

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
                                            ? theme.colors.primary
                                            : theme.colors.surfaceVariant,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        margin: 2,
                                    }}
                                >
                                    <Text style={{ color: s.splitDialog!.selectedPages.includes(page) ? "#fff" : theme.colors.onSurface }}>
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
                                            ? theme.colors.error
                                            : theme.colors.surfaceVariant,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        margin: 2,
                                    }}
                                >
                                    <Text style={{ color: s.removeDialog!.selectedPages.includes(page) ? "#fff" : theme.colors.onSurface }}>
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

            {/* Import/Export Dialog — requires connection */}
            <Portal>
                <Dialog visible={s.importExportDialog !== null} onDismiss={() => s.setImportExportDialog(null)}>
                    <Dialog.Title>{s.importExportDialog?.mode === "import" ? t("tools.importTitle") : t("tools.exportTitle")}</Dialog.Title>
                    <Dialog.Content>
                        {!s.isOnline && (
                            <Text variant="bodyMedium" style={{ color: theme.colors.error, marginBottom: 12 }}>
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

            {/* Sign flow — choose signature (draw/gallery) then position it */}
            {s.signDialog && (
                <SignFlowDialog
                    visible={s.signDialog !== null}
                    pdfId={s.signDialog.pdfId}
                    pdfName={s.signDialog.pdfName}
                    pdfUri={s.signDialog.pdfUri}
                    totalPages={s.signDialog.totalPages}
                    onDismiss={() => s.setSignDialog(null)}
                    onSigned={s.handleSigned}
                    onFailed={s.handleSignFailed}
                />
            )}

            {/* Annotation flow — choose type/color/page then position it */}
            {s.annotationDialog && (
                <AnnotationFlowDialog
                    visible={s.annotationDialog !== null}
                    pdfId={s.annotationDialog.pdfId}
                    pdfName={s.annotationDialog.pdfName}
                    pdfUri={s.annotationDialog.pdfUri}
                    totalPages={s.annotationDialog.totalPages}
                    onDismiss={() => s.setAnnotationDialog(null)}
                    onSaved={s.handleAnnotationSaved}
                    onFailed={s.handleAnnotationFailed}
                />
            )}

            {/* OCR — cloud-only, disabled offline */}
            {s.ocrDialog && (
                <OcrFlowDialog
                    visible={s.ocrDialog !== null}
                    pdfId={s.ocrDialog.pdfId}
                    pdfName={s.ocrDialog.pdfName}
                    isOnline={s.isOnline}
                    onDismiss={() => s.setOcrDialog(null)}
                    onDone={s.handleOcrDone}
                    onFailed={s.handleOcrFailed}
                />
            )}

            {/* Share via link — cloud-only, disabled offline */}
            {s.shareDialog && (
                <ShareFlowDialog
                    visible={s.shareDialog !== null}
                    pdfId={s.shareDialog.pdfId}
                    pdfName={s.shareDialog.pdfName}
                    isOnline={s.isOnline}
                    onDismiss={() => s.setShareDialog(null)}
                />
            )}

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
        </SafeAreaView>
    );
}