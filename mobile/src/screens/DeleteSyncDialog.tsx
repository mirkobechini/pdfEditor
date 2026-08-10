import React, { useState, useEffect } from "react";
import { Dialog, Portal, Text, Button, useTheme, RadioButton } from "react-native-paper";
import { useTranslation } from "react-i18next";

export type DeleteSyncOption = "local" | "cloud" | "both";

interface DeleteSyncDialogProps {
    visible: boolean;
    pdfName: string;
    onDismiss: () => void;
    onDelete: (option: DeleteSyncOption) => Promise<void>;
}

export default function DeleteSyncDialog({
    visible,
    pdfName,
    onDismiss,
    onDelete,
}: DeleteSyncDialogProps) {
    const theme = useTheme();
    const { t } = useTranslation();
    const [option, setOption] = useState<DeleteSyncOption>("both");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (visible) {
            setOption("both");
            setDeleting(false);
        }
    }, [visible]);

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss}>
                <Dialog.Title>{t("deleteSync.title")}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                        {t("deleteSync.desc", { name: pdfName })}
                    </Text>
                    <RadioButton.Group onValueChange={(val) => setOption(val as DeleteSyncOption)} value={option}>
                        <RadioButton.Item label={t("deleteSync.local")} value="local" />
                        <RadioButton.Item label={t("deleteSync.cloud")} value="cloud" />
                        <RadioButton.Item label={t("deleteSync.both")} value="both" />
                    </RadioButton.Group>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss} disabled={deleting}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        mode="contained"
                        buttonColor={theme.colors.error}
                        loading={deleting}
                        disabled={deleting}
                        onPress={async () => {
                            setDeleting(true);
                            try {
                                await onDelete(option);
                                onDismiss();
                            } finally {
                                setDeleting(false);
                            }
                        }}
                    >
                        {t("common.delete")}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}
