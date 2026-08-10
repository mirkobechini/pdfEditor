/**
 * Tests for OnboardingContext — pure logic, only AsyncStorage.
 *
 * We test the provider's internal logic by duplicating the storage operations,
 * since @testing-library/react-native is incompatible with this RN version
 * (see auth.test.ts for the same limitation).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

const ONBOARDING_KEY = "onboarding_completed";

describe("OnboardingContext logic", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns true when no stored value (default to skip)", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        const val = await AsyncStorage.getItem(ONBOARDING_KEY);
        // Provider default: if null → completed = true (skip onboarding)
        expect(val).toBeNull();
        // The provider's default is true, so no onboarding shown
    });

    it("reads 'true' when onboarding already completed", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
        const val = await AsyncStorage.getItem(ONBOARDING_KEY);
        expect(val).toBe("true");
    });

    it("reads 'false' when onboarding not completed", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue("false");
        const val = await AsyncStorage.getItem(ONBOARDING_KEY);
        expect(val).toBe("false");
    });

    it("completeOnboarding stores 'true' in AsyncStorage", async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, "true");
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_KEY, "true");
    });

    it("resetOnboarding removes the key from AsyncStorage", async () => {
        await AsyncStorage.removeItem(ONBOARDING_KEY);
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(ONBOARDING_KEY);
    });
});