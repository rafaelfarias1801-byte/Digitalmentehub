import type { Case, NoteLabel, Post } from "./types";

export const COLORS = [
  "#e91e8c",
  "#7b2fff",
  "#4dabf7",
  "#00e676",
  "#ffd600",
  "#ff6b35",
  "#00bcd4",
];

export const LABEL_COLORS = [
  "#e91e8c",
  "#ff6b35",
  "#ffd600",
  "#00e676",
  "#4dabf7",
  "#7b2fff",
  "#aaa",
];

export const EMPTY_CASE: Omit<Case, "id"> = {
  name: "",
  description: "",
  status: "ativo",
  color: "#e91e8c",
  logo_url: "",
  segment: "",
  contact: "",
  phone: "",
  since: "",
  notes: "",
};

export const STATUS_STYLES: Record<Case["status"], string> = {
  ativo: "ws-cs-ativo",
  pausado: "ws-cs-and",
  encerrado: "ws-s-venc",
};

export const APPROVAL_STYLES: Record<
  Post["approval_status"],
  { bg: string; color: string; label: string }
> = {
  pendente: {
    bg: "#2a2a3a",
    color: "#e0e0e0",
    label: "Pendente",
  },
  aprovado: {
    bg: "#00e67622",
    color: "#00e676",
    label: "Aprovado",
  },
  reprovado: {
    bg: "#ff443322",
    color: "#ff4433",
    label: "Reprovado",
  },
  alteracao: {
    bg: "#ffd60022",
    color: "#ffd600",
    label: "Alteração solicitada",
  },
};

export const SUB_TABS = [
  { id: "calendario", label: "Calendário", icon: "📅" },
  { id: "conteudo", label: "Conteúdo", icon: "📋" },
  { id: "financeiro", label: "Financeiro", icon: "💰" },
  { id: "contratos", label: "Contratos", icon: "📄" },
  { id: "documentos", label: "Documentos", icon: "🗂" },
  { id: "notas", label: "Notas", icon: "🗒" },
] as const;

export const MONTHS_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const DEFAULT_LABELS: NoteLabel[] = [
  { color: "#e91e8c", name: "" },
  { color: "#ff6b35", name: "" },
  { color: "#ffd600", name: "" },
  { color: "#00e676", name: "" },
  { color: "#4dabf7", name: "" },
  { color: "#7b2fff", name: "" },
  { color: "#aaa", name: "" },
];