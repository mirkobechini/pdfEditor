/**
 * Hook for camera scanning — photo capture, image processing, PDF conversion.
 * Extracted from ScannerScreen for reusability.
 */
import { useState, useRef, useCallback } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { PDFDocument } from "@cantoo/pdf-lib";
import { savePdfLocally } from "../services/localDb";
import type { LocalPdf } from "../shared/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function useCameraScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) {
        setPhotoUri(photo.uri);
      }
    } catch (e) {
      console.error("Camera error:", e);
    } finally {
      setProcessing(false);
    }
  }, []);

  const convertToPdf = useCallback(
    async (fileName?: string): Promise<LocalPdf | null> => {
      if (!photoUri) return null;
      setProcessing(true);
      try {
        const manipulated = await manipulateAsync(photoUri, [], {
          compress: 0.8,
          format: SaveFormat.JPEG,
        });

        const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const pdfDoc = await PDFDocument.create();
        const jpgImage = await pdfDoc.embedJpg(base64);
        const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
        page.drawImage(jpgImage, {
          x: 0,
          y: 0,
          width: jpgImage.width,
          height: jpgImage.height,
        });

        const pdfBytes = await pdfDoc.save();

        const pdfDir = (FileSystem.documentDirectory || "") + "PdfEditor/";
        const dirInfo = await FileSystem.getInfoAsync(pdfDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(pdfDir, { intermediates: true });
        }
        const id = generateId();
        const pdfFilePath = pdfDir + id + ".pdf";

        const uint8Array = new Uint8Array(pdfBytes);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const pdfBase64 = btoa(binary);

        await FileSystem.writeAsStringAsync(pdfFilePath, pdfBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const now = new Date().toISOString();
        const safeName = fileName?.trim()
          ? fileName.trim().replace(/[^a-zA-Z0-9 _-]/g, "_") + ".pdf"
          : `scan_${now.slice(0, 10)}.pdf`;

        const localPdf: LocalPdf = {
          id,
          original_filename: safeName,
          file_size: pdfBytes.length,
          page_count: 1,
          uri: pdfFilePath,
          created_at: now,
          updated_at: now,
        };

        await savePdfLocally(localPdf);
        setPhotoUri(null);
        return localPdf;
      } catch (e) {
        console.error("PDF conversion error:", e);
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [photoUri],
  );

  const resetPhoto = useCallback(() => {
    setPhotoUri(null);
  }, []);

  return {
    permission,
    requestPermission,
    photoUri,
    processing,
    cameraRef,
    takePhoto,
    convertToPdf,
    resetPhoto,
  };
}
