import React, { useState, useRef } from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Text, Button, useTheme, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { PDFDocument } from "pdf-lib";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { savePdfLocally } from "../services/localDb";
import type { LocalPdf } from "../shared/types";

type ScannerNavProp = NativeStackNavigationProp<RootStackParamList, "Scanner">;

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

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
            // Step 1: Crop/optimize the image
            const manipulated = await manipulateAsync(photoUri, [], {
                compress: 0.8,
                format: SaveFormat.JPEG,
            });

            // Step 2: Read the image as base64
            const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Step 3: Create a PDF with pdf-lib and embed the image
            const pdfDoc = await PDFDocument.create();
            const jpgImage = await pdfDoc.embedJpg(base64);
            const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
            page.drawImage(jpgImage, {
                x: 0,
                y: 0,
                width: jpgImage.width,
                height: jpgImage.height,
            });

            const pdfBytes = await pdfDoc.save();

            // Step 4: Save PDF locally
            const pdfDir = `${FileSystem.documentDirectory}pdfs/`;
            await FileSystem.makeDirectoryAsync(pdfDir, { intermediates: true });
            const id = generateId();
            const pdfFilePath = `${pdfDir}${id}.pdf`;

            // Convert pdf-lib bytes to base64
            const uint8Array = new Uint8Array(pdfBytes);
            let binary = "";
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            const pdfBase64 = btoa(binary);

            await FileSystem.writeAsStringAsync(pdfFilePath, pdfBase64, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const now = new Date().toISOString();
            const localPdf: LocalPdf = {
                id,
                original_filename: `scan_${new Date().toISOString().slice(0, 10)}.pdf`,
                file_size: pdfBytes.length,
                page_count: 1,
                uri: pdfFilePath,
                created_at: now,
                updated_at: now,
            };

            await savePdfLocally(localPdf);

            // Navigate back to home — the PDF is now in the list
            navigation.navigate("Home");
        } catch (e) {
            console.error("PDF conversion error:", e);
        } finally {
            setProcessing(false);
        }
    }

    if (photoUri) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    {/* Show preview of captured photo */}
                    <Image
                        source={{ uri: photoUri }}
                        style={{ width: "100%", height: 300, borderRadius: 12, marginBottom: 24 }}
                        resizeMode="contain"
                    />
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
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
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
                        {processing ? <ActivityIndicator size="small" color="#F97316" /> : null}
                    </TouchableOpacity>
                </View>
            </CameraView>
        </SafeAreaView>
    );
}