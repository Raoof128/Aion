# v3 direct-chapter — gold_40 v0.2 Failures

**Date:** 2026-05-26  
**System:** v3 direct-chapter  
**Dataset:** `aion_bibleqa_gold_40_v0.2.jsonl`  
**Failure count:** 4 / 34 scored (R@5 = 0.882)

---

## aion_023 — `gold_too_narrow`

**Category:** thematic  
**Question:** What does the Bible say about strength?

**Gold:** `PHP.4.13`, `ISA.40.31`  
**Retrieved (top 5):** `2TI.1.7`, `EPH.1.19`, `2CO.13.4`, `1TI.4.8`, `2CO.10.4`

**Analysis:** No chapter ref in this query → standard hybrid RAG path. The system retrieved valid, high-quality strength verses (spirit of power, surpassing greatness, living by God's power). Gold is anchored to the two canonical "strength" memory-verses (Philippians 4:13 "I can do all things"; Isaiah 40:31 "renew their strength like eagles"). PHP.4.13 is contextually about contentment and ranking well below NT power-language verses. ISA.40.31 is OT — embedding distance from NT queries is high.

**Status:** Unchanged from v2. Not a retrieval failure; a gold annotation scope issue.

**Fix path:** v0.3 annotation — expand aion_023 `acceptable_verse_clusters` to include `["2TI.1.7", "EPH.1.19", "2CO.13.4"]`. Applied in v0.3 dataset → aion_023 passes on v0.3.

---

## aion_027 — `semantic_drift`

**Category:** thematic  
**Question:** What does the Bible say about grace?

**Gold:** `EPH.2.8`, `EPH.2.9`  
**Retrieved (top 5):** `EPH.4.7`, `2TH.1.2`, `EPH.1.2`, `PHM.1.3`, `2CO.1.2`

**Analysis:** No chapter ref → standard hybrid RAG path. "Grace" in the Pauline corpus appears overwhelmingly in salutation formulae ("Grace and peace to you from God our Father…"). These verses are short, dense in the keyword "grace", and semantically cluster together. The salvific EPH.2.8-9 ("saved by grace through faith") is narratively distinct — it uses "grace" in the sense of unmerited divine favour, not as a liturgical greeting. Classic frequency-bias failure: the retriever surfaces the most *common* use of "grace" rather than the most *theologically central* one.

**Status:** Unchanged from v2. This is a genuine retrieval failure requiring architectural work.

**Fix path:** v3.1 — query-expansion or re-rank step for thematic queries. Detect "what does Bible say about X" pattern → add theological framing to the query before embedding. Or: a re-ranker that penalises salutation verses for open thematic queries where no verse/chapter ref is present.

---

## aion_033 — `gold_too_narrow` (within-chapter miss)

**Category:** interpretive  
**Question:** Does 1 Corinthians 15 prove bodily resurrection?

**Gold:** `1CO.15.42`, `1CO.15.52`  
**Retrieved (top 5):** `1CO.15.12`, `1CO.15.13`, `1CO.15.16`, `1CO.15.20`, `1CO.15.15`

**Analysis:** v3 correctly identified "1 Corinthians 15" as a chapter-only ref, performed the direct DB lookup for all 1CO.15 verses, then applied semantic ranking within those results. The semantic search within the chapter favoured vv.12-21 (the *argument for* resurrection: "if there is no resurrection…") over vv.42-52 (the *description of* the resurrection body: "sown perishable, raised imperishable"; "in a moment, in the twinkling of an eye"). The query "prove bodily resurrection" semantically matches the argument section more closely than the body-description section. The chapter-constrained retrieval path is working correctly.

**Status:** Unchanged from v2. Not a path failure; a within-chapter semantic ranking issue.

**Fix path:** v0.3 annotation — add `1CO.15.12`–`1CO.15.21` as an acceptable argument-for-resurrection cluster. Applied in v0.3 dataset → aion_033 passes on v0.3. Longer term (v4): per-query theological framing for interpretive questions.

---

## aion_036 — `IVFFlat_boundary` (NEW failure in v3)

**Category:** multi_hop  
**Question:** Compare the teaching on anxiety in Philippians 4 and Matthew 6.

**Gold:** `PHP.4.6`, `MAT.6.25`  
**Retrieved (top 5):** `PHP.4.1`, `MAT.6.1`, ... (per-chapter guarantee verses, not gold)

**Analysis:** v3 correctly identified two chapter-only refs: PHP.4 and MAT.6. Direct DB lookup fetched all PHP.4 and MAT.6 verses. Semantic search (`matchCount=20`) was run against the full query. However, PHP.4.6 and MAT.6.25 were not in the top-20 semantic results for two compounding reasons:

1. **IVFFlat boundary non-determinism:** PHP.4.6 and MAT.6.25 sit near the `matchCount=20` similarity boundary. With `matchCount=20`, these verses are inconsistently included or excluded depending on index state.

2. **Name contamination:** PHP.4.15 contains the phrase "you Philippians know" — the word "Philippians" appears literally in the verse text, causing it to rank higher than PHP.4.6 ("do not be anxious about anything") for queries containing "Philippians 4". PHP.4.15 scores high on keyword match, pushing PHP.4.6 below the cutoff in the within-chapter filter.

The `selectWithinChapters` per-chapter guarantee activates: since PHP.4.6 is absent from the semantic results, it falls back to the direct DB verses and adds PHP.4.1 (the first verse of PHP.4). Same for MAT.6.1. These guarantee verses are structurally correct (from the right chapter) but are not the gold anxiety verses.

**Context:** In v2, this query was **accidentally rescued** by the unrestricted fallback: when the chapter filter returned < 2 results, `broadResults.slice(0,6)` was used — which returned PHP.4.6 and MAT.6.25 via pure semantic search on the full corpus. v3 deliberately removes this fallback for `chapter_only` refs. The loss of aion_036 is **intentional and expected**.

**Fix path:** v4 — per-chapter vector search RPC: `SELECT * FROM search_verses_in_chapter(embedding, book_id, chapter, k)`. This searches only within the chapter's embedding subspace, bypassing the global `matchCount` limit and avoiding cross-chapter name contamination. The per-chapter guarantee becomes unnecessary once the per-chapter search is correctly scoped.
