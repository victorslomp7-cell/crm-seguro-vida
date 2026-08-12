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

const CREATE_CLIENTS = `
  CREATE TABLE clients_target (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    cpf TEXT,
    birth_date TEXT,
    vigencia_date TEXT NOT NULL,
    broker TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Não contatado',
    lead_temperature TEXT NOT NULL DEFAULT 'morno',
    next_contact_date TEXT,
    call_attempts INTEGER NOT NULL DEFAULT 0,
    ramo TEXT NOT NULL DEFAULT 'vida',
    tipo TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

async function migrate(): Promise<void> {
  // Ensure tables exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      cpf TEXT,
      birth_date TEXT,
      vigencia_date TEXT NOT NULL,
      broker TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Não contatado',
      lead_temperature TEXT NOT NULL DEFAULT 'morno',
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
  await db.execute("CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id)");

  // Detect missing columns by querying them directly.
  // If a column is missing, recreate the table to add all missing columns at once.
  let needsRamo = false;
  let needsTipo = false;
  let needsCpf = false;
  let needsBirthDate = false;

  try {
    await db.execute("SELECT ramo FROM clients LIMIT 1");
  } catch {
    needsRamo = true;
  }
  try {
    await db.execute("SELECT tipo FROM clients LIMIT 1");
  } catch {
    needsTipo = true;
  }
  try {
    await db.execute("SELECT cpf FROM clients LIMIT 1");
  } catch {
    needsCpf = true;
  }
  try {
    await db.execute("SELECT birth_date FROM clients LIMIT 1");
  } catch {
    needsBirthDate = true;
  }

  if (needsRamo || needsTipo || needsCpf || needsBirthDate) {
    // Recreate the table with the full schema, copying existing data.
    // We use COALESCE to fill in defaults for columns that didn’t exist.
    const cpfCol = needsCpf ? "NULL" : "cpf";
    const birthCol = needsBirthDate ? "NULL" : "birth_date";
    const ramoCol = needsRamo ? "'vida'" : "ramo";
    const tipoCol = needsTipo ? "NULL" : "tipo";

    await db.batch(
      [
        CREATE_CLIENTS,
        `INSERT INTO clients_target
          SELECT id, name, phone, ${cpfCol}, ${birthCol}, vigencia_date, broker,
                 status, lead_temperature, next_contact_date, call_attempts,
                 ${ramoCol}, ${tipoCol}, created_at, updated_at
          FROM clients`,
        "DROP TABLE clients",
        "ALTER TABLE clients_target RENAME TO clients",
        "CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)",
        "CREATE INDEX IF NOT EXISTS idx_clients_broker ON clients(broker)",
        "CREATE INDEX IF NOT EXISTS idx_clients_next_contact ON clients(next_contact_date)",
        "CREATE INDEX IF NOT EXISTS idx_clients_ramo ON clients(ramo)",
        "CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id)",
      ],
      "write"
    );
  } else {
    // Table already has all columns; just ensure the ramo index exists
    await db.execute("CREATE INDEX IF NOT EXISTS idx_clients_ramo ON clients(ramo)");
  }
}

export const ready: Promise<void> = migrate();
