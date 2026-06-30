import { NextResponse } from "next/server";
import { db, ready } from "@/lib/db";
import { ASSIGNABLE_BROKERS } from "@/lib/types";

export async function POST() {
  await ready;

  const unassignedResult = await db.execute({
    sql: "SELECT id FROM clients WHERE broker = 'Não atribuído'",
    args: [],
  });
  const ids = unassignedResult.rows.map((r) => (r as unknown as { id: string }).id);

  if (ids.length === 0) {
    return NextResponse.json({ assigned: 0, victor: 0, lucas: 0 });
  }

  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  const half = Math.ceil(ids.length / 2);
  const now = new Date().toISOString();
  const statements = ids.map((id, idx) => ({
    sql: "UPDATE clients SET broker = @broker, updated_at = @now WHERE id = @id",
    args: { id, broker: idx < half ? ASSIGNABLE_BROKERS[0] : ASSIGNABLE_BROKERS[1], now },
  }));

  await db.batch(statements, "write");

  return NextResponse.json({ assigned: ids.length, victor: half, lucas: ids.length - half });
}
