import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env.ts";

export type VerseFetched = {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  content: string;
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Parses a dot-notation coord string ("JHN.3.16") into its components.
 * Returns null on malformed input.
 */
function parseCoord(coord: string): { book_id: string; chapter: number; verse: number } | null {
  const parts = coord.split(".");
  if (parts.length < 3) return null;
  const [book_id, chStr, vStr] = parts;
  const chapter = parseInt(chStr, 10);
  const verse = parseInt(vStr, 10);
  if (isNaN(chapter) || isNaN(verse)) return null;
  return { book_id, chapter, verse };
}

/**
 * Batch-fetches verse content from Supabase for a list of dot-notation coord strings.
 * Deduplicates coords before fetching. Returns a map from coord → verse data.
 * Silently drops coords that don't exist in the DB.
 */
export async function fetchVerseTexts(coords: string[]): Promise<Map<string, VerseFetched>> {
  const unique = [...new Set(coords)];
  const parsed = unique
    .map((c) => ({ coord: c, ...parseCoord(c) }))
    .filter((p) => p.book_id != null) as Array<{
    coord: string;
    book_id: string;
    chapter: number;
    verse: number;
  }>;

  if (parsed.length === 0) return new Map();

  const result = new Map<string, VerseFetched>();
  const BATCH = 20;

  for (let i = 0; i < parsed.length; i += BATCH) {
    const batch = parsed.slice(i, i + BATCH);
    // Build a PostgREST OR filter using supabase-js — each condition matches one verse exactly
    const orFilter = batch
      .map((p) => `and(book_id.eq.${p.book_id},chapter.eq.${p.chapter},verse.eq.${p.verse})`)
      .join(",");

    const { data, error } = await supabase
      .from("bible_verses")
      .select("book_id,book_name,chapter,verse,content")
      .or(orFilter)
      .limit(batch.length + 5);

    if (error || !data) continue;
    for (const row of data as VerseFetched[]) {
      const coord = `${row.book_id}.${row.chapter}.${row.verse}`;
      result.set(coord, row);
    }
  }

  return result;
}

/**
 * Formats fetched verses into a block string for the judge prompt.
 * Example line: "John 3:16 — For God so loved the world..."
 */
export function formatVerseBlock(coords: string[], verseMap: Map<string, VerseFetched>): string {
  return coords
    .filter((c) => verseMap.has(c))
    .map((c) => {
      const v = verseMap.get(c)!;
      return `${v.book_name} ${v.chapter}:${v.verse} — ${v.content}`;
    })
    .join("\n");
}
