export interface Verse {
  id: number;
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  content: string;
  similarity: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  verses: Verse[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export type ChatSSEEvent =
  | { type: "text"; content: string }
  | { type: "verses"; verses: Verse[] }
  | { type: "conversation"; id: string }
  | { type: "error"; message: string }
  | { type: "done" };

// ── Streak ────────────────────────────────────────────────

export interface StreakState {
  current_streak: number;
  longest_streak: number;
  freeze_uses_this_week: number;
  last_active_date: string | null; // "YYYY-MM-DD" — server's local date
  week_start: string | null; // "YYYY-MM-DD" — ISO week Monday
}

export interface RecordOpenResponse {
  current_streak: number;
  longest_streak: number;
  freeze_uses_this_week: number;
  local_date: string; // "YYYY-MM-DD" — server-derived, use this for UI
  week_start: string; // "YYYY-MM-DD" — ISO week Monday
  milestone_unlocked?: 7 | 30 | 100;
  today_recorded: boolean;
}

export interface StreakDayRecord {
  local_date: string; // "YYYY-MM-DD"
  status: "active" | "frozen";
}
