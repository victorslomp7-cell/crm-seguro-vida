"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { BROKERS, Client, Note, STATUSES, TEMPERATURES, TIPOS_OUTROS } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, whatsappLink } from "@/lib/ui";

const SCRIPT_SUGGESTIONS: Record<string, string> = {
  "Não contatado":
    "Olá {nome}, tudo bem? Aqui é da [Corretora]. Vi que seu seguro está vigente desde {vigencia} e gostaria de conversar sobre a renovação e possíveis melhorias na sua cobertura {tipo}. Posso te explicar em 2 minutos?",
  "Em tentativa de contato":
    "Olá {nome}, tentei falar com você outras vezes sobre sua apólice de seguro {tipo}. Esse é um bom horário para conversarmos rapidamente sobre a renovação?",
  Interessado:
    "Que bom que você tem interesse, {nome}! Vou te enviar os detalhes e valores da proposta de seguro {tipo} para você avaliar com calma. Posso te ligar amanhã para tirar dúvidas?",
  "Proposta enviada":
    "Oi {nome}, só confirmando se você recebeu a proposta do seguro {tipo} que te enviei. Ficou alguma dúvida sobre coberturas ou valores?",
};

export default function ClienteResidencialDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  useEffect(() => { load(); }, [load]);

  async function patchClient(fields: Record<string, unknown>) {
    setSaving(true); setMessage("");
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
    if (res.ok) { const data = await res.json(); setNotes(data); setNoteText(""); load(); }
    setSavingNote(false);
  }

  async function logCallAttempt() {
    await patchClient({ incrementCallAttempts: true, status: client?.status === "Não contatado" ? "Em tentativa de contato" : undefined });
    load();
  }

  async function deleteClient() {
    if (!confirm("Tem certeza que deseja excluir este cliente? Essa ação não pode ser desfeita.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    router.push("/residencial/clientes");
  }

  if (loading) return <p className="subtitle">Carregando...</p>;
  if (!client) return <div className="empty-state">Cliente não encontrado.</div>;

  const tipoLabel = client.tipo || "seguro";
  const scriptTemplate = SCRIPT_SUGGESTIONS[client.status];
  const scriptText = scriptTemplate
    ? scriptTemplate.replace("{nome}", client.name).replace("{vigencia}", formatDate(client.vigencia_date)).replace(/\{tipo\}/g, tipoLabel)
    : null;

  const waLink = whatsappLink(client.phone);
  const waScriptLink = whatsappLink(client.phone, scriptText || undefined);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>{client.name}</h1>
          <p className="subtitle">
            {client.tipo ? <strong style={{ marginRight: 6 }}>{client.tipo}</strong> : null}
            {client.phone || "Sem telefone"} · Vigência em {formatDate(client.vigencia_date)} · Corretor: {client.broker}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {waLink && <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Abrir WhatsApp</a>}
          <button className="btn btn-danger" onClick={deleteClient}>Excluir</button>
        </div>
      </div>

      <div className="two-col section">
        <div>
          <div className="card section">
            <h2>Dados do cliente</h2>
            <div className="field">
              <label>Segmento</label>
              <select value={client.tipo || ""} onChange={(e) => patchClient({ tipo: e.target.value || null })} disabled={saving}>
                <option value="">Não definido</option>
                {TIPOS_OUTROS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Telefone</label>
              <input defaultValue={client.phone || ""} placeholder="(11) 99999-9999" onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== client.phone) patchClient({ phone: v }); }} disabled={saving} />
            </div>
            <div className="field">
              <label>CPF / CNPJ</label>
              <input defaultValue={client.cpf || ""} placeholder="000.000.000-00" onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== client.cpf) patchClient({ cpf: v }); }} disabled={saving} />
            </div>
          </div>

          <div className="card section">
            <h2>Status do contato</h2>
            <div className="field">
              <label>Status</label>
              <select value={client.status} onChange={(e) => patchClient({ status: e.target.value })} disabled={saving}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Classificação do lead</label>
              <select value={client.lead_temperature} onChange={(e) => patchClient({ lead_temperature: e.target.value })} disabled={saving}>
                {TEMPERATURES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Corretor responsável</label>
              <select value={client.broker} onChange={(e) => patchClient({ broker: e.target.value })} disabled={saving}>
                {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Próximo contato</label>
              <input type="date" defaultValue={client.next_contact_date || ""} onBlur={(e) => { const v = e.target.value || null; if (v !== client.next_contact_date) patchClient({ next_contact_date: v }); }} disabled={saving} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="subtitle" style={{ margin: 0 }}>Tentativas de ligação: <strong>{client.call_attempts}</strong></span>
              <button className="btn btn-sm" onClick={logCallAttempt} disabled={saving}>Registrar tentativa</button>
            </div>
            {message && <p className="success-text">{message}</p>}
          </div>

          {scriptText && (
            <div className="card section">
              <h2>Sugestão de script</h2>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>{scriptText}</p>
              {waScriptLink && <a href={waScriptLink} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ marginTop: 10 }}>Enviar pelo WhatsApp</a>}
            </div>
          )}

          <div className="card">
            <h2>Resumo</h2>
            <div className="kv"><span>Status atual</span><StatusBadge status={client.status} /></div>
            <div className="kv"><span>Classificação</span><span><span className={`temp-dot temp-${client.lead_temperature}`} />{client.lead_temperature}</span></div>
            <div className="kv"><span>Segmento</span><span>{client.tipo || "—"}</span></div>
            <div className="kv"><span>Última atualização</span><span>{new Date(client.updated_at).toLocaleString("pt-BR")}</span></div>
            <div className="kv"><span>Cadastrado em</span><span>{new Date(client.created_at).toLocaleString("pt-BR")}</span></div>
          </div>
        </div>

        <div className="card">
          <h2>Anotações / histórico de contato</h2>
          <p className="subtitle">Registre detalhes do imóvel, objeções, combinados de retorno e tudo o que for relevante.</p>
          <div className="field">
            <textarea rows={4} placeholder="Ex: Imóvel de 200m², cliente quer cobertura completa, aguardando avaliação do bem..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={addNote} disabled={savingNote || !noteText.trim()}>{savingNote ? "Salvando..." : "Adicionar anotação"}</button>
          <div className="notes-list">
            {notes.length === 0 ? <p className="subtitle">Nenhuma anotação ainda.</p> : notes.map((n) => (
              <div className="note-item" key={n.id}>
                <div className="note-date">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
                <div>{n.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
