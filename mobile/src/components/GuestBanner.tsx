import React from "react";
import { View } from "react-native";
import { Text, useTheme } from "react-native-paper";

export default function GuestBanner() {
    const theme = useTheme();

    return (
        <View style={{ backgroundColor: theme.colors.secondaryContainer, paddingVertical: 8, paddingHorizontal: 16 }}>
            <Text style={{ color: theme.colors.onSecondaryContainer, textAlign: "center", fontSize: 13 }}>
                Guest mode — PDFs are stored locally only
            </Text>
        </View>
    );
}