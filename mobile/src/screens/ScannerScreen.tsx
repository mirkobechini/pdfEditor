import React, { useState, useRef } from "react";
import { View, TouchableOpacity } from "react-native";
import { Text, Button, useTheme, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

type ScannerNavProp = NativeStackNavigationProp<RootStackParamList, "Scanner">;

export default function ScannerScreen() {
    const theme = useTheme();
    const navigation = useNavigation<ScannerNavProp>();
    const [permission, requestPermission] = useCameraPermissions();
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    if (!permission) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </SafeAreaView>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                <Text variant="bodyLarge" style={{ textAlign: "center", marginBottom: 16 }}>
                    Camera permission is required to scan documents.
                </Text>
                <Button mode="contained" onPress={requestPermission}>
                    Grant Permission
                </Button>
            </SafeAreaView>
        );
    }

    async function takePhoto() {
        if (!cameraRef.current) return;
        setProcessing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync();
            if (photo) {
                setPhotoUri(photo.uri);
            }
        } catch (e) {
            console.error("Camera error:", e);
        } finally {
            setProcessing(false);
        }
    }

    async function convertToPdf() {
        if (!photoUri) return;
        setProcessing(true);
        try {
            // TODO: Subtask 8 — use expo-image-manipulator for crop + pdf-lib to create PDF
            alert(`Photo captured: ${photoUri}\nPDF conversion coming in Subtask 8.`);
            setPhotoUri(null);
        } finally {
            setProcessing(false);
        }
    }

    if (photoUri) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Text variant="titleMedium" style={{ marginBottom: 16 }}>
                        Photo captured
                    </Text>
                    <Button
                        mode="contained"
                        onPress={convertToPdf}
                        loading={processing}
                        disabled={processing}
                        style={{ marginBottom: 12, borderRadius: 8 }}
                    >
                        Convert to PDF
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => setPhotoUri(null)}
                        disabled={processing}
                        style={{ borderRadius: 8 }}
                    >
                        Retake
                    </Button>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["bottom"]}>
            <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="back"
            >
                <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 48 }}>
                    <TouchableOpacity
                        onPress={takePhoto}
                        disabled={processing}
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: 36,
                            backgroundColor: "#fff",
                            borderWidth: 4,
                            borderColor: "#F97316",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        {processing ? (
                            <ActivityIndicator size="small" color="#F97316" />
                        ) : null}
                    </TouchableOpacity>
                </View>
            </CameraView>
        </SafeAreaView>
    );
}