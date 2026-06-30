import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "crm.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vigencia_date TEXT NOT NULL,
    broker TEXT NOT NULL CHECK (broker IN ('Victor', 'Lucas')),
    status TEXT NOT NULL DEFAULT 'Não contatado',
    lead_temperature TEXT NOT NULL DEFAULT 'morno' CHECK (lead_temperature IN ('quente', 'morno', 'frio')),
    next_contact_date TEXT,
    call_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
  CREATE INDEX IF NOT EXISTS idx_clients_broker ON clients(broker);
  CREATE INDEX IF NOT EXISTS idx_clients_next_contact ON clients(next_contact_date);
  CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id);
`);

export default db;
