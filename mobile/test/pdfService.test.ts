/**
 * Test pdf-lib operations in memory.
 * Tests the core PDF editing logic without expo-file-system dependency.
 */
import { PDFDocument } from "@cantoo/pdf-lib";

async function createTestPdf(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 200]);
  page.drawText(text, { x: 50, y: 100 });
  return doc.save();
}

describe("pdf-lib operations", () => {
  it("creates a PDF document", async () => {
    const bytes = await createTestPdf("Test");
    expect(bytes.length).toBeGreaterThan(100);
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(1);
  });

  describe("merge", () => {
    it("merges two PDFs into one", async () => {
      const pdfA = await createTestPdf("Page 1");
      const pdfB = await createTestPdf("Page 2");

      const merged = await PDFDocument.create();
      for (const bytes of [pdfA, pdfB]) {
        const source = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }

      expect(merged.getPageCount()).toBe(2);
    });

    it("merge with single PDF returns 1 page", async () => {
      const bytes = await createTestPdf("Single");
      const merged = await PDFDocument.create();
      const source = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
      expect(merged.getPageCount()).toBe(1);
    });
  });

  describe("split", () => {
    it("splits a 2-page PDF into individual pages", async () => {
      const doc = await PDFDocument.create();
      const p1 = doc.addPage([100, 100]);
      p1.drawText("A", { x: 10, y: 50 });
      const p2 = doc.addPage([100, 100]);
      p2.drawText("B", { x: 10, y: 50 });
      const bytes = await doc.save();

      const source = await PDFDocument.load(bytes);
      expect(source.getPageCount()).toBe(2);

      // Simulate split: extract each page into its own PDF
      for (let i = 0; i < source.getPageCount(); i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(source, [i]);
        newPdf.addPage(page);
        expect(newPdf.getPageCount()).toBe(1);
      }
    });
  });

  describe("reorder", () => {
    it("reverses page order of 3-page PDF", async () => {
      const doc = await PDFDocument.create();
      for (let i = 1; i <= 3; i++) {
        const page = doc.addPage([100, 100]);
        page.drawText(`Page ${i}`, { x: 10, y: 50 });
      }
      const bytes = await doc.save();
      const source = await PDFDocument.load(bytes);

      // Reverse order
      const newPdf = await PDFDocument.create();
      const indices = [2, 1, 0]; // zero-based: pages 3, 2, 1
      const pages = await newPdf.copyPages(source, indices);
      pages.forEach((p) => newPdf.addPage(p));

      expect(newPdf.getPageCount()).toBe(3);
    });
  });

  describe("metadata", () => {
    it("sets and reads title/author", async () => {
      const doc = await PDFDocument.create();
      doc.addPage([100, 100]);
      doc.setTitle("My Title");
      doc.setAuthor("My Author");
      const bytes = await doc.save();

      const loaded = await PDFDocument.load(bytes);
      expect(loaded.getTitle()).toBe("My Title");
      expect(loaded.getAuthor()).toBe("My Author");
    });

    it("updates existing metadata", async () => {
      const doc = await PDFDocument.create();
      doc.addPage([100, 100]);
      doc.setTitle("Old Title");
      const bytes = await doc.save();

      const loaded = await PDFDocument.load(bytes);
      loaded.setTitle("New Title");
      const updated = await loaded.save();

      const reloaded = await PDFDocument.load(updated);
      expect(reloaded.getTitle()).toBe("New Title");
    });
  });
});
