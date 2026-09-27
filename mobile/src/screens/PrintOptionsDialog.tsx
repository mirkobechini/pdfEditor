import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { Dialog, Portal, Button, RadioButton, TextInput, IconButton, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import Pdf from "react-native-pdf";
import type { PrintOptions, PrintOrientation } from "../services/printService";
import { parsePageRangeList } from "../shared/print";

interface PrintOptionsDialogProps {
    visible: boolean;
    pdfUri: string | null;
    totalPages: number;
    onDismiss: () => void;
    onConfirm: (options: PrintOptions) => void;
}

/**
 * In-app print options (pages, orientation) shown before handing off to the
 * native print sheet. No color/grayscale option here — see printService.ts
 * for why that isn't achievable on-device without full page rasterization.
 */
export default function PrintOptionsDialog({ visible, pdfUri, totalPages, onDismiss, onConfirm }: PrintOptionsDialogProps) {
    const { t } = useTranslation();
    const { width: windowWidth } = useWindowDimensions();
    const previewWidth = Math.min(windowWidth - 110, 400);
    const [pageMode, setPageMode] = useState<"all" | "range">("all");
    const [pageRangeText, setPageRangeText] = useState("");
    const [orientation, setOrientation] = useState<PrintOrientation>("auto");
    const [previewIndex, setPreviewIndex] = useState(0);
    const [previewHeight, setPreviewHeight] = useState(previewWidth * 1.414);

    // Constrained to an index into the pages that will actually print — same
    // reasoning as desktop/web: browsing the preview should never land on a
    // page outside the chosen range.
    const selectablePages = useMemo(
        () => parsePageRangeList(pageMode === "range" ? pageRangeText : "", totalPages || 1),
        [pageMode, pageRangeText, totalPages],
    );
    const previewPage = selectablePages[Math.min(previewIndex, selectablePages.length - 1)] ?? 1;

    // react-native-pdf reloads on a new `source` object reference — memoize
    // so scrubbing through pages (which re-renders this dialog) doesn't
    // re-trigger a full reload of the document on every page change.
    const source = useMemo(() => ({ uri: pdfUri ?? "" }), [pdfUri]);

    useEffect(() => {
        if (visible) {
            setPageMode("all");
            setPageRangeText("");
            setOrientation("auto");
            setPreviewIndex(0);
        }
    }, [visible]);

    function handleConfirm() {
        onConfirm({
            pageRange: pageMode === "range" ? pageRangeText.trim() : "",
            orientation,
        });
    }

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: "85%" }}>
                <Dialog.Title>{t("viewer.printOptionsTitle")}</Dialog.Title>
                <Dialog.ScrollArea>
                    <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                        {pdfUri && (
                            <View style={{ alignItems: "center", marginBottom: 12 }}>
                                <View
                                    style={{
                                        width: previewWidth,
                                        height: previewHeight,
                                        borderRadius: 8,
                                        overflow: "hidden",
                                        borderWidth: 1,
                                        borderColor: "#ccc",
                                    }}
                                >
                                    <Pdf
                                        // react-native-pdf's singlePage mode only honors the `page`
                                        // prop at mount time — changing it afterward doesn't switch
                                        // the displayed page. Keying on the page number forces a
                                        // full remount whenever the user scrubs to a different one.
                                        key={previewPage}
                                        source={source}
                                        page={previewPage}
                                        singlePage
                                        onLoadComplete={(_n, _p, size) => setPreviewHeight(previewWidth * (size.height / size.width))}
                                        style={{ width: previewWidth, height: previewHeight }}
                                    />
                                </View>
                                {selectablePages.length > 1 && (
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                                        <IconButton
                                            icon="chevron-left"
                                            size={20}
                                            disabled={previewIndex <= 0}
                                            onPress={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                                            testID="print-preview-prev"
                                        />
                                        <Text variant="bodySmall" testID="print-preview-page-indicator">
                                            {selectablePages.length === totalPages
                                                ? `${previewPage} / ${totalPages}`
                                                : `${t("viewer.printOptionsPreviewPage")} ${previewPage} (${previewIndex + 1}/${selectablePages.length})`}
                                        </Text>
                                        <IconButton
                                            icon="chevron-right"
                                            size={20}
                                            disabled={previewIndex >= selectablePages.length - 1}
                                            onPress={() => setPreviewIndex((i) => Math.min(selectablePages.length - 1, i + 1))}
                                            testID="print-preview-next"
                                        />
                                    </View>
                                )}
                            </View>
                        )}

                        {totalPages > 1 && (
                            <View>
                                <RadioButton.Group onValueChange={(val) => { setPageMode(val as "all" | "range"); setPreviewIndex(0); }} value={pageMode}>
                                    <RadioButton.Item
                                        label={`${t("viewer.printOptionsPagesAll")} (${totalPages})`}
                                        value="all"
                                        testID="print-pages-all"
                                    />
                                    <RadioButton.Item
                                        label={t("viewer.printOptionsPagesRange")}
                                        value="range"
                                        testID="print-pages-range"
                                    />
                                </RadioButton.Group>
                                {pageMode === "range" && (
                                    <TextInput
                                        mode="outlined"
                                        value={pageRangeText}
                                        onChangeText={(v) => { setPageRangeText(v); setPreviewIndex(0); }}
                                        placeholder={t("viewer.printOptionsPagesRangePlaceholder")}
                                        testID="print-pages-range-input"
                                        style={{ marginBottom: 12 }}
                                    />
                                )}
                            </View>
                        )}
                        <RadioButton.Group onValueChange={(val) => setOrientation(val as PrintOrientation)} value={orientation}>
                            <RadioButton.Item label={t("viewer.printOptionsOrientationAuto")} value="auto" testID="print-orientation-auto" />
                            <RadioButton.Item label={t("viewer.printOptionsOrientationPortrait")} value="portrait" testID="print-orientation-portrait" />
                            <RadioButton.Item label={t("viewer.printOptionsOrientationLandscape")} value="landscape" testID="print-orientation-landscape" />
                        </RadioButton.Group>
                    </ScrollView>
                </Dialog.ScrollArea>
                <Dialog.Actions>
                    <Button onPress={onDismiss}>{t("viewer.printOptionsCancel")}</Button>
                    <Button onPress={handleConfirm} testID="print-confirm">{t("viewer.printOptionsConfirm")}</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}
