import React, {
    createContext,
    useContext,
    useCallback,
    useEffect,
    useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "onboarding_completed";

interface OnboardingContextValue {
    /** Whether onboarding is completed */
    completed: boolean;
    /** Whether we're still loading the flag from storage */
    loading: boolean;
    /** Mark onboarding as completed (persisted) */
    completeOnboarding: () => Promise<void>;
    /** Reset onboarding (for testing / dev) */
    resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [completed, setCompleted] = useState(true); // default true → skip onboarding if not loaded yet
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const val = await AsyncStorage.getItem(ONBOARDING_KEY);
                if (!cancelled) {
                    setCompleted(val === "true");
                }
            } catch {
                if (!cancelled) setCompleted(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const completeOnboarding = useCallback(async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, "true");
        setCompleted(true);
    }, []);

    const resetOnboarding = useCallback(async () => {
        await AsyncStorage.removeItem(ONBOARDING_KEY);
        setCompleted(false);
    }, []);

    return (
        <OnboardingContext.Provider
            value={{ completed, loading, completeOnboarding, resetOnboarding }}
        >
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const ctx = useContext(OnboardingContext);
    if (!ctx) throw new Error("useOnboarding must be used within an OnboardingProvider");
    return ctx;
}
