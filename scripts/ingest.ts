import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// --- Config ---
const TRANSLATION_ID = "BSB";
const API_BASE = "https://bible.helloao.org/api";
const BATCH_SIZE = 25; // smaller batches to avoid Supabase statement timeout
const MAX_RETRIES = 3;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Types ---
interface ChapterContent {
  type: string;
  number?: number;
  content?: (string | { noteId: number })[];
}

interface ChapterInner {
  number: number;
  content: ChapterContent[];
}

interface ChapterWrapper {
  numberOfVerses: number;
  chapter: ChapterInner;
}

interface Book {
  id: string;
  name: string;
  chapters: ChapterWrapper[];
}

interface CompleteResponse {
  books: Book[];
}

interface VerseRow {
  translation_id: string;
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  content: string;
}

// --- Helpers ---

function flattenVerseContent(
  content: (string | { noteId: number })[]
): string {
  return content
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractVerses(data: CompleteResponse): VerseRow[] {
  const verses: VerseRow[] = [];

  for (const book of data.books) {
    for (const chapterWrapper of book.chapters) {
      const chapter = chapterWrapper.chapter;
      for (const item of chapter.content) {
        if (item.type === "verse" && item.number && item.content) {
          const text = flattenVerseContent(item.content);
          if (text.length > 0) {
            verses.push({
              translation_id: TRANSLATION_ID,
              book_id: book.id,
              book_name: book.name,
              chapter: chapter.number,
              verse: item.number,
              content: text,
            });
          }
        }
      }
    }
  }

  return verses;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main ---

async function main() {
  console.log(`Fetching ${TRANSLATION_ID} complete.json...`);
  const response = await fetch(`${API_BASE}/${TRANSLATION_ID}/complete.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  const data: CompleteResponse = await response.json();
  console.log(`Fetched. Parsing verses...`);

  const verses = extractVerses(data);
  console.log(`Extracted ${verses.length} verses.`);

  let inserted = 0;
  let currentBook = "";

  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const batch = verses.slice(i, i + BATCH_SIZE);
    const texts = batch.map((v) => v.content);

    if (batch[0].book_name !== currentBook) {
      currentBook = batch[0].book_name;
      console.log(`\nProcessing: ${currentBook}`);
    }

    const embeddings = await embedBatch(texts);

    const rows = batch.map((v, idx) => ({
      ...v,
      embedding: JSON.stringify(embeddings[idx]),
    }));

    let retries = 0;
    while (retries < MAX_RETRIES) {
      const { error } = await supabase
        .from("bible_verses")
        .upsert(rows, {
          onConflict: "translation_id,book_id,chapter,verse",
        });

      if (!error) break;

      retries++;
      if (retries >= MAX_RETRIES) {
        console.error(`\nFailed after ${MAX_RETRIES} retries at batch ${Math.floor(i / BATCH_SIZE)}:`, error.message);
        throw error;
      }
      console.log(`\n  Retry ${retries}/${MAX_RETRIES} (${error.message})...`);
      await sleep(2000 * retries);
    }

    inserted += batch.length;
    process.stdout.write(
      `  ${inserted}/${verses.length} verses (${((inserted / verses.length) * 100).toFixed(1)}%)\r`
    );

    await sleep(300);
  }

  console.log(`\n\nDone! Inserted ${inserted} verses into bible_verses.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
