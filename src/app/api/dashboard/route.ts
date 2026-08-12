import { NextRequest, NextResponse } from "next/server";
import { db, ready } from "@/lib/db";
import { BROKERS, LOST_STATUSES } from "@/lib/types";

export async function GET(req: NextRequest) {
  await ready;
  const ramo = req.nextUrl.searchParams.get("ramo") || "vida";

  const total = ((await db.execute({ sql: `SELECT COUNT(*) AS c FROM clients WHERE ramo = ?`, args: [ramo] })).rows[0] as unknown as { c: number }).c;

  const contacted = ((await db.execute({ sql: `SELECT COUNT(*) AS c FROM clients WHERE ramo = ? AND status != 'Não contatado'`, args: [ramo] })).rows[0] as unknown as { c: number }).c;

  const closed = ((await db.execute({ sql: `SELECT COUNT(*) AS c FROM clients WHERE ramo = ? AND status = 'Fechado'`, args: [ramo] })).rows[0] as unknown as { c: number }).c;

  const lost = ((await db.execute({
    sql: `SELECT COUNT(*) AS c FROM clients WHERE ramo = ? AND status IN (${LOST_STATUSES.map(() => "?").join(",")})`,
    args: [ramo, ...LOST_STATUSES],
  })).rows[0] as unknown as { c: number }).c;

  const conversionRate = total > 0 ? closed / total : 0;

  const byStatus = (await db.execute({ sql: `SELECT status, COUNT(*) AS count FROM clients WHERE ramo = ? GROUP BY status`, args: [ramo] })).rows;

  const overdueFollowUps = ((await db.execute({ sql: `SELECT COUNT(*) AS c FROM clients WHERE ramo = ? AND next_contact_date IS NOT NULL AND next_contact_date <= date('now')`, args: [ramo] })).rows[0] as unknown as { c: number }).c;

  const byBroker = await Promise.all(
    BROKERS.map(async (broker) => {
      const brokerTotal = ((await db.execute({ sql: `SELECT COUNT(*) AS c FROM clients WHERE ramo = ? AND broker = ?`, args: [ramo, broker] })).rows[0] as unknown as { c: number }).c;
      const brokerContacted = ((await db.execute({ sql: `SELECT COUNT(*) AS c FROM clients WHERE ramo = ? AND broker = ? AND status != 'Não contatado'`, args: [ramo, broker] })).rows[0] as unknown as { c: number }).c;
      const brokerClosed = ((await db.execute({ sql: `SELECT COUNT(*) AS c FROM clients WHERE ramo = ? AND broker = ? AND status = 'Fechado'`, args: [ramo, broker] })).rows[0] as unknown as { c: number }).c;
      const brokerLost = ((await db.execute({
        sql: `SELECT COUNT(*) AS c FROM clients WHERE ramo = ? AND broker = ? AND status IN (${LOST_STATUSES.map(() => "?").join(",")})`,
        args: [ramo, broker, ...LOST_STATUSES],
      })).rows[0] as unknown as { c: number }).c;
      return { broker, total: brokerTotal, contacted: brokerContacted, closed: brokerClosed, lost: brokerLost, conversionRate: brokerTotal > 0 ? brokerClosed / brokerTotal : 0 };
    })
  );

  return NextResponse.json({ total, contacted, closed, lost, conversionRate, overdueFollowUps, byStatus, byBroker });
}
