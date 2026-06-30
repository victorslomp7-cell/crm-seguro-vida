import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { BROKERS, STATUSES, TEMPERATURES } from "@/lib/types";

const EDITABLE_FIELDS = [
  "name",
  "phone",
  "vigencia_date",
  "broker",
  "status",
  "lead_temperature",
  "next_contact_date",
] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const notes = db
    .prepare("SELECT * FROM notes WHERE client_id = ? ORDER BY datetime(created_at) DESC")
    .all(id);

  return NextResponse.json({ client, notes });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
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
  const data: Record<string, unknown> = { id };
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

  db.prepare(`UPDATE clients SET ${updates.join(", ")} WHERE id = @id`).run(data);
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  return NextResponse.json(client);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
