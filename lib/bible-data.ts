// Static Bible book metadata for the Reader navigation
// Source: bible.helloao.org BSB translation

export interface BibleBook {
  id: string;
  name: string;
  chapters: number;
  testament: "OT" | "NT";
}

export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament
  { id: "GEN", name: "Genesis", chapters: 50, testament: "OT" },
  { id: "EXO", name: "Exodus", chapters: 40, testament: "OT" },
  { id: "LEV", name: "Leviticus", chapters: 27, testament: "OT" },
  { id: "NUM", name: "Numbers", chapters: 36, testament: "OT" },
  { id: "DEU", name: "Deuteronomy", chapters: 34, testament: "OT" },
  { id: "JOS", name: "Joshua", chapters: 24, testament: "OT" },
  { id: "JDG", name: "Judges", chapters: 21, testament: "OT" },
  { id: "RUT", name: "Ruth", chapters: 4, testament: "OT" },
  { id: "1SA", name: "1 Samuel", chapters: 31, testament: "OT" },
  { id: "2SA", name: "2 Samuel", chapters: 24, testament: "OT" },
  { id: "1KI", name: "1 Kings", chapters: 22, testament: "OT" },
  { id: "2KI", name: "2 Kings", chapters: 25, testament: "OT" },
  { id: "1CH", name: "1 Chronicles", chapters: 29, testament: "OT" },
  { id: "2CH", name: "2 Chronicles", chapters: 36, testament: "OT" },
  { id: "EZR", name: "Ezra", chapters: 10, testament: "OT" },
  { id: "NEH", name: "Nehemiah", chapters: 13, testament: "OT" },
  { id: "EST", name: "Esther", chapters: 10, testament: "OT" },
  { id: "JOB", name: "Job", chapters: 42, testament: "OT" },
  { id: "PSA", name: "Psalms", chapters: 150, testament: "OT" },
  { id: "PRO", name: "Proverbs", chapters: 31, testament: "OT" },
  { id: "ECC", name: "Ecclesiastes", chapters: 12, testament: "OT" },
  { id: "SNG", name: "Song of Solomon", chapters: 8, testament: "OT" },
  { id: "ISA", name: "Isaiah", chapters: 66, testament: "OT" },
  { id: "JER", name: "Jeremiah", chapters: 52, testament: "OT" },
  { id: "LAM", name: "Lamentations", chapters: 5, testament: "OT" },
  { id: "EZK", name: "Ezekiel", chapters: 48, testament: "OT" },
  { id: "DAN", name: "Daniel", chapters: 12, testament: "OT" },
  { id: "HOS", name: "Hosea", chapters: 14, testament: "OT" },
  { id: "JOL", name: "Joel", chapters: 3, testament: "OT" },
  { id: "AMO", name: "Amos", chapters: 9, testament: "OT" },
  { id: "OBA", name: "Obadiah", chapters: 1, testament: "OT" },
  { id: "JON", name: "Jonah", chapters: 4, testament: "OT" },
  { id: "MIC", name: "Micah", chapters: 7, testament: "OT" },
  { id: "NAM", name: "Nahum", chapters: 3, testament: "OT" },
  { id: "HAB", name: "Habakkuk", chapters: 3, testament: "OT" },
  { id: "ZEP", name: "Zephaniah", chapters: 3, testament: "OT" },
  { id: "HAG", name: "Haggai", chapters: 2, testament: "OT" },
  { id: "ZEC", name: "Zechariah", chapters: 14, testament: "OT" },
  { id: "MAL", name: "Malachi", chapters: 4, testament: "OT" },
  // New Testament
  { id: "MAT", name: "Matthew", chapters: 28, testament: "NT" },
  { id: "MRK", name: "Mark", chapters: 16, testament: "NT" },
  { id: "LUK", name: "Luke", chapters: 24, testament: "NT" },
  { id: "JHN", name: "John", chapters: 21, testament: "NT" },
  { id: "ACT", name: "Acts", chapters: 28, testament: "NT" },
  { id: "ROM", name: "Romans", chapters: 16, testament: "NT" },
  { id: "1CO", name: "1 Corinthians", chapters: 16, testament: "NT" },
  { id: "2CO", name: "2 Corinthians", chapters: 13, testament: "NT" },
  { id: "GAL", name: "Galatians", chapters: 6, testament: "NT" },
  { id: "EPH", name: "Ephesians", chapters: 6, testament: "NT" },
  { id: "PHP", name: "Philippians", chapters: 4, testament: "NT" },
  { id: "COL", name: "Colossians", chapters: 4, testament: "NT" },
  { id: "1TH", name: "1 Thessalonians", chapters: 5, testament: "NT" },
  { id: "2TH", name: "2 Thessalonians", chapters: 3, testament: "NT" },
  { id: "1TI", name: "1 Timothy", chapters: 6, testament: "NT" },
  { id: "2TI", name: "2 Timothy", chapters: 4, testament: "NT" },
  { id: "TIT", name: "Titus", chapters: 3, testament: "NT" },
  { id: "PHM", name: "Philemon", chapters: 1, testament: "NT" },
  { id: "HEB", name: "Hebrews", chapters: 13, testament: "NT" },
  { id: "JAS", name: "James", chapters: 5, testament: "NT" },
  { id: "1PE", name: "1 Peter", chapters: 5, testament: "NT" },
  { id: "2PE", name: "2 Peter", chapters: 3, testament: "NT" },
  { id: "1JN", name: "1 John", chapters: 5, testament: "NT" },
  { id: "2JN", name: "2 John", chapters: 1, testament: "NT" },
  { id: "3JN", name: "3 John", chapters: 1, testament: "NT" },
  { id: "JUD", name: "Jude", chapters: 1, testament: "NT" },
  { id: "REV", name: "Revelation", chapters: 22, testament: "NT" },
];

export const OT_BOOKS = BIBLE_BOOKS.filter((b) => b.testament === "OT");
export const NT_BOOKS = BIBLE_BOOKS.filter((b) => b.testament === "NT");

// Verse of the Day pool — curated popular verses
export const VOTD_POOL = [
  {
    book_id: "PSA",
    book_name: "Psalms",
    chapter: 46,
    verse: 10,
    content:
      "Be still, and know that I am God; I will be exalted among the nations, I will be exalted over the earth.",
  },
  {
    book_id: "PRO",
    book_name: "Proverbs",
    chapter: 3,
    verse: 5,
    content: "Trust in the LORD with all your heart, and lean not on your own understanding.",
  },
  {
    book_id: "ISA",
    book_name: "Isaiah",
    chapter: 41,
    verse: 10,
    content:
      "Do not fear, for I am with you; do not be afraid, for I am your God. I will strengthen you; I will surely help you; I will uphold you with My righteous right hand.",
  },
  {
    book_id: "PHP",
    book_name: "Philippians",
    chapter: 4,
    verse: 13,
    content: "I can do all things through Christ who gives me strength.",
  },
  {
    book_id: "JER",
    book_name: "Jeremiah",
    chapter: 29,
    verse: 11,
    content:
      "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, to give you a future and a hope.",
  },
  {
    book_id: "ROM",
    book_name: "Romans",
    chapter: 8,
    verse: 28,
    content:
      "And we know that God works all things together for the good of those who love Him, who are called according to His purpose.",
  },
  {
    book_id: "PSA",
    book_name: "Psalms",
    chapter: 23,
    verse: 1,
    content: "The LORD is my shepherd; I shall not want.",
  },
  {
    book_id: "JHN",
    book_name: "John",
    chapter: 3,
    verse: 16,
    content:
      "For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.",
  },
  {
    book_id: "MAT",
    book_name: "Matthew",
    chapter: 11,
    verse: 28,
    content: "Come to Me, all you who are weary and burdened, and I will give you rest.",
  },
  {
    book_id: "PSA",
    book_name: "Psalms",
    chapter: 119,
    verse: 105,
    content: "Your word is a lamp to my feet and a light to my path.",
  },
  {
    book_id: "ISA",
    book_name: "Isaiah",
    chapter: 40,
    verse: 31,
    content:
      "But those who wait upon the LORD will renew their strength; they will mount up with wings like eagles; they will run and not grow weary, they will walk and not faint.",
  },
  {
    book_id: "ROM",
    book_name: "Romans",
    chapter: 12,
    verse: 2,
    content:
      "Do not be conformed to this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what is the good, pleasing, and perfect will of God.",
  },
  {
    book_id: "GAL",
    book_name: "Galatians",
    chapter: 5,
    verse: 22,
    content:
      "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness,",
  },
  {
    book_id: "HEB",
    book_name: "Hebrews",
    chapter: 11,
    verse: 1,
    content:
      "Now faith is the assurance of what we hope for and the certainty of what we do not see.",
  },
  {
    book_id: "PSA",
    book_name: "Psalms",
    chapter: 37,
    verse: 4,
    content: "Delight yourself in the LORD, and He will give you the desires of your heart.",
  },
  {
    book_id: "ECC",
    book_name: "Ecclesiastes",
    chapter: 3,
    verse: 1,
    content: "To everything there is a season, and a time for every purpose under heaven.",
  },
  {
    book_id: "1CO",
    book_name: "1 Corinthians",
    chapter: 13,
    verse: 4,
    content: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.",
  },
  {
    book_id: "JOS",
    book_name: "Joshua",
    chapter: 1,
    verse: 9,
    content:
      "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.",
  },
  {
    book_id: "PRO",
    book_name: "Proverbs",
    chapter: 16,
    verse: 3,
    content: "Commit your works to the LORD and your plans will be achieved.",
  },
  {
    book_id: "2TI",
    book_name: "2 Timothy",
    chapter: 1,
    verse: 7,
    content: "For God has not given us a spirit of fear, but of power, love, and self-discipline.",
  },
  {
    book_id: "PSA",
    book_name: "Psalms",
    chapter: 91,
    verse: 1,
    content:
      "He who dwells in the shelter of the Most High will abide in the shadow of the Almighty.",
  },
];

export function getVerseOfTheDay() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return VOTD_POOL[dayOfYear % VOTD_POOL.length];
}
