import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const DEFAULT_CONN = "postgres://postgres:postgres@localhost:5432/carecircle";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || DEFAULT_CONN,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function runMigrations() {
  await ensureMigrationsTable();

  const migrationsDir = path.resolve(projectRoot, "migrations");
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const appliedRows = await query("SELECT filename FROM schema_migrations");
  const applied = new Set(appliedRows.rows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await withTx(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(filename) VALUES($1)", [file]);
    });
  }
}
