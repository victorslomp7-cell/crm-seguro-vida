"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BROKERS, Client, STATUSES, TEMPERATURES } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, isOverdue, whatsappLink } from "@/lib/ui";

function ClientesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [broker, setBroker] = useState(searchParams.get("broker") || "");
  const [temperature, setTemperature] = useState(searchParams.get("temperature") || "");
  const [vigenciaFrom, setVigenciaFrom] = useState(searchParams.get("vigenciaFrom") || "");
  const [vigenciaTo, setVigenciaTo] = useState(searchParams.get("vigenciaTo") || "");
  const [nextContactFrom, setNextContactFrom] = useState(searchParams.get("nextContactFrom") || "");
  const [nextContactTo, setNextContactTo] = useState(searchParams.get("nextContactTo") || "");
  const [dueOnly, setDueOnly] = useState(searchParams.get("dueOnly") === "1");
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "priority");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (broker) params.set("broker", broker);
    if (temperature) params.set("temperature", temperature);
    if (vigenciaFrom) params.set("vigenciaFrom", vigenciaFrom);
    if (vigenciaTo) params.set("vigenciaTo", vigenciaTo);
    if (nextContactFrom) params.set("nextContactFrom", nextContactFrom);
    if (nextContactTo) params.set("nextContactTo", nextContactTo);
    if (dueOnly) params.set("dueOnly", "1");
    if (q) params.set("q", q);
    params.set("sort", sort);
    return params.toString();
  }, [status, broker, temperature, vigenciaFrom, vigenciaTo, nextContactFrom, nextContactTo, dueOnly, q, sort]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/clients?${query}`)
      .then((r) => r.json())
      .then((data) => setClients(data))
      .finally(() => setLoading(false));
    router.replace(`/clientes?${query}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Clientes</h1>
          <p className="subtitle">{clients.length} cliente(s) encontrados.</p>
        </div>
        <Link href="/clientes/novo" className="btn btn-primary">
          + Novo cliente
        </Link>
      </div>

      <div className="card section">
        <div className="filters">
          <div className="filter-field">
            <label>Buscar</label>
            <input placeholder="Nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="filter-field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label>Corretor</label>
            <select value={broker} onChange={(e) => setBroker(e.target.value)}>
              <option value="">Todos</option>
              {BROKERS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label>Classificação</label>
            <select value={temperature} onChange={(e) => setTemperature(e.target.value)}>
              <option value="">Todas</option>
              {TEMPERATURES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label>Vigência de</label>
            <input type="date" value={vigenciaFrom} onChange={(e) => setVigenciaFrom(e.target.value)} />
          </div>
          <div className="filter-field">
            <label>Vigência até</label>
            <input type="date" value={vigenciaTo} onChange={(e) => setVigenciaTo(e.target.value)} />
          </div>
          <div className="filter-field">
            <label>Próx. contato de</label>
            <input type="date" value={nextContactFrom} onChange={(e) => setNextContactFrom(e.target.value)} />
          </div>
          <div className="filter-field">
            <label>Próx. contato até</label>
            <input type="date" value={nextContactTo} onChange={(e) => setNextContactTo(e.target.value)} />
          </div>
          <div className="filter-field">
            <label>Ordenar por</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="priority">Prioridade (recomendado)</option>
              <option value="next_contact">Próximo contato</option>
              <option value="vigencia_desc">Vigência (mais recente)</option>
              <option value="vigencia_asc">Vigência (mais antiga)</option>
              <option value="name">Nome (A-Z)</option>
            </select>
          </div>
          <div className="filter-field" style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 9 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={dueOnly}
              onChange={(e) => setDueOnly(e.target.checked)}
              id="dueOnly"
            />
            <label htmlFor="dueOnly" style={{ marginBottom: 0 }}>
              Só follow-up vencido
            </label>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => {
              setStatus("");
              setBroker("");
              setTemperature("");
              setVigenciaFrom("");
              setVigenciaTo("");
              setNextContactFrom("");
              setNextContactTo("");
              setDueOnly(false);
              setQ("");
              setSort("priority");
            }}
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="subtitle">Carregando...</p>
        ) : clients.length === 0 ? (
          <div className="empty-state">Nenhum cliente encontrado com esses filtros.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Corretor</th>
                <th>Status</th>
                <th>Lead</th>
                <th>Vigência</th>
                <th>Próx. contato</th>
                <th>Tentativas</th>
                <th>WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className={`row-link${isOverdue(c.next_contact_date) ? " overdue" : ""}`}
                  onClick={() => router.push(`/clientes/${c.id}`)}
                >
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.broker}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    <span className={`temp-dot temp-${c.lead_temperature}`} />
                    {c.lead_temperature}
                  </td>
                  <td>{formatDate(c.vigencia_date)}</td>
                  <td style={{ color: isOverdue(c.next_contact_date) ? "var(--danger)" : undefined, fontWeight: isOverdue(c.next_contact_date) ? 600 : 400 }}>
                    {formatDate(c.next_contact_date)}
                  </td>
                  <td>{c.call_attempts}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <a
                      href={whatsappLink(c.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm"
                    >
                      Abrir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function ClientesPage() {
  return (
    <Suspense fallback={<p className="subtitle">Carregando...</p>}>
      <ClientesContent />
    </Suspense>
  );
}
