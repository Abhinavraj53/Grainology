const fs = require('fs');
const path = require('path');

const notebookPath = process.argv[2];
if (!notebookPath) {
  console.error('Usage: node scripts/patchExternalNotebookSupabase.cjs <notebook.ipynb>');
  process.exit(1);
}

const resolvedPath = path.resolve(notebookPath);
const notebook = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

const supabaseCellIndex = notebook.cells.findIndex((cell) => {
  const source = (cell.source || []).join('');
  return cell.cell_type === 'code'
    && source.includes('def fetch_supabase_actuals')
    && source.includes('agmarknet_ai_actuals')
    && source.includes('create_client');
});

if (supabaseCellIndex < 0) {
  console.error('Could not find the Supabase source code cell.');
  process.exit(1);
}

const newSource = `from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
from supabase import create_client


def read_secret(name: str) -> str | None:
    value = os.environ.get(name)
    if value:
        return value.strip()
    try:
        from kaggle_secrets import UserSecretsClient

        value = UserSecretsClient().get_secret(name)
        return value.strip() if value else None
    except Exception:
        return None


def get_supabase_client():
    url = read_secret("SUPABASE_URL")
    key = read_secret("SUPABASE_SECRET_KEY") or read_secret("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Supabase secrets are missing; continuing without live actual deltas")
        return None
    return create_client(url, key)


def get_supabase_actuals_watermark(client) -> str | None:
    try:
        response = (
            client.table("agmarknet_ai_actuals")
            .select("date")
            .order("date", desc=True)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        return rows[0].get("date") if rows else None
    except Exception as exc:
        print(f"Could not read Supabase actuals watermark: {exc}")
        return None


def download_previous_canonical(destination: Path) -> bool:
    client = get_supabase_client()
    if not client:
        return False
    for object_path in [
        "canonical/latest/canonical_daily.parquet",
        "canonical/latest/canonical_daily.csv",
    ]:
        try:
            payload = client.storage.from_(AI_PREDICTION_BUCKET).download(object_path)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(payload if isinstance(payload, bytes) else payload.read())
            print(f"Downloaded previous canonical snapshot: {object_path}")
            return True
        except Exception as exc:
            print(f"Previous canonical download skipped for {object_path}: {exc}")
    return False


def fetch_supabase_actuals(canonical_latest_date: str | None) -> pd.DataFrame:
    client = get_supabase_client()
    if not client:
        return pd.DataFrame()

    watermark = get_supabase_actuals_watermark(client)
    print(f"Supabase agmarknet_ai_actuals latest date: {watermark or 'none'}")
    print(f"Fetching Supabase actual rows newer than canonical date: {canonical_latest_date or 'none'}")

    rows = []
    page_size = 1000
    offset = 0
    while True:
        query = (
            client.table("agmarknet_ai_actuals")
            .select("*")
            .order("date", desc=False)
            .range(offset, offset + page_size - 1)
        )
        if canonical_latest_date:
            query = query.gt("date", str(canonical_latest_date))
        response = query.execute()
        batch = response.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    if not rows:
        print("Fetched 0 Supabase actual rows")
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df = df[df["grain"].isin(TARGET_GRAINS)].copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.date.astype("string")
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    for column in ["price_low", "price_high", "arrival"]:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")
    if "market_count" in df.columns:
        df["market_count"] = pd.to_numeric(df["market_count"], errors="coerce").fillna(0).astype(int)
    df = df[df["price"].gt(0)]
    df["is_observed"] = True
    df["source"] = "supabase_agmarknet"
    df["source_priority"] = 3

    if df.empty:
        print("Fetched Supabase rows, but none survived grain/date/price filtering")
        return df

    print(
        f"Fetched {len(df):,} Supabase actual rows "
        f"from {df['date'].min()} to {df['date'].max()}"
    )
    print(
        "Supabase rows by grain:",
        df.groupby("grain").size().sort_index().to_dict(),
    )
    print(
        "Supabase rows by state:",
        df.groupby("state_name").size().sort_index().to_dict(),
    )
    return df
`;

const backupPath = `${resolvedPath}.bak`;
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(resolvedPath, backupPath);
}

notebook.cells[supabaseCellIndex].source = newSource.split(/(?<=\n)/);
fs.writeFileSync(resolvedPath, `${JSON.stringify(notebook, null, 1)}\n`, 'utf8');

console.log(`Patched Supabase cell ${supabaseCellIndex} in ${resolvedPath}`);
console.log(`Backup: ${backupPath}`);
