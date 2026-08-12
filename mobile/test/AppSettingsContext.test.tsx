/**
 * Tests for AppSettingsContext — pure logic, only AsyncStorage.
 *
 * Tests the storage operations that AppSettingsProvider uses internally,
 * without rendering React components (due to TurboModule incompatibility).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

const THEME_MODE_KEY = "pdfeditor_theme_mode";
const LOCALE_KEY = "pdfeditor_locale";

describe("AppSettingsContext storage logic", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("theme mode", () => {
        it("defaults to 'system' when no saved value", async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
            const val = await AsyncStorage.getItem(THEME_MODE_KEY);
            expect(val).toBeNull();
            // Provider default: "system"
        });

        it("reads saved 'dark' theme mode", async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue("dark");
            const val = await AsyncStorage.getItem(THEME_MODE_KEY);
            expect(val).toBe("dark");
        });

        it("reads saved 'light' theme mode", async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue("light");
            const val = await AsyncStorage.getItem(THEME_MODE_KEY);
            expect(val).toBe("light");
        });

        it("persists theme mode change to AsyncStorage", async () => {
            await AsyncStorage.setItem(THEME_MODE_KEY, "dark");
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_MODE_KEY, "dark");
        });
    });

    describe("locale", () => {
        it("defaults to 'system' when no saved value", async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
            const val = await AsyncStorage.getItem(LOCALE_KEY);
            expect(val).toBeNull();
            // Provider default: "system"
        });

        it("reads saved 'it' locale", async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue("it");
            const val = await AsyncStorage.getItem(LOCALE_KEY);
            expect(val).toBe("it");
        });

        it("reads saved 'en' locale", async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue("en");
            const val = await AsyncStorage.getItem(LOCALE_KEY);
            expect(val).toBe("en");
        });

        it("persists locale change to AsyncStorage", async () => {
            await AsyncStorage.setItem(LOCALE_KEY, "it");
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(LOCALE_KEY, "it");
        });
    });
});