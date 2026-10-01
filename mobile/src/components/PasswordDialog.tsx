import React from "react";
import { Text, Button, Dialog, Portal, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { ToolsScreenState } from "../hooks/useToolsScreen";

/**
 * Password dialog — protect or unlock (issue #885, A3a - step 6).
 * Extracted from ToolsDialogs to reduce nesting. Zero behavior changes.
 */
export default function PasswordDialog({ s }: { s: ToolsScreenState }) {
    const { t } = useTranslation();
    const dlg = s.passwordDialog;
    const isProtect = dlg?.mode === "protect";

    return (
        <Portal>
            <Dialog visible={dlg !== null} onDismiss={() => s.setPasswordDialog(null)}>
                <Dialog.Title>{isProtect ? t("tools.protectTitle") : t("tools.unlockTitle")}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                        {isProtect
                            ? t("tools.passwordProtectHint", { name: dlg?.pdfName || "" })
                            : t("tools.passwordUnlockHint", { name: dlg?.pdfName || "" })}
                    </Text>
                    <TextInput
                        label={t("tools.passwordHint")}
                        value={s.passwordInput}
                        onChangeText={s.setPasswordInput}
                        mode="outlined"
                        secureTextEntry
                        style={{ marginBottom: 12 }}
                    />
                    {isProtect && (
                        <TextInput
                            label={t("tools.confirmPassword")}
                            value={s.passwordConfirm}
                            onChangeText={s.setPasswordConfirm}
                            mode="outlined"
                            secureTextEntry
                        />
                    )}
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={() => s.setPasswordDialog(null)}>{t("common.cancel")}</Button>
                    <Button onPress={isProtect ? s.executeProtect : s.executeUnlock}>
                        {isProtect ? t("tools.protect") : t("tools.unlockAction")}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}