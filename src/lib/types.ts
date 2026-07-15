export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_url: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  remind_at: string;
  days_of_week: number[];
  is_active: boolean;
  created_at: string;
}

export const NOTE_COLORS = [
  "slate", "amber", "rose", "emerald", "sky", "violet", "orange",
] as const;

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Assalamu Alaikum! Good night";
  if (h < 12) return "Assalamu Alaikum! Good morning";
  if (h < 15) return "Assalamu Alaikum! Good afternoon";
  if (h < 18) return "Assalamu Alaikum! Good evening";
  if (h < 22) return "Assalamu Alaikum! Good evening";
  return "Assalamu Alaikum! Good night";
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/[#*_`~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, ". ")
    .trim();
}
