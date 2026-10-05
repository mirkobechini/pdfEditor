import React from "react";
import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { useTranslation } from "react-i18next";
import type { ToolsScreenState } from "../hooks/useToolsScreen";

/** Tool-selection toolbar header (issue #885, A3a - step 3). */
export default function ToolsToolbar({ s }: { s: ToolsScreenState }) {
    const { t } = useTranslation();
    const theme = s.theme;

    return (
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
                    testID="tool-sign"
                    buttonColor={s.operation === "sign" ? theme.colors.primary : undefined}
                    textColor={s.operation === "sign" ? "#fff" : theme.colors.primary}
                    onPress={() => { s.setOperation("sign"); s.setSelectedIds([]); }}
                >
                    {t("tools.sign")}
                </Button>
                <Button
                    mode={s.operation === "annotate" ? "contained" : "outlined"}
                    compact
                    testID="tool-annotate"
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
    );
}