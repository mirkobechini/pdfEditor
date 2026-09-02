import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Portal, Text, TextInput, Button, Checkbox, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { api } from "../shared/api";
import type { PdfDocument } from "../shared/types";

interface ReplaceTextDialogProps {
    visible: boolean;
    onClose: () => void;
    pdfId: string | null;
    onSuccess?: (doc: PdfDocument) => void;
}

export default function ReplaceTextDialog({
    visible,
    onClose,
    pdfId,
    onSuccess,
}: ReplaceTextDialogProps) {
    const { t } = useTranslation("replaceTextDialog");
    const theme = useTheme();
    const [search, setSearch] = useState("");
    const [replaceWith, setReplaceWith] = useState("");
    const [replaceAll, setReplaceAll] = useState(true);
    const [replacing, setReplacing] = useState(false);
    const [error, setError] = useState("");
    const [outputName, setOutputName] = useState("");

    async function handleReplace() {
        if (!pdfId || !search.trim()) return;
        setReplacing(true);
        setError("");
        try {
            const occurrence = replaceAll ? undefined : 1;
            const result = await api.replaceText(
                pdfId,
                search,
                replaceWith,
                occurrence,
                outputName.trim() || undefined,
            );
            setSearch("");
            setReplaceWith("");
            onClose();
            onSuccess?.(result);
        } catch (err) {
            setError(
                t("replaceFailed") +
                ": " +
                (err instanceof Error ? err.message : String(err)),
            );
        } finally {
            setReplacing(false);
        }
    }

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onClose}
                contentContainerStyle={[
                    styles.container,
                    { backgroundColor: theme.colors.surface },
                ]}
            >
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                    {t("title")}
                </Text>

                <TextInput
                    label={t("searchLabel")}
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t("searchPlaceholder")}
                    mode="outlined"
                    style={styles.input}
                />

                <TextInput
                    label={t("replaceLabel")}
                    value={replaceWith}
                    onChangeText={setReplaceWith}
                    placeholder={t("replacePlaceholder")}
                    mode="outlined"
                    style={styles.input}
                />

                <View style={styles.checkboxRow}>
                    <Checkbox
                        status={replaceAll ? "checked" : "unchecked"}
                        onPress={() => setReplaceAll(!replaceAll)}
                    />
                    <Text
                        style={{ color: theme.colors.onSurface }}
                        onPress={() => setReplaceAll(!replaceAll)}
                    >
                        {t("replaceAllLabel")}
                    </Text>
                </View>

                {error ? (
                    <Text style={styles.error}>{error}</Text>
                ) : null}

                <TextInput
                    label={t("outputName")}
                    value={outputName}
                    onChangeText={setOutputName}
                    placeholder="replaced.pdf"
                    mode="outlined"
                    style={styles.input}
                />
                <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
                    {t("outputNameHint")}
                </Text>

                <View style={styles.buttons}>
                    <Button mode="outlined" onPress={onClose} style={styles.button}>
                        {t("cancel")}
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleReplace}
                        disabled={replacing || !search.trim()}
                        loading={replacing}
                        style={styles.button}
                    >
                        {replacing ? t("replacing") : t("replace")}
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: {
        margin: 24,
        padding: 24,
        borderRadius: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 16,
    },
    input: {
        marginBottom: 12,
    },
    checkboxRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    error: {
        color: "#B00020",
        fontSize: 13,
        marginBottom: 12,
    },
    hint: {
        fontSize: 12,
        marginBottom: 16,
    },
    buttons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
    },
    button: {
        minWidth: 100,
    },
});
