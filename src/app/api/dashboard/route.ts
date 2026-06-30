import { NextResponse } from "next/server";
import db from "@/lib/db";
import { BROKERS, LOST_STATUSES } from "@/lib/types";

export async function GET() {
  const total = (db.prepare("SELECT COUNT(*) AS c FROM clients").get() as { c: number }).c;

  const contacted = (
    db
      .prepare("SELECT COUNT(*) AS c FROM clients WHERE status != 'Não contatado'")
      .get() as { c: number }
  ).c;

  const closed = (
    db.prepare("SELECT COUNT(*) AS c FROM clients WHERE status = 'Fechado'").get() as {
      c: number;
    }
  ).c;

  const lost = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM clients WHERE status IN (${LOST_STATUSES.map(() => "?").join(",")})`
      )
      .get(...LOST_STATUSES) as { c: number }
  ).c;

  const conversionRate = total > 0 ? closed / total : 0;

  const byStatus = db
    .prepare("SELECT status, COUNT(*) AS count FROM clients GROUP BY status")
    .all();

  const overdueFollowUps = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM clients WHERE next_contact_date IS NOT NULL AND next_contact_date <= date('now')"
      )
      .get() as { c: number }
  ).c;

  const byBroker = BROKERS.map((broker) => {
    const brokerTotal = (
      db.prepare("SELECT COUNT(*) AS c FROM clients WHERE broker = ?").get(broker) as {
        c: number;
      }
    ).c;
    const brokerContacted = (
      db
        .prepare("SELECT COUNT(*) AS c FROM clients WHERE broker = ? AND status != 'Não contatado'")
        .get(broker) as { c: number }
    ).c;
    const brokerClosed = (
      db
        .prepare("SELECT COUNT(*) AS c FROM clients WHERE broker = ? AND status = 'Fechado'")
        .get(broker) as { c: number }
    ).c;
    const brokerLost = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM clients WHERE broker = ? AND status IN (${LOST_STATUSES.map(() => "?").join(",")})`
        )
        .get(broker, ...LOST_STATUSES) as { c: number }
    ).c;
    return {
      broker,
      total: brokerTotal,
      contacted: brokerContacted,
      closed: brokerClosed,
      lost: brokerLost,
      conversionRate: brokerTotal > 0 ? brokerClosed / brokerTotal : 0,
    };
  });

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
