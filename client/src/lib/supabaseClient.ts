// client/src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nznyzjvtmqfcjkogkfju.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bnl6anZ0bXFmY2prb2drZmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTAzMTAsImV4cCI6MjA4ODkyNjMxMH0.NLf83n9WS3v-e0u_H3WvHGvEgOq1xMgpCP1m7C8LFIY";

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
