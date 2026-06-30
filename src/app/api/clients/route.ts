import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { BROKERS, STATUSES, TEMPERATURES } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const broker = sp.get("broker");
  const temperature = sp.get("temperature");
  const vigenciaFrom = sp.get("vigenciaFrom");
  const vigenciaTo = sp.get("vigenciaTo");
  const nextContactFrom = sp.get("nextContactFrom");
  const nextContactTo = sp.get("nextContactTo");
  const dueOnly = sp.get("dueOnly");
  const q = sp.get("q");
  const sort = sp.get("sort") || "priority";

  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (status) {
    where.push("status = @status");
    params.status = status;
  }
  if (broker) {
    where.push("broker = @broker");
    params.broker = broker;
  }
  if (temperature) {
    where.push("lead_temperature = @temperature");
    params.temperature = temperature;
  }
  if (vigenciaFrom) {
    where.push("vigencia_date >= @vigenciaFrom");
    params.vigenciaFrom = vigenciaFrom;
  }
  if (vigenciaTo) {
    where.push("vigencia_date <= @vigenciaTo");
    params.vigenciaTo = vigenciaTo;
  }
  if (nextContactFrom) {
    where.push("next_contact_date >= @nextContactFrom");
    params.nextContactFrom = nextContactFrom;
  }
  if (nextContactTo) {
    where.push("next_contact_date <= @nextContactTo");
    params.nextContactTo = nextContactTo;
  }
  if (dueOnly === "1") {
    where.push("next_contact_date IS NOT NULL AND next_contact_date <= @today");
    params.today = new Date().toISOString().slice(0, 10);
  }
  if (q) {
    where.push("(name LIKE @q OR phone LIKE @q OR cpf LIKE @q)");
    params.q = `%${q}%`;
  }

  let orderBy = "ORDER BY datetime(updated_at) DESC";
  if (sort === "priority") {
    // overdue/soonest follow-ups first, then hottest leads, then most recent vigencia
    orderBy = `ORDER BY
      CASE WHEN next_contact_date IS NULL THEN 1 ELSE 0 END,
      next_contact_date ASC,
      CASE lead_temperature WHEN 'quente' THEN 0 WHEN 'morno' THEN 1 ELSE 2 END,
      vigencia_date DESC`;
  } else if (sort === "vigencia_desc") {
    orderBy = "ORDER BY vigencia_date DESC";
  } else if (sort === "vigencia_asc") {
    orderBy = "ORDER BY vigencia_date ASC";
  } else if (sort === "name") {
    orderBy = "ORDER BY name ASC";
  } else if (sort === "next_contact") {
    orderBy = "ORDER BY CASE WHEN next_contact_date IS NULL THEN 1 ELSE 0 END, next_contact_date ASC";
  }

  const sql = `SELECT * FROM clients ${where.length ? "WHERE " + where.join(" AND ") : ""} ${orderBy}`;
  const rows = db.prepare(sql).all(params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, vigencia_date, broker } = body;
  const phone = body.phone || null;
  const cpf = body.cpf || null;
  const birth_date = body.birth_date || null;

  if (!name || !vigencia_date) {
    return NextResponse.json({ error: "Nome e data de vigência são obrigatórios." }, { status: 400 });
  }
  if (!BROKERS.includes(broker)) {
    return NextResponse.json({ error: "Corretor responsável inválido." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  db.prepare(
    `INSERT INTO clients (id, name, phone, cpf, birth_date, vigencia_date, broker, status, lead_temperature, next_contact_date, call_attempts, created_at, updated_at)
     VALUES (@id, @name, @phone, @cpf, @birth_date, @vigencia_date, @broker, @status, @lead_temperature, @next_contact_date, 0, @now, @now)`
  ).run({
    id,
    name,
    phone,
    cpf,
    birth_date,
    vigencia_date,
    broker,
    status: STATUSES[0],
    lead_temperature: TEMPERATURES[1],
    next_contact_date: body.next_contact_date || null,
    now,
  });

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  return NextResponse.json(client, { status: 201 });
}
