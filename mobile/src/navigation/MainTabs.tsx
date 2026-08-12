import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { IconButton, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import HomeScreen from "../screens/HomeScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
    const theme = useTheme();
    const { t } = useTranslation();
    const [pdfCount, setPdfCount] = useState(0);

    return (
        <Tab.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: "#F97316" },
                headerTintColor: "#FFFFFF",
                headerTitleStyle: { fontWeight: "bold" },
                tabBarActiveTintColor: "#F97316",
                tabBarInactiveTintColor: "#999",
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.surfaceVariant,
                },
            }}
        >
            <Tab.Screen
                name="HomeTab"
                children={() => <HomeScreen onPdfCountChange={setPdfCount} />}
                options={{
                    title: t("home.title"),
                    tabBarLabel: t("home.title"),
                    tabBarBadge: pdfCount > 0 ? pdfCount : undefined,
                    tabBarIcon: ({ color, size }) => (
                        <IconButton icon="file-document" size={size} iconColor={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="SettingsTab"
                component={SettingsScreen}
                options={{
                    title: t("settings.title"),
                    tabBarLabel: t("settings.title"),
                    tabBarIcon: ({ color, size }) => (
                        <IconButton icon="cog" size={size} iconColor={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}