// client/src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nznyzjvtmqfcjkogkfju.supabase.co";
const SUPABASE_KEY = "sb_publishable_UZfq3hE15htSZ_RAFRJ_7Q_h5k2bOqy";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export type UserRole = "admin" | "parceiro" | "cliente";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  initials: string;
  created_at: string;
}

export interface Task {
  id: string;
  text: string;
  person: string;
  tag: "dig" | "cliente" | "parceiro";
  done: boolean;
  created_at: string;
}

export interface FinancialEntry {
  id: string;
  description: string;
  type: "recebimento" | "assinatura" | "pagamento";
  due_date: string;
  amount: number;
  positive: boolean;
  status: "pago" | "pendente" | "vencido";
}

export interface Case {
  id: string;
  name: string;
  description: string;
  status: "ativo" | "andamento" | "concluido";
  color: string;
}

export interface Note {
  id: string;
  content: string;
  created_at: string;
}
