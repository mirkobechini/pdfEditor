/**
 * Security and metadata operations: metadata editing, encryption check,
 * password protection/unlock, and signatures.
 */
import { PDFDocument } from "@cantoo/pdf-lib";
import { getLocalPdfById, savePdfLocally } from "../localDb";
import type { LocalPdf } from "../../shared/types";
import { generateId, getPdfDir, readPdfBytes, writePdfBytes } from "./io";

export async function updateMetadata(
  pdfId: string,
  title?: string,
  author?: string,
): Promise<LocalPdf | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    const bytes = await readPdfBytes(pdf.uri);
    const doc = await PDFDocument.load(bytes);

    if (title !== undefined) doc.setTitle(title);
    if (author !== undefined) doc.setAuthor(author);

    const pdfBytes = await doc.save();
    await writePdfBytes(pdf.uri, pdfBytes);

    const now = new Date().toISOString();
    const updated = {
      ...pdf,
      user_id: pdf.user_id ?? "",
      title: title ?? pdf.title,
      author: author ?? pdf.author,
      updated_at: now,
      file_size: pdfBytes.length,
    };
    await savePdfLocally(updated);
    return updated;
  } catch (e) {
    console.error("Metadata error:", e);
    return null;
  }
}

export async function isPdfEncrypted(pdfId: string): Promise<boolean> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return false;
    const bytes = await readPdfBytes(pdf.uri);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return doc.isEncrypted;
  } catch (e) {
    console.error("isPdfEncrypted error:", e);
    return false;
  }
}

export async function protectPdf(
  pdfId: string,
  password: string,
  fileName?: string,
): Promise<LocalPdf | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    const bytes = await readPdfBytes(pdf.uri);
    const doc = await PDFDocument.load(bytes);

    doc.encrypt({
      userPassword: password,
      ownerPassword: password,
      permissions: {
        printing: "highResolution",
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: false,
        contentAccessibility: true,
        documentAssembly: false,
      },
    });

    const pdfBytes = await doc.save();

    const pdfDir = getPdfDir();
    const id = generateId();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, pdfBytes);

    const now = new Date().toISOString();
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9 _-]/g, "_") + ".pdf"
      : `protected_${now.slice(0, 10)}.pdf`;
    const result: LocalPdf = {
      id,
      original_filename: safeName,
      file_size: pdfBytes.length,
      page_count: doc.getPageCount(),
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return result;
  } catch (e) {
    console.error("Protect error:", e);
    return null;
  }
}

export async function unlockPdf(
  pdfId: string,
  password: string,
  fileName?: string,
): Promise<LocalPdf | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    const bytes = await readPdfBytes(pdf.uri);
    const doc = await PDFDocument.load(bytes, { password });

    // Loading with the correct password then saving produces
    // an unencrypted copy — this is the unlock.
    const pdfBytes = await doc.save();

    const pdfDir = getPdfDir();
    const id = generateId();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, pdfBytes);

    const now = new Date().toISOString();
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9 _-]/g, "_") + ".pdf"
      : `unlocked_${now.slice(0, 10)}.pdf`;
    const result: LocalPdf = {
      id,
      original_filename: safeName,
      file_size: pdfBytes.length,
      page_count: doc.getPageCount(),
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return result;
  } catch (e) {
    console.error("Unlock error:", e);
    return null;
  }
}

/**
 * Sign a PDF by inserting a signature image onto a page (offline, pdf-lib).
 * The signature image is base64-encoded PNG bytes.
 */
export async function signPdf(
  pdfId: string,
  signatureImageB64: string,
  pageNumber: number,
  x: number,
  y: number,
  width: number,
  height: number,
  fileName?: string,
): Promise<LocalPdf | null> {
  try {
    const pdf = await getLocalPdfById(pdfId);
    if (!pdf) return null;

    const bytes = await readPdfBytes(pdf.uri);
    const doc = await PDFDocument.load(bytes);

    if (pageNumber < 1 || pageNumber > doc.getPageCount()) {
      console.error("Sign error: page out of range");
      return null;
    }

    // Decode base64 PNG signature
    const binary = atob(signatureImageB64);
    const imgBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      imgBytes[i] = binary.charCodeAt(i);
    }

    const pngImage = await doc.embedPng(imgBytes);
    const page = doc.getPage(pageNumber - 1);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    // PositionSelectorNative reports the box's top-left corner (y grows
    // downward, screen convention), but pdf-lib's drawImage takes the
    // lower-left corner in PDF space (y grows upward from the page bottom).
    // Without this flip the signature was drawn mirrored vertically — often
    // entirely outside the visible page.
    // Also defensively clamp to the page bounds: a zoom/scroll edge case in
    // PositionSelectorNative can still report a box position past the page
    // edge, which would otherwise draw the signature completely off-page.
    const clampedX = Math.max(0, Math.min(x, pageWidth - width));
    const clampedY = Math.max(0, Math.min(pageHeight - y - height, pageHeight - height));

    // The position-selector preview shows the signature with resizeMode
    // "contain" (aspect ratio preserved, letterboxed inside the box), but
    // drawImage stretches to exactly fill width/height — fit the image
    // inside the box the same way, instead of distorting it, and center it
    // in whatever axis has leftover space.
    const boxAspect = width / height;
    const imgAspect = pngImage.width / pngImage.height;
    let drawWidth = width;
    let drawHeight = height;
    if (imgAspect > boxAspect) {
      drawHeight = width / imgAspect;
    } else {
      drawWidth = height * imgAspect;
    }
    const drawX = clampedX + (width - drawWidth) / 2;
    const drawY = clampedY + (height - drawHeight) / 2;

    page.drawImage(pngImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });

    const pdfBytes = await doc.save();

    const pdfDir = getPdfDir();
    const id = generateId();
    const uri = `${pdfDir.uri}${id}.pdf`;
    await writePdfBytes(uri, pdfBytes);

    const now = new Date().toISOString();
    const safeName = fileName
      ? fileName.replace(/[^a-zA-Z0-9 _-]/g, "_") + ".pdf"
      : `signed_${now.slice(0, 10)}.pdf`;
    const result: LocalPdf = {
      id,
      original_filename: safeName,
      file_size: pdfBytes.length,
      page_count: doc.getPageCount(),
      uri,
      created_at: now,
      updated_at: now,
    };
    await savePdfLocally(result);
    return result;
  } catch (e) {
    console.error("Sign error:", e);
    return null;
  }
}