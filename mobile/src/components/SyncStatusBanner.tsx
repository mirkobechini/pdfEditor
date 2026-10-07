/**
 * SyncStatusBanner — mostra all'utente l'errore del sync cloud quando
 * fallisce (niente barra durante la sync: il caricamento e' mostrato altrove) (A5: niente più console.log silenziosi). Piccolo, non invasivo,
 * coerente con il tema scuro. Espone l'azione "riprova" in caso di errore.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useCloudSyncContext } from "../hooks/CloudSyncContext";

export default function SyncStatusBanner() {
    const theme = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { syncUi, syncAll, clearSyncError } = useCloudSyncContext();

    if (syncUi.status === "error") {
        return (
            <View style={[styles.row, { backgroundColor: theme.colors.errorContainer, paddingTop: insets.top + 8 }]}>
                <Text style={[styles.text, { color: theme.colors.onErrorContainer, flex: 1 }]}>
                    {t("sync.error")}
                    {syncUi.lastError ? ` — ${syncUi.lastError}` : ""}
                </Text>
                <Button
                    mode="text"
                    compact
                    onPress={() => {
                        clearSyncError();
                        syncAll();
                    }}
                    textColor={theme.colors.onErrorContainer}
                >
                    {t("sync.retry")}
                </Button>
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },
    text: {
        fontSize: 13,
    },
});