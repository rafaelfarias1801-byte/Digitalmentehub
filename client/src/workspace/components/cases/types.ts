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
  // Redes Sociais
  instagram_username?: string;
  instagram_page_id?: string;
  facebook_page_id?: string;
  tiktok_username?: string;
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
  media_type: "feed" | "stories" | "reels" | "carousel";
  scheduled_date: string;
  scheduled_time?: string;
  approval_status: "pendente" | "aprovado" | "reprovado" | "alteracao" | "agendado";
  extra_info?: string;
  media_urls?: string[];
  description?: string;
  checklist?: CheckItem[];
  due_date?: string;
  label_color?: string;
  comments?: Comment[];
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

export interface CasesProps {
  profile: Profile;
}

export interface CaseWorkspaceProps {
  caseData: Case;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  profile: Profile;
}
