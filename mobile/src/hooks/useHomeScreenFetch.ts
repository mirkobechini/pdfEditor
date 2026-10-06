/**
 * Fetch/refresh slice of useHomeScreen (issue #885, A3c - split).
 * Owns loadPdfs, onRefresh and the focus/sync reload effects — everything
 * that loads local PDFs and keeps them current. Zero behavior changes;
 * composed back by useHomeScreen.
 */
import { useEffect, useRef, useCallback } from "react";
import { setBadgeCountAsync } from "expo-notifications";
import { useFocusEffect } from "@react-navigation/native";
import type { HomeScreenStateCtx } from "./useHomeScreenState";

export interface HomeScreenFetchCtx {
    loadPdfs: () => Promise<void>;
    onRefresh: () => Promise<void>;
}

export function useHomeScreenFetch(
    st: HomeScreenStateCtx,
    onPdfCountChange?: (count: number) => void,
): HomeScreenFetchCtx {
    const { userId, loadLocalPdfs, setPdfs, setLoading, setRefreshing } = st;
    async function loadPdfs() {
        setLoading(true);
        try {
            const local = await loadLocalPdfs(userId);
            setPdfs(local);
            onPdfCountChange?.(local.length);
            setBadgeCountAsync(local.length).catch(() => { });
        } catch {
            setPdfs([]);
        } finally {
            setLoading(false);
        }
    }

    async function onRefresh() {
        setRefreshing(true);
        try {
            const local = await loadLocalPdfs(userId);
            setPdfs(local);
            onPdfCountChange?.(local.length);
            setBadgeCountAsync(local.length).catch(() => { });
        } catch {
            setPdfs([]);
        } finally {
            setRefreshing(false);
        }
    }

    // Reload PDFs when screen is focused (lightweight, no spinner to avoid lag).
    // Also clears the initial `loading` spinner once local PDFs are in — this
    // used to depend solely on the isSyncing effect below, which never fires
    // (leaving the screen stuck on the spinner forever) when sync never starts
    // — offline, disabled, or the sync loop just hasn't kicked in yet.
    useFocusEffect(
        useCallback(() => {
            loadLocalPdfs(userId).then((local) => {
                setPdfs(local);
                onPdfCountChange?.(local.length);
            }).catch(() => { }).finally(() => setLoading(false));
        }, [userId])
    );

    // Reload PDFs when sync completes (isSyncing goes from true to false)
    // so downloaded PDFs appear immediately instead of only on next focus
    const prevSyncingRef = useRef(st.isSyncing);
    useEffect(() => {
        if (prevSyncingRef.current && !st.isSyncing) {
            loadPdfs();
        }
        prevSyncingRef.current = st.isSyncing;
    }, [st.isSyncing]);

    // Reload PDFs as sync progresses so downloaded PDFs appear one by one
    // (progress.current advances on each upload/download step)
    const prevProgressRef = useRef(st.progress?.current ?? 0);
    useEffect(() => {
        const current = st.progress?.current ?? 0;
        if (st.isSyncing && current !== prevProgressRef.current) {
            // Lightweight reload without loading spinner (avoid flicker during sync)
            loadLocalPdfs(userId).then((local) => {
                setPdfs(local);
                onPdfCountChange?.(local.length);
            }).catch(() => { });
        }
        prevProgressRef.current = current;
    }, [st.progress, st.isSyncing]);

    return { loadPdfs, onRefresh };
}