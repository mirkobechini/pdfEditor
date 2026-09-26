import React, { useEffect, useState } from "react";
import { Dialog, Portal, Button, RadioButton, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { PrintOptions, PrintOrientation } from "../services/printService";

interface PrintOptionsDialogProps {
    visible: boolean;
    totalPages: number;
    onDismiss: () => void;
    onConfirm: (options: PrintOptions) => void;
}

/**
 * In-app print options (pages, orientation) shown before handing off to the
 * native print sheet. No color/grayscale option here — see printService.ts
 * for why that isn't achievable on-device without full page rasterization.
 */
export default function PrintOptionsDialog({ visible, totalPages, onDismiss, onConfirm }: PrintOptionsDialogProps) {
    const { t } = useTranslation();
    const [pageMode, setPageMode] = useState<"all" | "range">("all");
    const [pageRangeText, setPageRangeText] = useState("");
    const [orientation, setOrientation] = useState<PrintOrientation>("auto");

    useEffect(() => {
        if (visible) {
            setPageMode("all");
            setPageRangeText("");
            setOrientation("auto");
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
            <Dialog visible={visible} onDismiss={onDismiss}>
                <Dialog.Title>{t("viewer.printOptionsTitle")}</Dialog.Title>
                <Dialog.Content>
                    {totalPages > 1 && (
                        <>
                            <RadioButton.Group onValueChange={(val) => setPageMode(val as "all" | "range")} value={pageMode}>
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
                                    onChangeText={setPageRangeText}
                                    placeholder={t("viewer.printOptionsPagesRangePlaceholder")}
                                    testID="print-pages-range-input"
                                    style={{ marginBottom: 12 }}
                                />
                            )}
                        </>
                    )}
                    <RadioButton.Group onValueChange={(val) => setOrientation(val as PrintOrientation)} value={orientation}>
                        <RadioButton.Item label={t("viewer.printOptionsOrientationAuto")} value="auto" testID="print-orientation-auto" />
                        <RadioButton.Item label={t("viewer.printOptionsOrientationPortrait")} value="portrait" testID="print-orientation-portrait" />
                        <RadioButton.Item label={t("viewer.printOptionsOrientationLandscape")} value="landscape" testID="print-orientation-landscape" />
                    </RadioButton.Group>
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss}>{t("viewer.printOptionsCancel")}</Button>
                    <Button onPress={handleConfirm} testID="print-confirm">{t("viewer.printOptionsConfirm")}</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}
