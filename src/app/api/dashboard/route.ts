import { NextResponse } from "next/server";
import { db, ready } from "@/lib/db";
import { BROKERS, LOST_STATUSES } from "@/lib/types";

export async function GET() {
  await ready;
  const total = ((await db.execute("SELECT COUNT(*) AS c FROM clients")).rows[0] as unknown as { c: number }).c;

  const contacted = (
    (await db.execute("SELECT COUNT(*) AS c FROM clients WHERE status != 'Não contatado'")).rows[0] as unknown as {
      c: number;
    }
  ).c;

  const closed = (
    (await db.execute("SELECT COUNT(*) AS c FROM clients WHERE status = 'Fechado'")).rows[0] as unknown as {
      c: number;
    }
  ).c;

  const lost = (
    (
      await db.execute({
        sql: `SELECT COUNT(*) AS c FROM clients WHERE status IN (${LOST_STATUSES.map(() => "?").join(",")})`,
        args: LOST_STATUSES as unknown as string[],
      })
    ).rows[0] as unknown as { c: number }
  ).c;

  const conversionRate = total > 0 ? closed / total : 0;

  const byStatus = (await db.execute("SELECT status, COUNT(*) AS count FROM clients GROUP BY status")).rows;

  const overdueFollowUps = (
    (
      await db.execute(
        "SELECT COUNT(*) AS c FROM clients WHERE next_contact_date IS NOT NULL AND next_contact_date <= date('now')"
      )
    ).rows[0] as unknown as { c: number }
  ).c;

  const byBroker = await Promise.all(
    BROKERS.map(async (broker) => {
      const brokerTotal = (
        (await db.execute({ sql: "SELECT COUNT(*) AS c FROM clients WHERE broker = ?", args: [broker] }))
          .rows[0] as unknown as { c: number }
      ).c;
      const brokerContacted = (
        (
          await db.execute({
            sql: "SELECT COUNT(*) AS c FROM clients WHERE broker = ? AND status != 'Não contatado'",
            args: [broker],
          })
        ).rows[0] as unknown as { c: number }
      ).c;
      const brokerClosed = (
        (
          await db.execute({
            sql: "SELECT COUNT(*) AS c FROM clients WHERE broker = ? AND status = 'Fechado'",
            args: [broker],
          })
        ).rows[0] as unknown as { c: number }
      ).c;
      const brokerLost = (
        (
          await db.execute({
            sql: `SELECT COUNT(*) AS c FROM clients WHERE broker = ? AND status IN (${LOST_STATUSES.map(() => "?").join(",")})`,
            args: [broker, ...LOST_STATUSES] as unknown as string[],
          })
        ).rows[0] as unknown as { c: number }
      ).c;
      return {
        broker,
        total: brokerTotal,
        contacted: brokerContacted,
        closed: brokerClosed,
        lost: brokerLost,
        conversionRate: brokerTotal > 0 ? brokerClosed / brokerTotal : 0,
      };
    })
  );

  return NextResponse.json({
    total,
    contacted,
    closed,
    lost,
    conversionRate,
    overdueFollowUps,
    byStatus,
    byBroker,
  });
}
