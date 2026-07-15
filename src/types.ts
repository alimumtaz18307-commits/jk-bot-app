export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
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

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export type NoteColor = "slate" | "rose" | "amber" | "emerald" | "sky" | "violet";
