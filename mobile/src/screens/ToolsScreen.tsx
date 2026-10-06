import React from "react";
import { View } from "react-native";
import { Button, useTheme, Portal, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useToolsScreen } from "../hooks/useToolsScreen";
import SignFlowDialog from "../components/SignFlowDialog";
import AnnotationFlowDialog from "../components/AnnotationFlowDialog";
import OcrFlowDialog from "../components/OcrFlowDialog";
import ShareFlowDialog from "../components/ShareFlowDialog";
import ToolsToolbar from "../components/ToolsToolbar";
import ToolsListContent from "../components/ToolsListContent";
import ToolsDialogs from "../components/ToolsDialogs";

export default function ToolsScreen() {
    const theme = useTheme();
    const s = useToolsScreen();
    const { t } = useTranslation();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            <ToolsToolbar s={s} />

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

            <ToolsListContent s={s} />

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