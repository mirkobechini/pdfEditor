import React from "react";
import { Button, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import * as Google from "expo-auth-session/providers/google";
import { useAuth } from "../shared/auth";

const GOOGLE_CLIENT_ID = "309361418291-0j2jpuk4sdft5hm9tdvpj1n4trukphee.apps.googleusercontent.com";

export default function GoogleLoginButton() {
    const theme = useTheme();
    const { t } = useTranslation();
    const { googleLogin } = useAuth();
    const [error, setError] = React.useState<string | null>(null);

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        androidClientId: GOOGLE_CLIENT_ID,
        iosClientId: GOOGLE_CLIENT_ID,
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