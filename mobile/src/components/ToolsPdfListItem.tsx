import React from "react";
import { TouchableOpacity } from "react-native";
import { Text, Card, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { LocalPdf } from "../shared/types";

interface ToolsPdfListItemProps {
    item: LocalPdf;
    isSelected: boolean;
    onPress: (item: LocalPdf) => void;
}

/**
 * Extracted from ToolsScreen's FlatList `renderItem` for the same reason as
 * HomeScreen's PdfListItem: an inline renderItem is recreated on every
 * ToolsScreen render — including one caused by typing into an unrelated
 * TextInput elsewhere on the screen (e.g. the rename dialog) — which forced
 * every visible row to re-render. With a large file list that was enough
 * JS-thread work per keystroke to desync Android's native TextInput from
 * React's controlled state. React.memo here only helps if `onPress` stays
 * referentially stable — see ToolsScreen's handleItemPress.
 */
function ToolsPdfListItem({ item, isSelected, onPress }: ToolsPdfListItemProps) {
    const theme = useTheme();
    const { t } = useTranslation();

    return (
        <Card
            style={{
                marginBottom: 12,
                backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface,
            }}
        >
            <TouchableOpacity onPress={() => onPress(item)}>
                <Card.Content>
                    <Text variant="titleSmall" style={{ fontWeight: "600" }}>
                        {item.original_filename}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {t("tools.pagesInfo", { count: item.page_count, size: (item.file_size / 1024).toFixed(0) })}
                    </Text>
                </Card.Content>
            </TouchableOpacity>
        </Card>
    );
}

export default React.memo(ToolsPdfListItem);
