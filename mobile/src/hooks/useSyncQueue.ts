/**
 * Hook for managing a sync queue of offline operations.
 * Persists pending operations in AsyncStorage and processes them
 * when the device is back online.
 *
 * Queue items are processed FIFO. Each item is removed from the queue
 * only after successful processing. Failed items stay in the queue
 * and are retried on the next sync cycle.
 *
 * Future use: upload PDFs to cloud, delete remote PDFs, update metadata.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../shared/api";

const QUEUE_KEY = "pdfeditor_sync_queue";

export interface SyncQueueItem {
  id: string;
  type: "upload" | "delete" | "update";
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

interface UseSyncQueueReturn {
  /** All items currently in the queue */
  queue: SyncQueueItem[];
  /** Number of pending items */
  queueLength: number;
  /** Whether the queue is currently being processed */
  isProcessing: boolean;
  /** Add an item to the queue */
  enqueue: (
    item: Omit<SyncQueueItem, "id" | "createdAt" | "retries">,
  ) => Promise<void>;
  /** Process all pending items in the queue */
  processQueue: () => Promise<void>;
  /** Clear all items from the queue */
  clearQueue: () => Promise<void>;
  /** Remove a single item by id */
  removeItem: (id: string) => Promise<void>;
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

export function useSyncQueue(): UseSyncQueueReturn {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // Load queue on mount
  useEffect(() => {
    loadQueue().then(setQueue);
  }, []);

  const enqueue = useCallback(
    async (item: Omit<SyncQueueItem, "id" | "createdAt" | "retries">) => {
      const newItem: SyncQueueItem = {
        ...item,
        id: generateId(),
        createdAt: new Date().toISOString(),
        retries: 0,
      };
      const updated = [...queue, newItem];
      setQueue(updated);
      await saveQueue(updated);
    },
    [queue],
  );

  const removeItem = useCallback(
    async (id: string) => {
      const updated = queue.filter((q) => q.id !== id);
      setQueue(updated);
      await saveQueue(updated);
    },
    [queue],
  );

  const clearQueue = useCallback(async () => {
    setQueue([]);
    await AsyncStorage.removeItem(QUEUE_KEY);
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      const current = await loadQueue();
      if (current.length === 0) return;

      const remaining: SyncQueueItem[] = [];

      for (const item of current) {
        try {
          // Process based on type
          if (item.type === "upload") {
            const { fileUri, fileName, mimeType } = item.payload as {
              fileUri: string;
              fileName: string;
              mimeType: string;
            };
            await api.uploadPdf(fileUri, fileName, mimeType);
          } else if (item.type === "delete") {
            await api.deletePdf(item.payload.id as string);
          } else if (item.type === "update") {
            const { id, title, author } = item.payload as {
              id: string;
              title?: string;
              author?: string;
            };
            await api.updateMetadata(id, { title, author });
          }
          // Success — item is not added to remaining
        } catch {
          // Failed — keep in queue, increment retries
          remaining.push({ ...item, retries: item.retries + 1 });
        }
      }

      // Save remaining items
      setQueue(remaining);
      await saveQueue(remaining);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  return {
    queue,
    queueLength: queue.length,
    isProcessing,
    enqueue,
    processQueue,
    clearQueue,
    removeItem,
  };
}
