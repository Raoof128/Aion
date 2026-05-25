import type { VerseCoord } from "./types.ts";

// Maps BSB book names to book IDs — used as fallback when SSE payload lacks book_id
export const BOOK_NAME_TO_ID: Record<string, string> = {
  Genesis: "GEN", Exodus: "EXO", Leviticus: "LEV", Numbers: "NUM",
  Deuteronomy: "DEU", Joshua: "JOS", Judges: "JDG", Ruth: "RUT",
  "1 Samuel": "1SA", "2 Samuel": "2SA", "1 Kings": "1KI", "2 Kings": "2KI",
  "1 Chronicles": "1CH", "2 Chronicles": "2CH", Ezra: "EZR", Nehemiah: "NEH",
  Esther: "EST", Job: "JOB", Psalms: "PSA", Proverbs: "PRO",
  Ecclesiastes: "ECC", "Song of Solomon": "SNG", Isaiah: "ISA",
  Jeremiah: "JER", Lamentations: "LAM", Ezekiel: "EZK", Daniel: "DAN",
  Hosea: "HOS", Joel: "JOL", Amos: "AMO", Obadiah: "OBA",
  Jonah: "JON", Micah: "MIC", Nahum: "NAM", Habakkuk: "HAB",
  Zephaniah: "ZEP", Haggai: "HAG", Zechariah: "ZEC", Malachi: "MAL",
  Matthew: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN",
  Acts: "ACT", Romans: "ROM", "1 Corinthians": "1CO", "2 Corinthians": "2CO",
  Galatians: "GAL", Ephesians: "EPH", Philippians: "PHP",
  Colossians: "COL", "1 Thessalonians": "1TH", "2 Thessalonians": "2TH",
  "1 Timothy": "1TI", "2 Timothy": "2TI", Titus: "TIT", Philemon: "PHM",
  Hebrews: "HEB", James: "JAS", "1 Peter": "1PE", "2 Peter": "2PE",
  "1 John": "1JN", "2 John": "2JN", "3 John": "3JN", Jude: "JUD",
  Revelation: "REV",
};

/**
 * Normalises a raw SSE verse payload to dot-notation: "BOOK.CHAPTER.VERSE".
 * Uses book_id if present; falls back to BOOK_NAME_TO_ID[book_name]; emits "UNK" if unknown.
 */
export function normaliseCoord(v: {
  book_id?: string;
  book_name?: string;
  chapter: number;
  verse: number;
}): string {
  const bookId = v.book_id || BOOK_NAME_TO_ID[v.book_name ?? ""] || "UNK";
  return `${bookId}.${v.chapter}.${v.verse}`;
}

/** Converts VerseCoord[] (from dataset) to normalised coord strings. */
export function normaliseGoldVerses(goldVerses: VerseCoord[]): string[] {
  return goldVerses.map(v => `${v.book_id}.${v.chapter}.${v.verse}`);
}

function buildGoldSet(goldCoords: string[], acceptableClusters: string[][]): Set<string> {
  const set = new Set(goldCoords);
  for (const cluster of acceptableClusters) {
    for (const coord of cluster) set.add(coord);
  }
  return set;
}

/** 1 if any of the first 5 retrieved verses match gold or an acceptable cluster; else 0. */
export function recallAt5(
  retrieved: string[],
  goldCoords: string[],
  acceptableClusters: string[][]
): number {
  const goldSet = buildGoldSet(goldCoords, acceptableClusters);
  return retrieved.slice(0, 5).some(v => goldSet.has(v)) ? 1 : 0;
}

/** Fraction of the first 5 retrieved verses that match gold or an acceptable cluster. */
export function precisionAt5(
  retrieved: string[],
  goldCoords: string[],
  acceptableClusters: string[][]
): number {
  const goldSet = buildGoldSet(goldCoords, acceptableClusters);
  const hits = retrieved.slice(0, 5).filter(v => goldSet.has(v)).length;
  return hits / 5;
}

/** Reciprocal rank of the first matching verse in the top 5; 0 if none match. */
export function mrr(
  retrieved: string[],
  goldCoords: string[],
  acceptableClusters: string[][]
): number {
  const goldSet = buildGoldSet(goldCoords, acceptableClusters);
  const top5 = retrieved.slice(0, 5);
  for (let i = 0; i < top5.length; i++) {
    if (goldSet.has(top5[i])) return 1 / (i + 1);
  }
  return 0;
}
