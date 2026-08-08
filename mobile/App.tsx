import React from "react";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/shared/auth";
import AppNavigator from "./src/navigation/AppNavigator";
import * as Icons from "@expo/vector-icons";
import { lightTheme, darkTheme } from "./src/theme";

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

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
