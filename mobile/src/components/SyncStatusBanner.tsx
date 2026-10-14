/**
 * SyncStatusDialog — mostra all'utente l'errore del sync cloud quando
 * fallisce come DIALOG modale invece che come barra rossa in cima allo
 * schermo (prima la barra si appiccicava alla zona della barra notifiche
 * e non si leggeva). Esso espone le azioni "Riprova" e "Chiudi".
 */
import React from "react";
import { StyleSheet } from "react-native";
import {
  Dialog,
  Portal,
  Button,
  Text,
  useTheme,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useCloudSyncContext } from "../hooks/CloudSyncContext";

export default function SyncStatusBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { syncUi, syncAll, clearSyncError } = useCloudSyncContext();

  const onRetry = () => {
    clearSyncError();
    syncAll();
  };

  return (
    <Portal>
      <Dialog visible={syncUi.status === "error"} onDismiss={clearSyncError}>
        <Dialog.Icon
          icon="cloud-alert"
          size={40}
          color={theme.colors.error}
        />
        <Dialog.Title style={styles.title}>{t("sync.error")}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={styles.message}>
            {syncUi.lastError || t("common.unknownError")}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={clearSyncError}>{t("common.close")}</Button>
          <Button
            mode="contained"
            onPress={onRetry}
            buttonColor={theme.colors.error}
          >
            {t("sync.retry")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: "center",
    marginTop: 4,
  },
  message: {
    textAlign: "center",
  },
});