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
