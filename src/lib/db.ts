import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";

const authToken = process.env.TURSO_AUTH_TOKEN;

let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  url = `file:${path.join(dataDir, "crm.db")}`;
}

export const db = createClient(authToken ? { url, authToken } : { url });

/** Run ALTER TABLE ADD COLUMN, ignoring errors if the column already exists */
async function addColumnIfMissing(column: string, definition: string): Promise<void> {
  try {
    await db.execute(`ALTER TABLE clients ADD COLUMN ${column} ${definition}`);
  } catch {
    // Column likely already exists — safe to ignore
  }
}

async function migrate(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      cpf TEXT,
      birth_date TEXT,
      vigencia_date TEXT NOT NULL,
      broker TEXT NOT NULL CHECK (broker IN ('Não atribuído', 'Victor', 'Lucas')),
      status TEXT NOT NULL DEFAULT 'Não contatado',
      lead_temperature TEXT NOT NULL DEFAULT 'morno' CHECK (lead_temperature IN ('quente', 'morno', 'frio')),
      next_contact_date TEXT,
      call_attempts INTEGER NOT NULL DEFAULT 0,
      ramo TEXT NOT NULL DEFAULT 'vida',
      tipo TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute("CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_clients_broker ON clients(broker)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_clients_next_contact ON clients(next_contact_date)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_clients_ramo ON clients(ramo)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id)");

  // Add columns that were introduced after the initial schema.
  // Uses try/catch so it’s safe whether or not the column already exists.
  await addColumnIfMissing("cpf", "TEXT");
  await addColumnIfMissing("birth_date", "TEXT");
  await addColumnIfMissing("ramo", "TEXT DEFAULT 'vida'");
  await addColumnIfMissing("tipo", "TEXT");
}

export const ready: Promise<void> = migrate();
