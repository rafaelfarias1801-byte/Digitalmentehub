export function isVideoFile(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|mov|webm|ogg)$/i.test(url);
}

export function normalizeWhatsAppPhone(phone?: string | null) {
  return (phone ?? "").replace(/\D/g, "");
}

export function parseDateAtNoon(value?: string | null) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`);
}

export function formatDateBR(
  value?: string | null,
  options?: Intl.DateTimeFormatOptions
) {
  const date = parseDateAtNoon(value);

  if (!date) return "Sem data";

  return date.toLocaleDateString("pt-BR", options);
}

export function todayLocalISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isOverdueDate(value?: string | null) {
  const date = parseDateAtNoon(value);
  if (!date) return false;

  const due = new Date(date);
  due.setHours(23, 59, 59, 999);

  return due.getTime() < Date.now();
}