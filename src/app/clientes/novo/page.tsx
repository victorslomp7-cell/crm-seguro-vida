"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BROKERS } from "@/lib/types";

export default function NovoClientePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vigenciaDate, setVigenciaDate] = useState("");
  const [broker, setBroker] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, vigencia_date: vigenciaDate, broker }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar cliente.");
        return;
      }
      router.push(`/clientes/${data.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>Novo cliente</h1>
      <p className="subtitle">Cadastre manualmente um segurado para a campanha de upsell.</p>

      <form className="card" style={{ maxWidth: 480 }} onSubmit={handleSubmit}>
        <div className="field">
          <label>Nome *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Telefone *</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            required
          />
        </div>
        <div className="field">
          <label>Data de início de vigência *</label>
          <input
            type="date"
            value={vigenciaDate}
            onChange={(e) => setVigenciaDate(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Corretor responsável *</label>
          <select value={broker} onChange={(e) => setBroker(e.target.value)} required>
            <option value="">Selecione...</option>
            {BROKERS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar cliente"}
        </button>
      </form>
    </div>
  );
}
