export const STATUSES = [
  "Não contatado",
  "Em tentativa de contato",
  "Contatado",
  "Interessado",
  "Não interessado",
  "Proposta enviada",
  "Fechado",
  "Perdido",
] as const;

export type Status = (typeof STATUSES)[number];

export const CLOSED_WON: Status = "Fechado";
export const LOST_STATUSES: Status[] = ["Não interessado", "Perdido"];

export const BROKERS = ["Victor", "Lucas"] as const;
export type Broker = (typeof BROKERS)[number];

export const TEMPERATURES = ["quente", "morno", "frio"] as const;
export type Temperature = (typeof TEMPERATURES)[number];

export interface Client {
  id: string;
  name: string;
  phone: string;
  vigencia_date: string;
  broker: Broker;
  status: Status;
  lead_temperature: Temperature;
  next_contact_date: string | null;
  call_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  client_id: string;
  text: string;
  created_at: string;
}
