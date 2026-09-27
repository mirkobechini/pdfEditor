import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Dialog, Portal, Button, Text, RadioButton, ActivityIndicator } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { ocrPdf } from "../services/pdfService";
import type { LocalPdf } from "../shared/types";

interface OcrFlowDialogProps {
    visible: boolean;
    pdfId: string;
    pdfName: string;
    isOnline: boolean;
    onDismiss: () => void;
    onDone: (result: LocalPdf, characterCount: number, alreadySearchable: boolean) => void;
    onFailed: () => void;
}

const LANGUAGES = [
    { code: "eng", label: "English" },
    { code: "ita", label: "Italiano" },
    { code: "fra", label: "Français" },
    { code: "deu", label: "Deutsch" },
    { code: "spa", label: "Español" },
];

/** OCR requires the cloud backend's Tesseract — necessarily online-only, like compressPdf. */
export default function OcrFlowDialog({ visible, pdfId, pdfName, isOnline, onDismiss, onDone, onFailed }: OcrFlowDialogProps) {
    const { t } = useTranslation();
    const [language, setLanguage] = useState("eng");
    const [running, setRunning] = useState(false);

    useEffect(() => {
        if (visible) {
            setLanguage("eng");
            setRunning(false);
        }
    }, [visible]);

    async function handleRun() {
        setRunning(true);
        try {
            const outcome = await ocrPdf(pdfId, language);
            if (outcome) {
                onDone(outcome.pdf, outcome.characterCount, outcome.alreadySearchable);
            } else {
                onFailed();
            }
        } catch (e) {
            console.error("OCR error:", e);
            onFailed();
        } finally {
            setRunning(false);
            onDismiss();
        }
    }

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss}>
                <Dialog.Title>{t("tools.ocrTitle")}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                        {t("tools.ocrHint", { name: pdfName })}
                    </Text>

                    {!isOnline ? (
                        <Text variant="bodySmall" style={{ color: "red" }}>
                            {t("tools.ocrOffline")}
                        </Text>
                    ) : (
                        <RadioButton.Group onValueChange={setLanguage} value={language}>
                            {LANGUAGES.map((lang) => (
                                <RadioButton.Item key={lang.code} label={lang.label} value={lang.code} disabled={running} />
                            ))}
                        </RadioButton.Group>
                    )}

                    {running && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
                            <ActivityIndicator size="small" />
                            <Text variant="bodySmall">{t("tools.ocrProcessing")}</Text>
                        </View>
                    )}
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss} disabled={running}>{t("common.cancel")}</Button>
                    <Button onPress={handleRun} loading={running} disabled={running || !isOnline}>
                        {t("tools.ocrRun")}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}
