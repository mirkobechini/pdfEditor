import React, { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Surface, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../shared/auth";
import { useTranslation } from "react-i18next";

type ForgotNavProp = NativeStackNavigationProp<RootStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen() {
    const theme = useTheme();
    const navigation = useNavigation<ForgotNavProp>();
    const { forgotPassword } = useAuth();
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        if (!email.trim()) return;
        setError("");
        setLoading(true);
        try {
            await forgotPassword(email.trim());
            setSent(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to send reset email");
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
                    <Surface style={{ padding: 32, borderRadius: 16, elevation: 4, backgroundColor: theme.colors.surface }}>
                        <Text variant="headlineLarge" style={{ textAlign: "center", fontWeight: "bold", color: theme.colors.primary, marginBottom: 8 }}>
                            PdfEditor
                        </Text>
                        <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginBottom: 32 }}>
                            {sent ? t("auth.checkEmail") : t("auth.forgotPassword")}
                        </Text>

                        {error ? (
                            <View style={{ backgroundColor: "#FFE0E0", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                <Text style={{ color: "#B00020", textAlign: "center" }}>{error}</Text>
                            </View>
                        ) : null}

                        {sent ? (
                            <>
                                <Text variant="bodyMedium" style={{ textAlign: "center", marginBottom: 24 }}>
                                    {t("auth.resetSent")}
                                </Text>
                                <Button mode="contained" onPress={() => navigation.navigate("Login")} style={{ borderRadius: 8 }} contentStyle={{ paddingVertical: 6 }}>
                                    {t("auth.backToSignIn")}
                                </Button>
                            </>
                        ) : (
                            <>
                                <TextInput
                                    label={t("auth.email")}
                                    value={email}
                                    onChangeText={setEmail}
                                    mode="outlined"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={{ marginBottom: 24 }}
                                />
                                <Button
                                    mode="contained"
                                    onPress={handleSubmit}
                                    loading={loading}
                                    disabled={loading || !email.trim()}
                                    style={{ marginBottom: 12, borderRadius: 8 }}
                                    contentStyle={{ paddingVertical: 6 }}
                                >
                                    {t("auth.sendReset")}
                                </Button>
                                <Button
                                    mode="text"
                                    onPress={() => navigation.goBack()}
                                >
                                    {t("auth.backToSignIn")}
                                </Button>
                            </>
                        )}
                    </Surface>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}