/**
 * Print service — isolated in its own module so expo-print (which requires
 * a native module) is only loaded when the viewer screen needs it, not at
 * app startup. Importing expo-print statically in pdfService.ts caused an
 * infinite loading loop in the editor.
 */
import { printAsync } from "expo-print";

/**
 * Print a PDF using the native print dialog (iOS/Android AirPrint).
 * Uses expo-print with the local file URI.
 */
export async function printPdf(uri: string): Promise<boolean> {
  try {
    await printAsync({ uri });
    return true;
  } catch (e) {
    console.error("Print error:", e);
    return false;
  }
}
