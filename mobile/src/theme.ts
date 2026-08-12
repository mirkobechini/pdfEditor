import {
  MD3LightTheme,
  MD3DarkTheme,
  configureFonts,
} from "react-native-paper";

const fontConfig = configureFonts({ config: { fontFamily: "System" } });

const commonColors = {
  primary: "#F97316",
  primaryContainer: "#FFEDD5",
  onPrimaryContainer: "#7C2D00",
  secondary: "#FB923C",
  tertiary: "#F97316",
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...commonColors,
    onPrimary: "#FFFFFF",
    onSecondary: "#FFFFFF",
    background: "#F5F5F5",
    surface: "#FFFFFF",
    surfaceVariant: "#E5E5E5",
    onSurface: "#1C1C1E",
    onSurfaceVariant: "#6B7280",
    error: "#DC2626",
    onError: "#FFFFFF",
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...commonColors,
    onPrimary: "#FFFFFF",
    onSecondary: "#FFFFFF",
    background: "#121212",
    surface: "#1E1E1E",
    surfaceVariant: "#2C2C2E",
    onSurface: "#E5E5E5",
    onSurfaceVariant: "#9CA3AF",
    error: "#EF4444",
    onError: "#FFFFFF",
  },
};

export type ThemeMode = "system" | "light" | "dark";
