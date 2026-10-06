import React from "react";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHomeScreen } from "../hooks/useHomeScreen";
import HomeToolbar from "../components/HomeToolbar";
import HomeListContent from "../components/HomeListContent";
import HomeDialogs from "../components/HomeDialogs";

interface HomeScreenProps {
    onPdfCountChange?: (count: number) => void;
}

export default function HomeScreen({ onPdfCountChange }: HomeScreenProps) {
    const theme = useTheme();
    const s = useHomeScreen({ onPdfCountChange });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            <HomeToolbar s={s} />
            <HomeListContent s={s} />
            <HomeDialogs s={s} />
        </SafeAreaView>
    );
}