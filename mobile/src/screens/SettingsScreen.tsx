import React from "react";
import { View, ScrollView } from "react-native";
import { Text, List, useTheme, Button, RadioButton, Dialog, Portal } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../shared/auth";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useAppSettings } from "../shared/AppSettingsContext";

export default function SettingsScreen() {
    const theme = useTheme();
    const { user, logout } = useAuth();
    const appVersion = Constants.expoConfig?.version || "0.1.0";
    const { t } = useTranslation();
    const { themeMode, setThemeMode, locale, setLocale } = useAppSettings();
    const [themeDialog, setThemeDialog] = React.useState(false);
    const [langDialog, setLangDialog] = React.useState(false);

    const themeLabel = themeMode === "system" ? t("settings.themeSystem") : themeMode === "light" ? t("settings.themeLight") : t("settings.themeDark");
    const langLabel = locale === "system" ? t("settings.languageSystem") : locale === "it" ? t("settings.languageIt") : t("settings.languageEn");

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            <ScrollView>
                <List.Section>
                    <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                        {t("settings.account")}
                    </List.Subheader>
                    <List.Item
                        title={user?.full_name || "Unknown"}
                        description={user?.email || "No email"}
                        left={(props) => <List.Icon {...props} icon="account" />}
                    />
                    <List.Item
                        title={t("settings.logout")}
                        left={(props) => <List.Icon {...props} icon="logout" />}
                        onPress={async () => {
                            await logout();
                        }}
                    />
                </List.Section>

                <List.Section>
                    <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                        {t("settings.app")}
                    </List.Subheader>
                    <List.Item
                        title={t("settings.language")}
                        description={langLabel}
                        left={(props) => <List.Icon {...props} icon="translate" />}
                        onPress={() => setLangDialog(true)}
                    />
                    <List.Item
                        title={t("settings.theme")}
                        description={themeLabel}
                        left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
                        onPress={() => setThemeDialog(true)}
                    />
                    <List.Item
                        title={t("settings.version")}
                        description={appVersion}
                        left={(props) => <List.Icon {...props} icon="information" />}
                    />
                </List.Section>
            </ScrollView>

            {/* Language Dialog */}
            <Portal>
                <Dialog visible={langDialog} onDismiss={() => setLangDialog(false)}>
                    <Dialog.Title>{t("settings.language")}</Dialog.Title>
                    <Dialog.Content>
                        <RadioButton.Group onValueChange={(val) => { setLocale(val); setLangDialog(false); }} value={locale}>
                            <RadioButton.Item label={t("settings.languageSystem")} value="system" />
                            <RadioButton.Item label={t("settings.languageIt")} value="it" />
                            <RadioButton.Item label={t("settings.languageEn")} value="en" />
                        </RadioButton.Group>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setLangDialog(false)}>{t("common.cancel")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Theme Dialog */}
            <Portal>
                <Dialog visible={themeDialog} onDismiss={() => setThemeDialog(false)}>
                    <Dialog.Title>{t("settings.theme")}</Dialog.Title>
                    <Dialog.Content>
                        <RadioButton.Group onValueChange={(val) => { setThemeMode(val as "system" | "light" | "dark"); setThemeDialog(false); }} value={themeMode}>
                            <RadioButton.Item label={t("settings.themeSystem")} value="system" />
                            <RadioButton.Item label={t("settings.themeLight")} value="light" />
                            <RadioButton.Item label={t("settings.themeDark")} value="dark" />
                        </RadioButton.Group>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setThemeDialog(false)}>{t("common.cancel")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </SafeAreaView>
    );
}