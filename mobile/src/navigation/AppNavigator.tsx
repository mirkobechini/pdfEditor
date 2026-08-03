import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../shared/auth";

import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import PdfViewerScreen from "../screens/PdfViewerScreen";
import ScannerScreen from "../screens/ScannerScreen";
import SettingsScreen from "../screens/SettingsScreen";

export type RootStackParamList = {
    Login: undefined;
    Home: undefined;
    PdfViewer: { pdfId: string; title?: string };
    Scanner: undefined;
    Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) return null; // Splash / loading screen can be added later

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: { backgroundColor: "#F97316" },
                    headerTintColor: "#FFFFFF",
                    headerTitleStyle: { fontWeight: "bold" },
                }}
            >
                {user ? (
                    <>
                        <Stack.Screen
                            name="Home"
                            component={HomeScreen}
                            options={{ title: "PdfEditor" }}
                        />
                        <Stack.Screen
                            name="PdfViewer"
                            component={PdfViewerScreen}
                            options={{ title: "PDF Viewer" }}
                        />
                        <Stack.Screen
                            name="Scanner"
                            component={ScannerScreen}
                            options={{ title: "Scanner" }}
                        />
                        <Stack.Screen
                            name="Settings"
                            component={SettingsScreen}
                            options={{ title: "Settings" }}
                        />
                    </>
                ) : (
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}