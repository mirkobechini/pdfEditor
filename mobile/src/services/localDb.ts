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
  }
  return db;
}

export async function savePdfLocally(pdf: LocalPdf): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO pdfs (id, original_filename, file_size, page_count, title, author, uri, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pdf.id,
      pdf.original_filename,
      pdf.file_size,
      pdf.page_count,
      pdf.title ?? null,
      pdf.author ?? null,
      pdf.uri,
      pdf.created_at,
      pdf.updated_at,
    ],
  );
}

export async function getLocalPdfs(): Promise<LocalPdf[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<LocalPdf>(
    "SELECT * FROM pdfs ORDER BY updated_at DESC",
  );
  return rows;
}

export async function getLocalPdfById(id: string): Promise<LocalPdf | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<LocalPdf>(
    "SELECT * FROM pdfs WHERE id = ?",
    [id],
  );
  return row ?? null;
}

export async function deleteLocalPdf(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM pdfs WHERE id = ?", [id]);
}
