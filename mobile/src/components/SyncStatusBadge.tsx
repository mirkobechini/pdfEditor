import React from "react";
import { View } from "react-native";
import { Text, IconButton, useTheme } from "react-native-paper";

interface SyncStatusBadgeProps {
    pendingCount: number;
}

export default function SyncStatusBadge({ pendingCount }: SyncStatusBadgeProps) {
    const theme = useTheme();

    if (pendingCount === 0) return null;

    return (
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 4 }}>
            <IconButton icon="sync" size={16} iconColor={theme.colors.onSurfaceVariant} />
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                {pendingCount} pending sync
            </Text>
        </View>
    );
}