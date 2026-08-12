import { NextRequest, NextResponse } from "next/server";
import { db, ready } from "@/lib/db";

export async function POST(req: NextRequest) {
  await ready;
  const ramo = req.nextUrl.searchParams.get("ramo");
  if (ramo) {
    const result = await db.execute({ sql: "DELETE FROM clients WHERE ramo = ?", args: [ramo] });
    return NextResponse.json({ deleted: result.rowsAffected });
  }
  const result = await db.execute("DELETE FROM clients");
  return NextResponse.json({ deleted: result.rowsAffected });
}
