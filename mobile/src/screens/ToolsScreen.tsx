import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, Card, Button, useTheme, ActivityIndicator, Dialog, Portal, IconButton, TextInput, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { LocalPdf } from "../shared/types";
import { usePdfStorage } from "../hooks/usePdfStorage";
import { mergePdfs, splitPdf, reorderPages, removePages, updateMetadata, protectPdf, unlockPdf } from "../services/pdfService";
import { useTranslation } from "react-i18next";

type ToolsNavProp = NativeStackNavigationProp<RootStackParamList, "Tools">;

export default function ToolsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<ToolsNavProp>();
    const { loadLocalPdfs } = usePdfStorage();
    const { t } = useTranslation();
    const [pdfs, setPdfs] = useState<LocalPdf[]>([]);
    const [loading, setLoading] = useState(true);
    const [operation, setOperation] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [result, setResult] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);

    function showResult(msg: string) {
        setResult(msg);
        setSnackbarVisible(true);
    }

    // Split dialog state
    const [splitDialog, setSplitDialog] = useState<{ pdfId: string; pdfName: string; totalPages: number; selectedPages: number[] } | null>(null);
    // Remove dialog state
    const [removeDialog, setRemoveDialog] = useState<{ pdfId: string; pdfName: string; totalPages: number; selectedPages: number[] } | null>(null);
    // Reorder dialog state
    const [reorderDialog, setReorderDialog] = useState<{ pdfId: string; pdfName: string; pageOrder: number[] } | null>(null);
    // Name dialog state
    const [nameDialog, setNameDialog] = useState<{ type: "merge" | "split" | "reorder" | "remove"; data: any } | null>(null);
    const [nameInput, setNameInput] = useState("");
    // Metadata dialog state
    const [metadataDialog, setMetadataDialog] = useState<{ pdfId: string; pdfName: string; title: string; author: string } | null>(null);
    // Password dialog state
    const [passwordDialog, setPasswordDialog] = useState<{ pdfId: string; pdfName: string; mode: "protect" | "unlock" } | null>(null);
    const [passwordInput, setPasswordInput] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");

    useEffect(() => {
        loadLocalPdfs().then(setPdfs).finally(() => setLoading(false));
    }, []);

    const reloadPdfs = useCallback(async () => {
        const updated = await loadLocalPdfs();
        setPdfs(updated);
    }, [loadLocalPdfs]);

    async function handleMerge() {
        if (selectedIds.length < 2) { showResult(t("tools.selectMin2")); return; }
        // Ask for file name before merging
        setNameDialog({ type: "merge", data: { ids: [...selectedIds] } });
    }

    async function executeMerge(fileName?: string) {
        if (!nameDialog) return;
        const { ids } = nameDialog.data;
        setNameDialog(null);
        setLoading(true);
        const merged = await mergePdfs(ids, fileName);
        if (merged) {
            showResult(t("tools.mergeResult", { name: merged.original_filename }));
            setSelectedIds([]);
            await reloadPdfs();
        } else showResult(t("tools.mergeFailed"));
        setLoading(false);
    }

    // ─── Split ────────────────────────────────────────────────────

    function openSplitDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setSplitDialog({
            pdfId,
            pdfName: pdf.original_filename,
            totalPages: pdf.page_count || 1,
            selectedPages: [],
        });
    }

    function toggleSplitPage(page: number) {
        if (!splitDialog) return;
        const selected = splitDialog.selectedPages.includes(page)
            ? splitDialog.selectedPages.filter((p) => p !== page)
            : [...splitDialog.selectedPages, page];
        setSplitDialog({ ...splitDialog, selectedPages: selected });
    }

    function openRemoveDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setRemoveDialog({
            pdfId,
            pdfName: pdf.original_filename,
            totalPages: pdf.page_count || 1,
            selectedPages: [],
        });
    }

    function toggleRemovePage(page: number) {
        if (!removeDialog) return;
        const selected = removeDialog.selectedPages.includes(page)
            ? removeDialog.selectedPages.filter((p) => p !== page)
            : [...removeDialog.selectedPages, page];
        setRemoveDialog({ ...removeDialog, selectedPages: selected });
    }

    // ─── Metadata ────────────────────────────────────────────────

    function openMetadataDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        setMetadataDialog({
            pdfId,
            pdfName: pdf.original_filename,
            title: pdf.title || "",
            author: pdf.author || "",
        });
    }

    async function saveMetadata() {
        if (!metadataDialog) return;
        const { pdfId, title, author } = metadataDialog;
        setMetadataDialog(null);
        setLoading(true);
        const result_pdf = await updateMetadata(pdfId, title || undefined, author || undefined);
        if (result_pdf) showResult(t("tools.metadataResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.metadataFailed"));
        setLoading(false);
        await reloadPdfs();
    }

    async function executeSplit(fileName?: string) {
        if (!nameDialog) return;
        const { pdfId, totalPages, selectedPages } = nameDialog.data;
        setSplitDialog(null);
        setLoading(true);

        // Build contiguous ranges from selected pages (e.g., [1,2,4,5] → [[1,2],[4,5]])
        const selectedRanges: [number, number][] = [];
        let start = selectedPages[0];
        let end = selectedPages[0];
        for (let i = 1; i < selectedPages.length; i++) {
            if (selectedPages[i] === end + 1) {
                end = selectedPages[i];
            } else {
                selectedRanges.push([start, end]);
                start = selectedPages[i];
                end = selectedPages[i];
            }
        }
        selectedRanges.push([start, end]);

        // Remaining pages as contiguous ranges
        const remainingPages: number[] = [];
        for (let i = 1; i <= totalPages; i++) {
            if (!selectedPages.includes(i)) remainingPages.push(i);
        }
        const remainingRanges: [number, number][] = [];
        if (remainingPages.length > 0) {
            let rStart = remainingPages[0];
            let rEnd = remainingPages[0];
            for (let i = 1; i < remainingPages.length; i++) {
                if (remainingPages[i] === rEnd + 1) {
                    rEnd = remainingPages[i];
                } else {
                    remainingRanges.push([rStart, rEnd]);
                    rStart = remainingPages[i];
                    rEnd = remainingPages[i];
                }
            }
            remainingRanges.push([rStart, rEnd]);
        }

        const allRanges = [...selectedRanges, ...remainingRanges];
        const results = await splitPdf(pdfId, allRanges, fileName);
        showResult(t("tools.splitResult", { count: results.length }));
        setLoading(false);
        await reloadPdfs();
    }

    // ─── Reorder ──────────────────────────────────────────────────

    function openReorderDialog(pdfId: string) {
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf || !pdf.page_count) return;
        const pages: number[] = [];
        for (let i = 1; i <= pdf.page_count; i++) pages.push(i);
        setReorderDialog({
            pdfId,
            pdfName: pdf.original_filename,
            pageOrder: pages,
        });
    }

    function movePageUp(index: number) {
        if (!reorderDialog || index === 0) return;
        const order = [...reorderDialog.pageOrder];
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
        setReorderDialog({ ...reorderDialog, pageOrder: order });
    }

    function movePageDown(index: number) {
        if (!reorderDialog || index >= reorderDialog.pageOrder.length - 1) return;
        const order = [...reorderDialog.pageOrder];
        [order[index], order[index + 1]] = [order[index + 1], order[index]];
        setReorderDialog({ ...reorderDialog, pageOrder: order });
    }

    async function executeReorder(fileName?: string) {
        if (!reorderDialog) return;
        const { pdfId, pageOrder } = reorderDialog;
        setReorderDialog(null);
        setLoading(true);

        const reordered = await reorderPages(pdfId, pageOrder, fileName);
        if (reordered) showResult(t("tools.reorderResult", { name: reordered.original_filename }));
        else showResult(t("tools.reorderFailed"));
        setLoading(false);
        await reloadPdfs();
    }

    // ─── Remove Pages ────────────────────────────────────────────

    async function executeRemove(fileName?: string) {
        if (!nameDialog || nameDialog.type !== "remove") return;
        const { pdfId, selectedPages } = nameDialog.data;
        if (selectedPages.length === 0) return;
        setLoading(true);
        const result_pdf = await removePages(pdfId, selectedPages, fileName);
        if (result_pdf) showResult(t("tools.removeResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.removeFailed"));
        setLoading(false);
        await reloadPdfs();
    }

    function openPasswordDialog(pdfId: string, mode: "protect" | "unlock") {
        setPasswordDialog({ pdfId, pdfName: pdfs.find((p) => p.id === pdfId)?.original_filename || "PDF", mode });
        setPasswordInput("");
        setPasswordConfirm("");
    }

    async function executeProtect() {
        if (!passwordDialog || passwordDialog.mode !== "protect") return;
        if (passwordInput.length < 4) { showResult(t("tools.passwordShort")); return; }
        if (passwordInput !== passwordConfirm) { showResult(t("tools.passwordMismatch")); return; }
        const { pdfId } = passwordDialog;
        setPasswordDialog(null);
        setLoading(true);
        const result_pdf = await protectPdf(pdfId, passwordInput);
        if (result_pdf) showResult(t("tools.protectResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.protectFailed"));
        setLoading(false);
        await reloadPdfs();
    }

    async function executeUnlock() {
        if (!passwordDialog || passwordDialog.mode !== "unlock") return;
        if (!passwordInput) { showResult(t("tools.enterPassword")); return; }
        const { pdfId } = passwordDialog;
        setPasswordDialog(null);
        setLoading(true);
        const result_pdf = await unlockPdf(pdfId, passwordInput);
        if (result_pdf) showResult(t("tools.unlockResult", { name: result_pdf.original_filename }));
        else showResult(t("tools.unlockFailed"));
        setLoading(false);
        await reloadPdfs();
    }

    function toggleSelect(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant }}>
                <Text variant="titleMedium" style={{ marginBottom: 12 }}>{t("tools.title")}</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Button
                        mode={operation === "merge" ? "contained" : "outlined"}
                        compact
                        buttonColor={operation === "merge" ? theme.colors.primary : undefined}
                        textColor={operation === "merge" ? "#fff" : theme.colors.primary}
                        onPress={() => { setOperation("merge"); setSelectedIds([]); }}
                    >
                        {t("tools.merge")}
                    </Button>
                    <Button
                        mode={operation === "split" ? "contained" : "outlined"}
                        compact
                        buttonColor={operation === "split" ? theme.colors.primary : undefined}
                        textColor={operation === "split" ? "#fff" : theme.colors.primary}
                        onPress={() => { setOperation("split"); setSelectedIds([]); }}
                    >
                        {t("tools.split")}
                    </Button>
                    <Button
                        mode={operation === "reorder" ? "contained" : "outlined"}
                        compact
                        buttonColor={operation === "reorder" ? theme.colors.primary : undefined}
                        textColor={operation === "reorder" ? "#fff" : theme.colors.primary}
                        onPress={() => { setOperation("reorder"); setSelectedIds([]); }}
                    >
                        {t("tools.reorder")}
                    </Button>
                    <Button
                        mode={operation === "remove" ? "contained" : "outlined"}
                        compact
                        buttonColor={operation === "remove" ? theme.colors.primary : undefined}
                        textColor={operation === "remove" ? "#fff" : theme.colors.primary}
                        onPress={() => { setOperation("remove"); setSelectedIds([]); }}
                    >
                        {t("tools.remove")}
                    </Button>
                    <Button
                        mode={operation === "metadata" ? "contained" : "outlined"}
                        compact
                        buttonColor={operation === "metadata" ? theme.colors.primary : undefined}
                        textColor={operation === "metadata" ? "#fff" : theme.colors.primary}
                        onPress={() => { setOperation("metadata"); setSelectedIds([]); }}
                    >
                        {t("tools.metadata")}
                    </Button>
                    <Button
                        mode={operation === "protect" ? "contained" : "outlined"}
                        compact
                        buttonColor={operation === "protect" ? theme.colors.primary : undefined}
                        textColor={operation === "protect" ? "#fff" : theme.colors.primary}
                        onPress={() => { setOperation("protect"); setSelectedIds([]); }}
                    >
                        {t("tools.password")}
                    </Button>
                    <Button
                        mode={operation === "unlock" ? "contained" : "outlined"}
                        compact
                        buttonColor={operation === "unlock" ? theme.colors.primary : undefined}
                        textColor={operation === "unlock" ? "#fff" : theme.colors.primary}
                        onPress={() => { setOperation("unlock"); setSelectedIds([]); }}
                    >
                        {t("tools.unlock")}
                    </Button>
                </View>
            </View>

            {operation === "merge" && selectedIds.length >= 2 && (
                <View style={{ padding: 16 }}>
                    <Button mode="contained" onPress={handleMerge} loading={loading} disabled={loading}>
                        {t("tools.mergeAction", { count: selectedIds.length })}
                    </Button>
                </View>
            )}

            {result ? (
                <Snackbar
                    visible={snackbarVisible}
                    onDismiss={() => setSnackbarVisible(false)}
                    duration={3000}
                    action={{ label: t("common.ok"), onPress: () => setSnackbarVisible(false) }}
                >
                    {result}
                </Snackbar>
            ) : null}

            {!operation ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                        {t("tools.selectTool")}
                    </Text>
                </View>
            ) : loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    data={pdfs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <Card
                            style={{
                                marginBottom: 12,
                                backgroundColor: selectedIds.includes(item.id)
                                    ? theme.colors.primaryContainer
                                    : theme.colors.surface,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    if (operation === "merge") toggleSelect(item.id);
                                    else if (operation === "split") openSplitDialog(item.id);
                                    else if (operation === "reorder") openReorderDialog(item.id);
                                    else if (operation === "remove") openRemoveDialog(item.id);
                                    else if (operation === "metadata") openMetadataDialog(item.id);
                                    else if (operation === "protect") openPasswordDialog(item.id, "protect");
                                    else if (operation === "unlock") openPasswordDialog(item.id, "unlock");
                                }}
                            >
                                <Card.Content>
                                    <Text variant="titleSmall" style={{ fontWeight: "600" }}>
                                        {item.original_filename}
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        {t("tools.pagesInfo", { count: item.page_count, size: (item.file_size / 1024).toFixed(0) })}
                                    </Text>
                                </Card.Content>
                            </TouchableOpacity>
                        </Card>
                    )}
                />
            )}

            {/* Split Dialog — choose pages to extract */}
            <Portal>
                <Dialog visible={splitDialog !== null} onDismiss={() => setSplitDialog(null)}>
                    <Dialog.Title>{t("tools.splitTitle", { name: splitDialog?.pdfName || "" })}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            {t("tools.splitSelectPages")}
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                            {splitDialog && Array.from({ length: splitDialog.totalPages }, (_, i) => i + 1).map((page) => (
                                <TouchableOpacity
                                    key={page}
                                    onPress={() => toggleSplitPage(page)}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 8,
                                        backgroundColor: splitDialog.selectedPages.includes(page)
                                            ? theme.colors.primary
                                            : theme.colors.surfaceVariant,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        margin: 2,
                                    }}
                                >
                                    <Text style={{ color: splitDialog.selectedPages.includes(page) ? "#fff" : theme.colors.onSurface }}>
                                        {page}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setSplitDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={() => { if (splitDialog) { const data = { ...splitDialog }; setSplitDialog(null); setNameDialog({ type: "split", data }); } }} disabled={!splitDialog || splitDialog.selectedPages.length === 0}>
                            {t("tools.splitExtract", { count: splitDialog?.selectedPages.length || 0 })}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Reorder Dialog — move pages up/down */}
            <Portal>
                <Dialog visible={reorderDialog !== null} onDismiss={() => setReorderDialog(null)}>
                    <Dialog.Title>{t("tools.reorderTitle", { name: reorderDialog?.pdfName || "" })}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            {t("tools.reorderInstructions")}
                        </Text>
                        {reorderDialog && reorderDialog.pageOrder.map((page, index) => (
                            <View key={page} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                                <Text style={{ width: 30, fontWeight: "600" }}>{page}</Text>
                                <IconButton icon="arrow-up" size={16} onPress={() => movePageUp(index)} disabled={index === 0} />
                                <IconButton icon="arrow-down" size={16} onPress={() => movePageDown(index)} disabled={index >= reorderDialog.pageOrder.length - 1} />
                            </View>
                        ))}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setReorderDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={() => { if (reorderDialog) { const data = { ...reorderDialog }; setReorderDialog(null); setNameDialog({ type: "reorder", data }); } }}>{t("tools.reorder")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Remove Pages Dialog — choose pages to remove */}
            <Portal>
                <Dialog visible={removeDialog !== null} onDismiss={() => setRemoveDialog(null)}>
                    <Dialog.Title>{t("tools.removeTitle", { name: removeDialog?.pdfName || "" })}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            {t("tools.removeSelectPages")}
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                            {removeDialog && Array.from({ length: removeDialog.totalPages }, (_, i) => i + 1).map((page) => (
                                <TouchableOpacity
                                    key={page}
                                    onPress={() => toggleRemovePage(page)}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 8,
                                        backgroundColor: removeDialog.selectedPages.includes(page)
                                            ? theme.colors.error
                                            : theme.colors.surfaceVariant,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        margin: 2,
                                    }}
                                >
                                    <Text style={{ color: removeDialog.selectedPages.includes(page) ? "#fff" : theme.colors.onSurface }}>
                                        {page}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setRemoveDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={() => { if (removeDialog) { const data = { ...removeDialog }; setRemoveDialog(null); setNameDialog({ type: "remove", data }); } }} disabled={!removeDialog || removeDialog.selectedPages.length === 0}>
                            {t("tools.removeAction", { count: removeDialog?.selectedPages.length || 0 })}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Metadata Dialog — edit title and author */}
            <Portal>
                <Dialog visible={metadataDialog !== null} onDismiss={() => setMetadataDialog(null)}>
                    <Dialog.Title>{t("tools.metadataTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput label={t("tools.metadataLabelTitle")} value={metadataDialog?.title || ""} onChangeText={(v) => setMetadataDialog((prev) => prev ? { ...prev, title: v } : null)} mode="outlined" style={{ marginBottom: 12 }} />
                        <TextInput label={t("tools.metadataLabelAuthor")} value={metadataDialog?.author || ""} onChangeText={(v) => setMetadataDialog((prev) => prev ? { ...prev, author: v } : null)} mode="outlined" />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setMetadataDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={saveMetadata}>{t("common.save")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Password Dialog — protect or unlock */}
            <Portal>
                <Dialog visible={passwordDialog !== null} onDismiss={() => setPasswordDialog(null)}>
                    <Dialog.Title>{passwordDialog?.mode === "protect" ? t("tools.protectTitle") : t("tools.unlockTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                            {passwordDialog?.mode === "protect"
                                ? t("tools.passwordProtectHint", { name: passwordDialog?.pdfName || "" })
                                : t("tools.passwordUnlockHint", { name: passwordDialog?.pdfName || "" })}
                        </Text>
                        <TextInput
                            label={t("tools.passwordHint")}
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                            mode="outlined"
                            secureTextEntry
                            style={{ marginBottom: 12 }}
                        />
                        {passwordDialog?.mode === "protect" && (
                            <TextInput
                                label={t("tools.confirmPassword")}
                                value={passwordConfirm}
                                onChangeText={setPasswordConfirm}
                                mode="outlined"
                                secureTextEntry
                            />
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setPasswordDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={passwordDialog?.mode === "protect" ? executeProtect : executeUnlock}>
                            {passwordDialog?.mode === "protect" ? t("tools.protect") : t("tools.unlockAction")}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Name Dialog — ask for file name before executing */}
            <Portal>
                <Dialog visible={nameDialog !== null} onDismiss={() => setNameDialog(null)}>
                    <Dialog.Title>{t("tools.namePdfTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label={t("tools.fileNameOptional")}
                            mode="outlined"
                            autoFocus
                            value={nameInput}
                            onChangeText={setNameInput}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setNameDialog(null)}>{t("common.cancel")}</Button>
                        <Button onPress={() => {
                            const type = nameDialog?.type;
                            const data = nameDialog?.data;
                            const fileName = nameInput.trim() || undefined;
                            setNameDialog(null);
                            setNameInput("");
                            if (type === "merge") executeMerge(fileName);
                            else if (type === "split") executeSplit(fileName);
                            else if (type === "reorder") executeReorder(fileName);
                            else if (type === "remove") executeRemove(fileName);
                        }}>{t("common.save")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </SafeAreaView>
    );
}