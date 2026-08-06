import React, { useState, useEffect } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, Card, Button, useTheme, ActivityIndicator, TextInput, Dialog, Portal } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { LocalPdf } from "../shared/types";
import { usePdfStorage } from "../hooks/usePdfStorage";
import { mergePdfs, splitPdf, reorderPages, updateMetadata } from "../services/pdfService";

type ToolsNavProp = NativeStackNavigationProp<RootStackParamList, "Tools">;

export default function ToolsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<ToolsNavProp>();
    const { pickAndSavePdf, loadLocalPdfs } = usePdfStorage();
    const [pdfs, setPdfs] = useState<LocalPdf[]>([]);
    const [loading, setLoading] = useState(true);
    const [operation, setOperation] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [result, setResult] = useState<string>("");

    useEffect(() => {
        loadLocalPdfs().then(setPdfs).finally(() => setLoading(false));
    }, []);

    async function handleMerge() {
        if (selectedIds.length < 2) { setResult("Select at least 2 PDFs"); return; }
        setLoading(true);
        const merged = await mergePdfs(selectedIds);
        if (merged) {
            setResult(`Merged into: ${merged.original_filename}`);
            setSelectedIds([]);
        } else setResult("Merge failed");
        setLoading(false);
    }

    async function handleSplit(pdfId: string) {
        setLoading(true);
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf) return;
        // Split every page individually
        const ranges: [number, number][] = [];
        for (let i = 1; i <= (pdf.page_count || 1); i++) {
            ranges.push([i, i]);
        }
        const results = await splitPdf(pdfId, ranges);
        setResult(`Split into ${results.length} PDFs`);
        setLoading(false);
    }

    async function handleReorder(pdfId: string) {
        setLoading(true);
        const pdf = pdfs.find((p) => p.id === pdfId);
        if (!pdf || !pdf.page_count) return;
        // Reverse page order
        const order: number[] = [];
        for (let i = pdf.page_count; i >= 1; i--) order.push(i);
        const reordered = await reorderPages(pdfId, order);
        if (reordered) setResult(`Reordered: ${reordered.original_filename}`);
        else setResult("Reorder failed");
        setLoading(false);
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
                                    else if (operation === "split") handleSplit(item.id);
                                    else if (operation === "reorder") handleReorder(item.id);
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
        </SafeAreaView>
    );
}