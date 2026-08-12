import React from "react";
import { View } from "react-native";
import { Text, Card, IconButton, useTheme, Checkbox } from "react-native-paper";
import type { LocalPdf } from "../shared/types";

interface PdfListItemProps {
    item: LocalPdf;
    multiSelect: boolean;
    isSelected: boolean;
    onPress: () => void;
    onLongPress: () => void;
    onToggleSelect: () => void;
}

export default function PdfListItem({ item, multiSelect, isSelected, onPress, onLongPress, onToggleSelect }: PdfListItemProps) {
    const theme = useTheme();

    function formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return (
        <Card style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                {multiSelect && (
                    <Checkbox
                        status={isSelected ? "checked" : "unchecked"}
                        onPress={onToggleSelect}
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
                    <IconButton icon="file-pdf-box" iconColor={isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant} size={28} />
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
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatSize(item.file_size)}
                    </Text>
                </View>
            </View>
        </Card>
    );
}