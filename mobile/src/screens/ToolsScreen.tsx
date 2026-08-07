import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, Card, Button, useTheme, ActivityIndicator, Dialog, Portal, IconButton, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { LocalPdf } from "../shared/types";
import { usePdfStorage } from "../hooks/usePdfStorage";
import { mergePdfs, splitPdf, reorderPages } from "../services/pdfService";

type ToolsNavProp = NativeStackNavigationProp<RootStackParamList, "Tools">;

export default function ToolsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<ToolsNavProp>();
    const { loadLocalPdfs } = usePdfStorage();
    const [pdfs, setPdfs] = useState<LocalPdf[]>([]);
    const [loading, setLoading] = useState(true);
    const [operation, setOperation] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [result, setResult] = useState("");

    // Split dialog state
    const [splitDialog, setSplitDialog] = useState<{ pdfId: string; pdfName: string; totalPages: number; selectedPages: number[] } | null>(null);
    // Reorder dialog state
    const [reorderDialog, setReorderDialog] = useState<{ pdfId: string; pdfName: string; pageOrder: number[] } | null>(null);
    // Name dialog state
    const [nameDialog, setNameDialog] = useState<{ type: "merge" | "split" | "reorder"; data: any } | null>(null);
    const [nameInput, setNameInput] = useState("");

    useEffect(() => {
        loadLocalPdfs().then(setPdfs).finally(() => setLoading(false));
    }, []);

    const reloadPdfs = useCallback(async () => {
        const updated = await loadLocalPdfs();
        setPdfs(updated);
    }, [loadLocalPdfs]);

    async function handleMerge() {
        if (selectedIds.length < 2) { setResult("Select at least 2 PDFs"); return; }
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
            setResult(`Merged into: ${merged.original_filename}`);
            setSelectedIds([]);
            await reloadPdfs();
        } else setResult("Merge failed");
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
        setResult(`Split into ${results.length} PDFs`);
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
        if (reordered) setResult(`Reordered: ${reordered.original_filename}`);
        else setResult("Reorder failed");
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
                <Text variant="titleMedium" style={{ marginBottom: 12 }}>PDF Tools</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Button mode="contained" compact onPress={() => { setOperation("merge"); setSelectedIds([]); }}>
                        Merge
                    </Button>
                    <Button mode="contained" compact onPress={() => { setOperation("split"); setSelectedIds([]); }}>
                        Split
                    </Button>
                    <Button mode="contained" compact onPress={() => { setOperation("reorder"); setSelectedIds([]); }}>
                        Reorder
                    </Button>
                </View>
            </View>

            {operation === "merge" && selectedIds.length >= 2 && (
                <View style={{ padding: 16 }}>
                    <Button mode="contained" onPress={handleMerge} loading={loading} disabled={loading}>
                        Merge {selectedIds.length} PDFs
                    </Button>
                </View>
            )}

            {result ? (
                <View style={{ padding: 16 }}>
                    <Text style={{ color: theme.colors.primary }}>{result}</Text>
                    <Button onPress={() => setResult("")} style={{ marginTop: 8 }}>Clear</Button>
                </View>
            ) : null}

            {loading ? (
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
                                }}
                            >
                                <Card.Content>
                                    <Text variant="titleSmall" style={{ fontWeight: "600" }}>
                                        {item.original_filename}
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        {item.page_count} pages • {(item.file_size / 1024).toFixed(0)} KB
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
                    <Dialog.Title>Split "{splitDialog?.pdfName}"</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            Select pages to extract into a new PDF:
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
                        <Button onPress={() => setSplitDialog(null)}>Cancel</Button>
                        <Button onPress={() => { if (splitDialog) { const data = { ...splitDialog }; setSplitDialog(null); setNameDialog({ type: "split", data }); } }} disabled={!splitDialog || splitDialog.selectedPages.length === 0}>
                            Extract {splitDialog?.selectedPages.length || 0} pages
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Reorder Dialog — move pages up/down */}
            <Portal>
                <Dialog visible={reorderDialog !== null} onDismiss={() => setReorderDialog(null)}>
                    <Dialog.Title>Reorder "{reorderDialog?.pdfName}"</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            Rearrange pages by moving them up or down:
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
                        <Button onPress={() => setReorderDialog(null)}>Cancel</Button>
                        <Button onPress={() => { if (reorderDialog) { const data = { ...reorderDialog }; setReorderDialog(null); setNameDialog({ type: "reorder", data }); } }}>Reorder</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Name Dialog — ask for file name before executing */}
            <Portal>
                <Dialog visible={nameDialog !== null} onDismiss={() => setNameDialog(null)}>
                    <Dialog.Title>Name your PDF</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="File name (optional)"
                            mode="outlined"
                            autoFocus
                            value={nameInput}
                            onChangeText={setNameInput}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setNameDialog(null)}>Cancel</Button>
                        <Button onPress={() => {
                            const type = nameDialog?.type;
                            const data = nameDialog?.data;
                            const fileName = nameInput.trim() || undefined;
                            setNameDialog(null);
                            setNameInput("");
                            if (type === "merge") executeMerge(fileName);
                            else if (type === "split") executeSplit(fileName);
                            else if (type === "reorder") executeReorder(fileName);
                        }}>Save</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </SafeAreaView>
    );
}