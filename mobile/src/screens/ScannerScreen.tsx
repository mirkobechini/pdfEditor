import React, { useState } from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Text, Button, useTheme, ActivityIndicator, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useCameraScanner } from "../hooks/useCameraScanner";

type ScannerNavProp = NativeStackNavigationProp<RootStackParamList, "Scanner">;

export default function ScannerScreen() {
    const theme = useTheme();
    const navigation = useNavigation<ScannerNavProp>();
    const { permission, requestPermission, photoUri, processing, cameraRef, takePhoto, convertToPdf, resetPhoto } = useCameraScanner();
    const [fileName, setFileName] = useState("");

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

    async function handleConvert() {
        const pdf = await convertToPdf(fileName || undefined);
        if (pdf) {
            navigation.navigate("Main");
        }
    }

    if (photoUri) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Image
                        source={{ uri: photoUri }}
                        style={{ width: "100%", height: 300, borderRadius: 12, marginBottom: 24 }}
                        resizeMode="contain"
                    />
                    <Text variant="titleMedium" style={{ marginBottom: 16 }}>
                        Photo captured
                    </Text>
                    <TextInput
                        label="File name (optional)"
                        value={fileName}
                        onChangeText={setFileName}
                        mode="outlined"
                        style={{ width: "100%", marginBottom: 16 }}
                    />
                    <Button
                        mode="contained"
                        onPress={handleConvert}
                        loading={processing}
                        disabled={processing}
                        style={{ marginBottom: 12, borderRadius: 8 }}
                    >
                        Convert to PDF
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={resetPhoto}
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