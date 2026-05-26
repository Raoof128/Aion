export type ParsedRef = {
  book_id: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  chapter_only?: true; // present only for chapter-level lookups (e.g. "Psalm 23", "1 Corinthians 15")
};

const ALIAS_MAP: Record<string, string> = {
  genesis: "GEN",
  gen: "GEN",
  exodus: "EXO",
  exo: "EXO",
  ex: "EXO",
  leviticus: "LEV",
  lev: "LEV",
  numbers: "NUM",
  num: "NUM",
  deuteronomy: "DEU",
  deu: "DEU",
  deut: "DEU",
  joshua: "JOS",
  jos: "JOS",
  josh: "JOS",
  judges: "JDG",
  jdg: "JDG",
  judg: "JDG",
  ruth: "RUT",
  rut: "RUT",
  "1 samuel": "1SA",
  "1sa": "1SA",
  "1sam": "1SA",
  "2 samuel": "2SA",
  "2sa": "2SA",
  "2sam": "2SA",
  "1 kings": "1KI",
  "1ki": "1KI",
  "1kgs": "1KI",
  "2 kings": "2KI",
  "2ki": "2KI",
  "2kgs": "2KI",
  "1 chronicles": "1CH",
  "1ch": "1CH",
  "1chron": "1CH",
  "2 chronicles": "2CH",
  "2ch": "2CH",
  "2chron": "2CH",
  ezra: "EZR",
  ezr: "EZR",
  nehemiah: "NEH",
  neh: "NEH",
  esther: "EST",
  est: "EST",
  job: "JOB",
  psalm: "PSA",
  psalms: "PSA",
  psa: "PSA",
  ps: "PSA",
  proverbs: "PRO",
  pro: "PRO",
  prov: "PRO",
  ecclesiastes: "ECC",
  ecc: "ECC",
  eccl: "ECC",
  "song of solomon": "SNG",
  "song of songs": "SNG",
  song: "SNG",
  sng: "SNG",
  sos: "SNG",
  isaiah: "ISA",
  isa: "ISA",
  jeremiah: "JER",
  jer: "JER",
  lamentations: "LAM",
  lam: "LAM",
  ezekiel: "EZK",
  ezk: "EZK",
  ezek: "EZK",
  daniel: "DAN",
  dan: "DAN",
  hosea: "HOS",
  hos: "HOS",
  joel: "JOL",
  jol: "JOL",
  amos: "AMO",
  amo: "AMO",
  obadiah: "OBA",
  oba: "OBA",
  jonah: "JON",
  jon: "JON",
  micah: "MIC",
  mic: "MIC",
  nahum: "NAH",
  nah: "NAH",
  habakkuk: "HAB",
  hab: "HAB",
  zephaniah: "ZEP",
  zep: "ZEP",
  haggai: "HAG",
  hag: "HAG",
  zechariah: "ZEC",
  zec: "ZEC",
  zech: "ZEC",
  malachi: "MAL",
  mal: "MAL",
  matthew: "MAT",
  mat: "MAT",
  matt: "MAT",
  mark: "MRK",
  mrk: "MRK",
  mk: "MRK",
  luke: "LUK",
  luk: "LUK",
  lk: "LUK",
  john: "JHN",
  jhn: "JHN",
  jn: "JHN",
  acts: "ACT",
  act: "ACT",
  romans: "ROM",
  rom: "ROM",
  "1 corinthians": "1CO",
  "1co": "1CO",
  "1cor": "1CO",
  "2 corinthians": "2CO",
  "2co": "2CO",
  "2cor": "2CO",
  galatians: "GAL",
  gal: "GAL",
  ephesians: "EPH",
  eph: "EPH",
  philippians: "PHP",
  php: "PHP",
  phil: "PHP",
  colossians: "COL",
  col: "COL",
  "1 thessalonians": "1TH",
  "1th": "1TH",
  "1thess": "1TH",
  "2 thessalonians": "2TH",
  "2th": "2TH",
  "2thess": "2TH",
  "1 timothy": "1TI",
  "1ti": "1TI",
  "1tim": "1TI",
  "2 timothy": "2TI",
  "2ti": "2TI",
  "2tim": "2TI",
  titus: "TIT",
  tit: "TIT",
  philemon: "PHM",
  phm: "PHM",
  hebrews: "HEB",
  heb: "HEB",
  james: "JAS",
  jas: "JAS",
  "1 peter": "1PE",
  "1pe": "1PE",
  "1pet": "1PE",
  "2 peter": "2PE",
  "2pe": "2PE",
  "2pet": "2PE",
  "1 john": "1JN",
  "1jn": "1JN",
  "2 john": "2JN",
  "2jn": "2JN",
  "3 john": "3JN",
  "3jn": "3JN",
  jude: "JUD",
  jud: "JUD",
  revelation: "REV",
  rev: "REV",
};

// Matches "Book Chapter:Verse" and "Book Chapter:Verse-Verse" (verse refs — highest priority)
const REF_REGEX =
  /\b((?:\d\s)?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?\b/g;

// Matches "Book Chapter" without ":verse" — chapter-level refs (lower priority, skips covered positions)
// (?!:\d) prevents matching when already followed by a colon-digit (handled by REF_REGEX)
const CHAPTER_REGEX = /\b((?:\d\s)?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d{1,3})\b(?!:\d)/g;

export function parseReferences(text: string): ParsedRef[] | null {
  const refs: ParsedRef[] = [];
  const covered = new Set<number>();
  let match: RegExpExecArray | null;

  // Pass 1: verse refs — take priority and mark their text positions as covered
  REF_REGEX.lastIndex = 0;
  while ((match = REF_REGEX.exec(text)) !== null) {
    const bookId = ALIAS_MAP[match[1].toLowerCase().trim()];
    if (!bookId) continue;
    for (let i = match.index; i < match.index + match[0].length; i++) covered.add(i);
    const chapter = parseInt(match[2], 10);
    const verseStart = parseInt(match[3], 10);
    const verseEnd = match[4] ? parseInt(match[4], 10) : verseStart;
    refs.push({ book_id: bookId, chapter, verse_start: verseStart, verse_end: verseEnd });
  }

  // Pass 2: chapter refs — only emit if start position is not already covered by a verse ref
  CHAPTER_REGEX.lastIndex = 0;
  while ((match = CHAPTER_REGEX.exec(text)) !== null) {
    if (covered.has(match.index)) continue;
    const bookId = ALIAS_MAP[match[1].toLowerCase().trim()];
    if (!bookId) {
      CHAPTER_REGEX.lastIndex = match.index + 1;
      continue;
    }
    const chapter = parseInt(match[2], 10);
    refs.push({ book_id: bookId, chapter, verse_start: 1, verse_end: 999, chapter_only: true });
  }

  return refs.length > 0 ? refs : null;
}
