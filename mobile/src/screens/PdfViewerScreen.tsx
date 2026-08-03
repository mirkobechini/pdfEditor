import React from "react";
import { View } from "react-native";
import { Text, useTheme, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";

type PdfViewerRouteProp = RouteProp<RootStackParamList, "PdfViewer">;
type PdfViewerNavProp = NativeStackNavigationProp<RootStackParamList, "PdfViewer">;

export default function PdfViewerScreen() {
    const theme = useTheme();
    const route = useRoute<PdfViewerRouteProp>();
    const navigation = useNavigation<PdfViewerNavProp>();
    const { pdfId, title } = route.params;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                <Text variant="titleLarge" style={{ marginBottom: 16 }}>
                    {title || "PDF Viewer"}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                    PDF ID: {pdfId}
                </Text>
                <Text variant="bodyLarge" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant }}>
                    PDF viewer with react-native-pdf coming in Subtask 7.
                </Text>
                <Button
                    mode="contained"
                    onPress={() => navigation.goBack()}
                    style={{ marginTop: 24, borderRadius: 8 }}
                >
                    Back
                </Button>
            </View>
        </SafeAreaView>
    );
}