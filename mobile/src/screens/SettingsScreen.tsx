import React, { useState, useEffect } from "react";
import { View, ScrollView } from "react-native";
import { Text, List, useTheme, Button, RadioButton, Dialog, Portal } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../shared/auth";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ThemeMode } from "../theme";

const THEME_MODE_KEY = "pdfeditor_theme_mode";
const LOCALE_KEY = "pdfeditor_locale";

export default function SettingsScreen() {
    const theme = useTheme();
    const { user, logout } = useAuth();
    const appVersion = Constants.expoConfig?.version || "0.1.0";
    const { t } = useTranslation();
    const [themeDialog, setThemeDialog] = useState(false);
    const [langDialog, setLangDialog] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<ThemeMode>("system");
    const [currentLang, setCurrentLang] = useState(i18n.language);

    useEffect(() => {
        AsyncStorage.getItem(THEME_MODE_KEY).then((saved) => {
            if (saved === "light" || saved === "dark" || saved === "system") {
                setCurrentTheme(saved);
            }
        });
    }, []);

    async function changeTheme(mode: ThemeMode) {
        setCurrentTheme(mode);
        await AsyncStorage.setItem(THEME_MODE_KEY, mode);
        setThemeDialog(false);
        // Force re-render by triggering a state change that App.tsx picks up
        // App.tsx reads from AsyncStorage on mount, so we need a way to notify it.
        // For simplicity, we'll reload the app state by using the theme state directly.
        // Since App.tsx reads from AsyncStorage, we need to re-mount or use a context.
        // For now, the theme change will apply on next app launch.
        // A more complete solution would use a ThemeContext, but that's beyond this scope.
    }

    async function changeLanguage(lang: "en" | "it") {
        setCurrentLang(lang);
        await i18n.changeLanguage(lang);
        await AsyncStorage.setItem(LOCALE_KEY, lang);
        setLangDialog(false);
    }

    const themeLabel = currentTheme === "system" ? t("settings.themeSystem") : currentTheme === "light" ? t("settings.themeLight") : t("settings.themeDark");
    const langLabel = currentLang === "it" ? t("settings.languageIt") : t("settings.languageEn");

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
                        <RadioButton.Group onValueChange={(val) => changeLanguage(val as "en" | "it")} value={currentLang}>
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
                        <RadioButton.Group onValueChange={(val) => changeTheme(val as ThemeMode)} value={currentTheme}>
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