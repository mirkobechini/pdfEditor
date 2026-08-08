import React, { useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/shared/auth";
import AppNavigator from "./src/navigation/AppNavigator";
import * as Icons from "@expo/vector-icons";
import { lightTheme, darkTheme } from "./src/theme";
import type { ThemeMode } from "./src/theme";
import "./src/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "./src/i18n";

const THEME_MODE_KEY = "pdfeditor_theme_mode";
const LOCALE_KEY = "pdfeditor_locale";

export default function App() {
  const colorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeMode(saved);
      }
    });
    AsyncStorage.getItem(LOCALE_KEY).then((saved) => {
      if (saved === "it" || saved === "en") {
        i18n.changeLanguage(saved);
      }
    });
  }, []);

  const isDark =
    themeMode === "dark" || (themeMode === "system" && colorScheme === "dark");
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider
        theme={theme}
        settings={{
          icon: (props) => <Icons.MaterialCommunityIcons {...props} />,
        }}
      >
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export { THEME_MODE_KEY, LOCALE_KEY };
