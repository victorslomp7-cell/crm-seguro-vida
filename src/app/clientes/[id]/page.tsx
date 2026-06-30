"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { BROKERS, Client, Note, STATUSES, TEMPERATURES } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, whatsappLink } from "@/lib/ui";

const SCRIPT_SUGGESTIONS: Record<string, string> = {
  "Não contatado":
    "Olá {nome}, tudo bem? Aqui é da [Corretora]. Vi que sua apólice está vigente desde {vigencia} e eu gostaria de te apresentar uma proteção extra para você e sua família: o seguro de vida. Posso te explicar em 2 minutos?",
  "Em tentativa de contato":
    "Olá {nome}, tentei falar com você outras vezes sobre uma oportunidade de proteção para sua família. Esse é um bom horário para conversarmos rapidamente?",
  Interessado:
    "Que bom que você tem interesse, {nome}! Vou te enviar os detalhes e valores do seguro de vida para você avaliar com calma. Posso te ligar amanhã para tirar dúvidas?",
  "Proposta enviada":
    "Oi {nome}, só confirmando se você recebeu a proposta do seguro de vida que te enviei. Ficou alguma dúvida sobre coberturas ou valores?",
};

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/${id}`);
    if (res.ok) {
      const data = await res.json();
      setClient(data.client);
      setNotes(data.notes);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function patchClient(fields: Record<string, unknown>) {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const data = await res.json();
      setClient(data);
      setMessage("Salvo.");
      setTimeout(() => setMessage(""), 1500);
    }
    setSaving(false);
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setSavingNote(true);
    const res = await fetch(`/api/clients/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noteText.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotes(data);
      setNoteText("");
      load();
    }
    setSavingNote(false);
  }

  async function logCallAttempt() {
    await patchClient({ incrementCallAttempts: true, status: client?.status === "Não contatado" ? "Em tentativa de contato" : undefined });
    load();
  }

  async function deleteClient() {
    if (!confirm("Tem certeza que deseja excluir este cliente? Essa ação não pode ser desfeita.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    router.push("/clientes");
  }

  if (loading) return <p className="subtitle">Carregando...</p>;
  if (!client) return <div className="empty-state">Cliente não encontrado.</div>;

  const scriptTemplate = SCRIPT_SUGGESTIONS[client.status];
  const scriptText = scriptTemplate
    ? scriptTemplate.replace("{nome}", client.name).replace("{vigencia}", formatDate(client.vigencia_date))
    : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>{client.name}</h1>
          <p className="subtitle">
            {client.phone} · Vigência em {formatDate(client.vigencia_date)} · Corretor: {client.broker}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={whatsappLink(client.phone)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Abrir WhatsApp
          </a>
          <button className="btn btn-danger" onClick={deleteClient}>
            Excluir
          </button>
        </div>
      </div>

      <div className="two-col section">
        <div>
          <div className="card section">
            <h2>Status do contato</h2>
            <div className="field">
              <label>Status</label>
              <select
                value={client.status}
                onChange={(e) => patchClient({ status: e.target.value })}
                disabled={saving}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Classificação do lead</label>
              <select
                value={client.lead_temperature}
                onChange={(e) => patchClient({ lead_temperature: e.target.value })}
                disabled={saving}
              >
                {TEMPERATURES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Corretor responsável</label>
              <select
                value={client.broker}
                onChange={(e) => patchClient({ broker: e.target.value })}
                disabled={saving}
              >
                {BROKERS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Próximo contato</label>
              <input
                type="date"
                value={client.next_contact_date || ""}
                onChange={(e) => patchClient({ next_contact_date: e.target.value || null })}
                disabled={saving}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="subtitle" style={{ margin: 0 }}>
                Tentativas de ligação: <strong>{client.call_attempts}</strong>
              </span>
              <button className="btn btn-sm" onClick={logCallAttempt} disabled={saving}>
                Registrar tentativa de ligação
              </button>
            </div>
            {message && <p className="success-text">{message}</p>}
          </div>

          {scriptText && (
            <div className="card section">
              <h2>Sugestão de script</h2>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>{scriptText}</p>
              <a
                href={whatsappLink(client.phone, scriptText)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm"
                style={{ marginTop: 10 }}
              >
                Enviar pelo WhatsApp
              </a>
            </div>
          )}

          <div className="card">
            <h2>Resumo</h2>
            <div className="kv">
              <span>Status atual</span>
              <StatusBadge status={client.status} />
            </div>
            <div className="kv">
              <span>Classificação</span>
              <span>
                <span className={`temp-dot temp-${client.lead_temperature}`} />
                {client.lead_temperature}
              </span>
            </div>
            <div className="kv">
              <span>Última atualização</span>
              <span>{new Date(client.updated_at).toLocaleString("pt-BR")}</span>
            </div>
            <div className="kv">
              <span>Cadastrado em</span>
              <span>{new Date(client.created_at).toLocaleString("pt-BR")}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Anotações / histórico de contato</h2>
          <p className="subtitle">
            Registre objeções, momento de vida do cliente, combinados de retorno e tudo o que for relevante.
          </p>
          <div className="field">
            <textarea
              rows={4}
              placeholder="Ex: Cliente disse que está sem orçamento agora, combinamos de retornar em 30 dias..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={addNote} disabled={savingNote || !noteText.trim()}>
            {savingNote ? "Salvando..." : "Adicionar anotação"}
          </button>

          <div className="notes-list">
            {notes.length === 0 ? (
              <p className="subtitle">Nenhuma anotação ainda.</p>
            ) : (
              notes.map((n) => (
                <div className="note-item" key={n.id}>
                  <div className="note-date">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
                  <div>{n.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
