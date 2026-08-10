import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppSettingsProvider>
        <AppContent />
      </AppSettingsProvider>
    </GestureHandlerRootView>
  );
}
