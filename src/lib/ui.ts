import { Status, Temperature } from "./types";

export const STATUS_COLORS: Record<Status, { bg: string; fg: string }> = {
  "Não contatado": { bg: "#eef0f4", fg: "#475467" },
  "Em tentativa de contato": { bg: "#fef3c7", fg: "#92400e" },
  Contatado: { bg: "#dbeafe", fg: "#1e40af" },
  Interessado: { bg: "#dcfce7", fg: "#166534" },
  "Não interessado": { bg: "#fee2e2", fg: "#991b1b" },
  "Proposta enviada": { bg: "#e0e7ff", fg: "#3730a3" },
  Fechado: { bg: "#16a34a", fg: "#ffffff" },
  Perdido: { bg: "#6b7280", fg: "#ffffff" },
};

export const TEMP_LABELS: Record<Temperature, string> = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function isOverdue(nextContactDate: string | null | undefined): boolean {
  if (!nextContactDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return nextContactDate <= today;
}

export function whatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${withCountry}${text}`;
}
