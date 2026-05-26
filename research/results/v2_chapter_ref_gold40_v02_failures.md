# v2 chapter-ref — gold_40 v0.2 Failures

**Date:** 2026-05-26  
**System:** v2 hybrid_rag  
**Dataset:** `aion_bibleqa_gold_40_v0.2.jsonl`  
**Failure count:** 4 / 34 scored (R@5 = 0.882)

---

## aion_023 — `gold_too_narrow`

**Category:** thematic  
**Question:** What does the Bible say about strength?

**Gold:** `PHP.4.13`, `ISA.40.31`  
**Retrieved (top 5):** `2TI.1.7`, `EPH.1.19`, `2CO.13.4`, `1TI.4.8`, `2CO.10.4`

**Analysis:** The system retrieved valid, high-quality strength verses (spirit of power, surpassing greatness, living by God's power). Gold is anchored to the two canonical "strength" memory-verses (Philippians 4:13 "I can do all things"; Isaiah 40:31 "renew their strength like eagles"). Neither appeared in top 5 — probable cause: PHP.4.13 is contextually about contentment; ISA.40.31 is OT and embedding distance may be high relative to NT power language.

**Fix path:** v2.1 annotation — expand aion_023 acceptable_verse_clusters to include `2TI.1.7`, `EPH.1.19`, `ISA.40.31` as an alternative cluster.

---

## aion_027 — `semantic_drift`

**Category:** thematic  
**Question:** What does the Bible say about grace?

**Gold:** `EPH.2.8`, `EPH.2.9`  
**Retrieved (top 5):** `EPH.4.7`, `2TH.1.2`, `EPH.1.2`, `PHM.1.3`, `2CO.1.2`

**Analysis:** "Grace" in the epistles appears overwhelmingly in salutation formulae ("Grace and peace to you from God our Father…"). These verses are short, dense in the keyword "grace", and semantically cluster together. The salvific passage EPH.2.8-9 ("saved by grace through faith") is narratively distinct and ranks lower. Classic frequency-bias failure: the retriever surfaces the most *common* use of "grace" rather than the most *theologically central* one.

**Fix path:** v3 — requires either query-expansion (detect "what does Bible say about X" pattern → add theological framing to embedding), or a re-rank step that penalises salutation verses for open thematic queries.

---

## aion_033 — `gold_too_narrow` (within-chapter miss)

**Category:** interpretive  
**Question:** Does 1 Corinthians 15 prove bodily resurrection?

**Gold:** `1CO.15.42`, `1CO.15.52`  
**Retrieved (top 5):** `1CO.15.12`, `1CO.15.13`, `1CO.15.16`, `1CO.15.20`, `1CO.15.15`

**Analysis:** The v2 chapter-ref parser correctly identified "1 Corinthians 15" as a chapter-only ref and the chapter-constrained search correctly returned verses from 1CO.15. However, the semantic search within the chapter favoured vv.12-21 (the *argument for* resurrection: "if there is no resurrection…") over vv.42-52 (the *description of* the resurrection body: "sown perishable, raised imperishable"; "in a moment, in the twinkling of an eye"). The query "prove bodily resurrection" semantically matches the argument section more than the body-description section.

**Fix path:** v2.1 annotation — add vv.12-21 as an acceptable cluster for aion_033. The retrieved result is a legitimate interpretive answer. Alternatively v3 — semantic re-rank with "bodily/physical nature" framing.

---

## aion_035 — `chapter_filter_miss`

**Category:** multi_hop  
**Question:** How do Psalm 23 and John 10 describe God as shepherd?

**Gold:** `PSA.23.1`, `JHN.10.11`  
**Retrieved (top 5):** `MIC.5.4`, `PSA.95.7`, `PSA.100.3`, `PSA.136.16`, `ISA.58.11`

**Analysis:** The parser correctly identified two chapter-only refs: PSA.23 and JHN.10. The chapter-constrained path did a broad semantic search for "shepherd" (matchCount=20), then filtered to `{PSA.23, JHN.10}`. Neither PSA.23 nor JHN.10 verses appeared in the top 20 semantic results — the embedding space is saturated with shepherd-themed verses from across the Bible (MIC.5.4, PSA.95.7, PSA.100.3, PSA.136.16, ISA.58.11). Chapter filter returned 0 results → condition `deduped.length >= 2` was false → system fell back to unrestricted `broadResults`. The answer correctly acknowledged it couldn't find PSA.23/JHN.10.

**Fix path:** v3 — for `chapter_only` refs, add a direct DB chapter lookup (`SELECT … WHERE book_id=? AND chapter=? ORDER BY verse LIMIT 10`) as the primary retrieval method, then apply semantic re-ranking within those results. Do not rely on semantic search to surface a specific chapter when that chapter is not the only one covering the theme.
