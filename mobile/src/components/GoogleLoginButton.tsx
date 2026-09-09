import React from "react";
import { Button, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { useAuth } from "../shared/auth";

export default function GoogleLoginButton() {
    const theme = useTheme();
    const { t } = useTranslation();
    const { googleLogin } = useAuth();
    const [error, setError] = React.useState<string | null>(null);

    // Read the Android client ID from app.json (extra.googleClientId)
    const config = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
    const androidClientId = (config?.googleClientId as string) || undefined;

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: androidClientId,
        androidClientId,
    });

    // When the auth response arrives, exchange the id_token with the backend
    React.useEffect(() => {
        if (response?.type === "success" && response.authentication?.idToken) {
            const idToken = response.authentication.idToken;
            googleLogin(idToken).catch((err) => {
                setError(String(err));
            });
        }
    }, [response]);

    const handlePress = async () => {
        setError(null);
        try {
            await promptAsync();
        } catch (err) {
            setError(String(err));
        }
    };

    return (
        <>
            <Button
                mode="outlined"
                onPress={handlePress}
                disabled={!request}
                style={{ marginTop: 8 }}
            >
                <Text>G {t("auth.googleLogin")}</Text>
            </Button>
            {error ? (
                <Text style={{ color: theme.colors.error, fontSize: 12, marginTop: 4 }}>
                    {error}
                </Text>
            ) : null}
        </>
    );
}