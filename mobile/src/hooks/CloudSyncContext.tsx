/**
 * CloudSync Context — condivide una singola istanza di useCloudSync
 * tra tutte le schermate (Home, Settings, Onboarding) per evitare
 * sync duplicati che bloccano il thread JS e causano lag.
 */
import React, { createContext, useContext } from "react";
import { useCloudSync } from "./useCloudSync";

type CloudSyncValue = ReturnType<typeof useCloudSync>;

const CloudSyncContext = createContext<CloudSyncValue | null>(null);

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
    const value = useCloudSync();
    return (
        <CloudSyncContext.Provider value={value}>
            {children}
        </CloudSyncContext.Provider>
    );
}

export function useCloudSyncContext(): CloudSyncValue {
    const ctx = useContext(CloudSyncContext);
    if (!ctx) {
        throw new Error(
            "useCloudSyncContext must be used within a CloudSyncProvider",
        );
    }
    return ctx;
}
