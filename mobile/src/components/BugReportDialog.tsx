import React from "react";
import { Dialog, Portal, Button, Text, TextInput, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { api } from "../shared/api";
import { mapError } from "../shared/error-map";

const BUG_CATEGORIES = [
  "UI",
  "PDF Processing",
  "Auth / Login",
  "Upload / Download",
  "Dark Mode",
  "Other",
] as const;

interface BugReportDialogProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function BugReportDialog({ visible, onDismiss }: BugReportDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<string>("Other");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setTitle("");
      setDescription("");
      setCategory("Other");
      setSending(false);
      setError(null);
      setDone(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError(t("bugReport.required"));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.createBugReport(
        `[${category}] ${title.trim()}`,
        description.trim(),
        "mobile",
      );
      setDone(true);
    } catch (err) {
      setError(mapError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{t("bugReport.title")}</Dialog.Title>
        <Dialog.Content>
          {done ? (
            <Text style={{ color: theme.colors.primary }}>
              {t("bugReport.success")}
            </Text>
          ) : (
            <>
              <TextInput
                label={t("bugReport.titleLabel")}
                value={title}
                onChangeText={setTitle}
                style={{ marginBottom: 8 }}
              />
              <TextInput
                label={t("bugReport.descriptionLabel")}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                style={{ marginBottom: 8 }}
              />
              <TextInput
                label={t("bugReport.categoryLabel")}
                value={category}
                onChangeText={setCategory}
                style={{ marginBottom: 8 }}
              />
              {error ? (
                <Text style={{ color: theme.colors.error, fontSize: 12 }}>
                  {error}
                </Text>
              ) : null}
            </>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t("common.cancel")}</Button>
          {!done && (
            <Button onPress={handleSubmit} loading={sending} disabled={sending}>
              {t("bugReport.submit")}
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}