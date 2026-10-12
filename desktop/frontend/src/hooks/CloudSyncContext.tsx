/**
 * CloudSyncContext — condivide UNA SINGOLA istanza di useCloudSync (a livello
 * app) tra le schermate /startup e /app (editor), evitando sync cloud
 * duplicati (doppio loader) e il lag che ne deriverebbe.
 *
 * Montato in ClientLayout dentro AuthProvider: l'instanza è unica per tutta
 * l'app. autoSyncOnMount=true fa girare l'auto-sync una sola volta al boot.
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