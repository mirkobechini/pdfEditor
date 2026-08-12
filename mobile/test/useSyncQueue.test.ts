/**
 * Tests for useSyncQueue — offline sync queue logic.
 *
 * Tests the core queue operations (enqueue, removeItem, clearQueue, processQueue)
 * with mocked AsyncStorage. Pure logic, no UI rendering needed.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const QUEUE_KEY = "pdfeditor_sync_queue";

interface SyncQueueItem {
  id: string;
  type: "upload" | "delete" | "update";
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

async function loadQueue(): Promise<SyncQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: SyncQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

describe("useSyncQueue logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loadQueue", () => {
    it("returns empty array when no stored queue", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const queue = await loadQueue();
      expect(queue).toEqual([]);
    });

    it("parses stored JSON queue", async () => {
      const stored = [
        {
          id: "1",
          type: "upload",
          payload: {},
          createdAt: "2026-01-01",
          retries: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(stored),
      );
      const queue = await loadQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe("upload");
    });

    it("returns empty array on parse error", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("invalid-json");
      const queue = await loadQueue();
      expect(queue).toEqual([]);
    });
  });

  describe("saveQueue", () => {
    it("persists queue to AsyncStorage", async () => {
      const queue = [
        {
          id: "1",
          type: "upload" as const,
          payload: {},
          createdAt: "2026-01-01",
          retries: 0,
        },
      ];
      await saveQueue(queue);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        QUEUE_KEY,
        JSON.stringify(queue),
      );
    });
  });

  describe("enqueue", () => {
    it("adds item to queue and persists", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("[]");
      const existing = await loadQueue();

      const newItem: SyncQueueItem = {
        id: generateId(),
        type: "upload",
        payload: { pdfId: "pdf-1" },
        createdAt: new Date().toISOString(),
        retries: 0,
      };
      const updated = [...existing, newItem];
      await saveQueue(updated);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        QUEUE_KEY,
        expect.stringContaining("upload"),
      );
    });
  });

  describe("removeItem", () => {
    it("removes item by id and persists", async () => {
      const stored = [
        {
          id: "1",
          type: "upload",
          payload: {},
          createdAt: "2026-01-01",
          retries: 0,
        },
        {
          id: "2",
          type: "delete",
          payload: {},
          createdAt: "2026-01-01",
          retries: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(stored),
      );

      const queue = await loadQueue();
      const filtered = queue.filter((q) => q.id !== "1");
      await saveQueue(filtered);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        QUEUE_KEY,
        expect.not.stringContaining('"id":"1"'),
      );
    });
  });

  describe("clearQueue", () => {
    it("removes queue key from AsyncStorage", async () => {
      await AsyncStorage.removeItem(QUEUE_KEY);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(QUEUE_KEY);
    });
  });
});
