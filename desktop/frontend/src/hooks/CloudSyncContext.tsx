/**
 * CloudSyncContext — condivide UNA SINGOLA istanza di useCloudSync (a livello
 * app) tra le schermate /startup e /app (editor), evitando sync cloud
 * duplicati (doppio loader) e il lag che ne deriverebbe.
 *
 * Montato in ClientLayout dentro AuthProvider: l'instanza è unica per tutta
 * l'app.
 *
 * IMPORTANTE (timing): qui NON si usa autoSyncOnMount=true. Il sync cloud NON
 * deve partire "al boot" — a quel punto il backend sidecar non è ancora pronto
 * e il primo tentativo fallirebbe mostrando un errore rosso appena parte la
 * start-up. Il sync viene lanciato in modo esplicito nel posto giusto:
 *   - start-up → come 4° step, DOPO backend/database/api;
 *   - editor (ingresso via login) → al mount.
 * La guardia `triggerInitialSync` garantisce che il sync giri UNA SOLA volta
 * per utente (mai doppio: se è partito in start-up, l'editor non lo rilancia).
 */
import React, { createContext, useContext } from "react";
import { useCloudSync } from "./useCloudSync";
import { useAuth } from "../shared/auth";

interface CloudSyncContextValue extends ReturnType<typeof useCloudSync> {
    /**
     * Lancia il sync INIZIALE una sola volta per utente. Chiamabile dalla
     * start-up (post step 1-3) e dall'editor al mount: se già partito per lo
     * stesso utente, è un no-op. No-op anche se non autenticato.
     */
    triggerInitialSync: () => Promise<void>;
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
    const value = useCloudSync({ autoSyncOnMount: false });
    const { user } = useAuth();
    // Guardia "una sola volta per utente": evita che il sync iniziale parta
    // due volte (start-up + editor) per lo stesso accesso.
    const startedForUserIdRef = React.useRef<string | null>(null);

    const triggerInitialSync = React.useCallback(async () => {
        const userId = user?.id ?? null;
        if (!userId) return; // non autenticato: niente sync (es. ingresso via login)
        if (startedForUserIdRef.current === userId) return; // già partito
        startedForUserIdRef.current = userId;
        await value.syncAll();
    }, [user?.id, value.syncAll]);

    const contextValue = React.useMemo(
        () => ({ ...value, triggerInitialSync }),
        [value, triggerInitialSync],
    );

    return (
        <CloudSyncContext.Provider value={contextValue}>
            {children}
        </CloudSyncContext.Provider>
    );
}

export function useCloudSyncContext(): CloudSyncContextValue {
    const ctx = useContext(CloudSyncContext);
    if (!ctx) {
        throw new Error(
            "useCloudSyncContext must be used within a CloudSyncProvider",
        );
    }
    return ctx;
}