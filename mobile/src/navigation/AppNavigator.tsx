import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../shared/auth";
import { useOnboarding } from "../shared/OnboardingContext";
import { useTranslation } from "react-i18next";

import LoginScreen from "../screens/LoginScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import OnboardingWizard from "../screens/OnboardingWizard";
import MainTabs from "./MainTabs";
import PdfViewerScreen from "../screens/PdfViewerScreen";
import ScannerScreen from "../screens/ScannerScreen";
import ToolsScreen from "../screens/ToolsScreen";

export type RootStackParamList = {
    Login: undefined;
    ForgotPassword: undefined;
    Onboarding: undefined;
    Main: undefined;
    PdfViewer: { pdfId: string; title?: string };
    Scanner: undefined;
    Tools: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const { user, loading } = useAuth();
    const { completed: onboardingCompleted, loading: onboardingLoading } = useOnboarding();
    const { t } = useTranslation();

    if (onboardingLoading) {
        // Splash-like empty view while checking onboarding flag
        return <NavigationContainer><Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Onboarding" component={OnboardingWizard} /></Stack.Navigator></NavigationContainer>;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: { backgroundColor: "#F97316" },
                    headerTintColor: "#FFFFFF",
                    headerTitleStyle: { fontWeight: "bold" },
                }}
            >
                {!onboardingCompleted ? (
                    <>
                        <Stack.Screen
                            name="Onboarding"
                            component={OnboardingWizard}
                            options={{ headerShown: false }}
                        />
                    </>
                ) : user ? (
                    <>
                        <Stack.Screen
                            name="Main"
                            component={MainTabs}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="PdfViewer"
                            component={PdfViewerScreen}
                            options={{ title: t("home.title") + " - " + t("home.detailsTitle") }}
                        />
                        <Stack.Screen
                            name="Scanner"
                            component={ScannerScreen}
                            options={{ title: t("home.scan") }}
                        />
                        <Stack.Screen
                            name="Tools"
                            component={ToolsScreen}
                            options={{ title: t("tools.title") }}
                        />
                    </>
                ) : (
                    <>
                        <Stack.Screen
                            name="Login"
                            component={LoginScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="ForgotPassword"
                            component={ForgotPasswordScreen}
                            options={{ title: t("auth.forgotPassword") }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}