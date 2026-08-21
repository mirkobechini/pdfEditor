import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "../api";

describe("ApiClient extra methods", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api as any).token = null;
    (api as any)._csrfToken = null;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );
  });

  it("getPdf fetches single PDF", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "p1" }), { status: 200 }),
    );
    const result = await api.getPdf("p1");
    expect(result.id).toBe("p1");
  });

  it("replaceText sends POST", async () => {
    await api.replaceText("p1", "old", "new");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("extractText sends POST", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ text: "content", total_pages: 5 }), { status: 200 }),
    );
    const result = await api.extractText("p1");
    expect(result.text).toBe("content");
  });

  it("getMetadata fetches metadata", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: "Doc" }), { status: 200 }),
    );
    const result = await api.getMetadata("p1");
    expect(result.title).toBe("Doc");
  });

  it("importFile sends POST", async () => {
    const file = new File(["text"], "doc.txt", { type: "text/plain" });
    await api.importFile(file);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("googleLogin sends POST with token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "jwt" }), { status: 200 }),
    );
    const result = await api.googleLogin("google-token");
    expect(result.access_token).toBe("jwt");
  });

  it("guestLogin creates guest session", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "guest-jwt", user: { id: "g1" } }), { status: 200 }),
    );
    const result = await api.guestLogin();
    expect(result.access_token).toBe("guest-jwt");
  });

  it("convertGuest sends POST", async () => {
    await api.convertGuest("test@test.com", "pass", "Test");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("forgotPassword sends POST with email", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Email sent" }), { status: 200 }),
    );
    const result = await api.forgotPassword("test@test.com");
    expect(result.message).toBe("Email sent");
  });

  it("resetPassword sends POST", async () => {
    await api.resetPassword("token123", "newpass");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refreshToken refreshes JWT", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "new-jwt" }), { status: 200 }),
    );
    const result = await api.refreshToken();
    expect(result.access_token).toBe("new-jwt");
  });

  it("syncUser syncs user data", async () => {
    await api.syncUser({ id: "u1", email: "test@test.com" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("updateProfile updates user profile", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "u1", full_name: "New Name" }), { status: 200 }),
    );
    const result = await api.updateProfile({ full_name: "New Name" });
    expect(result.full_name).toBe("New Name");
  });

  it("unlinkGoogle unlinks Google account", async () => {
    await api.unlinkGoogle("password123");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("getPreferences fetches preferences", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ theme: "dark" }), { status: 200 }),
    );
    const result = await api.getPreferences();
    expect(result.theme).toBe("dark");
  });

  it("updatePreferences sends PATCH", async () => {
    await api.updatePreferences({ theme: "light" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("undoPdf undoes last operation", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "p1" }), { status: 200 }),
    );
    const result = await api.undoPdf("p1");
    expect(result.id).toBe("p1");
  });

  it("redoPdf redoes last undone operation", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "p1" }), { status: 200 }),
    );
    const result = await api.redoPdf("p1");
    expect(result.id).toBe("p1");
  });

  it("createBugReport sends POST", async () => {
    await api.createBugReport({ title: "Bug", description: "desc" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("listBugReports fetches bug reports", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
    );
    const result = await api.listBugReports();
    expect(result.items).toEqual([]);
  });
});
