import React from "react";
import { View } from "react-native";
import { Text, useTheme, ActivityIndicator, IconButton, Searchbar } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { HomeScreenState } from "../hooks/useHomeScreen";

/**
 * Header of HomeScreen — search bar, multi-select enter/exit toggle and
 * tools shortcut (issue #885, A3c - step 2). Presentational, reads state `s`.
 */
export default function HomeToolbar({ s }: { s: HomeScreenState }) {
    const { t } = useTranslation();

    return (
        <>
            <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                <Searchbar
                    placeholder={t("home.search")}
                    value={s.searchQuery}
                    onChangeText={s.setSearchQuery}
                    style={{ flex: 1, margin: 16, marginBottom: 0 }}
                />
                {s.pdfs.length > 0 && !s.multiSelect ? (
                    <IconButton icon="checkbox-multiple-marked-outline" onPress={s.enterMultiSelect} />
                ) : s.pdfs.length > 0 && s.multiSelect ? (
                    <IconButton icon="close" onPress={s.exitMultiSelect} />
                ) : null}
                {!s.multiSelect && (
                    <IconButton icon="wrench" testID="tools-button" onPress={s.goToTools} />
                )}
            </View>

            {s.isSyncing && s.progress && (
                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 4, gap: 8 }}>
                    <ActivityIndicator size="small" color={s.theme.colors.primary} />
                    <Text variant="bodySmall" style={{ color: s.theme.colors.onSurfaceVariant, flex: 1 }}>
                        Sync in corso... ({s.progress.current}/{s.progress.total})
                    </Text>
                </View>
            )}
        </>
    );
}