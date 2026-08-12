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

  const columnsResult = await db.execute("PRAGMA table_info(clients)");
  const columnNames = new Set(columnsResult.rows.map((r) => r.name as string));

  if (!columnNames.has("cpf")) {
    await db.execute("ALTER TABLE clients ADD COLUMN cpf TEXT");
  }
  if (!columnNames.has("birth_date")) {
    await db.execute("ALTER TABLE clients ADD COLUMN birth_date TEXT");
  }
  // Omit NOT NULL — older SQLite/libsql rejects NOT NULL on ALTER TABLE ADD COLUMN
  if (!columnNames.has("ramo")) {
    await db.execute("ALTER TABLE clients ADD COLUMN ramo TEXT DEFAULT 'vida'");
  }
  if (!columnNames.has("tipo")) {
    await db.execute("ALTER TABLE clients ADD COLUMN tipo TEXT");
  }

  // Check if broker constraint needs migration (old DBs had only Victor/Lucas without 'Não atribuído')
  // Wrap in try/catch since sqlite_master may not be available on all libsql hosts
  let brokerCheckOutdated = false;
  try {
    const tableSql = await db.execute(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'clients'"
    );
    brokerCheckOutdated = (tableSql.rows[0]?.sql as string | undefined)?.includes(
      "CHECK (broker IN ('Victor', 'Lucas'))"
    ) ?? false;
  } catch {
    // sqlite_master not available (e.g. Turso remote) — assume no migration needed
    brokerCheckOutdated = false;
  }

  if (brokerCheckOutdated) {
    await db.batch(
      [
        `CREATE TABLE clients_new (
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
        )`,
        "INSERT INTO clients_new SELECT id, name, phone, cpf, birth_date, vigencia_date, broker, status, lead_temperature, next_contact_date, call_attempts, 'vida', NULL, created_at, updated_at FROM clients",
        "DROP TABLE clients",
        "ALTER TABLE clients_new RENAME TO clients",
        "CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)",
        "CREATE INDEX IF NOT EXISTS idx_clients_broker ON clients(broker)",
        "CREATE INDEX IF NOT EXISTS idx_clients_next_contact ON clients(next_contact_date)",
        "CREATE INDEX IF NOT EXISTS idx_clients_ramo ON clients(ramo)",
      ],
      "write"
    );
  }
}

export const ready: Promise<void> = migrate();
