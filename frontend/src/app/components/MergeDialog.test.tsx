import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MergeDialog from "./MergeDialog";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    listPdfs: vi.fn(),
    downloadPdf: vi.fn(),
    uploadPdf: vi.fn(),
  },
}));

const mockFiles = [
  { id: "1", original_filename: "doc1.pdf", file_size: 100, page_count: 5, created_at: "", updated_at: "" },
  { id: "2", original_filename: "doc2.pdf", file_size: 200, page_count: 3, created_at: "", updated_at: "" },
  { id: "3", original_filename: "doc3.pdf", file_size: 150, page_count: 7, created_at: "", updated_at: "" },
];

describe("MergeDialog", () => {
  it("renders when open and shows file list", async () => {
    (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });

    render(
      <MergeDialog open={true} onClose={() => {}} onMergeComplete={() => {}} />
    );

    expect(await screen.findByText("doc1.pdf")).toBeTruthy();
    expect(screen.getByText("doc2.pdf")).toBeTruthy();
    expect(screen.getByText("doc3.pdf")).toBeTruthy();
  });

  it("has Merge button disabled when fewer than 2 files selected", async () => {
    (api.listPdfs as any).mockResolvedValue({ items: mockFiles, total: 3 });

    render(
      <MergeDialog open={true} onClose={() => {}} onMergeComplete={() => {}} />
    );

    const mergeBtn = await screen.findByText("Merge");
    expect(mergeBtn).toBeDisabled();

    // Select one file
    const checkbox1 = await screen.findAllByRole("checkbox");
    fireEvent.click(checkbox1[0]);
    expect(mergeBtn).toBeDisabled();

    // Select second file
    fireEvent.click(checkbox1[1]);
    expect(mergeBtn).toBeEnabled();
  });
});