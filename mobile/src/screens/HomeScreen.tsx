import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { Text, Card, FAB, useTheme, ActivityIndicator, Portal, Modal, Button, List, Dialog, TextInput, Searchbar, Snackbar, IconButton, Checkbox } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { LocalPdf } from "../shared/types";
import { usePdfStorage } from "../hooks/usePdfStorage";
import { useAuth } from "../shared/auth";
import { getLocalPdfById, savePdfLocally, deleteLocalPdf } from "../services/localDb";
import { File } from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system/legacy";
import { Swipeable } from "react-native-gesture-handler";
import { setBadgeCountAsync } from "expo-notifications";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Main">;

interface HomeScreenProps {
    onPdfCountChange?: (count: number) => void;
}

export default function HomeScreen({ onPdfCountChange }: HomeScreenProps) {
    const theme = useTheme();
    const navigation = useNavigation<HomeNavProp>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
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
    const [searchQuery, setSearchQuery] = useState("");
    const [snackbarMsg, setSnackbarMsg] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [multiSelect, setMultiSelect] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    function showSnack(msg: string) {
        setSnackbarMsg(msg);
        setSnackbarVisible(true);
    }

    function toggleSelect(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function enterMultiSelect() {
        setMultiSelect(true);
        setSelectedIds(new Set());
    }

    function exitMultiSelect() {
        setMultiSelect(false);
        setSelectedIds(new Set());
    }

    async function handleBatchDelete() {
        for (const id of selectedIds) {
            const pdf = pdfs.find((p) => p.id === id);
            if (!pdf) continue;
            try {
                const file = new File(pdf.uri);
                if (file.exists) file.delete();
            } catch { /* ignore */ }
            await deleteLocalPdf(id);
        }
        showSnack(t("home.deletedBatch", { count: selectedIds.size }));
        exitMultiSelect();
        await loadPdfs();
    }

    async function handleShare(pdf: LocalPdf) {
        setContextPdf(null);
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                showSnack(t("home.sharingNotAvailable"));
                return;
            }
            await Sharing.shareAsync(pdf.uri, {
                mimeType: "application/pdf",
                dialogTitle: `Share ${pdf.original_filename}`,
            });
        } catch {
            showSnack(t("home.shareFailed"));
        }
    }

    async function handleDownload(pdf: LocalPdf) {
        setContextPdf(null);
        try {
            const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (!permissions.granted) {
                showSnack(t("home.permissionDenied"));
                return;
            }
            const name = pdf.original_filename.endsWith(".pdf")
                ? pdf.original_filename.replace(/\.pdf$/i, "")
                : pdf.original_filename;
            const safUri = await StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                name,
                "application/pdf"
            );
            const file = new File(pdf.uri);
            const bytes = await file.arrayBuffer();
            let binary = "";
            const arr = new Uint8Array(bytes);
            for (let i = 0; i < arr.length; i++) {
                binary += String.fromCharCode(arr[i]);
            }
            const base64 = btoa(binary);
            await StorageAccessFramework.writeAsStringAsync(safUri, base64, {
                encoding: "base64",
            });
            showSnack(t("home.downloaded", { name: pdf.original_filename }));
        } catch {
            showSnack(t("home.downloadFailed"));
        }
    }

    const filteredPdfs = useMemo(() => {
        if (!searchQuery.trim()) return pdfs;
        const q = searchQuery.toLowerCase();
        return pdfs.filter((p) => p.original_filename.toLowerCase().includes(q));
    }, [pdfs, searchQuery]);

    async function onRefresh() {
        setRefreshing(true);
        try {
            const local = await loadLocalPdfs(userId);
            setPdfs(local);
            onPdfCountChange?.(local.length);
            setBadgeCountAsync(local.length).catch(() => { });
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
            onPdfCountChange?.(local.length);
            setBadgeCountAsync(local.length).catch(() => { });
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
        showSnack(t("home.deleted", { name: pdf.original_filename }));
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
            <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                <Searchbar
                    placeholder={t("home.search")}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{ flex: 1, margin: 16, marginBottom: 0 }}
                />
                {pdfs.length > 0 && !multiSelect ? (
                    <IconButton icon="checkbox-multiple-marked-outline" onPress={enterMultiSelect} />
                ) : pdfs.length > 0 && multiSelect ? (
                    <IconButton icon="close" onPress={exitMultiSelect} />
                ) : null}
                {!multiSelect && (
                    <IconButton icon="wrench" onPress={() => navigation.navigate("Tools")} />
                )}
            </View>
            {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" />
                </View>
            ) : pdfs.length === 0 ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                        {t("home.noPdfs")}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPdfs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    renderItem={({ item }) => {
                        const isSelected = selectedIds.has(item.id);
                        const renderRightActions = () => {
                            if (multiSelect) return <View />;
                            return (
                                <View style={{ justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.error, marginBottom: 12, borderRadius: 12, width: 80 }}>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item)}
                                        style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}
                                    >
                                        <IconButton icon="delete" iconColor={theme.colors.onError} size={24} />
                                        <Text style={{ color: theme.colors.onError, fontSize: 12 }}>{t("home.delete")}</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        };
                        return (
                            <Swipeable renderRightActions={renderRightActions}>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (multiSelect) {
                                            toggleSelect(item.id);
                                        } else {
                                            navigation.navigate("PdfViewer", {
                                                pdfId: item.id,
                                                title: item.original_filename,
                                            });
                                        }
                                    }}
                                    onLongPress={() => {
                                        if (!multiSelect) {
                                            enterMultiSelect();
                                            toggleSelect(item.id);
                                        }
                                    }}
                                >
                                    <Card style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}>
                                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                                            {multiSelect && (
                                                <Checkbox
                                                    status={isSelected ? "checked" : "unchecked"}
                                                    onPress={() => toggleSelect(item.id)}
                                                    color={theme.colors.primary}
                                                />
                                            )}
                                            <View
                                                style={{
                                                    width: 48,
                                                    height: 60,
                                                    borderRadius: 6,
                                                    backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                    margin: 12,
                                                }}
                                            >
                                                <IconButton icon="file-pdf-box" iconColor={isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant} size={28} />
                                                <Text
                                                    style={{
                                                        fontSize: 10,
                                                        color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                                                        fontWeight: "700",
                                                        marginTop: -6,
                                                    }}
                                                >
                                                    {item.page_count ?? "?"} p.
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1, paddingRight: 12 }}>
                                                <Text variant="titleMedium" style={{ fontWeight: "600" }} numberOfLines={1}>
                                                    {item.original_filename}
                                                </Text>
                                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                                    {formatSize(item.file_size)}
                                                </Text>
                                            </View>
                                        </View>
                                    </Card>
                                </TouchableOpacity>
                            </Swipeable>
                        );
                    }}
                />
            )}

            {multiSelect ? (
                <View style={{ position: "absolute", right: 0, left: 0, bottom: 0, backgroundColor: theme.colors.primaryContainer, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 8 + insets.bottom }}>
                    <Text style={{ color: theme.colors.onPrimaryContainer, fontWeight: "600" }}>
                        {t("home.selected", { count: selectedIds.size })}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        <Button textColor={theme.colors.onPrimaryContainer} onPress={() => setSelectedIds(new Set(filteredPdfs.map((p) => p.id)))}>
                            {t("home.selectAll")}
                        </Button>
                        <Button textColor={theme.colors.error} onPress={handleBatchDelete} disabled={selectedIds.size === 0}>
                            {t("home.delete")}
                        </Button>
                        <Button textColor={theme.colors.onPrimaryContainer} onPress={exitMultiSelect}>
                            {t("common.cancel")}
                        </Button>
                    </View>
                </View>
            ) : (
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
            )}

            <Portal>
                <Modal visible={showMenu} onDismiss={() => setShowMenu(false)} contentContainerStyle={{ backgroundColor: theme.colors.surface, margin: 24, borderRadius: 12 }}>
                    <List.Section>
                        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                            {t("home.addPdf")}
                        </List.Subheader>
                        <List.Item
                            title={t("home.upload")}
                            description={t("home.uploadDesc")}
                            left={(props) => <List.Icon {...props} icon="file-upload" />}
                            onPress={handleUpload}
                        />
                        <List.Item
                            title={t("home.scan")}
                            description={t("home.scanDesc")}
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
                        <List.Item title={t("home.rename")} left={(p) => <List.Icon {...p} icon="pencil" />} onPress={() => { if (contextPdf) openRename(contextPdf); }} />
                        <List.Item title={t("home.share")} left={(p) => <List.Icon {...p} icon="share-variant" />} onPress={() => { if (contextPdf) handleShare(contextPdf); }} />
                        <List.Item title={t("home.download")} left={(p) => <List.Icon {...p} icon="download" />} onPress={() => { if (contextPdf) handleDownload(contextPdf); }} />
                        <List.Item title={t("home.delete")} left={(p) => <List.Icon {...p} icon="delete" />} onPress={() => contextPdf && handleDelete(contextPdf)} />
                        <List.Item title={t("home.details")} left={(p) => <List.Icon {...p} icon="information" />} onPress={() => { const pdf = contextPdf; setContextPdf(null); if (pdf) { setDetailsPdf(pdf); } }} />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setContextPdf(null)}>{t("common.close")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Rename dialog */}
            <Portal>
                <Dialog visible={renameDialog} onDismiss={() => setRenameDialog(false)}>
                    <Dialog.Title>{t("home.renameTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput label={t("home.fileName")} value={renameText} onChangeText={setRenameText} mode="outlined" autoFocus />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setRenameDialog(false)}>{t("common.cancel")}</Button>
                        <Button onPress={confirmRename}>{t("home.rename")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Details dialog */}
            <Portal>
                <Dialog visible={detailsPdf !== null} onDismiss={() => setDetailsPdf(null)}>
                    <Dialog.Title>{t("home.detailsTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>{t("home.detailsName")}: </Text>{detailsPdf?.original_filename}</Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>{t("home.detailsSize")}: </Text>{detailsPdf ? formatSize(detailsPdf.file_size) : ""}</Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>{t("home.detailsPages")}: </Text>{detailsPdf?.page_count}</Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>{t("home.detailsCreated")}: </Text>{detailsPdf ? new Date(detailsPdf.created_at).toLocaleDateString() : ""}</Text>
                        <Text variant="bodyMedium"><Text style={{ fontWeight: "700" }}>{t("home.detailsUpdated")}: </Text>{detailsPdf ? new Date(detailsPdf.updated_at).toLocaleDateString() : ""}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDetailsPdf(null)}>{t("common.close")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={3000}
                action={{ label: t("common.ok"), onPress: () => setSnackbarVisible(false) }}
            >
                {snackbarMsg}
            </Snackbar>
        </SafeAreaView>
    );
}