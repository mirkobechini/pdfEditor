import React from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { Text, useTheme, ActivityIndicator, Portal, Modal, Button, List, Dialog, TextInput, Searchbar, Snackbar, IconButton, FAB } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useHomeScreen } from "../hooks/useHomeScreen";
import DeleteSyncDialog from "./DeleteSyncDialog";
import ReplaceTextDialog from "../components/ReplaceTextDialog";
import PdfListItem from "../components/PdfListItem";

interface HomeScreenProps {
    onPdfCountChange?: (count: number) => void;
}

export default function HomeScreen({ onPdfCountChange }: HomeScreenProps) {
    const theme = useTheme();
    const { t } = useTranslation();
    const s = useHomeScreen({ onPdfCountChange });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["bottom"]}>
            {/* Search bar + multi-select / tools actions */}
            <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                <Searchbar
                    placeholder={t("home.search")}
                    value={s.searchQuery}
                    onChangeText={s.setSearchQuery}
                    style={{ flex: 1, margin: 16, marginBottom: 0 }}
                />
                {s.pdfs.length > 0 && !s.multiSelect ? (
                    <IconButton icon="checkbox-multiple-marked-outline" onPress={s.enterMultiSelect} />
                ) : s.pdfs.length > 0 && s.multiSelect ? (
                    <IconButton icon="close" onPress={s.exitMultiSelect} />
                ) : null}
                {!s.multiSelect && (
                    <IconButton icon="wrench" onPress={s.goToTools} />
                )}
            </View>

            {/* Sync progress banner */}
            {s.isSyncing && s.progress && (
                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 4, gap: 8 }}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                        Sync in corso... ({s.progress.current}/{s.progress.total})
                    </Text>
                </View>
            )}

            {s.loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" />
                </View>
            ) : s.pdfs.length === 0 ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center" }}>
                        {t("home.noPdfs")}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={s.filteredPdfs}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16 }}
                    refreshControl={<RefreshControl refreshing={s.refreshing} onRefresh={s.onRefresh} />}
                    renderItem={({ item }) => (
                        <PdfListItem
                            item={item}
                            isSelected={s.selectedIds.has(item.id)}
                            multiSelect={s.multiSelect}
                            syncEnabled={s.syncEnabled}
                            syncStatus={s.syncStatus[item.id]}
                            onPress={s.handleItemPress}
                            onLongPress={s.handleItemLongPress}
                            onToggleSelect={s.toggleSelect}
                            onDelete={s.handleDelete}
                        />
                    )}
                />
            )}

            {/* Multi-select action bar OR FAB */}
            {s.multiSelect ? (
                <View style={{ position: "absolute", right: 0, left: 0, bottom: 0, backgroundColor: theme.colors.primaryContainer, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 8 + s.insets.bottom }}>
                    <Text style={{ color: theme.colors.onPrimaryContainer, fontWeight: "600" }}>
                        {t("home.selected", { count: s.selectedIds.size })}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        <Button textColor={theme.colors.onPrimaryContainer} onPress={s.selectAllFiltered}>
                            {t("home.selectAll")}
                        </Button>
                        <Button textColor={theme.colors.error} onPress={s.handleBatchDelete} disabled={s.selectedIds.size === 0}>
                            {t("home.delete")}
                        </Button>
                        <Button textColor={theme.colors.onPrimaryContainer} onPress={s.exitMultiSelect}>
                            {t("common.cancel")}
                        </Button>
                    </View>
                </View>
            ) : (
                <FAB
                    icon="plus"
                    style={{
                        position: "absolute",
                        right: 16,
                        bottom: 16 + s.insets.bottom,
                        backgroundColor: theme.colors.primary,
                    }}
                    color={theme.colors.onPrimary}
                    onPress={() => s.setShowMenu(true)}
                />
            )}

            {/* Add PDF menu */}
            <Portal>
                <Modal visible={s.showMenu} onDismiss={() => s.setShowMenu(false)} contentContainerStyle={{ backgroundColor: theme.colors.surface, margin: 24, borderRadius: 12 }}>
                    <List.Section>
                        <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                            {t("home.addPdf")}
                        </List.Subheader>
                        <List.Item
                            title={t("home.upload")}
                            description={t("home.uploadDesc")}
                            left={(props) => <List.Icon {...props} icon="file-upload" />}
                            onPress={s.handleUpload}
                        />
                        <List.Item
                            title={t("home.scan")}
                            description={t("home.scanDesc")}
                            left={(props) => <List.Icon {...props} icon="camera" />}
                            onPress={s.goToScanner}
                        />
                    </List.Section>
                </Modal>
            </Portal>

            {/* Context menu — long press on PDF */}
            <Portal>
                <Dialog visible={s.contextPdf !== null && !s.renameDialog} onDismiss={() => s.setContextPdf(null)}>
                    <Dialog.Title>{s.contextPdf?.original_filename}</Dialog.Title>
                    <Dialog.Content>
                        <List.Item title={t("home.rename")} left={(p) => <List.Icon {...p} icon="pencil" />} onPress={() => { if (s.contextPdf) s.openRename(s.contextPdf); }} />
                        <List.Item title={t("home.share")} left={(p) => <List.Icon {...p} icon="share-variant" />} onPress={() => { if (s.contextPdf) s.handleShare(s.contextPdf); }} />
                        <List.Item title={t("home.download")} left={(p) => <List.Icon {...p} icon="download" />} onPress={() => { if (s.contextPdf) s.handleDownload(s.contextPdf); }} />
                        {s.syncEnabled && s.contextPdf && s.contextPdf.cloud_synced === 1 ? (
                            <List.Item title={t("home.removeFromCloud")} left={(p) => <List.Icon {...p} icon="cloud-remove" />} onPress={() => { if (s.contextPdf) s.handleRemoveFromCloud(s.contextPdf); }} />
                        ) : s.syncEnabled && s.contextPdf && s.contextPdf.cloud_synced !== 1 && s.contextPdf.cloud_synced_exclude !== 1 ? (
                            <List.Item title={t("home.syncToCloud")} left={(p) => <List.Icon {...p} icon="cloud-upload" />} onPress={() => { if (s.contextPdf) s.handleSyncToCloud(s.contextPdf); }} />
                        ) : null}
                        {s.syncEnabled && s.contextPdf && (
                            <List.Item title={(s.contextPdf!.cloud_synced_exclude === 1 ? t("home.includeInSync") : t("home.excludeFromSync"))} left={(p) => <List.Icon {...p} icon={s.contextPdf!.cloud_synced_exclude === 1 ? "cloud-sync" : "cloud-off-outline"} />} onPress={() => { if (s.contextPdf) s.handleToggleSyncExclude(s.contextPdf); }} />
                        )}
                        <List.Item title={t("home.delete")} left={(p) => <List.Icon {...p} icon="delete" />} onPress={() => s.contextPdf && s.handleDelete(s.contextPdf)} />
                        <List.Item title={t("home.details")} left={(p) => <List.Icon {...p} icon="information" />} onPress={() => { if (s.contextPdf) s.openDetails(s.contextPdf); }} />
                        <List.Item title={t("home.replaceText")} left={(p) => <List.Icon {...p} icon="text-search" />} onPress={() => { if (s.contextPdf) s.openReplaceText(s.contextPdf); }} />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => s.setContextPdf(null)}>{t("common.close")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Rename dialog */}
            <Portal>
                <Dialog visible={s.renameDialog} onDismiss={() => s.setRenameDialog(false)}>
                    <Dialog.Title>{t("home.renameTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            key={s.renameTarget?.id || "rename"}
                            label={t("home.fileName")}
                            defaultValue={s.renameText}
                            onChangeText={s.setRenameText}
                            mode="outlined"
                            autoFocus
                            onSubmitEditing={s.confirmRename}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => s.setRenameDialog(false)}>{t("common.cancel")}</Button>
                        <Button onPress={s.confirmRename}>{t("home.rename")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Details dialog */}
            <Portal>
                <Dialog visible={s.detailsPdf !== null} onDismiss={() => s.setDetailsPdf(null)}>
                    <Dialog.Title>{t("home.detailsTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>{t("home.detailsName")}: </Text>{s.detailsPdf?.original_filename}</Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>{t("home.detailsSize")}: </Text>{s.detailsPdf ? s.formatSize(s.detailsPdf.file_size) : ""}</Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>{t("home.detailsPages")}: </Text>{s.detailsPdf?.page_count}</Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}><Text style={{ fontWeight: "700" }}>{t("home.detailsCreated")}: </Text>{s.detailsPdf ? new Date(s.detailsPdf.created_at).toLocaleDateString() : ""}</Text>
                        <Text variant="bodyMedium"><Text style={{ fontWeight: "700" }}>{t("home.detailsUpdated")}: </Text>{s.detailsPdf ? new Date(s.detailsPdf.updated_at).toLocaleDateString() : ""}</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => s.setDetailsPdf(null)}>{t("common.close")}</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <ReplaceTextDialog
                visible={s.replaceTextPdf !== null}
                onClose={() => s.setReplaceTextPdf(null)}
                pdfId={s.replaceTextPdf?.id ?? null}
                onSuccess={() => {
                    s.setReplaceTextPdf(null);
                    s.loadPdfs();
                }}
            />

            <Snackbar
                visible={s.snackbarVisible}
                onDismiss={() => s.setSnackbarVisible(false)}
                duration={3000}
                action={{ label: t("common.ok"), onPress: () => s.setSnackbarVisible(false) }}
            >
                {s.snackbarMsg}
            </Snackbar>

            <DeleteSyncDialog
                visible={s.deleteTarget !== null}
                pdfName={s.deleteTarget?.original_filename || ""}
                onDismiss={() => s.setDeleteTarget(null)}
                onDelete={s.handleDeleteSync}
            />

            {/* Sync after upload dialog */}
            <Portal>
                <Dialog visible={s.syncAfterUpload !== null} onDismiss={() => { s.setSyncAfterUpload(null); }}>
                    <Dialog.Title>{t("home.syncAfterUploadTitle")}</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                            {t("home.syncAfterUploadDesc", { name: s.syncAfterUpload?.pdfName || "" })}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={s.handleSyncAfterUploadNo}>
                            {t("common.no")}
                        </Button>
                        <Button onPress={s.handleSyncAfterUploadYes}>
                            {t("common.yes")}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </SafeAreaView>
    );
}