// client/src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nznyzjvtmqfcjkogkfju.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bnl6anZ0bXFmY2prb2drZmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTAzMTAsImV4cCI6MjA4ODkyNjMxMH0.NLf83n9WS3v-e0u_H3WvHGvEgOq1xMgpCP1m7C8LFIY";

// --- INÍCIO DA CORREÇÃO DE MÚLTIPLAS INSTÂNCIAS (SINGLETON) ---
// Criamos um espaço na memória global para guardar a instância do Supabase
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

// Se já existir uma instância (ex: durante o Hot Reload do Vite), ele usa a existente.
// Se não existir, ele cria uma nova.
export const supabase = globalForSupabase.supabase ?? createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,        // mantém sessão no localStorage
    autoRefreshToken: true,      // renova token automaticamente
    detectSessionInUrl: false,   // evita conflito com rotas do React
    storageKey: "dig-workspace-auth", // chave única no localStorage
  },
});

// Salva a instância na memória global apenas em ambiente de desenvolvimento
if (import.meta.env?.DEV) {
  globalForSupabase.supabase = supabase;
}
// --- FIM DA CORREÇÃO ---

export type UserRole = "admin" | "parceiro" | "cliente";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  initials: string;
  avatar_url?: string;
  case_id?: string;          // para clientes: vincula ao case deles
  must_change_password?: boolean; // true no primeiro acesso
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