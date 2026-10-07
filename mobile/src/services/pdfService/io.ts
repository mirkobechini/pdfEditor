/**
 * Low-level I/O helpers shared by all pdfService operations.
 * Handle bytes/file access, id generation and the local pdf directory.
 */
import { File, Directory, Paths } from "expo-file-system";
import { writeAsStringAsync, EncodingType } from "expo-file-system/legacy";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Undoes accidental percent-encoding in a filename (e.g. "React%2520Hooks.pdf"
 * instead of "React Hooks.pdf"). Filenames round-tripping through upload
 * endpoints (import, annotate, OCR, compress, export) can pick up a layer of
 * URL-encoding somewhere in that chain; since each of those re-uploads
 * whatever name it was given, an already-encoded name gets encoded AGAIN on
 * the next operation, compounding ("%20" -> "%2520" -> "%252520" ...).
 * Decoding repeatedly until stable neutralizes however many layers built up,
 * and is a safe no-op on a name that was never encoded in the first place.
 */
export function normalizeFilename(name: string): string {
  let decoded = name;
  for (let i = 0; i < 5; i++) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      break;
    }
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

export async function readPdfBytes(uri: string): Promise<Uint8Array> {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

export async function writePdfBytes(uri: string, bytes: Uint8Array): Promise<void> {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });
}

export function getPdfDir(): Directory {
  const dir = new Directory(Paths.document, "pdfs");
  if (!dir.exists) {
    try {
      dir.create();
    } catch {
      // Directory already exists — ignore
    }
  }
  return dir;
}

export { generateId };