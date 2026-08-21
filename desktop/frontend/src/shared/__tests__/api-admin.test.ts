import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient } from "../api";

describe("ApiClient admin methods", () => {
  let client: ApiClient;
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    client = new ApiClient("http://test.local");
    client.setToken("admin-token");
  });

  it("adminListUsers fetches and returns users", async () => {
    const users = [{ id: "u1", email: "admin@test.com", is_admin: true }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(users),
    });
    const result = await client.adminListUsers();
    expect(result).toEqual(users);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/admin/users",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer admin-token" }) })
    );
  });

  it("adminListUsers throws on error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ detail: "Forbidden" }),
    });
    await expect(client.adminListUsers()).rejects.toThrow("Forbidden");
  });

  it("adminUpdateUser sends PUT with data", async () => {
    const updated = { id: "u1", email: "test@test.com", is_admin: true };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(updated),
    });
    const result = await client.adminUpdateUser("u1", { is_admin: true });
    expect(result).toEqual(updated);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/admin/users/u1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ is_admin: true }),
      })
    );
  });

  it("adminSendResetEmail sends POST", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: "Reset email sent" }),
    });
    const result = await client.adminSendResetEmail("u1");
    expect(result).toEqual({ message: "Reset email sent" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/admin/users/u1/send-reset",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("adminSendResetEmail throws on error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: "User not found" }),
    });
    await expect(client.adminSendResetEmail("u1")).rejects.toThrow("User not found");
  });

  it("updatePreferences sends PUT with preferences", async () => {
    const prefs = { theme: "dark", language: "it", default_zoom: 100, antialiasing: true, density: "comfortable" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(prefs),
    });
    const result = await client.updatePreferences(prefs);
    expect(result).toEqual(prefs);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/settings/",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(prefs),
      })
    );
  });

  it("updatePreferences returns null on error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });
    const result = await client.updatePreferences({} as any);
    expect(result).toBeNull();
  });

  it("updatePreferences returns null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await client.updatePreferences({} as any);
    expect(result).toBeNull();
  });

  it("createBugReport sends POST with title and description", async () => {
    const report = { id: "b1", title: "Bug", description: "Desc" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(report),
    });
    const result = await client.createBugReport("Bug", "Desc");
    expect(result).toEqual(report);
  });

  it("createBugReport sends page_url when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "b1" }),
    });
    await client.createBugReport("Bug", "Desc", "http://page");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test.local/bugs",
      expect.objectContaining({
        body: JSON.stringify({ title: "Bug", description: "Desc", page_url: "http://page" }),
      })
    );
  });

  it("listBugReports fetches bug reports", async () => {
    const reports = { items: [{ id: "b1" }], total: 1 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(reports),
    });
    const result = await client.listBugReports();
    expect(result).toEqual(reports);
  });

  it("undoPdf sends POST", async () => {
    const doc = { id: "p1", original_filename: "doc.pdf" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(doc),
    });
    const result = await client.undoPdf("p1");
    expect(result).toEqual(doc);
  });

  it("redoPdf sends POST", async () => {
    const doc = { id: "p1", original_filename: "doc.pdf" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(doc),
    });
    const result = await client.redoPdf("p1");
    expect(result).toEqual(doc);
  });
});
