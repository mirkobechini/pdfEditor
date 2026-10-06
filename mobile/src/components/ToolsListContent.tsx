import React from "react";
import { View, FlatList } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { ToolsScreenState } from "../hooks/useToolsScreen";
import ToolsPdfListItem from "./ToolsPdfListItem";

/**
 * Body content of ToolsScreen — empty hint / loading / file list.
 * Uses early returns to avoid nested ternaries (issue #885, A3a - step 3).
 */
export default function ToolsListContent({ s }: { s: ToolsScreenState }) {
    const { t } = useTranslation();
    const theme = s.theme;

    if (!s.operation) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                    {t("tools.selectTool")}
                </Text>
            </View>
        );
    }

    if (s.loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <FlatList
            data={s.pdfs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
                <ToolsPdfListItem
                    item={item}
                    isSelected={s.selectedIds.includes(item.id)}
                    onPress={s.handleItemPress}
                />
            )}
        />
    );
}