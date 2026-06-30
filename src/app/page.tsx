import Link from "next/link";
import { db, ready } from "@/lib/db";
import { BROKERS, LOST_STATUSES, Status } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/ui";

export const dynamic = "force-dynamic";

async function getDashboardData() {
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
  const overdueFollowUps = (
    (
      await db.execute(
        "SELECT COUNT(*) AS c FROM clients WHERE next_contact_date IS NOT NULL AND next_contact_date <= date('now')"
      )
    ).rows[0] as unknown as { c: number }
  ).c;
  const byStatus = (await db.execute("SELECT status, COUNT(*) AS count FROM clients GROUP BY status"))
    .rows as unknown as { status: Status; count: number }[];

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

  return {
    total,
    contacted,
    closed,
    lost,
    conversionRate: total > 0 ? closed / total : 0,
    overdueFollowUps,
    byStatus,
    byBroker,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="subtitle">Visão geral da campanha de upsell de seguro de vida.</p>

      <div className="grid grid-stats section">
        <div className="card">
          <div className="stat-value">{data.total}</div>
          <div className="stat-label">Total de clientes</div>
        </div>
        <div className="card">
          <div className="stat-value">{data.contacted}</div>
          <div className="stat-label">Já contatados</div>
        </div>
        <div className="card">
          <div className="stat-value">{(data.conversionRate * 100).toFixed(1)}%</div>
          <div className="stat-label">Taxa de conversão</div>
        </div>
        <div className="card">
          <div className="stat-value">{data.closed}</div>
          <div className="stat-label">Fechados</div>
        </div>
        <div className="card">
          <div className="stat-value">{data.lost}</div>
          <div className="stat-label">Recusados / perdidos</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ color: data.overdueFollowUps > 0 ? "var(--danger)" : undefined }}>
            {data.overdueFollowUps}
          </div>
          <div className="stat-label">Follow-ups atrasados/hoje</div>
        </div>
      </div>

      {data.overdueFollowUps > 0 && (
        <div className="card section" style={{ borderColor: "var(--danger)", background: "#fff5f5" }}>
          <strong style={{ color: "var(--danger)" }}>
            {data.overdueFollowUps} cliente(s) com follow-up vencido ou para hoje.
          </strong>{" "}
          <Link href="/clientes?dueOnly=1" className="btn btn-sm" style={{ marginLeft: 10 }}>
            Ver lista
          </Link>
        </div>
      )}

      <div className="two-col section">
        <div className="card">
          <h2>Performance por corretor</h2>
          <table>
            <thead>
              <tr>
                <th>Corretor</th>
                <th>Total</th>
                <th>Contatados</th>
                <th>Fechados</th>
                <th>Perdidos</th>
                <th>Conversão</th>
              </tr>
            </thead>
            <tbody>
              {data.byBroker.map((b) => (
                <tr key={b.broker}>
                  <td>{b.broker}</td>
                  <td>{b.total}</td>
                  <td>{b.contacted}</td>
                  <td>{b.closed}</td>
                  <td>{b.lost}</td>
                  <td>{(b.conversionRate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Clientes por status</h2>
          {data.byStatus.length === 0 ? (
            <p className="subtitle">Nenhum cliente cadastrado ainda.</p>
          ) : (
            <div>
              {data.byStatus.map((s) => {
                const colors = STATUS_COLORS[s.status] ?? { bg: "#eef0f4", fg: "#475467" };
                const pct = data.total > 0 ? (s.count / data.total) * 100 : 0;
                return (
                  <div key={s.status} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>{s.status}</span>
                      <span>{s.count}</span>
                    </div>
                    <div style={{ background: "#eef0f4", borderRadius: 6, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, background: colors.fg, height: "100%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {data.total === 0 && (
        <div className="card empty-state">
          <p>Você ainda não tem clientes cadastrados.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
            <Link href="/importar" className="btn btn-primary">
              Importar planilha
            </Link>
            <Link href="/clientes/novo" className="btn">
              Cadastrar manualmente
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
