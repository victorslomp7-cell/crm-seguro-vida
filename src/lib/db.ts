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
    phone TEXT,
    cpf TEXT,
    birth_date TEXT,
    vigencia_date TEXT NOT NULL,
    broker TEXT NOT NULL CHECK (broker IN ('Não atribuído', 'Victor', 'Lucas')),
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

// Lightweight migration for databases created before phone became optional /
// cpf, birth_date and the "Não atribuído" broker were introduced.
const columns = db.prepare("PRAGMA table_info(clients)").all() as { name: string }[];
const columnNames = new Set(columns.map((c) => c.name));

if (!columnNames.has("cpf")) {
  db.exec("ALTER TABLE clients ADD COLUMN cpf TEXT");
}
if (!columnNames.has("birth_date")) {
  db.exec("ALTER TABLE clients ADD COLUMN birth_date TEXT");
}

const brokerCheckOutdated = (
  db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'clients'")
    .get() as { sql: string } | undefined
)?.sql?.includes("CHECK (broker IN ('Victor', 'Lucas'))");

if (brokerCheckOutdated) {
  db.exec(`
    CREATE TABLE clients_new (
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO clients_new SELECT id, name, phone, cpf, birth_date, vigencia_date, broker, status, lead_temperature, next_contact_date, call_attempts, created_at, updated_at FROM clients;
    DROP TABLE clients;
    ALTER TABLE clients_new RENAME TO clients;
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
    CREATE INDEX IF NOT EXISTS idx_clients_broker ON clients(broker);
    CREATE INDEX IF NOT EXISTS idx_clients_next_contact ON clients(next_contact_date);
  `);
}

export default db;
