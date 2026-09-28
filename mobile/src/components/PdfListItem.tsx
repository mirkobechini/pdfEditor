import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text, Card, useTheme, IconButton, Checkbox } from "react-native-paper";
import { Swipeable } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import type { LocalPdf } from "../shared/types";
import type { PdfSyncStatus } from "../hooks/useCloudSync";

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PdfListItemProps {
    item: LocalPdf;
    isSelected: boolean;
    multiSelect: boolean;
    syncEnabled: boolean;
    syncStatus?: PdfSyncStatus;
    onPress: (item: LocalPdf) => void;
    onLongPress: (item: LocalPdf) => void;
    onToggleSelect: (id: string) => void;
    onDelete: (item: LocalPdf) => void;
}

/**
 * Extracted from HomeScreen's FlatList `renderItem` — an inline arrow
 * function there was recreated on every render, defeating FlatList/
 * VirtualizedList's own item memoization and causing the "large list is
 * slow to update" warning (and the perceptible lag) on the home screen.
 * React.memo here only helps if the callback props below stay referentially
 * stable across renders — see HomeScreen's useCallback-wrapped handlers.
 */
function PdfListItem({
    item,
    isSelected,
    multiSelect,
    syncEnabled,
    syncStatus,
    onPress,
    onLongPress,
    onToggleSelect,
    onDelete,
}: PdfListItemProps) {
    const theme = useTheme();
    const { t } = useTranslation();

    const renderRightActions = () => {
        if (multiSelect) return <View />;
        return (
            <View style={{ justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.error, marginBottom: 12, borderRadius: 12, width: 80 }}>
                <TouchableOpacity
                    onPress={() => onDelete(item)}
                    style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}
                >
                    <IconButton icon="delete" iconColor={theme.colors.onError} size={24} />
                    <Text style={{ color: theme.colors.onError, fontSize: 12 }}>{t("home.delete")}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Swipeable renderRightActions={renderRightActions}>
            <TouchableOpacity
                onPress={() => (multiSelect ? onToggleSelect(item.id) : onPress(item))}
                onLongPress={() => { if (!multiSelect) onLongPress(item); }}
            >
                <Card style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {multiSelect && (
                            <Checkbox
                                status={isSelected ? "checked" : "unchecked"}
                                onPress={() => onToggleSelect(item.id)}
                                color={theme.colors.primary}
                            />
                        )}
                        <View
                            style={{
                                width: 48,
                                height: 60,
                                borderRadius: 6,
                                backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                                justifyContent: "center",
                                alignItems: "center",
                                margin: 12,
                            }}
                        >
                            {item.upload_source && item.upload_source !== "mobile" ? (
                                <Text style={{ fontSize: 24, color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }}>
                                    {item.upload_source === "web" ? "🌐" : item.upload_source === "desktop" ? "💻" : "📱"}
                                </Text>
                            ) : (
                                <IconButton icon="file-pdf-box" iconColor={isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant} size={28} />
                            )}
                            <Text
                                style={{
                                    fontSize: 10,
                                    color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                                    fontWeight: "700",
                                    marginTop: -6,
                                }}
                            >
                                {item.page_count ?? "?"} p.
                            </Text>
                        </View>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text variant="titleMedium" style={{ fontWeight: "600" }} numberOfLines={1}>
                                {item.original_filename}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {formatSize(item.file_size)}
                                </Text>
                                {syncEnabled === false ? (
                                    <IconButton icon="cloud-off-outline" size={16} iconColor="#9E9E9E" style={{ margin: 0 }} />
                                ) : syncStatus === "pending" ? (
                                    <IconButton icon="cloud-sync" size={16} iconColor="#FFC107" style={{ margin: 0 }} />
                                ) : syncStatus === "error" ? (
                                    <IconButton icon="cloud-alert" size={16} iconColor="#F44336" style={{ margin: 0 }} />
                                ) : item.cloud_synced_exclude === 1 ? (
                                    <IconButton icon="cloud-off-outline" size={16} iconColor="#9E9E9E" style={{ margin: 0 }} />
                                ) : syncStatus === "synced" || item.cloud_synced === 1 ? (
                                    <IconButton icon="cloud-check" size={16} iconColor="#4CAF50" style={{ margin: 0 }} />
                                ) : (
                                    <IconButton icon="cloud-outline" size={16} iconColor="#9E9E9E" style={{ margin: 0 }} />
                                )}
                            </View>
                        </View>
                    </View>
                </Card>
            </TouchableOpacity>
        </Swipeable>
    );
}

export default React.memo(PdfListItem);
