import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import * as XLSX from "xlsx";
import { db, ready } from "@/lib/db";
import { BROKERS, STATUSES, TEMPERATURES } from "@/lib/types";
import type { InValue } from "@libsql/client";

function normalizeKey(key: string) {
  return key
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function pick(row: Record<string, unknown>, candidates: string[]): unknown {
  const normalized: Record<string, unknown> = {};
  for (const k of Object.keys(row)) normalized[normalizeKey(k)] = row[k];
  for (const c of candidates) {
    if (normalized[c] !== undefined && normalized[c] !== "") return normalized[c];
  }
  return undefined;
}

function parseDate(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + value);
    const y = epoch.getUTCFullYear();
    const mm = String(epoch.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(epoch.getUTCDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }
  const str = String(value).trim();
  // dd/mm/yyyy
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-mm-dd already
  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export async function POST(req: NextRequest) {
  await ready;
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const defaultBroker = formData.get("broker") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // raw: true prevents xlsx from auto-detecting CSV date-like strings (e.g. "06/01/2026")
  // and silently converting them to serial numbers using a US (MM/DD/YYYY) assumption,
  // which would corrupt Brazilian dd/mm/yyyy dates.
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, raw: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });

  const now = new Date().toISOString();
  const insertSql = `INSERT INTO clients (id, name, phone, cpf, birth_date, vigencia_date, broker, status, lead_temperature, next_contact_date, call_attempts, created_at, updated_at)
     VALUES (@id, @name, @phone, @cpf, @birth_date, @vigencia_date, @broker, @status, @lead_temperature, NULL, 0, @now, @now)`;

  let imported = 0;
  const errors: { row: number; reason: string }[] = [];
  const batchStatements: { sql: string; args: Record<string, InValue> }[] = [];

  rows.forEach((row, idx) => {
    const name = pick(row, ["nome", "name", "cliente"]);
    const phone = pick(row, ["telefone", "phone", "celular", "contato"]);
    const cpf = pick(row, ["cpf", "cpf_cnpj", "documento"]);
    const birthDateRaw = pick(row, ["data de nascimento", "data nascimento", "nascimento", "data_nascimento"]);
    const vigenciaRaw = pick(row, [
      "data de inicio de vigencia",
      "data de vigencia",
      "vigencia",
      "data inicio vigencia",
      "inicio de vigencia",
      "inicio_vigencia",
      "data_inicio_vigencia",
    ]);
    const brokerRaw = pick(row, ["corretor", "responsavel", "broker"]) ?? defaultBroker;

    if (!name || !vigenciaRaw) {
      errors.push({ row: idx + 2, reason: "Faltam dados obrigatórios (nome ou vigência)." });
      return;
    }

    const vigencia_date = parseDate(vigenciaRaw);
    if (!vigencia_date) {
      errors.push({ row: idx + 2, reason: `Data de vigência inválida: "${vigenciaRaw}".` });
      return;
    }

    const broker = String(brokerRaw || "Não atribuído").trim();
    if (!BROKERS.includes(broker as (typeof BROKERS)[number])) {
      errors.push({ row: idx + 2, reason: `Corretor responsável inválido: "${broker}".` });
      return;
    }

    batchStatements.push({
      sql: insertSql,
      args: {
        id: randomUUID(),
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : null,
        cpf: cpf ? String(cpf).trim() : null,
        birth_date: parseDate(birthDateRaw),
        vigencia_date,
        broker,
        status: STATUSES[0],
        lead_temperature: TEMPERATURES[1],
        now,
      },
    });
    imported++;
  });

  if (batchStatements.length) {
    await db.batch(
      batchStatements.map((s) => ({ sql: s.sql, args: s.args })),
      "write"
    );
  }

  return NextResponse.json({ imported, total: rows.length, errors });
}
