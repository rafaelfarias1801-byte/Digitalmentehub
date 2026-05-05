import type { Profile } from "../../../lib/supabaseClient";

export interface Case {
  id: string;
  name: string;
  description: string;
  status: "ativo" | "pausado" | "encerrado";
  color: string;
  logo_url?: string;
  segment?: string;
  contact?: string;
  phone?: string;
  since?: string;
  notes?: string;
  client_email?: string;
  // Redes Sociais
  instagram_username?: string;
  instagram_page_id?: string;
  facebook_page_id?: string;
  tiktok_username?: string;
  tiktok_user_id?: string;
  linkedin_url?: string;
}

export interface CheckItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  created_at: string;
  edited_at?: string;
}

export interface Post {
  id: string;
  case_id: string;
  slug: string;
  title: string;
  caption: string;
  hashtags: string;
  media_url?: string;
  media_type: "feed" | "stories" | "reels" | "carousel" | "banners" | "lancamento";
  scheduled_date: string;
  scheduled_time?: string;
  approval_status: "pendente" | "aprovado" | "reprovado" | "alteracao" | "agendado" | "postado" | "pendente_alteracao";
  rejection_reason?: string | null;
  rejection_reason_at?: string | null;
  rejection_history?: Array<{ reason: string; type: string; created_at: string }> | null;
  status_changed_at?: string | null;
  extra_info?: string;
  media_urls?: string[];
  description?: string;
  checklist?: CheckItem[];
  due_date?: string;
  label_color?: string;
  comments?: Comment[];
  platforms?: string[];
  destination?: string;
}

export interface Payment {
  id: string;
  case_id: string;
  description: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date?: string;
}

export interface CaseDocument {
  id: string;
  case_id: string;
  name: string;
  file_url: string;
  doc_type: "contrato" | "nfe" | "outro";
  uploaded_at: string;
}

export interface NoteCard {
  id: string;
  case_id: string;
  column_id: string;
  title: string;
  description: string;
  checklist: CheckItem[];
  comments: Comment[];
  due_date?: string;
  label_color?: string;
  order: number;
  completed?: boolean;}
  attachments?: { id: string; name: string; url: string; type: string; cover: boolean }[];
}

export interface NoteColumn {
  id: string;
  case_id: string;
  title: string;
  order: number;
}

export interface NoteLabel {
  color: string;
  name: string;
}

// ── Designer / Parceiro ──────────────────────────────────────
export interface Designer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

// ── Briefing ─────────────────────────────────────────────────
export interface Briefing {
  id: string;
  case_id: string;
  designer_id: string;
  format: string;
  reference_text?: string;
  reference_links: string[];      // array de URLs
  reference_images: string[];     // URLs no R2
  deadline: string;               // ISO date YYYY-MM-DD
  brand_identity?: string;        // cores, tipografia, etc.
  status: "aguardando" | "entregue" | "revisao" | "aprovado";
  revision_note?: string;         // nota de revisão solicitada
  delivery_urls?: string[];       // artes entregues pelo designer
  designer_value?: number;        // valor cobrado pelo designer
  created_at: string;
}

// ── Props components ─────────────────────────────────────────
export interface CasesProps {
  profile: Profile;
}

export interface CaseWorkspaceProps {
  caseData: Case;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  profile: Profile;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

// ── Brand Identity ────────────────────────────────────────────
export interface BrandColor { hex: string; name: string; }
export interface BrandFont  { name: string; role: string; }
export interface BrandLink  { label: string; url: string; }

export interface BrandIdentity {
  id?: string;
  case_id?: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  links: BrandLink[];
  style_notes?: string;
  warnings?: string;
  updated_at?: string;
}

// ── Designer Closing ──────────────────────────────────────────
export interface DesignerClosing {
  id?: string;
  designer_id: string;
  month: number;
  year: number;
  total_bruto: number;
  discount: number;
  total_final: number;
  notes?: string;
  closed_at?: string;
  created_at?: string;
}
