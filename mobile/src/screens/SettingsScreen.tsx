import React from "react";
import { View, ScrollView } from "react-native";
import { Text, List, useTheme, Button, RadioButton, Dialog, Portal, Switch, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../shared/auth";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { useAppSettings } from "../shared/AppSettingsContext";
import { useCloudSync, type SyncMode, type SyncConflict } from "../hooks/useCloudSync";
import ConflictDialog from "./ConflictDialog";
import ImportPdfDialog from "./ImportPdfDialog";

export default function SettingsScreen() {
    const theme = useTheme();
    const { user, logout } = useAuth();
    const appVersion = Constants.expoConfig?.version || "0.1.0";
    const { t } = useTranslation();
    const { themeMode, setThemeMode, locale, setLocale } = useAppSettings();
    const { syncEnabled, setSyncEnabled, syncMode, setSyncMode, syncOnStartup, setSyncOnStartup, isSyncing, isOnline, syncAll, resolveConflict, importPdfs } = useCloudSync();
    const [themeDialog, setThemeDialog] = React.useState(false);
    const [langDialog, setLangDialog] = React.useState(false);
    const [syncModeDialog, setSyncModeDialog] = React.useState(false);
    const [syncResult, setSyncResult] = React.useState("");
    const [syncResultVisible, setSyncResultVisible] = React.useState(false);
    const [syncErrorDetail, setSyncErrorDetail] = React.useState<string[]>([]);
    const [syncErrorDialog, setSyncErrorDialog] = React.useState(false);
    const [conflicts, setConflicts] = React.useState<SyncConflict[]>([]);
    const [conflictDialogVisible, setConflictDialogVisible] = React.useState(false);
    const [importDialogVisible, setImportDialogVisible] = React.useState(false);

    const themeLabel = themeMode === "system" ? t("settings.themeSystem") : themeMode === "light" ? t("settings.themeLight") : t("settings.themeDark");
    const langLabel = locale === "system" ? t("settings.languageSystem") : locale === "it" ? t("settings.languageIt") : t("settings.languageEn");
    const syncModeLabel = (mode: SyncMode): string => {
        switch (mode) {
            case "differito": return t("cloud.syncModeDifferito");
            case "auto": return t("cloud.syncModeAuto");
            case "ibrido": return t("cloud.syncModeIbrido");
            case "chiedi": return t("cloud.syncModeChiedi");
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={[]}>
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

                <View style={{ height: 1, backgroundColor: theme.colors.surfaceVariant, marginHorizontal: 16 }} />

                {/* Cloud Section — subito dopo Account per visibilità */}
                <List.Section>
                    <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                        {t("cloud.title")}
                    </List.Subheader>
                    <List.Item
                        title={t("cloud.syncCloud")}
                        description={syncEnabled ? (isSyncing ? t("cloud.syncing") : t("cloud.enabled")) : t("cloud.disabled")}
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
                                title={t("cloud.syncMode")}
                                description={syncModeLabel(syncMode)}
                                left={(props) => <List.Icon {...props} icon="sync" />}
                                onPress={() => setSyncModeDialog(true)}
                            />
                            <List.Item
                                title={t("cloud.syncOnStartup")}
                                description={syncOnStartup ? t("cloud.syncOnStartupOn") : t("cloud.syncOnStartupOff")}
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
                                title={t("cloud.connection")}
                                description={isOnline ? t("cloud.online") : t("cloud.offline")}
                                left={(props) => <List.Icon {...props} icon={isOnline ? "wifi" : "wifi-off"} />}
                            />
                            <List.Item
                                title={t("cloud.manageLocal")}
                                description={t("cloud.manageLocalDesc")}
                                left={(props) => <List.Icon {...props} icon="folder-upload" />}
                                onPress={() => setImportDialogVisible(true)}
                            />
                            <List.Item
                                title={t("cloud.syncNow")}
                                description={isSyncing ? t("cloud.syncNowInProgress") : t("cloud.syncNowDesc")}
                                left={(props) => <List.Icon {...props} icon="cloud-upload" />}
                                onPress={async () => {
                                    const result = await syncAll();
                                    // Show conflicts dialog first if any
                                    if (result.conflicts.length > 0) {
                                        setConflicts(result.conflicts);
                                        setConflictDialogVisible(true);
                                    }
                                    if (result.errors.length > 0) {
                                        setSyncErrorDetail(result.errors);
                                        setSyncErrorDialog(true);
                                    } else if (result.conflicts.length === 0) {
                                        const msg = t("cloud.syncResult", { uploaded: result.uploaded, downloaded: result.downloaded, conflicts: result.conflicts.length });
                                        setSyncResult(msg);
                                        setSyncResultVisible(true);
                                    }
                                }}
                                disabled={isSyncing || !isOnline}
                            />
                        </>
                    )}
                </List.Section>

                <View style={{ height: 1, backgroundColor: theme.colors.surfaceVariant, marginHorizontal: 16 }} />

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

            {/* Sync Mode Dialog */}
            <Portal>
                <Dialog visible={syncModeDialog} onDismiss={() => setSyncModeDialog(false)}>
                    <Dialog.Title>{t("cloud.syncModeTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <RadioButton.Group onValueChange={(val) => { setSyncMode(val as SyncMode); setSyncModeDialog(false); }} value={syncMode}>
                            <RadioButton.Item label={t("cloud.syncModeDifferito")} value="differito" />
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 16, marginTop: -8, marginBottom: 8 }}>
                                {t("cloud.syncModeDifferitoDesc")}
                            </Text>
                            <RadioButton.Item label={t("cloud.syncModeAuto")} value="auto" />
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 16, marginTop: -8, marginBottom: 8 }}>
                                {t("cloud.syncModeAutoDesc")}
                            </Text>
                            <RadioButton.Item label={t("cloud.syncModeIbrido")} value="ibrido" />
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 16, marginTop: -8, marginBottom: 8 }}>
                                {t("cloud.syncModeIbridoDesc")}
                            </Text>
                            <RadioButton.Item label={t("cloud.syncModeChiedi")} value="chiedi" />
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 16, marginTop: -8, marginBottom: 8 }}>
                                {t("cloud.syncModeChiediDesc")}
                            </Text>
                        </RadioButton.Group>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setSyncModeDialog(false)}>{t("common.cancel")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Sync Error Dialog */}
            <Portal>
                <Dialog visible={syncErrorDialog} onDismiss={() => setSyncErrorDialog(false)}>
                    <Dialog.Title>{t("cloud.syncErrors")}</Dialog.Title>
                    <Dialog.Content>
                        {syncErrorDetail.map((err, i) => {
                            const [key, name] = err.split(":");
                            const label = name ? t(key, { name }) : t(err);
                            return (
                                <Text key={i} variant="bodyMedium" style={{ color: theme.colors.error, marginBottom: 4 }}>
                                    • {label}
                                </Text>
                            );
                        })}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setSyncErrorDialog(false)}>{t("common.close")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Snackbar
                visible={syncResultVisible}
                onDismiss={() => setSyncResultVisible(false)}
                duration={4000}
                action={{ label: t("common.ok"), onPress: () => setSyncResultVisible(false) }}
            >
                {syncResult}
            </Snackbar>

            <ConflictDialog
                visible={conflictDialogVisible}
                conflicts={conflicts}
                onDismiss={() => setConflictDialogVisible(false)}
                onResolve={async (resolutions) => {
                    for (const [pdfId, resolution] of Object.entries(resolutions)) {
                        await resolveConflict(pdfId, resolution as "local" | "cloud");
                    }
                }}
            />

            <ImportPdfDialog
                visible={importDialogVisible}
                onDismiss={() => setImportDialogVisible(false)}
                onImport={async (pdfIds) => {
                    const result = await importPdfs(pdfIds);
                    if (result.errors.length > 0) {
                        setSyncErrorDetail(result.errors);
                        setSyncErrorDialog(true);
                    } else {
                        setSyncResult(t("cloud.importResult", { count: result.imported }));
                        setSyncResultVisible(true);
                    }
                }}
            />
        </SafeAreaView>
    );
}