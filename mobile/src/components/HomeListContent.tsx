import React from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { HomeScreenState } from "../hooks/useHomeScreen";
import PdfListItem from "./PdfListItem";

/**
 * Body of HomeScreen — loading / empty / flat list.
 * Uses early returns to avoid nested ternaries (issue #885, A3c - step 2).
 */
export default function HomeListContent({ s }: { s: HomeScreenState }) {
    const { t } = useTranslation();
    const theme = s.theme;

    if (s.loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (s.pdfs.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                    {t("home.noPdfs")}
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={s.filteredPdfs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={s.refreshing} onRefresh={s.onRefresh} />}
            renderItem={({ item }) => (
                <PdfListItem
                    item={item}
                    isSelected={s.selectedIds.has(item.id)}
                    multiSelect={s.multiSelect}
                    syncEnabled={s.syncEnabled}
                    syncStatus={s.syncStatus[item.id]}
                    onPress={s.handleItemPress}
                    onLongPress={s.handleItemLongPress}
                    onToggleSelect={s.toggleSelect}
                    onDelete={s.handleDelete}
                />
            )}
        />
    );
}