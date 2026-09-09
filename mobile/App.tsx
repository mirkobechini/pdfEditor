import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { AuthProvider } from "./src/shared/auth";
import { AppSettingsProvider, useAppSettings } from "./src/shared/AppSettingsContext";
import { OnboardingProvider } from "./src/shared/OnboardingContext";
import AppNavigator from "./src/navigation/AppNavigator";
import * as Icons from "@expo/vector-icons";
import "./src/i18n";

function AppContent() {
  const { theme } = useAppSettings();

  return (
    <PaperProvider
      theme={theme}
      settings={{
        icon: (props) => <Icons.MaterialCommunityIcons {...props} />,
      }}
    >
      <SafeAreaProvider>
        <OnboardingProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </AuthProvider>
        </OnboardingProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default function App() {
  // Load MaterialCommunityIcons font before rendering so icons are visible
  // (in APK standalone the font is not available at first render otherwise)
  const [fontsLoaded] = useFonts({
    MaterialCommunityIcons: Icons.MaterialCommunityIcons.font,
  });

  if (!fontsLoaded) {
    return null; // Keep splash screen visible until fonts are ready
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppSettingsProvider>
        <AppContent />
      </AppSettingsProvider>
    </GestureHandlerRootView>
  );
}
