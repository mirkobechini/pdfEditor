import React, { useEffect, useState } from "react";
import { View, Share } from "react-native";
import { Dialog, Portal, Button, Text, TextInput, IconButton, ActivityIndicator } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { createShareLink, listShareLinks, revokeShareLink } from "../services/shareService";
import type { ShareLink } from "../shared/api";

interface ShareFlowDialogProps {
    visible: boolean;
    pdfId: string;
    pdfName: string;
    isOnline: boolean;
    onDismiss: () => void;
}

/**
 * Share-via-link flow for mobile — distinct from the OS share sheet already
 * used elsewhere (expo-sharing, for sending the local file itself). This
 * creates a public link served by the backend, same as desktop/web.
 */
export default function ShareFlowDialog({ visible, pdfId, pdfName, isOnline, onDismiss }: ShareFlowDialogProps) {
    const { t } = useTranslation();
    const [links, setLinks] = useState<ShareLink[]>([]);
    const [password, setPassword] = useState("");
    const [expiresInDays, setExpiresInDays] = useState("");
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (visible && isOnline) {
            setError("");
            setPassword("");
            setExpiresInDays("");
            loadLinks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, isOnline]);

    async function loadLinks() {
        setLoading(true);
        try {
            const res = await listShareLinks(pdfId);
            setLinks(res);
        } catch (e) {
            setError(t("tools.shareLoadFailed"));
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        setCreating(true);
        setError("");
        try {
            const expires = expiresInDays ? parseInt(expiresInDays, 10) : undefined;
            const link = await createShareLink(pdfId, password.trim() || undefined, expires);
            setLinks((prev) => [link, ...prev]);
            setPassword("");
            setExpiresInDays("");
        } catch (e) {
            setError(t("tools.shareCreateFailed"));
        } finally {
            setCreating(false);
        }
    }

    async function handleRevoke(token: string) {
        try {
            await revokeShareLink(pdfId, token);
            setLinks((prev) => prev.filter((l) => l.token !== token));
        } catch (e) {
            setError(t("tools.shareRevokeFailed"));
        }
    }

    function handleShareLink(url: string) {
        Share.share({ message: url });
    }

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={{ maxHeight: "85%" }}>
                <Dialog.Title>{t("tools.shareTitle")}</Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                        {t("tools.shareHint", { name: pdfName })}
                    </Text>

                    {!isOnline ? (
                        <Text variant="bodySmall" style={{ color: "red" }}>
                            {t("tools.shareOffline")}
                        </Text>
                    ) : (
                        <>
                            <TextInput
                                label={t("tools.sharePasswordOptional")}
                                value={password}
                                onChangeText={setPassword}
                                mode="outlined"
                                secureTextEntry
                                style={{ marginBottom: 8 }}
                            />
                            <TextInput
                                label={t("tools.shareExpiresOptional")}
                                value={expiresInDays}
                                onChangeText={setExpiresInDays}
                                mode="outlined"
                                keyboardType="numeric"
                                style={{ marginBottom: 8 }}
                            />
                            <Button mode="outlined" onPress={handleCreate} loading={creating} disabled={creating}>
                                {t("tools.shareCreate")}
                            </Button>

                            {loading ? (
                                <ActivityIndicator style={{ marginTop: 12 }} />
                            ) : (
                                <View style={{ marginTop: 12 }}>
                                    {links.map((link) => (
                                        <View key={link.token} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
                                            <Text variant="bodySmall" numberOfLines={1} style={{ flex: 1 }}>
                                                {link.url}
                                            </Text>
                                            <IconButton icon="share-variant" size={18} onPress={() => handleShareLink(link.url)} />
                                            <IconButton icon="delete" size={18} onPress={() => handleRevoke(link.token)} />
                                        </View>
                                    ))}
                                </View>
                            )}
                        </>
                    )}

                    {error ? (
                        <Text variant="bodySmall" style={{ color: "red", marginTop: 8 }}>
                            {error}
                        </Text>
                    ) : null}
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss}>{t("common.close")}</Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
}
