import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import {
    Text,
    Button,
    useTheme,
    RadioButton,
    Switch,
    List,
    Surface,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAppSettings } from "../shared/AppSettingsContext";
import { useCloudSync } from "../hooks/useCloudSync";
import { useOnboarding } from "../shared/OnboardingContext";

type WizardStep =
    | "welcome"
    | "permissions"
    | "theme"
    | "language"
    | "cloud"
    | "done";

export default function OnboardingWizard() {
    const theme = useTheme();
    const { t } = useTranslation();
    const { themeMode, setThemeMode, locale, setLocale } = useAppSettings();
    const { syncEnabled, setSyncEnabled } = useCloudSync();
    const { completeOnboarding } = useOnboarding();

    const [step, setStep] = useState<WizardStep>("welcome");

    function renderStep() {
        switch (step) {
            case "welcome":
                return (
                    <Surface style={{ padding: 32, borderRadius: 16, elevation: 4, backgroundColor: theme.colors.surface }}>
                        <Text variant="headlineLarge" style={{ textAlign: "center", fontWeight: "bold", color: theme.colors.primary, marginBottom: 8 }}>
                            {t("onboarding.welcomeTitle")}
                        </Text>
                        <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                            {t("onboarding.welcomeDesc")}
                        </Text>
                        <Button mode="contained" onPress={() => setStep("permissions")} style={{ borderRadius: 8 }} contentStyle={{ paddingVertical: 6 }}>
                            {t("onboarding.start")}
                        </Button>
                        <Button mode="text" onPress={completeOnboarding} style={{ marginTop: 8 }}>
                            {t("onboarding.skip")}
                        </Button>
                    </Surface>
                );

            case "permissions":
                return (
                    <Surface style={{ padding: 32, borderRadius: 16, elevation: 4, backgroundColor: theme.colors.surface }}>
                        <Text variant="headlineSmall" style={{ fontWeight: "bold", color: theme.colors.primary, marginBottom: 12 }}>
                            {t("onboarding.permissionsTitle")}
                        </Text>
                        <List.Item
                            title={t("onboarding.permissionCamera")}
                            description={t("onboarding.permissionCameraDesc")}
                            left={(props) => <List.Icon {...props} icon="camera" />}
                        />
                        <List.Item
                            title={t("onboarding.permissionNotifications")}
                            description={t("onboarding.permissionNotificationsDesc")}
                            left={(props) => <List.Icon {...props} icon="bell" />}
                        />
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                            {t("onboarding.permissionsNote")}
                        </Text>
                        <Button mode="contained" onPress={() => setStep("theme")} style={{ borderRadius: 8 }} contentStyle={{ paddingVertical: 6 }}>
                            {t("onboarding.continue")}
                        </Button>
                    </Surface>
                );

            case "theme":
                return (
                    <Surface style={{ padding: 32, borderRadius: 16, elevation: 4, backgroundColor: theme.colors.surface }}>
                        <Text variant="headlineSmall" style={{ fontWeight: "bold", color: theme.colors.primary, marginBottom: 12 }}>
                            {t("settings.theme")}
                        </Text>
                        <RadioButton.Group onValueChange={(val) => setThemeMode(val as "system" | "light" | "dark")} value={themeMode}>
                            <RadioButton.Item label={t("settings.themeSystem")} value="system" />
                            <RadioButton.Item label={t("settings.themeLight")} value="light" />
                            <RadioButton.Item label={t("settings.themeDark")} value="dark" />
                        </RadioButton.Group>
                        <Button mode="contained" onPress={() => setStep("language")} style={{ borderRadius: 8, marginTop: 12 }} contentStyle={{ paddingVertical: 6 }}>
                            {t("onboarding.continue")}
                        </Button>
                    </Surface>
                );

            case "language":
                return (
                    <Surface style={{ padding: 32, borderRadius: 16, elevation: 4, backgroundColor: theme.colors.surface }}>
                        <Text variant="headlineSmall" style={{ fontWeight: "bold", color: theme.colors.primary, marginBottom: 12 }}>
                            {t("settings.language")}
                        </Text>
                        <RadioButton.Group onValueChange={(val) => setLocale(val)} value={locale}>
                            <RadioButton.Item label={t("settings.languageSystem")} value="system" />
                            <RadioButton.Item label={t("settings.languageIt")} value="it" />
                            <RadioButton.Item label={t("settings.languageEn")} value="en" />
                        </RadioButton.Group>
                        <Button mode="contained" onPress={() => setStep("cloud")} style={{ borderRadius: 8, marginTop: 12 }} contentStyle={{ paddingVertical: 6 }}>
                            {t("onboarding.continue")}
                        </Button>
                    </Surface>
                );

            case "cloud":
                return (
                    <Surface style={{ padding: 32, borderRadius: 16, elevation: 4, backgroundColor: theme.colors.surface }}>
                        <Text variant="headlineSmall" style={{ fontWeight: "bold", color: theme.colors.primary, marginBottom: 12 }}>
                            {t("cloud.syncCloud")}
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                            {t("onboarding.cloudDesc")}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                            <Text variant="bodyLarge">{t("cloud.syncCloud")}</Text>
                            <Switch value={syncEnabled} onValueChange={setSyncEnabled} color={theme.colors.primary} />
                        </View>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                            {t("onboarding.cloudNote")}
                        </Text>
                        <Button mode="contained" onPress={() => setStep("done")} style={{ borderRadius: 8 }} contentStyle={{ paddingVertical: 6 }}>
                            {t("onboarding.continue")}
                        </Button>
                    </Surface>
                );

            case "done":
                return (
                    <Surface style={{ padding: 32, borderRadius: 16, elevation: 4, backgroundColor: theme.colors.surface }}>
                        <Text variant="headlineLarge" style={{ textAlign: "center", fontWeight: "bold", color: theme.colors.primary, marginBottom: 8 }}>
                            {t("onboarding.doneTitle")}
                        </Text>
                        <Text variant="bodyMedium" style={{ textAlign: "center", color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                            {t("onboarding.doneDesc")}
                        </Text>
                        <Button mode="contained" onPress={completeOnboarding} style={{ borderRadius: 8 }} contentStyle={{ paddingVertical: 6 }}>
                            {t("onboarding.startApp")}
                        </Button>
                    </Surface>
                );
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
                {renderStep()}
            </ScrollView>
        </SafeAreaView>
    );
}
