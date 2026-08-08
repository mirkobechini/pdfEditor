import React from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../shared/auth";

import LoginScreen from "../screens/LoginScreen";
import MainTabs from "./MainTabs";
import PdfViewerScreen from "../screens/PdfViewerScreen";
import ScannerScreen from "../screens/ScannerScreen";
import ToolsScreen from "../screens/ToolsScreen";

export type RootStackParamList = {
    Login: undefined;
    Main: undefined;
    PdfViewer: { pdfId: string; title?: string };
    Scanner: undefined;
    Tools: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
            <ActivityIndicator size="large" color="#F97316" />
        </View>
    );

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
                            name="Main"
                            component={MainTabs}
                            options={{ headerShown: false }}
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
                            name="Tools"
                            component={ToolsScreen}
                            options={{ title: "PDF Tools" }}
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