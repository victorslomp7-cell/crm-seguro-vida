import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import * as XLSX from "xlsx";
import db from "@/lib/db";
import { BROKERS, STATUSES, TEMPERATURES } from "@/lib/types";

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
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
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
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const defaultBroker = formData.get("broker") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO clients (id, name, phone, vigencia_date, broker, status, lead_temperature, next_contact_date, call_attempts, created_at, updated_at)
     VALUES (@id, @name, @phone, @vigencia_date, @broker, @status, @lead_temperature, NULL, 0, @now, @now)`
  );

  let imported = 0;
  const errors: { row: number; reason: string }[] = [];

  const tx = db.transaction((items: Record<string, unknown>[]) => {
    items.forEach((row, idx) => {
      const name = pick(row, ["nome", "name", "cliente"]);
      const phone = pick(row, ["telefone", "phone", "celular", "contato"]);
      const vigenciaRaw = pick(row, [
        "data de inicio de vigencia",
        "data de vigencia",
        "vigencia",
        "data inicio vigencia",
        "inicio de vigencia",
        "data_inicio_vigencia",
      ]);
      const brokerRaw = pick(row, ["corretor", "responsavel", "broker"]) ?? defaultBroker;

      if (!name || !phone || !vigenciaRaw) {
        errors.push({ row: idx + 2, reason: "Faltam dados obrigatórios (nome, telefone ou vigência)." });
        return;
      }

      const vigencia_date = parseDate(vigenciaRaw);
      if (!vigencia_date) {
        errors.push({ row: idx + 2, reason: `Data de vigência inválida: "${vigenciaRaw}".` });
        return;
      }

      const broker = String(brokerRaw || "").trim();
      if (!BROKERS.includes(broker as (typeof BROKERS)[number])) {
        errors.push({ row: idx + 2, reason: `Corretor responsável inválido ou ausente: "${broker}".` });
        return;
      }

      insert.run({
        id: randomUUID(),
        name: String(name).trim(),
        phone: String(phone).trim(),
        vigencia_date,
        broker,
        status: STATUSES[0],
        lead_temperature: TEMPERATURES[1],
        now,
      });
      imported++;
    });
  });

  tx(rows);

  return NextResponse.json({ imported, total: rows.length, errors });
}
