import React from "react";
import { View } from "react-native";
import { Text, List, useTheme, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../shared/auth";

export default function SettingsScreen() {
    const theme = useTheme();
    const { user, logout } = useAuth();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            <List.Section>
                <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                    Account
                </List.Subheader>
                <List.Item
                    title={user?.full_name || "Unknown"}
                    description={user?.email || "No email"}
                    left={(props) => <List.Icon {...props} icon="account" />}
                />
                <List.Item
                    title="Logout"
                    left={(props) => <List.Icon {...props} icon="logout" />}
                    onPress={async () => {
                        await logout();
                        // Navigation will automatically switch to Login screen
                    }}
                />
            </List.Section>

            <List.Section>
                <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                    App
                </List.Subheader>
                <List.Item
                    title="Version"
                    description="0.1.0"
                    left={(props) => <List.Icon {...props} icon="information" />}
                />
            </List.Section>
        </SafeAreaView>
    );
}