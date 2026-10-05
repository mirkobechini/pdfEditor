import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, ScrollView, useWindowDimensions } from "react-native";
import { Dialog, Portal, Button, Text, TextInput, RadioButton } from "react-native-paper";
import { useTranslation } from "react-i18next";
import PositionSelectorNative from "./PositionSelectorNative";
import { addAnnotation } from "../services/pdfService";
import type { LocalPdf } from "../shared/types";

interface AnnotationFlowDialogProps {
    visible: boolean;
    pdfId: string;
    pdfName: string;
    pdfUri: string;
    totalPages: number;
    onDismiss: () => void;
    onSaved: (result: LocalPdf) => void;
    onFailed: () => void;
}

const ANNOTATION_TYPES = ["highlight", "underline", "strikeout", "text", "free_text"] as const;
const COLORS = ["#FFFF00", "#FF0000", "#00A651", "#0066FF", "#FF8800", "#000000"];
const DEFAULT_BOX_WIDTH = 200;
const DEFAULT_BOX_HEIGHT = 100;

/**
 * Annotation flow for mobile: choose type/color/page, drag the box to
 * position it (reusing PositionSelectorNative, same component the sign flow
 * uses), and — for text annotations — type the content.
 */
export default function AnnotationFlowDialog({ visible, pdfId, pdfName, pdfUri, totalPages, onDismiss, onSaved, onFailed }: AnnotationFlowDialogProps) {
    const { t } = useTranslation();
    // See SignFlowDialog for why this accounts for the Dialog's own insets.
    const { width: windowWidth } = useWindowDimensions();
    const contentWidth = Math.min(windowWidth - 110, 400);
    const [type, setType] = useState<(typeof ANNOTATION_TYPES)[number]>("highlight");
    const [color, setColor] = useState(COLORS[0]);
    const [content, setContent] = useState("");
    const [page, setPage] = useState(1);
    const [rectX, setRectX] = useState(50);
    const [rectY, setRectY] = useState(50);
    const [rectWidth, setRectWidth] = useState(DEFAULT_BOX_WIDTH);
    const [rectHeight, setRectHeight] = useState(DEFAULT_BOX_HEIGHT);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (visible) {
            setType("highlight");
            setColor(COLORS[0]);
            setContent("");
            setPage(1);
            setError("");
        }
    }, [visible]);

    async function handleSave() {
        setSaving(true);
        setError("");
        try {
            const rect = [rectX, rectY, rectX + rectWidth, rectY + rectHeight];
            const result = await addAnnotation(pdfId, {
                page,
                type,
                rect,
                color,
                content: content.trim() || null,
                opacity: 0.3,
            });
            if (result) {
                onSaved(result);
            } else {
                onFailed();
            }
        } catch (e) {
            console.error("Annotation error:", e);
            onFailed();
        } finally {
            setSaving(false);
            onDismiss();
        }
    }

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: "85%" }}>
                <Dialog.Title>{t("tools.annotationTitle")}</Dialog.Title>
                <Dialog.ScrollArea>
                    <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                        <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                            {t("tools.annotationHint", { name: pdfName })}
                        </Text>

                        <Text variant="bodySmall" style={{ marginBottom: 6 }}>{t("tools.annotationType")}</Text>
                        <RadioButton.Group onValueChange={(v) => setType(v as (typeof ANNOTATION_TYPES)[number])} value={type}>
                            {ANNOTATION_TYPES.map((tp) => (
                                <RadioButton.Item key={tp} label={t(`tools.annotationType_${tp}`)} value={tp} testID={`annotation-type-${tp}`} />
                            ))}
                        </RadioButton.Group>

                        <Text variant="bodySmall" style={{ marginBottom: 6 }}>{t("tools.annotationColor")}</Text>
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                            {COLORS.map((c) => (
                                <TouchableOpacity
                                    key={c}
                                    testID={`annotation-color-${c}`}
                                    onPress={() => setColor(c)}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: c,
                                        borderWidth: color === c ? 3 : 1,
                                        borderColor: color === c ? "#f7871f" : "#ccc",
                                    }}
                                />
                            ))}
                        </View>

                        <TextInput
                            label={t("tools.signPageLabel")}
                            value={String(page)}
                            onChangeText={(val) => setPage(Math.max(1, Math.min(totalPages, parseInt(val) || 1)))}
                            mode="outlined"
                            keyboardType="numeric"
                            style={{ marginBottom: 12 }}
                        />

                        <PositionSelectorNative
                            pdfUri={pdfUri}
                            pageNumber={page}
                            boxSize={{ width: DEFAULT_BOX_WIDTH, height: DEFAULT_BOX_HEIGHT }}
                            onPositionChange={(x, y) => { setRectX(x); setRectY(y); }}
                            onSizeChange={(w, h) => { setRectWidth(w); setRectHeight(h); }}
                            previewWidth={contentWidth}
                        />

                        {(type === "text" || type === "free_text") && (
                            <TextInput
                                label={t("tools.annotationContent")}
                                value={content}
                                onChangeText={setContent}
                                mode="outlined"
                                multiline
                                numberOfLines={3}
                                style={{ marginTop: 12 }}
                            />
                        )}

                        {error ? (
                            <Text variant="bodySmall" style={{ color: "red", marginTop: 8 }}>
                                {error}
                            </Text>
                        ) : null}
                    </ScrollView>
                </Dialog.ScrollArea>
                <Dialog.Actions>
                    <Button onPress={onDismiss}>{t("common.cancel")}</Button>
                    <Button testID="annotation-save" onPress={handleSave} loading={saving} disabled={saving}>
                        {t("tools.annotationSave")}
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}
