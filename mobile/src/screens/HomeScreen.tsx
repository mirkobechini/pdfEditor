import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, Card, FAB, useTheme, ActivityIndicator, Portal, Modal, Button, List } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { LocalPdf } from "../shared/types";
import { usePdfStorage } from "../hooks/usePdfStorage";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
    const theme = useTheme();
    const navigation = useNavigation<HomeNavProp>();
    const insets = useSafeAreaInsets();
    const { pickAndSavePdf, loadLocalPdfs, loading: storageLoading } = usePdfStorage();
    const [pdfs, setPdfs] = useState<LocalPdf[]>([]);
    const [loading, setLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);

    // Reload PDFs when screen is focused
    useFocusEffect(
        useCallback(() => {
            loadPdfs();
        }, [])
    );

    async function loadPdfs() {
        setLoading(true);
        try {
            const local = await loadLocalPdfs();
            setPdfs(local);
        } catch {
            setPdfs([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpload() {
        setShowMenu(false);
        const pdf = await pickAndSavePdf();
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
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() =>
                                navigation.navigate("PdfViewer", {
                                    pdfId: item.id,
                                    title: item.original_filename,
                                })
                            }
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
                        <List.Item
                            title="PDF Tools"
                            description="Merge, split, reorder, metadata"
                            left={(props) => <List.Icon {...props} icon="tools" />}
                            onPress={() => {
                                setShowMenu(false);
                                navigation.navigate("Tools");
                            }}
                        />
                        <List.Item
                            title="Settings"
                            description="App preferences"
                            left={(props) => <List.Icon {...props} icon="cog" />}
                            onPress={() => {
                                setShowMenu(false);
                                navigation.navigate("Settings");
                            }}
                        />
                    </List.Section>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
}