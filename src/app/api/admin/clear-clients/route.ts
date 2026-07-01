import { NextResponse } from "next/server";
import { db, ready } from "@/lib/db";

export async function POST() {
  await ready;
  const result = await db.execute("DELETE FROM clients");
  return NextResponse.json({ deleted: result.rowsAffected });
}
