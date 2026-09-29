/**
 * Local SQLite database for storing PDF metadata offline.
 * Uses expo-sqlite.
 */
import * as SQLite from "expo-sqlite";
import type { LocalPdf } from "../shared/types";

// Cache the init *promise*, not the resolved database — several callers can
// hit getDb() concurrently (a save, a list reload, a rename all firing close
// together right after a cold app launch is the common case). Caching only
// the resolved value left a window where `db` was still null while the first
// caller's openDatabaseAsync()/migrations were in flight, so a second caller
// would start its own openDatabaseAsync() on the same file — two connections
// racing through CREATE TABLE/migrations produced a native NullPointerException
// out of NativeDatabase.prepareAsync (issue #866, hit testing annotations).
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise;
}

async function initDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync("pdfeditor.db");
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
  } // Migration: add cloud_id column (for sync dedup)
  try {
    await db.execAsync("ALTER TABLE pdfs ADD COLUMN cloud_id TEXT");
  } catch {
    // Column already exists — ignore
  }
  // Migration: add upload_source column (web, desktop, mobile)
  try {
    await db.execAsync(
      "ALTER TABLE pdfs ADD COLUMN upload_source TEXT DEFAULT 'mobile'",
    );
  } catch {
    // Column already exists — ignore
  }
  return db;
}

export async function savePdfLocally(pdf: LocalPdf): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO pdfs (id, user_id, cloud_id, original_filename, file_size, page_count, title, author, uri, created_at, updated_at, cloud_synced, cloud_synced_at, cloud_synced_exclude, upload_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pdf.id,
      pdf.user_id ?? "",
      pdf.cloud_id ?? null,
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
      pdf.upload_source ?? "mobile",
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

export async function getLocalPdfByCloudId(
  cloudId: string,
): Promise<LocalPdf | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<LocalPdf>(
    "SELECT *, COALESCE(cloud_synced, 0) as cloud_synced FROM pdfs WHERE cloud_id = ?",
    [cloudId],
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

/** Record which cloud PDF a local one maps to (e.g. after uploading it for sharing). */
export async function setPdfCloudId(id: string, cloudId: string): Promise<void> {
  const database = await getDb();
  await database.runAsync("UPDATE pdfs SET cloud_id = ? WHERE id = ?", [cloudId, id]);
}

export async function renamePdfLocally(id: string, filename: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE pdfs SET original_filename = ?, updated_at = datetime('now') WHERE id = ?",
    [filename, id],
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
