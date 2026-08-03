import React, { useState, useEffect } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { Text, Card, FAB, useTheme, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { LocalPdf, PdfDocument } from "../shared/types";
import { api } from "../shared/api";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
    const theme = useTheme();
    const navigation = useNavigation<HomeNavProp>();
    const [pdfs, setPdfs] = useState<(LocalPdf | PdfDocument)[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPdfs();
    }, []);

    async function loadPdfs() {
        setLoading(true);
        try {
            const response = await api.listPdfs();
            setPdfs(response.items);
        } catch {
            // Offline — show empty list
            setPdfs([]);
        } finally {
            setLoading(false);
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
                        No PDFs yet. Tap the + button to upload a PDF or Scanner.
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
                                        {formatSize(item.file_size)} • {item.page_count} page{item.page_count !== 1 ? "s" : ""}
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
                    bottom: 16,
                    backgroundColor: theme.colors.primary,
                }}
                color={theme.colors.onPrimary}
                onPress={() => {
                    // TODO: show action sheet: Upload / Scanner
                    navigation.navigate("Scanner");
                }}
            />
        </SafeAreaView>
    );
}