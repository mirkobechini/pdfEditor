import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";

/**
 * Page-picker grid shared by the split and remove-pages dialogs
 * (issue #885, A3a - step 4). De-duplicates the deeply nested inline grid
 * that previously lived in ToolsDialogs.
 */
export default function PageGrid({
    totalPages,
    selectedPages,
    onTogglePage,
    selectedColor,
    unselectedColor,
    textColor,
    unselectedTextColor,
}: {
    totalPages: number;
    selectedPages: number[];
    onTogglePage: (page: number) => void;
    selectedColor: string;
    unselectedColor: string;
    textColor: string;
    unselectedTextColor: string;
}) {
    return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const selected = selectedPages.includes(page);
                return (
                    <TouchableOpacity
                        key={page}
                        onPress={() => onTogglePage(page)}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            backgroundColor: selected ? selectedColor : unselectedColor,
                            justifyContent: "center",
                            alignItems: "center",
                            margin: 2,
                        }}
                    >
                        <Text style={{ color: selected ? textColor : unselectedTextColor }}>
                            {page}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}