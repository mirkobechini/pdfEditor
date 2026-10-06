/**
 * State-owned slice of useHomeScreen (issue #885, A3c - split).
 * Owns theme/layout context, shared services, PDF list state, search,
 * multi-select and the snackbar — everything that is pure state without
 * actions. Zero behavior changes; composed back by useHomeScreen.
 */
import { useState, useCallback, useMemo } from "react";
import { useTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { LocalPdf } from "../shared/types";
import { usePdfStorage } from "./usePdfStorage";
import { useAuth } from "../shared/auth";
import { useCloudSyncContext } from "./CloudSyncContext";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Main">;

/**
 * Everything useHomeScreenState exposes. Each sub-hook receives exactly the
 * subset it needs; useHomeScreen reassembles the full public shape.
 */
export interface HomeScreenStateCtx {
    theme: MD3Theme;
    insets: ReturnType<typeof useSafeAreaInsets>;
    navigation: HomeNavProp;
    t: ReturnType<typeof useTranslation>["t"];
    pickAndSavePdf: ReturnType<typeof usePdfStorage>["pickAndSavePdf"];
    loadLocalPdfs: ReturnType<typeof usePdfStorage>["loadLocalPdfs"];
    deletePdf: ReturnType<typeof useCloudSyncContext>["deletePdf"];
    uploadPdf: ReturnType<typeof useCloudSyncContext>["uploadPdf"];
    syncStatus: ReturnType<typeof useCloudSyncContext>["status"];
    syncEnabled: boolean;
    syncMode: ReturnType<typeof useCloudSyncContext>["syncMode"];
    isSyncing: boolean;
    progress: ReturnType<typeof useCloudSyncContext>["progress"];
    userId: string;
    setShowMenu: (v: boolean) => void;
    showMenu: boolean;
    snackbarMsg: string;
    snackbarVisible: boolean;
    showSnack: (msg: string) => void;
    setSnackbarVisible: (v: boolean) => void;
    pdfs: LocalPdf[];
    setPdfs: (v: LocalPdf[]) => void;
    loading: boolean;
    setLoading: (v: boolean) => void;
    refreshing: boolean;
    setRefreshing: (v: boolean) => void;
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    multiSelect: boolean;
    setMultiSelect: (v: boolean) => void;
    selectedIds: Set<string>;
    setSelectedIds: (v: Set<string>) => void;
    toggleSelect: (id: string) => void;
    enterMultiSelect: () => void;
    exitMultiSelect: () => void;
    selectAllFiltered: () => void;
    filteredPdfs: LocalPdf[];
}

export function useHomeScreenState(): HomeScreenStateCtx {
    const theme = useTheme();
    const navigation = useNavigation<HomeNavProp>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { pickAndSavePdf, loadLocalPdfs } = usePdfStorage();
    const { user } = useAuth();
    const { status: syncStatus, syncEnabled, syncMode, progress, isSyncing, deletePdf, uploadPdf } = useCloudSyncContext();
    const userId = user?.id || "";

    const [pdfs, setPdfs] = useState<LocalPdf[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [snackbarMsg, setSnackbarMsg] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [multiSelect, setMultiSelect] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    function showSnack(msg: string) {
        setSnackbarMsg(msg);
        setSnackbarVisible(true);
    }

    const filteredPdfs = useMemo(() => {
        if (!searchQuery.trim()) return pdfs;
        const q = searchQuery.toLowerCase();
        return pdfs.filter((p) => p.original_filename.toLowerCase().includes(q));
    }, [pdfs, searchQuery]);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    function enterMultiSelect() {
        setMultiSelect(true);
        setSelectedIds(new Set());
    }

    function exitMultiSelect() {
        setMultiSelect(false);
        setSelectedIds(new Set());
    }

    function selectAllFiltered() {
        setSelectedIds(new Set(filteredPdfs.map((p) => p.id)));
    }

    return {
        theme,
        insets,
        navigation,
        t,
        pickAndSavePdf,
        loadLocalPdfs,
        deletePdf,
        uploadPdf,
        syncStatus,
        syncEnabled,
        syncMode,
        isSyncing,
        progress,
        userId,
        setShowMenu,
        showMenu,
        snackbarMsg,
        snackbarVisible,
        showSnack,
        setSnackbarVisible,
        pdfs,
        setPdfs,
        loading,
        setLoading,
        refreshing,
        setRefreshing,
        searchQuery,
        setSearchQuery,
        multiSelect,
        setMultiSelect,
        selectedIds,
        setSelectedIds,
        toggleSelect,
        enterMultiSelect,
        exitMultiSelect,
        selectAllFiltered,
        filteredPdfs,
    };
}