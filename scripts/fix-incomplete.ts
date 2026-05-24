import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// --- Config ---
const TRANSLATION_ID = "BSB";
const API_BASE = "https://bible.helloao.org/api";
const BATCH_SIZE = 5;
const MAX_RETRIES = 5;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;

// Resuming — RUT,1KI,2CH already done; batch size 5 for HNSW stability
const BOOKS_TO_FIX = [
  "MRK","JHN","1CO","2CO","2TI","1PE","JUD",
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// --- Types ---
type ContentItem = string | { noteId: number } | { text: string; poem?: number };

interface ChapterContent {
  type: string;
  number?: number;
  content?: ContentItem[];
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

function flattenVerseContent(content: ContentItem[]): string {
  return content
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && "text" in item) return item.text;
      return "";
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractVerses(book: Book): VerseRow[] {
  const verses: VerseRow[] = [];
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

  const booksToProcess = data.books.filter((b) => BOOKS_TO_FIX.includes(b.id));
  console.log(`Processing ${booksToProcess.length} books: ${booksToProcess.map((b) => b.id).join(", ")}\n`);

  let totalInserted = 0;
  let booksDone = 0;

  for (const book of booksToProcess) {
    const verses = extractVerses(book);
    console.log(`[${++booksDone}/${booksToProcess.length}] ${book.name} (${book.id}): ${verses.length} verses`);

    let inserted = 0;

    for (let i = 0; i < verses.length; i += BATCH_SIZE) {
      const batch = verses.slice(i, i + BATCH_SIZE);
      const texts = batch.map((v) => v.content);

      const embeddings = await embedBatch(texts);

      const rows = batch.map((v, idx) => ({
        ...v,
        embedding: JSON.stringify(embeddings[idx]),
      }));

      let retries = 0;
      while (retries < MAX_RETRIES) {
        const { error } = await supabase
          .from("bible_verses")
          .upsert(rows, { onConflict: "translation_id,book_id,chapter,verse" });

        if (!error) break;

        retries++;
        if (retries >= MAX_RETRIES) {
          console.error(`\n  Failed after ${MAX_RETRIES} retries:`, error.message);
          throw error;
        }
        console.log(`\n  Retry ${retries}/${MAX_RETRIES} (${error.message})...`);
        await sleep(3000 * retries);
      }

      inserted += batch.length;
      process.stdout.write(
        `  ${inserted}/${verses.length} verses (${((inserted / verses.length) * 100).toFixed(1)}%)\r`,
      );

      await sleep(800);
    }

    totalInserted += inserted;
    console.log(`  ✅ Done — ${inserted} verses upserted`);
  }

  console.log(`\n========================================`);
  console.log(`✅ All done! ${totalInserted} verses upserted across ${booksToProcess.length} books.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
