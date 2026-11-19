#!/usr/bin/env python3
"""
Cleanup script: rimuove i PDF ORFANI dal bucket R2/S3 di produzione.

Un oggetto è "orfano" se la sua chiave `pdfs/{uuid}.pdf` NON ha più alcuna
riga corrispondente nella tabella `pdf_documents` del DB (storage_filename
= "{uuid}.pdf"). Di default fa SOLO la DRY-RUN (elenca, non cancella).

Uso (dalla cartella backend/, con il .env di produzione o variabili esportate):
    # 1. DRY-RUN (sicuro, elenca gli orfani senza toccare nulla):
    python scripts/cleanup_orphan_pdfs.py

    # 2. DELETE reale:
    python scripts/cleanup_orphan_pdfs.py --apply

Credenziali richieste (dall'ambiente, come il backend di produzione):
  DATABASE_URL      (Neon/Postgres)
  S3_ENDPOINT       (R2 endpoint, es. https://<id>.r2.cloudflarestorage.com)
  S3_BUCKET         (nome bucket)
  S3_ACCESS_KEY / S3_SECRET_KEY
  S3_REGION         (default "auto")

NOTA DI SICUREZZA: gli oggetti sotto il prefisso `snapshots/` NON vengono mai
toccati (sono per undo/redo). Prima di eseguire --apply, fai un backup.
"""

import argparse
import os
import sys
from pathlib import Path

# Add backend root to path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine, text

from app.core.s3_storage import _get_s3_client
from app.core.config import settings


def get_referenced_uuids(database_url: str) -> set[str]:
    """Return the set of file UUIDs referenced by pdf_documents.storage_filename."""
    engine = create_engine(database_url)
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT storage_filename FROM pdf_documents "
                "WHERE storage_filename IS NOT NULL"
            )
        ).fetchall()
    uuids = set()
    for (fn,) in rows:
        if fn and fn.endswith(".pdf"):
            uuids.add(fn[:-4])  # strip ".pdf"
    engine.dispose()
    return uuids


def list_bucket_objects(client, bucket: str, prefix: str = "pdfs/") -> list[str]:
    """List all keys under a prefix (handles pagination)."""
    keys: list[str] = []
    continuation = None
    while True:
        kwargs = {"Bucket": bucket, "Prefix": prefix}
        if continuation:
            kwargs["ContinuationToken"] = continuation
        resp = client.list_objects_v2(**kwargs)
        contents = resp.get("Contents", [])
        keys.extend(o["Key"] for o in contents)
        if resp.get("IsTruncated") and resp.get("NextContinuationToken"):
            continuation = resp["NextContinuationToken"]
        else:
            break
    return keys


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Esegue la cancellazione reale. Se omesso: solo dry-run.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limita l'elenco stampato (dry-run). Non limita la delete.",
    )
    args = parser.parse_args()

    database_url = settings.DATABASE_URL
    if not database_url:
        print("[ERRORE] DATABASE_URL mancante")
        sys.exit(1)

    print("[INFO] Carico gli UUID referenziati dal DB...")
    referenced = get_referenced_uuids(database_url)
    print(f"[INFO] {len(referenced)} pdf referenziati nel DB.")

    client = _get_s3_client()
    bucket = settings.S3_BUCKET
    if not bucket:
        print("[ERRORE] S3_BUCKET mancante")
        sys.exit(1)

    print(f"[INFO] Elenco oggetti da bucket '{bucket}' (prefix pdfs/)...")
    keys = list_bucket_objects(client, bucket, prefix="pdfs/")
    print(f"[INFO] {len(keys)} oggetti sotto 'pdfs/' nel bucket.")

    orphans: list[str] = []
    for key in keys:
        # key = "pdfs/{uuid}.pdf"
        uuid_part = key[len("pdfs/") : -len(".pdf")]
        if uuid_part not in referenced:
            orphans.append(key)

    print(f"\n=== RISULTATI ===")
    print(f"Trovati {len(orphans)} PDF orfani (in bucket ma non nel DB).")

    if orphans:
        listed = orphans if args.limit is None else orphans[: args.limit]
        for k in listed:
            print(f"  - {k}")
        if args.limit is not None and len(orphans) > args.limit:
            print(f"  ... e altri {len(orphans) - args.limit} (usa --limit maggiore)")
    else:
        print("Nessun orfano: tutto a posto, nessuna azione necessaria.")
        return

    if not args.apply:
        print(
            "\n[DRY-RUN] Nessuna cancellazione eseguita. "
            "Per cancellare davvero rilancia con --apply."
        )
        return

    print(f"\n[APPLY] Cancello {len(orphans)} oggetti orfani dal bucket...")
    deleted = 0
    for key in orphans:
        try:
            client.delete_object(Bucket=bucket, Key=key)
            deleted += 1
        except Exception as e:  # noqa: BLE001
            print(f"  [ERRORE] {key}: {e}")
    print(f"[APPLY] Fatto: {deleted}/{len(orphans)} oggetti cancellati.")


if __name__ == "__main__":
    main()