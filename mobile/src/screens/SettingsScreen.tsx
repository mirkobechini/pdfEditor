import React from "react";
import { View, ScrollView } from "react-native";
import { Text, List, useTheme, Button, RadioButton, Dialog, Portal, Switch, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../shared/auth";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useAppSettings } from "../shared/AppSettingsContext";
import { useCloudSync, type SyncMode } from "../hooks/useCloudSync";

export default function SettingsScreen() {
    const theme = useTheme();
    const { user, logout } = useAuth();
    const appVersion = Constants.expoConfig?.version || "0.1.0";
    const { t } = useTranslation();
    const { themeMode, setThemeMode, locale, setLocale } = useAppSettings();
    const { syncEnabled, setSyncEnabled, syncMode, setSyncMode, syncOnStartup, setSyncOnStartup, isSyncing, isOnline, syncAll } = useCloudSync();
    const [themeDialog, setThemeDialog] = React.useState(false);
    const [langDialog, setLangDialog] = React.useState(false);
    const [syncModeDialog, setSyncModeDialog] = React.useState(false);
    const [syncResult, setSyncResult] = React.useState("");
    const [syncResultVisible, setSyncResultVisible] = React.useState(false);

    const themeLabel = themeMode === "system" ? t("settings.themeSystem") : themeMode === "light" ? t("settings.themeLight") : t("settings.themeDark");
    const langLabel = locale === "system" ? t("settings.languageSystem") : locale === "it" ? t("settings.languageIt") : t("settings.languageEn");
    const syncModeLabel = (mode: SyncMode): string => {
        switch (mode) {
            case "differito": return "Differito (sync manuale)";
            case "auto": return "Auto (tutte le modifiche)";
            case "ibrido": return "Ibrido (Wi-Fi solo)";
            case "chiedi": return "Chiedi ogni volta";
        }
    };

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
                    {/* Cloud Section */}
                    <List.Section>
                        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                            Cloud
                        </List.Subheader>
                        <List.Item
                            title="Sync cloud"
                            description={syncEnabled ? (isSyncing ? "Sync in corso..." : "Attivo") : "Disattivo"}
                            left={(props) => <List.Icon {...props} icon="cloud" />}
                            right={(props) => (
                                <Switch
                                    value={syncEnabled}
                                    onValueChange={setSyncEnabled}
                                    color={theme.colors.primary}
                                />
                            )}
                        />
                        {syncEnabled && (
                            <>
                                <List.Item
                                    title="Modalità sync"
                                    description={syncModeLabel(syncMode)}
                                    left={(props) => <List.Icon {...props} icon="sync" />}
                                    onPress={() => setSyncModeDialog(true)}
                                />
                                <List.Item
                                    title="Sync all'avvio"
                                    description={syncOnStartup ? "Attivo" : "Disattivo"}
                                    left={(props) => <List.Icon {...props} icon="restart" />}
                                    right={(props) => (
                                        <Switch
                                            value={syncOnStartup}
                                            onValueChange={setSyncOnStartup}
                                            color={theme.colors.primary}
                                        />
                                    )}
                                />
                                <List.Item
                                    title="Connessione"
                                    description={isOnline ? "Online" : "Offline"}
                                    left={(props) => <List.Icon {...props} icon={isOnline ? "wifi" : "wifi-off"} />}
                                />
                                <List.Item
                                    title="Sincronizza ora"
                                    description={isSyncing ? "In corso..." : "Avvia sync"}
                                    left={(props) => <List.Icon {...props} icon="cloud-upload" />}
                                    onPress={async () => {
                                        const result = await syncAll();
                                        setSyncResult(`Upload: ${result.uploaded}, Download: ${result.downloaded}, Conflitti: ${result.conflicts.length}, Errori: ${result.errors.length}`);
                                        setSyncResultVisible(true);
                                    }}
                                    disabled={isSyncing || !isOnline}
                                />
                            </>
                        )}
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

            {/* Sync Mode Dialog */}
            <Portal>
                <Dialog visible={syncModeDialog} onDismiss={() => setSyncModeDialog(false)}>
                    <Dialog.Title>Modalità sync</Dialog.Title>
                    <Dialog.Content>
                        <RadioButton.Group onValueChange={(val) => { setSyncMode(val as SyncMode); setSyncModeDialog(false); }} value={syncMode}>
                            <RadioButton.Item label="Differito (default)" value="differito" />
                            <RadioButton.Item label="Auto" value="auto" />
                            <RadioButton.Item label="Ibrido" value="ibrido" />
                            <RadioButton.Item label="Chiedi ogni volta" value="chiedi" />
                        </RadioButton.Group>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setSyncModeDialog(false)}>{t("common.cancel")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Snackbar
                visible={syncResultVisible}
                onDismiss={() => setSyncResultVisible(false)}
                duration={4000}
                action={{ label: "OK", onPress: () => setSyncResultVisible(false) }}
            >
                {syncResult}
            </Snackbar>
        </SafeAreaView>
    );
}