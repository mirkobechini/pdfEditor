/**
 * SyncStatusBanner — mostra all'utente lo stato del sync cloud quando
 * fallisce (A5: niente più console.log silenziosi). Piccolo, non invasivo,
 * coerente con il tema scuro. Espone l'azione "riprova" in caso di errore.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ActivityIndicator, Button, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useCloudSyncContext } from "../hooks/CloudSyncContext";

export default function SyncStatusBanner() {
    const theme = useTheme();
    const { t } = useTranslation();
    const { syncUi, isSyncing, syncAll, clearSyncError } = useCloudSyncContext();

    if (isSyncing || syncUi.status === "syncing") {
        return (
            <View style={[styles.row, { backgroundColor: theme.colors.surfaceVariant }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.text, { color: theme.colors.onSurface }]}>
                    {t("sync.syncing")}
                </Text>
            </View>
        );
    }

    if (syncUi.status === "error") {
        return (
            <View style={[styles.row, { backgroundColor: theme.colors.errorContainer }]}>
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