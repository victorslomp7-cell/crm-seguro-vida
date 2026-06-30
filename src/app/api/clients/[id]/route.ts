import { NextRequest, NextResponse } from "next/server";
import type { InValue } from "@libsql/client";
import { db, ready } from "@/lib/db";
import { BROKERS, STATUSES, TEMPERATURES } from "@/lib/types";

const EDITABLE_FIELDS = [
  "name",
  "phone",
  "cpf",
  "birth_date",
  "vigencia_date",
  "broker",
  "status",
  "lead_temperature",
  "next_contact_date",
] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ready;
  const { id } = await params;
  const clientResult = await db.execute({ sql: "SELECT * FROM clients WHERE id = ?", args: [id] });
  const client = clientResult.rows[0];
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const notesResult = await db.execute({
    sql: "SELECT * FROM notes WHERE client_id = ? ORDER BY datetime(created_at) DESC",
    args: [id],
  });

  return NextResponse.json({ client, notes: notesResult.rows });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ready;
  const { id } = await params;
  const existingResult = await db.execute({ sql: "SELECT * FROM clients WHERE id = ?", args: [id] });
  const existing = existingResult.rows[0];
  if (!existing) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const body = await req.json();

  if (body.broker && !BROKERS.includes(body.broker)) {
    return NextResponse.json({ error: "Corretor inválido." }, { status: 400 });
  }
  if (body.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }
  if (body.lead_temperature && !TEMPERATURES.includes(body.lead_temperature)) {
    return NextResponse.json({ error: "Classificação de lead inválida." }, { status: 400 });
  }

  const updates: string[] = [];
  const data: Record<string, InValue> = { id };
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      updates.push(`${field} = @${field}`);
      data[field] = body[field];
    }
  }
  if (body.incrementCallAttempts) {
    updates.push("call_attempts = call_attempts + 1");
  }
  if (!updates.length) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  data.updated_at = new Date().toISOString();
  updates.push("updated_at = @updated_at");

  await db.execute({
    sql: `UPDATE clients SET ${updates.join(", ")} WHERE id = @id`,
    args: data,
  });
  const clientResult = await db.execute({ sql: "SELECT * FROM clients WHERE id = ?", args: [id] });
  return NextResponse.json(clientResult.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ready;
  const { id } = await params;
  await db.execute({ sql: "DELETE FROM clients WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
