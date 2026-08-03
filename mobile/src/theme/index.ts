import {
  MD3LightTheme,
  MD3DarkTheme,
  configureFonts,
} from "react-native-paper";

const fontConfig = {
  fontFamily: "System",
} as const;

const sharedTheme = {
  fonts: configureFonts({ config: fontConfig }),
  roundness: 8,
};

export const lightTheme = {
  ...MD3LightTheme,
  ...sharedTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#F97316",
    primaryContainer: "#FFEDD5",
    secondary: "#0EA5E9",
    secondaryContainer: "#E0F2FE",
    background: "#FAFAFA",
    surface: "#FFFFFF",
    surfaceVariant: "#F5F5F4",
    error: "#DC2626",
    onPrimary: "#FFFFFF",
    onSecondary: "#FFFFFF",
    onBackground: "#1C1917",
    onSurface: "#1C1917",
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  ...sharedTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#FB923C",
    primaryContainer: "#7C2D12",
    secondary: "#38BDF8",
    secondaryContainer: "#0C4A6E",
    background: "#0C0A09",
    surface: "#1C1917",
    surfaceVariant: "#292524",
    error: "#FCA5A5",
    onPrimary: "#1C1917",
    onSecondary: "#FFFFFF",
    onBackground: "#FAFAFA",
    onSurface: "#FAFAFA",
  },
};
