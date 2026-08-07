import React from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { IconButton } from "react-native-paper";
import { useAuth } from "../shared/auth";

import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import PdfViewerScreen from "../screens/PdfViewerScreen";
import ScannerScreen from "../screens/ScannerScreen";
import ToolsScreen from "../screens/ToolsScreen";
import SettingsScreen from "../screens/SettingsScreen";

export type RootStackParamList = {
    Login: undefined;
    Home: undefined;
    PdfViewer: { pdfId: string; title?: string };
    Scanner: undefined;
    Tools: undefined;
    Settings: undefined;
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
                            name="Home"
                            component={HomeScreen}
                            options={({ navigation }) => ({
                                title: "PdfEditor",
                                headerRight: () => (
                                    <View style={{ flexDirection: "row" }}>
                                        <IconButton
                                            icon="tools"
                                            size={22}
                                            iconColor="#FFFFFF"
                                            onPress={() => navigation.navigate("Tools")}
                                        />
                                        <IconButton
                                            icon="cog"
                                            size={22}
                                            iconColor="#FFFFFF"
                                            onPress={() => navigation.navigate("Settings")}
                                        />
                                    </View>
                                ),
                            })}
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