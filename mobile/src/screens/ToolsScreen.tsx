import React from "react";
import { View, FlatList } from "react-native";
import { Text, Button, useTheme, ActivityIndicator, Portal, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useTranslation } from "react-i18next";
import { useToolsScreen } from "../hooks/useToolsScreen";
import SignFlowDialog from "../components/SignFlowDialog";
import AnnotationFlowDialog from "../components/AnnotationFlowDialog";
import OcrFlowDialog from "../components/OcrFlowDialog";
import ShareFlowDialog from "../components/ShareFlowDialog";
import ToolsPdfListItem from "../components/ToolsPdfListItem";
import ToolsDialogs from "../components/ToolsDialogs";

type ToolsNavProp = NativeStackNavigationProp<RootStackParamList, "Tools">;

export default function ToolsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<ToolsNavProp>();
    void navigation;
    const s = useToolsScreen();
    const { t } = useTranslation();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceVariant }}>
                <Text variant="titleMedium" style={{ marginBottom: 12 }}>{t("tools.title")}</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Button
                        mode={s.operation === "merge" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "merge" ? theme.colors.primary : undefined}
                        textColor={s.operation === "merge" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("merge"); s.setSelectedIds([]); }}
                    >
                        {t("tools.merge")}
                    </Button>
                    <Button
                        mode={s.operation === "split" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "split" ? theme.colors.primary : undefined}
                        textColor={s.operation === "split" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("split"); s.setSelectedIds([]); }}
                    >
                        {t("tools.split")}
                    </Button>
                    <Button
                        mode={s.operation === "compress" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "compress" ? theme.colors.primary : undefined}
                        textColor={s.operation === "compress" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("compress"); s.setSelectedIds([]); }}
                    >
                        {t("tools.compress")}
                    </Button>
                    <Button
                        mode={s.operation === "reorder" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "reorder" ? theme.colors.primary : undefined}
                        textColor={s.operation === "reorder" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("reorder"); s.setSelectedIds([]); }}
                    >
                        {t("tools.reorder")}
                    </Button>
                    <Button
                        mode={s.operation === "remove" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "remove" ? theme.colors.primary : undefined}
                        textColor={s.operation === "remove" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("remove"); s.setSelectedIds([]); }}
                    >
                        {t("tools.remove")}
                    </Button>
                    <Button
                        mode={s.operation === "metadata" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "metadata" ? theme.colors.primary : undefined}
                        textColor={s.operation === "metadata" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("metadata"); s.setSelectedIds([]); }}
                    >
                        {t("tools.metadata")}
                    </Button>
                    <Button
                        mode={s.operation === "protect" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "protect" ? theme.colors.primary : undefined}
                        textColor={s.operation === "protect" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("protect"); s.setSelectedIds([]); }}
                    >
                        {t("tools.password")}
                    </Button>
                    <Button
                        mode={s.operation === "unlock" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "unlock" ? theme.colors.primary : undefined}
                        textColor={s.operation === "unlock" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("unlock"); s.setSelectedIds([]); }}
                    >
                        {t("tools.unlock")}
                    </Button>
                    <Button
                        mode={s.operation === "sign" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "sign" ? theme.colors.primary : undefined}
                        textColor={s.operation === "sign" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("sign"); s.setSelectedIds([]); }}
                    >
                        {t("tools.sign")}
                    </Button>
                    <Button
                        mode={s.operation === "annotate" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "annotate" ? theme.colors.primary : undefined}
                        textColor={s.operation === "annotate" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("annotate"); s.setSelectedIds([]); }}
                    >
                        {t("tools.annotate")}
                    </Button>
                    <Button
                        mode={s.operation === "ocr" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "ocr" ? theme.colors.primary : undefined}
                        textColor={s.operation === "ocr" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("ocr"); s.setSelectedIds([]); }}
                    >
                        {t("tools.ocr")}
                    </Button>
                    <Button
                        mode={s.operation === "share" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "share" ? theme.colors.primary : undefined}
                        textColor={s.operation === "share" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("share"); s.setSelectedIds([]); }}
                    >
                        {t("tools.share")}
                    </Button>
                    <Button
                        mode={s.operation === "import" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "import" ? theme.colors.primary : undefined}
                        textColor={s.operation === "import" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("import"); s.setSelectedIds([]); }}
                    >
                        {t("tools.import")}
                    </Button>
                    <Button
                        mode={s.operation === "export" ? "contained" : "outlined"}
                        compact
                        buttonColor={s.operation === "export" ? theme.colors.primary : undefined}
                        textColor={s.operation === "export" ? "#fff" : theme.colors.primary}
                        onPress={() => { s.setOperation("export"); s.setSelectedIds([]); }}
                    >
                        {t("tools.export")}
                    </Button>
                </View>
            </View>

            {s.operation === "merge" && s.selectedIds.length >= 2 && (
                <View style={{ padding: 16 }}>
                    <Button mode="contained" onPress={s.handleMerge} loading={s.loading} disabled={s.loading}>
                        {t("tools.mergeAction", { count: s.selectedIds.length })}
                    </Button>
                </View>
            )}

            {s.result ? (
                <Portal>
                    <Snackbar
                        visible={s.snackbarVisible}
                        onDismiss={() => s.setSnackbarVisible(false)}
                        duration={3000}
                        action={{ label: t("common.ok"), onPress: () => s.setSnackbarVisible(false) }}
                    >
                        {s.result}
                    </Snackbar>
                </Portal>
            ) : null}

            {!s.operation ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                        {t("tools.selectTool")}
                    </Text>
                </View>
            ) : s.loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    data={s.pdfs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <ToolsPdfListItem
                            item={item}
                            isSelected={s.selectedIds.includes(item.id)}
                            onPress={s.handleItemPress}
                        />
                    )}
                />
            )}


            {/* Sign flow — choose signature (draw/gallery) then position it */}
            {s.signDialog && (
                <SignFlowDialog
                    visible={s.signDialog !== null}
                    pdfId={s.signDialog.pdfId}
                    pdfName={s.signDialog.pdfName}
                    pdfUri={s.signDialog.pdfUri}
                    totalPages={s.signDialog.totalPages}
                    onDismiss={() => s.setSignDialog(null)}
                    onSigned={s.handleSigned}
                    onFailed={s.handleSignFailed}
                />
            )}

            {/* Annotation flow — choose type/color/page then position it */}
            {s.annotationDialog && (
                <AnnotationFlowDialog
                    visible={s.annotationDialog !== null}
                    pdfId={s.annotationDialog.pdfId}
                    pdfName={s.annotationDialog.pdfName}
                    pdfUri={s.annotationDialog.pdfUri}
                    totalPages={s.annotationDialog.totalPages}
                    onDismiss={() => s.setAnnotationDialog(null)}
                    onSaved={s.handleAnnotationSaved}
                    onFailed={s.handleAnnotationFailed}
                />
            )}

            {/* OCR — cloud-only, disabled offline */}
            {s.ocrDialog && (
                <OcrFlowDialog
                    visible={s.ocrDialog !== null}
                    pdfId={s.ocrDialog.pdfId}
                    pdfName={s.ocrDialog.pdfName}
                    isOnline={s.isOnline}
                    onDismiss={() => s.setOcrDialog(null)}
                    onDone={s.handleOcrDone}
                    onFailed={s.handleOcrFailed}
                />
            )}

            {/* Share via link — cloud-only, disabled offline */}
            {s.shareDialog && (
                <ShareFlowDialog
                    visible={s.shareDialog !== null}
                    pdfId={s.shareDialog.pdfId}
                    pdfName={s.shareDialog.pdfName}
                    isOnline={s.isOnline}
                    onDismiss={() => s.setShareDialog(null)}
                />
            )}

            {/* All remaining modal dialogs (split/reorder/remove/metadata/compress/import-export/password/name/rename) */}
            <ToolsDialogs s={s} />
        </SafeAreaView>
    );
}
