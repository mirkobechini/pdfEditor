import React from "react";
import { Dialog, Portal, Button, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import * as Linking from "expo-linking";

interface UpdateDialogProps {
  visible: boolean;
  version: string;
  onDismiss: () => void;
}

export default function UpdateDialog({ visible, version, onDismiss }: UpdateDialogProps) {
  const { t } = useTranslation();

  const handleDownload = () => {
    // Open the GitHub releases page where the APK can be downloaded
    Linking.openURL("https://github.com/mirkobechini/pdfEditor/releases");
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{t("update.title")}</Dialog.Title>
        <Dialog.Content>
          <Text>{t("update.message", { version })}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t("update.later")}</Button>
          <Button onPress={handleDownload}>{t("update.download")}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}