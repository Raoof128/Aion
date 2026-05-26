# Method

<!-- Status: DRAFT -->

## 3.1 System Overview

Aion is a verse-grounded Bible QA system deployed as a Supabase Edge Function.
Given a user query, the system parses any explicit Bible references, retrieves candidate verses, re-ranks them semantically, and generates a grounded answer citing specific verses.
Figure 1 (to be created) shows the full pipeline.

## 3.2 Reference Parsing

A two-pass parser (`lib/bible-reference-parser.ts`) identifies explicit scripture references in the query.

**Pass 1 — verse-level references**: Regex matches `BOOK CHAPTER:VERSE` patterns (e.g., "John 3:16", "Ps. 23:1"). An alias map maps common abbreviations and alternate spellings to canonical book IDs.

**Pass 2 — chapter-only references**: A separate CHAPTER_REGEX captures patterns like "Psalm 23" or "1 Corinthians 15" where no verse is specified. A backtrack fix (`lastIndex = match.index + 1` on alias miss) prevents tokens like "Does 1" from consuming the leading digit of "1 Corinthians".

**Numeric keyword suppression**: Parsed chapter references suppress numeric token extraction in the downstream semantic query. Without this, a query for "Psalm 23" generates keyword "23", which retrieves unrelated numerical content (census records, inventory lists).

## 3.3 Layered Retrieval (v3 Direct-Chapter)

Retrieval proceeds in layers, ordered by specificity:

**Layer 1 — exact verse lookup**: For verse-level references, the system queries the `bible_verses` table directly by `(book_id, chapter, verse)`. These rows are added to the candidate set without any semantic ranking step.

**Layer 2 — chapter-aware DB query (`lookupChapterVerses`)**: For chapter-only references, the system fetches all verses in the referenced chapter directly from `bible_verses` by `(book_id, chapter)`. This avoids the v2 design flaw of running an unconstrained semantic search and then filtering, which could return semantically close verses from other chapters if the referenced chapter ranked poorly.

**Layer 3 — semantic re-ranking within chapter (`selectWithinChapters`)**: The fetched chapter verses are re-ranked by cosine similarity to the query embedding. An IVFFlat index on the `embedding` column provides approximate nearest-neighbor search. The top-k results are selected.

**Per-chapter coverage guarantee**: After semantic re-ranking, the system checks whether at least one verse from each referenced chapter appears in the final candidate set. If not, it appends the first verse of the chapter (verse 1). This ensures multi-hop queries that reference two chapters ("Psalm 23 and John 10") always return at least one verse from each.

**Layer 4 — hybrid semantic fallback**: For queries with no parsed references, the system runs an unconstrained semantic search over all verses using the query embedding. Keywords extracted from the query are used to bias results toward verses with matching lexical content.

**Context assembly**: The top-5 verses across all layers are assembled into a context block formatted as `BOOK CHAPTER:VERSE — {text}` on separate lines.

## 3.4 Answer Generation

The assembled verse context and original query are passed to a Gemini model with a system prompt instructing it to:
- Answer from the provided verses only
- Cite specific verses inline (e.g., "As John 3:16 says...")
- Refuse or correct false premises
- Decline to fabricate verses or attributions

The system prompt does not instruct on theological interpretation — it only constrains attribution fidelity.

## 3.5 Version History

| Version | Architecture | R@5 (v0.2) | R@5 (v0.3) |
|---------|-------------|------------|------------|
| v1 (hybrid-ref) | Semantic search + alias-based verse extraction | 0.676 | — |
| v2 (chapter-ref) | v1 + chapter-only parser + semantic filter | 0.882 | — |
| v3 (direct-chapter) | v2 → direct DB chapter lookup, no unrestricted fallback | 0.882 (MRR 0.714) | **0.941** |

v0.3 expanded the `acceptable_verse_clusters` for two questions (aion_023 strength, aion_033 resurrection) based on v2 failure analysis. The v0.2→v0.3 system gain is +0.059 and is entirely attributable to annotation expansion, not architecture change.
