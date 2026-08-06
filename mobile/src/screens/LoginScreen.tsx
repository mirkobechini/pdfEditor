import React, { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Surface, useTheme, IconButton, ActivityIndicator, Portal, Modal } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../shared/auth";

export default function LoginScreen() {
    const { login, register, guestLogin, loading } = useAuth();
    const theme = useTheme();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async () => {
        setError("");
        try {
            if (isRegister) {
                await register(email, password, fullName);
            } else {
                await login(email, password, true);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Login failed");
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >                <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
            >
                    <Surface
                        style={{
                            padding: 32,
                            borderRadius: 16,
                            elevation: 4,
                            backgroundColor: theme.colors.surface,
                        }}
                    >
                        <Text
                            variant="headlineLarge"
                            style={{
                                textAlign: "center",
                                fontWeight: "bold",
                                color: theme.colors.primary,
                                marginBottom: 8,
                            }}
                        >
                            PdfEditor
                        </Text>
                        <Text
                            variant="bodyMedium"
                            style={{
                                textAlign: "center",
                                color: theme.colors.onSurfaceVariant,
                                marginBottom: 32,
                            }}
                        >
                            {isRegister ? "Create your account" : "Sign in to continue"}
                        </Text>

                        {error ? (
                            <Text
                                style={{
                                    color: theme.colors.error,
                                    marginBottom: 16,
                                    textAlign: "center",
                                }}
                            >
                                {error}
                            </Text>
                        ) : null}

                        {isRegister && (
                            <TextInput
                                label="Full Name"
                                value={fullName}
                                onChangeText={setFullName}
                                mode="outlined"
                                style={{ marginBottom: 16 }}
                            />
                        )}

                        <TextInput
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            mode="outlined"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={{ marginBottom: 16 }}
                        />

                        <TextInput
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            mode="outlined"
                            secureTextEntry={!showPassword}
                            right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
                            style={{ marginBottom: 24 }}
                        />

                        <Button
                            mode="contained"
                            onPress={handleSubmit}
                            loading={loading}
                            disabled={loading}
                            style={{ marginBottom: 12, borderRadius: 8 }}
                            contentStyle={{ paddingVertical: 6 }}
                        >
                            {isRegister ? "Register" : "Sign In"}
                        </Button>

                        <Button
                            mode="text"
                            onPress={() => {
                                setIsRegister(!isRegister);
                                setError("");
                            }}
                            style={{ marginBottom: 12 }}
                        >
                            {isRegister
                                ? "Already have an account? Sign In"
                                : "Don't have an account? Register"}
                        </Button>

                        <View
                            style={{
                                borderTopWidth: 1,
                                borderTopColor: theme.colors.surfaceVariant,
                                paddingTop: 16,
                                marginTop: 8,
                            }}
                        >
                            <Button
                                mode="outlined"
                                onPress={guestLogin}
                                loading={loading}
                                disabled={loading}
                                style={{ borderRadius: 8 }}
                                contentStyle={{ paddingVertical: 6 }}
                            >
                                Continue as Guest
                            </Button>
                        </View>
                    </Surface>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Loading overlay — visible during login/register/guest */}
            <Portal>
                <Modal visible={loading} dismissable={false} onDismiss={() => { }} contentContainerStyle={{ backgroundColor: "transparent", alignItems: "center", justifyContent: "center" }}>
                    <View style={{ backgroundColor: theme.colors.surface, padding: 24, borderRadius: 12, alignItems: "center" }}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={{ marginTop: 12, color: theme.colors.onSurface }}>
                            {loading ? "Signing in..." : ""}
                        </Text>
                    </View>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
}