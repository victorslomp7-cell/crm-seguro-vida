"use client";

import { useState } from "react";
import Link from "next/link";
import { BROKERS } from "@/lib/types";

interface ImportResult {
  imported: number;
  total: number;
  errors: { row: number; reason: string }[];
}

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [defaultBroker, setDefaultBroker] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [distributing, setDistributing] = useState(false);
  const [distributeResult, setDistributeResult] = useState<{ assigned: number; victor: number; lucas: number } | null>(
    null
  );
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  async function handleClear() {
    if (!confirm("Tem certeza? Isso vai apagar TODOS os clientes permanentemente. Essa ação não pode ser desfeita."))
      return;
    setClearing(true);
    setClearResult(null);
    try {
      const res = await fetch("/api/admin/clear-clients", { method: "POST" });
      const data = await res.json();
      if (res.ok) setClearResult(`${data.deleted} cliente(s) removido(s).`);
    } finally {
      setClearing(false);
    }
  }

  async function handleDistribute() {
    setDistributing(true);
    setDistributeResult(null);
    try {
      const res = await fetch("/api/admin/distribute-brokers", { method: "POST" });
      const data = await res.json();
      if (res.ok) setDistributeResult(data);
    } finally {
      setDistributing(false);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (defaultBroker) formData.append("broker", defaultBroker);
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao importar planilha.");
        return;
      }
      setResult(data);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1>Importar planilha</h1>
      <p className="subtitle">
        Envie um arquivo .xlsx ou .csv com as colunas: Nome e Data de início de vigência (obrigatórias).
        Telefone, CPF e Data de nascimento são opcionais. Você também pode incluir uma coluna &ldquo;Corretor&rdquo;
        — se não houver, será usado o corretor padrão selecionado abaixo ou, na ausência dele, &ldquo;Não atribuído&rdquo;.
      </p>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="field">
          <label>Corretor responsável padrão (usado quando a planilha não tiver essa coluna)</label>
          <select value={defaultBroker} onChange={(e) => setDefaultBroker(e.target.value)}>
            <option value="">Nenhum (planilha deve ter coluna &ldquo;Corretor&rdquo;)</option>
            {BROKERS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Arquivo (.xlsx ou .csv)</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "Importando..." : "Importar"}
        </button>
      </div>

      {result && (
        <div className="card section" style={{ marginTop: 20 }}>
          <h2>Resultado da importação</h2>
          <p>
            <strong>{result.imported}</strong> de <strong>{result.total}</strong> linhas importadas com sucesso.
          </p>
          {result.errors.length > 0 && (
            <>
              <p className="error-text" style={{ marginTop: 10 }}>
                {result.errors.length} linha(s) com problema:
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td>{e.row}</td>
                      <td>{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <Link href="/clientes" className="btn btn-primary" style={{ marginTop: 14, display: "inline-block" }}>
            Ver clientes importados
          </Link>
        </div>
      )}

      <div className="card section" style={{ maxWidth: 560, borderColor: "var(--danger)" }}>
        <h2 style={{ color: "var(--danger)" }}>Remover todos os clientes</h2>
        <p className="subtitle">Apaga permanentemente todos os clientes do banco. Use antes de importar uma nova planilha.</p>
        <button className="btn" style={{ background: "var(--danger)", color: "#fff" }} onClick={handleClear} disabled={clearing}>
          {clearing ? "Removendo..." : "Apagar todos os clientes"}
        </button>
        {clearResult && <p style={{ marginTop: 10 }}>{clearResult}</p>}
      </div>

      <div className="card section" style={{ maxWidth: 560 }}>
        <h2>Distribuir corretores</h2>
        <p className="subtitle">
          Divide automaticamente todos os clientes com corretor &ldquo;Não atribuído&rdquo; entre Victor e Lucas,
          50% para cada um, em ordem embaralhada (não segue a ordem da planilha).
        </p>
        <button className="btn" onClick={handleDistribute} disabled={distributing}>
          {distributing ? "Distribuindo..." : "Distribuir 50/50"}
        </button>
        {distributeResult && (
          <p style={{ marginTop: 10 }}>
            {distributeResult.assigned === 0
              ? "Nenhum cliente sem corretor encontrado."
              : `${distributeResult.assigned} cliente(s) distribuído(s): ${distributeResult.victor} para Victor, ${distributeResult.lucas} para Lucas.`}
          </p>
        )}
      </div>
    </div>
  );
}
