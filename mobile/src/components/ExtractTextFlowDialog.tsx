import React, { useEffect, useState } from "react";
import { View, ScrollView } from "react-native";
import { Dialog, Portal, Button, Text, TextInput, ActivityIndicator, Snackbar } from "react-native-paper";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import { extractText } from "../services/pdfService";

interface ExtractTextFlowDialogProps {
    visible: boolean;
    pdfId: string;
    pdfName: string;
    isOnline: boolean;
    onDismiss: () => void;
}

/** Extract text requires the cloud backend (pdf-lib has no text extraction) — necessarily online-only, like OCR/compress. */
export default function ExtractTextFlowDialog({ visible, pdfId, pdfName, isOnline, onDismiss }: ExtractTextFlowDialogProps) {
    const { t } = useTranslation();
    const [page, setPage] = useState("");
    const [running, setRunning] = useState(false);
    const [text, setText] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (visible) {
            setPage("");
            setRunning(false);
            setText(null);
            setFailed(false);
            setCopied(false);
        }
    }, [visible]);

    async function handleRun() {
        setRunning(true);
        setFailed(false);
        setText(null);
        try {
            const pageNum = page.trim() ? parseInt(page, 10) : undefined;
            const result = await extractText(pdfId, pageNum);
            if (result) {
                setText(result.text);
            } else {
                setFailed(true);
            }
        } catch (e) {
            console.error("Extract text error:", e);
            setFailed(true);
        } finally {
            setRunning(false);
        }
    }

    async function handleCopy() {
        if (!text) return;
        await Clipboard.setStringAsync(text);
        setCopied(true);
    }

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss}>
                <Dialog.Title>{t("tools.extractTextTitle")}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                        {t("tools.extractTextHint", { name: pdfName })}
                    </Text>

                    {!isOnline ? (
                        <Text variant="bodySmall" style={{ color: "red" }}>
                            {t("tools.extractTextOffline")}
                        </Text>
                    ) : (
                        <TextInput
                            label={t("tools.extractTextPage")}
                            mode="outlined"
                            value={page}
                            onChangeText={setPage}
                            keyboardType="number-pad"
                            disabled={running}
                        />
                    )}

                    {running && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
                            <ActivityIndicator size="small" />
                            <Text variant="bodySmall">{t("tools.extractTextProcessing")}</Text>
                        </View>
                    )}

                    {failed && (
                        <Text variant="bodySmall" style={{ color: "red", marginTop: 12 }}>
                            {t("tools.extractTextFailed")}
                        </Text>
                    )}

                    {text !== null && (
                        text.trim() ? (
                            <>
                                <ScrollView style={{ maxHeight: 200, marginTop: 12 }}>
                                    <Text variant="bodySmall" selectable>{text}</Text>
                                </ScrollView>
                                <Button onPress={handleCopy} style={{ alignSelf: "flex-start", marginTop: 8 }}>
                                    {t("tools.extractTextCopy")}
                                </Button>
                            </>
                        ) : (
                            <Text variant="bodySmall" style={{ marginTop: 12 }}>
                                {t("tools.extractTextEmpty")}
                            </Text>
                        )
                    )}
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss} disabled={running}>{t("common.cancel")}</Button>
                    <Button onPress={handleRun} loading={running} disabled={running || !isOnline}>
                        {t("tools.extractTextRun")}
                    </Button>
                </Dialog.Actions>
            </Dialog>
            <Snackbar visible={copied} onDismiss={() => setCopied(false)} duration={2000}>
                {t("tools.extractTextCopied")}
            </Snackbar>
        </Portal>
    );
}
