import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const body = await req.json();
  if (!body.text || !String(body.text).trim()) {
    return NextResponse.json({ error: "Texto da anotação é obrigatório." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const noteId = randomUUID();

  db.prepare(
    "INSERT INTO notes (id, client_id, text, created_at) VALUES (@id, @client_id, @text, @created_at)"
  ).run({ id: noteId, client_id: id, text: String(body.text).trim(), created_at: now });

  db.prepare("UPDATE clients SET updated_at = @now WHERE id = @id").run({ now, id });

  const notes = db
    .prepare("SELECT * FROM notes WHERE client_id = ? ORDER BY datetime(created_at) DESC")
    .all(id);

  return NextResponse.json(notes, { status: 201 });
}
