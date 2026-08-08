import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { Text, Card, FAB, useTheme, ActivityIndicator, Portal, Modal, Button, List, Dialog, TextInput } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { LocalPdf } from "../shared/types";
import { usePdfStorage } from "../hooks/usePdfStorage";
import { useAuth } from "../shared/auth";
import { getLocalPdfById, savePdfLocally, deleteLocalPdf } from "../services/localDb";
import { File } from "expo-file-system";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
    const theme = useTheme();
    const navigation = useNavigation<HomeNavProp>();
    const insets = useSafeAreaInsets();
    const { pickAndSavePdf, loadLocalPdfs, loading: storageLoading } = usePdfStorage();
    const { user } = useAuth();
    const userId = user?.id || "";
    const [pdfs, setPdfs] = useState<LocalPdf[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [contextPdf, setContextPdf] = useState<LocalPdf | null>(null);
    const [renameDialog, setRenameDialog] = useState(false);
    const [renameText, setRenameText] = useState("");
    const [renameTarget, setRenameTarget] = useState<LocalPdf | null>(null);
    const [detailsPdf, setDetailsPdf] = useState<LocalPdf | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    async function onRefresh() {
        setRefreshing(true);
        try {
            const local = await loadLocalPdfs(userId);
            setPdfs(local);
        } catch {
            setPdfs([]);
        } finally {
            setRefreshing(false);
        }
    }

    // Reload PDFs when screen is focused
    useFocusEffect(
        useCallback(() => {
            loadPdfs();
        }, [userId])
    );

    async function loadPdfs() {
        setLoading(true);
        try {
            const local = await loadLocalPdfs(userId);
            setPdfs(local);
        } catch {
            setPdfs([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpload() {
        setShowMenu(false);
        const pdf = await pickAndSavePdf(userId);
        if (pdf) {
            navigation.navigate("PdfViewer", {
                pdfId: pdf.id,
                title: pdf.original_filename,
            });
        }
    }

    function formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    async function handleDelete(pdf: LocalPdf) {
        setContextPdf(null);
        try {
            const file = new File(pdf.uri);
            if (file.exists) file.delete();
        } catch { /* ignore */ }
        await deleteLocalPdf(pdf.id);
        await loadPdfs();
    }

    function openRename(pdf: LocalPdf) {
        setContextPdf(null);
        setRenameTarget(pdf);
        setRenameText(pdf.original_filename);
        setRenameDialog(true);
    }

    async function confirmRename() {
        if (!renameTarget || !renameText.trim()) return;
        const updated = { ...renameTarget, original_filename: renameText.trim(), updated_at: new Date().toISOString() };
        await savePdfLocally(updated);
        setRenameDialog(false);
        setRenameTarget(null);
        await loadPdfs();
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" />
                </View>
            ) : pdfs.length === 0 ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                        No PDFs yet. Tap the + button to upload a PDF or use the Scanner.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={pdfs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() =>
                                navigation.navigate("PdfViewer", {
                                    pdfId: item.id,
                                    title: item.original_filename,
                                })
                            }
                            onLongPress={() => setContextPdf(item)}
                        >
                            <Card style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}>
                                <Card.Content>
                                    <Text variant="titleMedium" style={{ fontWeight: "600" }}>
                                        {item.original_filename}
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                        {formatSize(item.file_size)}
                                    </Text>
                                </Card.Content>
                            </Card>
                        </TouchableOpacity>
                    )}
                />
            )}

            <FAB
                icon="plus"
                style={{
                    position: "absolute",
                    right: 16,
                    bottom: 16 + insets.bottom,
                    backgroundColor: theme.colors.primary,
                }}
                color={theme.colors.onPrimary}
                onPress={() => setShowMenu(true)}
            />

            <Portal>
                <Modal visible={showMenu} onDismiss={() => setShowMenu(false)} contentContainerStyle={{ backgroundColor: theme.colors.surface, margin: 24, borderRadius: 12 }}>
                    <List.Section>
                        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                            Add PDF
                        </List.Subheader>
                        <List.Item
                            title="Upload from device"
                            description="Pick a PDF file from your device"
                            left={(props) => <List.Icon {...props} icon="file-upload" />}
                            onPress={handleUpload}
                        />
                        <List.Item
                            title="Scan with camera"
                            description="Take a photo and convert to PDF"
                            left={(props) => <List.Icon {...props} icon="camera" />}
                            onPress={() => {
                                setShowMenu(false);
                                navigation.navigate("Scanner");
                            }}
                        />
                    </List.Section>
                </Modal>
            </Portal>

            {/* Context menu — long press on PDF */}
            <Portal>
                <Dialog visible={contextPdf !== null && !renameDialog} onDismiss={() => setContextPdf(null)}>
                    <Dialog.Title>{contextPdf?.original_filename}</Dialog.Title>
                    <Dialog.Content>
                        <List.Item title="Rename" left={(p) => <List.Icon {...p} icon="pencil" />} onPress={() => { if (contextPdf) openRename(contextPdf); }} />
                        <List.Item title="Delete" left={(p) => <List.Icon {...p} icon="delete" />} onPress={() => contextPdf && handleDelete(contextPdf)} />
                        <List.Item title="Details" left={(p) => <List.Icon {...p} icon="information" />} onPress={() => { const pdf = contextPdf; setContextPdf(null); if (pdf) { setDetailsPdf(pdf); } }} />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setContextPdf(null)}>Close</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Rename dialog */}
            <Portal>
                <Dialog visible={renameDialog} onDismiss={() => setRenameDialog(false)}>
                    <Dialog.Title>Rename PDF</Dialog.Title>
                    <Dialog.Content>
                        <TextInput label="File name" value={renameText} onChangeText={setRenameText} mode="outlined" autoFocus />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setRenameDialog(false)}>Cancel</Button>
                        <Button onPress={confirmRename}>Rename</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Details dialog */}
            <Portal>
                <Dialog visible={detailsPdf !== null} onDismiss={() => setDetailsPdf(null)}>
                    <Dialog.Title>PDF Details</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>Name: </Text>{detailsPdf?.original_filename}</Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>Size: </Text>{detailsPdf ? formatSize(detailsPdf.file_size) : ""}</Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>Pages: </Text>{detailsPdf?.page_count}</Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>Created: </Text>{detailsPdf ? new Date(detailsPdf.created_at).toLocaleDateString() : ""}</Text>
                        <Text variant="bodyMedium"><Text style={{ fontWeight: "700" }}>Updated: </Text>{detailsPdf ? new Date(detailsPdf.updated_at).toLocaleDateString() : ""}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDetailsPdf(null)}>Close</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </SafeAreaView>
    );
}