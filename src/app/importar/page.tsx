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
        Envie um arquivo .xlsx ou .csv com as colunas: Nome, Telefone e Data de início de vigência. Você
        também pode incluir uma coluna &ldquo;Corretor&rdquo; — se não houver, será usado o corretor padrão selecionado abaixo.
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
    </div>
  );
}
