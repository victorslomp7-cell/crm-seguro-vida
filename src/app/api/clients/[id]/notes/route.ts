import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db, ready } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ready;
  const { id } = await params;
  const clientResult = await db.execute({ sql: "SELECT * FROM clients WHERE id = ?", args: [id] });
  if (!clientResult.rows[0]) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const body = await req.json();
  if (!body.text || !String(body.text).trim()) {
    return NextResponse.json({ error: "Texto da anotação é obrigatório." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const noteId = randomUUID();

  await db.execute({
    sql: "INSERT INTO notes (id, client_id, text, created_at) VALUES (@id, @client_id, @text, @created_at)",
    args: { id: noteId, client_id: id, text: String(body.text).trim(), created_at: now },
  });

  await db.execute({
    sql: "UPDATE clients SET updated_at = @now WHERE id = @id",
    args: { now, id },
  });

  const notesResult = await db.execute({
    sql: "SELECT * FROM notes WHERE client_id = ? ORDER BY datetime(created_at) DESC",
    args: [id],
  });

  return NextResponse.json(notesResult.rows, { status: 201 });
}
