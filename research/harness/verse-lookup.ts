import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env.ts";

export type VerseFetched = {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  content: string;
};

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

  // Build a PostgREST `or` filter: (book_id.eq.JHN,chapter.eq.3,verse.eq.16),(...)
  // For large sets, split into batches of 20 to stay within URL length limits.
  const BATCH = 20;
  const result = new Map<string, VerseFetched>();

  for (let i = 0; i < parsed.length; i += BATCH) {
    const batch = parsed.slice(i, i + BATCH);

    // Use a single request with multiple OR conditions via PostgREST
    const orParts = batch.map(
      (p) => `and(book_id.eq.${p.book_id},chapter.eq.${p.chapter},verse.eq.${p.verse})`,
    );
    const filter = `or(${orParts.join(",")})`;

    const url = `${SUPABASE_URL}/rest/v1/bible_verses?select=book_id,book_name,chapter,verse,content&${filter}`;
    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) continue;
    const rows = (await resp.json()) as VerseFetched[];
    for (const row of rows) {
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
