import { useState, useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  savePdfLocally,
  getLocalPdfs,
  deleteLocalPdf,
  getLocalPdfById,
} from "../services/localDb";
import type { LocalPdf } from "../shared/types";

const PDF_DIR = `${FileSystem.documentDirectory}pdfs/`;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function usePdfStorage() {
  const [loading, setLoading] = useState(false);

  const pickAndSavePdf = useCallback(async (): Promise<LocalPdf | null> => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const asset = result.assets[0];
      const id = generateId();
      const destDir = PDF_DIR;

      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });

      const destUri = `${destDir}${id}.pdf`;
      await FileSystem.copyAsync({ from: asset.uri, to: destUri });

      const now = new Date().toISOString();

      const localPdf: LocalPdf = {
        id,
        original_filename: asset.name || "untitled.pdf",
        file_size: asset.size ?? 0,
        page_count: 1,
        uri: destUri,
        created_at: now,
        updated_at: now,
      };

      await savePdfLocally(localPdf);
      return localPdf;
    } catch (e) {
      console.error("Upload error:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLocalPdfs = useCallback(async (): Promise<LocalPdf[]> => {
    try {
      return await getLocalPdfs();
    } catch {
      return [];
    }
  }, []);

  const removeLocalPdf = useCallback(async (id: string) => {
    try {
      const pdf = await getLocalPdfById(id);
      if (pdf?.uri) {
        await FileSystem.deleteAsync(pdf.uri, { idempotent: true });
      }
      await deleteLocalPdf(id);
    } catch (e) {
      console.error("Delete error:", e);
    }
  }, []);

  return {
    pickAndSavePdf,
    loadLocalPdfs,
    removeLocalPdf,
    loading,
  };
}
