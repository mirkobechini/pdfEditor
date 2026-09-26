import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Dialog, Portal, Button, Text, TextInput, SegmentedButtons } from "react-native-paper";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import SignaturePad, { type SignaturePadRef } from "./SignaturePad";
import PositionSelectorNative from "./PositionSelectorNative";
import { signPdf } from "../services/pdfService";
import type { LocalPdf } from "../shared/types";

interface SignFlowDialogProps {
    visible: boolean;
    pdfId: string;
    pdfName: string;
    pdfUri: string | null;
    totalPages: number;
    onDismiss: () => void;
    onSigned: (result: LocalPdf) => void;
    onFailed: () => void;
}

const PAD_WIDTH = 320;
const PAD_HEIGHT = 160;
const DEFAULT_SIGN_WIDTH = 200;
const DEFAULT_SIGN_HEIGHT = 80;

/**
 * 2-step sign flow for mobile, matching desktop/web: choose a signature
 * (draw freehand or pick from the gallery), then drag/resize its position on
 * a live preview of the target page.
 */
export default function SignFlowDialog({ visible, pdfId, pdfName, pdfUri, totalPages, onDismiss, onSigned, onFailed }: SignFlowDialogProps) {
    const { t } = useTranslation();
    const padRef = useRef<SignaturePadRef>(null);
    const [step, setStep] = useState<"choose" | "position">("choose");
    const [source, setSource] = useState<"draw" | "gallery">("draw");
    const [signatureB64, setSignatureB64] = useState<string | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [signX, setSignX] = useState(50);
    const [signY, setSignY] = useState(50);
    const [signWidth, setSignWidth] = useState(DEFAULT_SIGN_WIDTH);
    const [signHeight, setSignHeight] = useState(DEFAULT_SIGN_HEIGHT);
    const [error, setError] = useState("");
    const [signing, setSigning] = useState(false);

    useEffect(() => {
        if (visible) {
            setStep("choose");
            setSource("draw");
            setSignatureB64(null);
            setPageNumber(1);
            setSignWidth(DEFAULT_SIGN_WIDTH);
            setSignHeight(DEFAULT_SIGN_HEIGHT);
            setError("");
        }
    }, [visible]);

    async function handlePickFromGallery() {
        const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true, multiple: false });
        if (result.canceled || !result.assets?.[0]) return;
        const base64 = await readAsStringAsync(result.assets[0].uri, { encoding: EncodingType.Base64 });
        setSignatureB64(base64);
    }

    async function handleNext() {
        if (source === "draw") {
            const drawn = await padRef.current?.toPngBase64();
            if (!drawn) {
                setError(t("tools.signNoSignature"));
                return;
            }
            setSignatureB64(drawn);
        } else if (!signatureB64) {
            setError(t("tools.signNoSignature"));
            return;
        }
        setError("");
        setStep("position");
    }

    async function handleConfirm() {
        if (!signatureB64) return;
        setSigning(true);
        setError("");
        try {
            const result = await signPdf(pdfId, signatureB64, pageNumber, signX, signY, signWidth, signHeight);
            if (result) {
                onSigned(result);
            } else {
                onFailed();
            }
        } catch (e) {
            console.error("Sign error:", e);
            onFailed();
        } finally {
            setSigning(false);
            onDismiss();
        }
    }

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: "85%" }}>
                <Dialog.Title>{t("tools.signTitle")}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                        {t("tools.signHint", { name: pdfName })}
                    </Text>

                    {step === "choose" ? (
                        <View>
                            <SegmentedButtons
                                value={source}
                                onValueChange={(v) => setSource(v as "draw" | "gallery")}
                                buttons={[
                                    { value: "draw", label: t("tools.signDraw") },
                                    { value: "gallery", label: t("tools.signGallery") },
                                ]}
                                style={{ marginBottom: 12 }}
                            />
                            {source === "draw" ? (
                                <View>
                                    <SignaturePad
                                        ref={padRef}
                                        width={PAD_WIDTH}
                                        height={PAD_HEIGHT}
                                    />
                                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                                        <Button onPress={() => padRef.current?.clear()}>
                                            {t("tools.signClear")}
                                        </Button>
                                        <Button onPress={() => padRef.current?.undo()}>{t("tools.signUndo")}</Button>
                                    </View>
                                </View>
                            ) : (
                                <Button mode="outlined" onPress={handlePickFromGallery}>
                                    {signatureB64 ? t("tools.signGallery") + " ✓" : t("tools.signGallery")}
                                </Button>
                            )}
                        </View>
                    ) : (
                        <View>
                            <TextInput
                                label={t("tools.signPageLabel")}
                                value={String(pageNumber)}
                                onChangeText={(val) => setPageNumber(Math.max(1, Math.min(totalPages, parseInt(val) || 1)))}
                                mode="outlined"
                                keyboardType="numeric"
                                style={{ marginBottom: 12 }}
                            />
                            <PositionSelectorNative
                                pdfUri={pdfUri}
                                pageNumber={pageNumber}
                                boxSize={{ width: signWidth, height: signHeight }}
                                signatureImage={signatureB64}
                                onPositionChange={(x, y) => { setSignX(x); setSignY(y); }}
                                onSizeChange={(w, h) => { setSignWidth(w); setSignHeight(h); }}
                            />
                            <Text variant="bodySmall" style={{ marginTop: 6, opacity: 0.7 }}>
                                {t("tools.signPositionHint")}
                            </Text>
                        </View>
                    )}

                    {error ? (
                        <Text variant="bodySmall" style={{ color: "red", marginTop: 8 }}>
                            {error}
                        </Text>
                    ) : null}
                </Dialog.Content>
                <Dialog.Actions>
                    {step === "choose" ? (
                        <>
                            <Button onPress={onDismiss}>{t("common.cancel")}</Button>
                            <Button onPress={handleNext} disabled={source === "gallery" && !signatureB64}>
                                {t("tools.signNext")}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onPress={() => setStep("choose")}>{t("tools.signBack")}</Button>
                            <Button onPress={handleConfirm} loading={signing} disabled={signing}>
                                {t("tools.signAction")}
                            </Button>
                        </>
                    )}
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}
