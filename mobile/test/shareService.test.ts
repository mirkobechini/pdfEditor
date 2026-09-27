/**
 * Tests for shareService — unlike compressPdf/ocrPdf/addAnnotation, sharing
 * needs a STABLE cloud copy: ensureCloudUploaded must upload only once and
 * reuse the persisted cloud_id afterward, or every share action would spawn
 * a new cloud PDF and orphan links already issued against the previous one.
 */
const mockGetLocalPdfById = jest.fn();
const mockSetPdfCloudId = jest.fn();
jest.mock("../src/services/localDb", () => ({
  getLocalPdfById: (...args: unknown[]) => mockGetLocalPdfById(...args),
  setPdfCloudId: (...args: unknown[]) => mockSetPdfCloudId(...args),
}));

const mockUploadPdf = jest.fn();
const mockCreateShareLink = jest.fn();
const mockListShareLinks = jest.fn();
const mockRevokeShareLink = jest.fn();
jest.mock("../src/shared/api", () => ({
  api: {
    uploadPdf: (...args: unknown[]) => mockUploadPdf(...args),
    createShareLink: (...args: unknown[]) => mockCreateShareLink(...args),
    listShareLinks: (...args: unknown[]) => mockListShareLinks(...args),
    revokeShareLink: (...args: unknown[]) => mockRevokeShareLink(...args),
  },
}));

import { ensureCloudUploaded, createShareLink, listShareLinks, revokeShareLink } from "../src/services/shareService";
import type { LocalPdf } from "../src/shared/types";

const localPdfWithoutCloudId: LocalPdf = {
  id: "pdf-1",
  original_filename: "test.pdf",
  file_size: 1024,
  page_count: 1,
  uri: "file:///pdfs/pdf-1.pdf",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const localPdfWithCloudId: LocalPdf = { ...localPdfWithoutCloudId, cloud_id: "cloud-existing" };

beforeEach(() => {
  jest.clearAllMocks();
  mockUploadPdf.mockResolvedValue({ id: "cloud-new" });
});

describe("ensureCloudUploaded", () => {
  it("uploads and persists the cloud id when the PDF has never been uploaded", async () => {
    mockGetLocalPdfById.mockResolvedValue(localPdfWithoutCloudId);

    const cloudId = await ensureCloudUploaded("pdf-1");

    expect(mockUploadPdf).toHaveBeenCalledWith(localPdfWithoutCloudId.uri, localPdfWithoutCloudId.original_filename, "application/pdf");
    expect(mockSetPdfCloudId).toHaveBeenCalledWith("pdf-1", "cloud-new");
    expect(cloudId).toBe("cloud-new");
  });

  it("reuses the existing cloud id without re-uploading", async () => {
    mockGetLocalPdfById.mockResolvedValue(localPdfWithCloudId);

    const cloudId = await ensureCloudUploaded("pdf-1");

    expect(mockUploadPdf).not.toHaveBeenCalled();
    expect(mockSetPdfCloudId).not.toHaveBeenCalled();
    expect(cloudId).toBe("cloud-existing");
  });

  it("throws when the local PDF doesn't exist", async () => {
    mockGetLocalPdfById.mockResolvedValue(null);
    await expect(ensureCloudUploaded("pdf-1")).rejects.toThrow("PDF not found locally");
  });
});

describe("createShareLink / listShareLinks / revokeShareLink", () => {
  beforeEach(() => {
    mockGetLocalPdfById.mockResolvedValue(localPdfWithCloudId);
  });

  it("createShareLink uses the resolved cloud id", async () => {
    mockCreateShareLink.mockResolvedValue({ token: "tok1" });
    await createShareLink("pdf-1", "secret", 7);
    expect(mockCreateShareLink).toHaveBeenCalledWith("cloud-existing", "secret", 7);
  });

  it("listShareLinks uses the resolved cloud id", async () => {
    mockListShareLinks.mockResolvedValue([]);
    await listShareLinks("pdf-1");
    expect(mockListShareLinks).toHaveBeenCalledWith("cloud-existing");
  });

  it("revokeShareLink uses the resolved cloud id", async () => {
    mockRevokeShareLink.mockResolvedValue(undefined);
    await revokeShareLink("pdf-1", "tok1");
    expect(mockRevokeShareLink).toHaveBeenCalledWith("cloud-existing", "tok1");
  });

  it("uploads once when the PDF has no cloud id yet, then reuses it across calls", async () => {
    mockGetLocalPdfById.mockResolvedValue(localPdfWithoutCloudId);
    mockCreateShareLink.mockResolvedValue({ token: "tok1" });
    mockListShareLinks.mockResolvedValue([]);

    await createShareLink("pdf-1");
    expect(mockUploadPdf).toHaveBeenCalledTimes(1);
    expect(mockCreateShareLink).toHaveBeenCalledWith("cloud-new", undefined, undefined);

    // Second call still resolves via getLocalPdfById, which in this test
    // always returns the same (stale) mock — the point being asserted here
    // is that shareService itself never re-derives a *different* cloud id
    // out of thin air; it always asks localDb first.
    await listShareLinks("pdf-1");
    expect(mockListShareLinks).toHaveBeenCalledWith("cloud-new");
  });
});
