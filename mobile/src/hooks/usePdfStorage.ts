/**
 * Hook for managing local PDF storage.
 * Handles file picking, copying to local storage, and DB metadata.
 * Uses expo-file-system SDK 57+ (Paths, File, Directory).
 */
import { useState, useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Paths, File, Directory } from "expo-file-system";
import { PDFDocument } from "@cantoo/pdf-lib";
import {
  savePdfLocally,
  getLocalPdfs,
  deleteLocalPdf,
  getLocalPdfById,
} from "../services/localDb";
import type { LocalPdf } from "../shared/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function usePdfStorage() {
  const [loading, setLoading] = useState(false);

  const pickAndSavePdf = useCallback(
    async (userId?: string): Promise<LocalPdf | null> => {
      setLoading(true);
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: "application/pdf",
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets?.[0]) return null;

        const asset = result.assets[0];
        const id = generateId();

        // Create pdfs directory in documents folder
        const pdfDir = new Directory(Paths.document, "pdfs");
        pdfDir.create();

        // Create destination file
        const destFile = new File(pdfDir, `${id}.pdf`);

        // Copy from source to destination
        const sourceFile = new File(asset.uri);
        await sourceFile.copy(destFile);

        // Read the copied file to count pages using pdf-lib
        const buffer = await destFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(new Uint8Array(buffer));
        const pageCount = pdfDoc.getPageCount();

        const now = new Date().toISOString();

        const localPdf: LocalPdf = {
          id,
          user_id: userId || "",
          original_filename: asset.name || "untitled.pdf",
          file_size: destFile.exists
            ? (destFile.size ?? asset.size ?? 0)
            : (asset.size ?? 0),
          page_count: pageCount,
          uri: destFile.uri,
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
    },
    [],
  );

  const loadLocalPdfs = useCallback(
    async (userId?: string): Promise<LocalPdf[]> => {
      try {
        return await getLocalPdfs(userId);
      } catch {
        return [];
      }
    },
    [],
  );

  const removeLocalPdf = useCallback(async (id: string) => {
    try {
      const pdf = await getLocalPdfById(id);
      if (pdf?.uri) {
        const file = new File(pdf.uri);
        if (file.exists) {
          file.delete();
        }
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
