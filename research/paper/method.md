# Method

<!-- Status: REVISED 2026-06-04 -->

## 3.1 System Overview

Aion is a verse-grounded Bible QA system deployed as a Supabase Edge Function.
Given a user query, the system parses any explicit Bible references, retrieves candidate verses, re-ranks them semantically, and generates a grounded answer citing specific verses.
Figure 1 shows the full pipeline.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User Query                                 │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Reference Parser  (lib/bible-reference-parser.ts)                  │
│  Pass 1: BOOK CHAPTER:VERSE regex  →  verse-level refs              │
│  Pass 2: BOOK CHAPTER regex        →  chapter-level refs            │
│  Numeric keyword suppression for chapter refs                       │
└───────┬──────────────────────────────────────┬───────────────────────┘
        │ explicit refs found                  │ no refs found
        ▼                                      ▼
┌───────────────────┐                ┌──────────────────────────────┐
│  Layer 1          │                │  Layer 4                     │
│  Exact verse      │                │  Hybrid semantic fallback    │
│  lookup by        │                │  Unconstrained pgvector      │
│  (book, ch, vs)   │                │  search + keyword bias       │
└───────┬───────────┘                └──────────────┬───────────────┘
        │                                           │
        ▼                                           │
┌───────────────────┐                               │
│  Layer 2          │                               │
│  Chapter-aware    │                               │
│  DB query         │                               │
│  lookupChapter-   │                               │
│  Verses()         │                               │
└───────┬───────────┘                               │
        │                                           │
        ▼                                           │
┌───────────────────┐                               │
│  Layer 3          │                               │
│  Semantic re-rank │                               │
│  within chapter   │                               │
│  text-embedding-  │                               │
│  3-small + IVFFlat│                               │
└───────┬───────────┘                               │
        │                                           │
        ▼                                           │
┌─────────────────────────────────────────────────────────────────────┐
│  Per-chapter coverage guarantee                                     │
│  Ensure ≥1 verse per referenced chapter; append verse 1 if missing  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Context Assembly  —  top-5 verses: "BOOK CH:VS — {text}"           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Answer Generation  —  gemini-3.1-flash-lite                        │
│  Grounded citation  ·  False-premise refusal  ·  No fabrication     │
└─────────────────────────────────────────────────────────────────────┘
```

*Figure 1: Aion v3 pipeline. Queries with explicit references follow the left branch (Layers 1–3 + coverage guarantee); queries without references follow the right branch (Layer 4). Both paths converge at context assembly before answer generation.*

## 3.2 Reference Parsing

A two-pass parser (`lib/bible-reference-parser.ts`) identifies explicit scripture references in the query.

**Pass 1 — verse-level references**: Regex matches `BOOK CHAPTER:VERSE` patterns (e.g., "John 3:16", "Ps. 23:1"). An alias map resolves common abbreviations and alternate spellings to canonical book IDs.

**Pass 2 — chapter-only references**: A separate CHAPTER_REGEX captures patterns like "Psalm 23" or "1 Corinthians 15" where no verse is specified. A backtrack fix (`lastIndex = match.index + 1` on alias miss) prevents tokens like "Does 1" from consuming the leading digit of "1 Corinthians".

**Numeric keyword suppression**: Parsed chapter references suppress numeric token extraction in the downstream semantic query. Without this, a query for "Psalm 23" generates keyword "23", which retrieves unrelated numerical content (census records, inventory lists).

## 3.3 Layered Retrieval (v3 Direct-Chapter)

Retrieval proceeds in layers, ordered by specificity:

**Layer 1 — exact verse lookup**: For verse-level references, the system queries the `bible_verses` table directly by `(book_id, chapter, verse)`. These rows are added to the candidate set without any semantic ranking step.

**Layer 2 — chapter-aware DB query (`lookupChapterVerses`)**: For chapter-only references, the system fetches all verses in the referenced chapter directly from `bible_verses` by `(book_id, chapter)`. This avoids the v2 design flaw of running an unconstrained semantic search and then filtering, which could return semantically close verses from other chapters if the referenced chapter ranked poorly.

**Layer 3 — semantic re-ranking within chapter (`selectWithinChapters`)**: The fetched chapter verses are re-ranked by cosine similarity to the query embedding using **text-embedding-3-small** (OpenAI) embeddings. An IVFFlat index on the `embedding` column provides approximate nearest-neighbor search. The top-k results are selected.

**Per-chapter coverage guarantee**: After semantic re-ranking, the system checks whether at least one verse from each referenced chapter appears in the final candidate set. If not, it appends the first verse of the chapter (verse 1). This ensures multi-hop queries that reference two chapters ("Psalm 23 and John 10") always return at least one verse from each.

**Layer 4 — hybrid semantic fallback**: For queries with no parsed references, the system runs an unconstrained semantic search over all verses using the query embedding. Keywords extracted from the query are used to bias results toward verses with matching lexical content.

**Context assembly**: The top-5 verses across all layers are assembled into a context block formatted as `BOOK CHAPTER:VERSE — {text}` on separate lines.

## 3.4 Answer Generation

The assembled verse context and original query are passed to **gemini-3.1-flash-lite** (Google DeepMind, 2026; API endpoint: `v1beta/models/gemini-3.1-flash-lite`) with a system prompt that:
- Restricts answers to the provided verses only; the model may not recall verses from memory
- Requires inline citation using the format `Book Chapter:Verse`
- Instructs the model to acknowledge when the retrieved verses do not address the question

The prompt contains no explicit instruction to detect false premises or refuse fabrication requests. The 1.000 false-premise/adversarial refusal rate in Section 5 is an emergent consequence of these three constraints operating together — explained in Appendix A.
The full system prompt is reproduced in Appendix A.

## 3.5 Version History

| Version | Architecture | R@5 (v0.2) | R@5 (v0.3) |
|---------|-------------|------------|------------|
| v1 (hybrid-ref) | Semantic search + alias-based verse extraction | 0.676 | — |
| v2 (chapter-ref) | v1 + chapter-only parser + semantic filter | 0.882 | — |
| v3 (direct-chapter) | v2 + direct DB chapter lookup, per-chapter coverage guarantee | 0.882 (MRR 0.714) | **0.941** |

v0.3 expanded the `acceptable_verse_clusters` for two questions (aion_023 strength, aion_033 resurrection) based on v2 failure analysis. The v0.2→v0.3 system gain is +0.059 and is entirely attributable to annotation expansion, not architecture change.

The v3 architecture change (evaluated on the same v0.2 dataset, R@5 constant at 0.882) should not be read as a null result: v3 fixes aion_035 (multi-hop, Psalm 23 + John 10, previously failing) and correctly loses aion_036, which passed in v2 only because an unrestricted semantic fallback accidentally retrieved PHP.4.6. The architecture change eliminates an unreliable accidental success and replaces it with principled chapter-level lookup, at no aggregate cost to R@5.
