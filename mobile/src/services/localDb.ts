/**
 * Local SQLite database for storing PDF metadata offline.
 * Uses expo-sqlite.
 */
import * as SQLite from "expo-sqlite";
import type { LocalPdf } from "../shared/types";

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("pdfeditor.db");
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pdfs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT '',
        original_filename TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        page_count INTEGER NOT NULL DEFAULT 0,
        title TEXT,
        author TEXT,
        uri TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    // Migration: add user_id column if missing (for existing DBs)
    try {
      await db.execAsync(
        "ALTER TABLE pdfs ADD COLUMN user_id TEXT NOT NULL DEFAULT ''",
      );
    } catch {
      // Column already exists — ignore
    }
    // Migration: add cloud_synced column
    try {
      await db.execAsync(
        "ALTER TABLE pdfs ADD COLUMN cloud_synced INTEGER NOT NULL DEFAULT 0",
      );
    } catch {
      // Column already exists — ignore
    } // Migration: add cloud_synced_exclude column
    try {
      await db.execAsync(
        "ALTER TABLE pdfs ADD COLUMN cloud_synced_exclude INTEGER NOT NULL DEFAULT 0",
      );
    } catch {
      // Column already exists — ignore
    } // Migration: add cloud_synced_at column
    try {
      await db.execAsync("ALTER TABLE pdfs ADD COLUMN cloud_synced_at TEXT");
    } catch {
      // Column already exists — ignore
    }
  }
  return db;
}

export async function savePdfLocally(pdf: LocalPdf): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO pdfs (id, user_id, original_filename, file_size, page_count, title, author, uri, created_at, updated_at, cloud_synced, cloud_synced_at, cloud_synced_exclude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pdf.id,
      pdf.user_id ?? "",
      pdf.original_filename,
      pdf.file_size,
      pdf.page_count,
      pdf.title ?? null,
      pdf.author ?? null,
      pdf.uri,
      pdf.created_at,
      pdf.updated_at,
      pdf.cloud_synced ?? 0,
      pdf.cloud_synced_at ?? null,
      pdf.cloud_synced_exclude ?? 0,
    ],
  );
}

export async function getLocalPdfs(userId?: string): Promise<LocalPdf[]> {
  const database = await getDb();
  // When no userId (guest or empty), return ALL PDFs (include legacy without user_id)
  if (!userId) {
    return await database.getAllAsync<LocalPdf>(
      "SELECT *, COALESCE(cloud_synced, 0) as cloud_synced FROM pdfs ORDER BY updated_at DESC",
    );
  }
  // When userId is set, return PDFs for that user OR legacy PDFs without user_id
  return await database.getAllAsync<LocalPdf>(
    "SELECT *, COALESCE(cloud_synced, 0) as cloud_synced FROM pdfs WHERE user_id = ? OR user_id IS NULL OR user_id = '' ORDER BY updated_at DESC",
    [userId],
  );
}

export async function getLocalPdfById(id: string): Promise<LocalPdf | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<LocalPdf>(
    "SELECT *, COALESCE(cloud_synced, 0) as cloud_synced FROM pdfs WHERE id = ?",
    [id],
  );
  return row ?? null;
}

export async function getLocalPdfsByUser(userId: string): Promise<LocalPdf[]> {
  const database = await getDb();
  return await database.getAllAsync<LocalPdf>(
    "SELECT *, COALESCE(cloud_synced, 0) as cloud_synced FROM pdfs WHERE user_id = ? ORDER BY updated_at DESC",
    [userId],
  );
}

export async function deleteLocalPdf(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM pdfs WHERE id = ?", [id]);
}

export async function markPdfCloudSynced(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE pdfs SET cloud_synced = 1, cloud_synced_at = datetime('now') WHERE id = ?",
    [id],
  );
}

export async function markPdfCloudUnsynced(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE pdfs SET cloud_synced = 0, cloud_synced_at = NULL WHERE id = ?",
    [id],
  );
}

export async function getUnsyncedPdfs(): Promise<LocalPdf[]> {
  const database = await getDb();
  return await database.getAllAsync<LocalPdf>(
    "SELECT *, COALESCE(cloud_synced, 0) as cloud_synced FROM pdfs WHERE (cloud_synced IS NULL OR cloud_synced = 0) AND (cloud_synced_exclude IS NULL OR cloud_synced_exclude = 0) ORDER BY updated_at DESC",
  );
}

export async function togglePdfSyncExclude(
  id: string,
  exclude: boolean,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE pdfs SET cloud_synced_exclude = ? WHERE id = ?",
    [exclude ? 1 : 0, id],
  );
}

export async function getSyncedPdfs(): Promise<LocalPdf[]> {
  const database = await getDb();
  return await database.getAllAsync<LocalPdf>(
    "SELECT *, COALESCE(cloud_synced, 0) as cloud_synced FROM pdfs WHERE cloud_synced = 1 AND (cloud_synced_exclude IS NULL OR cloud_synced_exclude = 0) ORDER BY updated_at DESC",
  );
}

export async function getOrphanPdfs(): Promise<LocalPdf[]> {
  const database = await getDb();
  return await database.getAllAsync<LocalPdf>(
    "SELECT *, COALESCE(cloud_synced, 0) as cloud_synced FROM pdfs WHERE user_id IS NULL OR user_id = '' ORDER BY updated_at DESC",
  );
}
