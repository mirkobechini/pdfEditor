import React, { useState, useRef, useCallback } from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import { Text, useTheme, Button, ActivityIndicator, IconButton } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { getLocalPdfById } from "../services/localDb";
import Pdf from "react-native-pdf";

type PdfViewerRouteProp = RouteProp<RootStackParamList, "PdfViewer">;
type PdfViewerNavProp = NativeStackNavigationProp<RootStackParamList, "PdfViewer">;

export default function PdfViewerScreen() {
    const theme = useTheme();
    const route = useRoute<PdfViewerRouteProp>();
    const navigation = useNavigation<PdfViewerNavProp>();
    const { pdfId, title } = route.params;

    const [pdfUri, setPdfUri] = useState<string | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const PdfRef = useRef<any>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Load PDF URI from local DB
    React.useEffect(() => {
        // Reset all state when PDF changes
        setPdfUri(null);
        setNumPages(0);
        setCurrentPage(1);
        setLoading(true);
        setError(null);
        setScale(1);

        (async () => {
            try {
                const localPdf = await getLocalPdfById(pdfId);
                if (localPdf?.uri) {
                    const uri = localPdf.uri.startsWith("file://")
                        ? localPdf.uri
                        : `file://${localPdf.uri}`;
                    // Set URI first, then increment key to force remount with new URI
                    setPdfUri(uri);
                    setRefreshKey((k) => k + 1);
                } else {
                    setError("PDF not found locally");
                    setLoading(false);
                }
            } catch (e) {
                setError("Failed to load PDF");
                setLoading(false);
            }
        })();
    }, [pdfId]);

    const onLoadComplete = useCallback((numberOfPages: number) => {
        setNumPages(numberOfPages);
        setLoading(false);
    }, []);

    const onPageChanged = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    const onError = useCallback((err: object) => {
        setError(String(err));
        setLoading(false);
    }, []);

    const goToPrevPage = () => {
        if (currentPage > 1) {
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            PdfRef.current?.setPage(newPage);
        }
    };

    const goToNextPage = () => {
        if (currentPage < numPages) {
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            PdfRef.current?.setPage(newPage);
        }
    };

    const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
    const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));

    if (error) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.error, marginBottom: 16 }}>
                        {error}
                    </Text>
                    <Button mode="contained" onPress={() => navigation.goBack()} style={{ borderRadius: 8 }}>
                        Back
                    </Button>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            {/* Top bar with page navigation */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    backgroundColor: theme.colors.surface,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.surfaceVariant,
                }}
            >
                <IconButton icon="arrow-left" size={20} onPress={goToPrevPage} disabled={currentPage <= 1} />
                <Text variant="bodyMedium">
                    {currentPage} / {numPages || "?"}
                </Text>
                <IconButton icon="arrow-right" size={20} onPress={goToNextPage} disabled={currentPage >= numPages} />
            </View>

            {/* PDF viewer */}
            <View style={{ flex: 1 }}>
                {loading && (
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <ActivityIndicator size="large" />
                    </View>
                )}

                {pdfUri && (
                    <View style={{ flex: 1 }}>
                        <Pdf
                            key={refreshKey}
                            ref={PdfRef}
                            source={{ uri: pdfUri, cache: false }}
                            onLoadComplete={onLoadComplete}
                            onPageChanged={onPageChanged}
                            onError={onError}
                            style={{ flex: 1 }}
                            scale={scale}
                            minScale={0.5}
                            maxScale={3}
                            enablePaging={true}
                            spacing={0}
                        />
                    </View>
                )}
            </View>

            {/* Bottom zoom controls */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 8,
                    backgroundColor: theme.colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.surfaceVariant,
                    gap: 16,
                }}
            >
                <IconButton icon="magnify-minus-outline" size={20} onPress={zoomOut} />
                <Text variant="bodySmall">{Math.round(scale * 100)}%</Text>
                <IconButton icon="magnify-plus-outline" size={20} onPress={zoomIn} />
            </View>
        </SafeAreaView>
    );
}