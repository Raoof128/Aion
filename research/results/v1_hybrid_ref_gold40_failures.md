# v1 Hybrid-Ref Gold40 — Failure Analysis

**Date:** 2026-05-26  
**11 failures across 34 scored questions**

---

## Failure Labels

| Label | Meaning |
| ----- | ------- |
| `retriever_miss` | System retrieved wrong verses with no semantic excuse |
| `gold_too_narrow` | System may retrieve valid verses not in gold set |
| `acceptable_cluster_missing` | Retrieved verse is genuinely valid but cluster doesn't include it |
| `reference_parser_gap` | Parser couldn't resolve the reference; keyword fallback failed |
| `semantic_drift` | System retrieved adjacent semantic neighbourhood instead of canonical target |
| `answer_good_retrieval_bad` | Answer text may be correct but cited verses wrong (Phase 3 to confirm) |
| `false_premise_pending_judge` | N/A retrieval — judge evaluates refusal quality |

---

## Failure 1 — aion_006

**Question:** Does Matthew 5 support non-violence?  
**Category:** interpretive  
**Label:** `semantic_drift` + `acceptable_cluster_missing`

**Gold clusters:** MAT.5.38-39, MAT.5.43-45  
**Retrieved:** DEU.19.21, MAT.19.18, TIT.3.2, ROM.12.19, 2TI.2.24

**Analysis:** The system found thematically adjacent verses — "an eye for an eye" (DEU.19.21), "do not murder" (MAT.19.18), "be gentle" (TIT.3.2), "vengeance is mine" (ROM.12.19), "not quarrelsome" (2TI.2.24). These are not wrong-topic, but the system missed the Sermon on the Mount's turn-the-other-cheek verses (MAT.5.38-45) — the only verses that directly reframe the "eye for eye" principle. The query has no explicit verse reference so falls to hybrid search; "non-violence" maps more to "vengeance/gentleness" vocabulary than to the Sermon on the Mount.

**Why retrieved verses are actually arguable:** ROM.12.19 ("vengeance is mine, says the Lord") is arguably a valid answer. The cluster should expand to include ROM.12.17-21 at minimum.

**Fix path:** Expand MAT.5 cluster to include context (MAT.5.38-45). Add ROM.12.17-21 as acceptable alternative cluster. Possibly query-expand "Matthew 5" as chapter lookup.

---

## Failure 2 — aion_019

**Question:** What does the Bible say about love?  
**Category:** thematic  
**Label:** `acceptable_cluster_missing`

**Gold clusters:** 1CO.13.4-7, JHN.3.16, 1JN.4.8, ROM.8.38-39  
**Retrieved:** 2JN.1.6, 1PE.4.8, 1JN.4.11, JHN.13.34, JHN.15.17

**Analysis:** Every retrieved verse is genuinely about love. JHN.13.34 ("Love one another as I have loved you") and JHN.15.17 ("This is my command: Love each other") are direct love commands from Jesus. 1JN.4.11 ("we also ought to love one another"), 1PE.4.8 ("love covers a multitude of sins"), 2JN.1.6 ("walk in love"). None are in the current clusters. **This is an annotation failure, not a retrieval failure.** The system is working correctly; the cluster is too narrow.

**Fix path:** Expand love cluster to include: JHN.13.34, JHN.15.17, 1JN.4.11, 1PE.4.8. These are canonical love commands.

---

## Failure 3 — aion_023

**Question:** What does the Bible say about strength?  
**Category:** thematic  
**Label:** `semantic_drift`

**Gold clusters:** PHP.4.13, ISA.40.31, PSA.46.1, EPH.6.10  
**Retrieved:** 2TI.1.7, EPH.1.19, 2CO.13.4, 1TI.4.8, 2CO.10.4

**Analysis:** The embedding neighbourhood for "strength" is populated by "power/dunamis" vocabulary: EPH.1.19 ("incomparably great power for us who believe"), 2TI.1.7 ("spirit of power and love"), 2CO.10.4 ("divine power to demolish strongholds"). PHP.4.13 ("I can do all things through Christ who strengthens me") and ISA.40.31 ("those who hope in the Lord will renew their strength") are the canonical targets but ranked below rank 5. BSB rendering of PHP.4.13 may use "strengthens" rather than "strength" as a standalone noun — the embedding may not bridge the inflection gap at rank 1.

**Fix path:** Query expansion: "strength" → "strengthen, power in weakness, made strong". Add EPH.1.19 and 2TI.1.7 to acceptable clusters (genuinely valid answers).

---

## Failure 4 — aion_024

**Question:** What does the Bible say about peace?  
**Category:** thematic  
**Label:** `acceptable_cluster_missing`

**Gold clusters:** PHP.4.7, JHN.14.27, ISA.26.3, ROM.5.1  
**Retrieved:** TIT.3.2, MRK.9.50, ROM.12.19, ROM.12.18, 2TI.2.24

**Analysis:** ROM.12.18 ("If it is possible, as far as it depends on you, live at peace with everyone") is a direct peace teaching. MRK.9.50 ("Have salt in yourselves, and be at peace with each other") and TIT.3.2 ("to be peaceable and considerate") are also valid. The current clusters cover inner peace (PHP.4.7, ISA.26.3) and soteriological peace (ROM.5.1), but miss the interpersonal peace category. Retrieved verses are from a different valid angle.

**Fix path:** Add `ROM.12.18`, `MRK.9.50` as an interpersonal-peace cluster. Expand annotation.

---

## Failure 5 — aion_027

**Question:** What does the Bible say about grace?  
**Category:** thematic  
**Label:** `semantic_drift`

**Gold clusters:** EPH.2.8-9, ROM.6.14, 2CO.12.9, TIT.2.11  
**Retrieved:** EPH.4.7, 2TH.1.2, EPH.1.2, PHM.1.3, 2CO.1.2

**Analysis:** The system over-indexed on the word "grace" appearing in Pauline letter salutations: EPH.1.2 ("Grace and peace to you from God our Father"), 2TH.1.2, PHM.1.3, 2CO.1.2 — all greeting formulae. EPH.4.7 ("to each one of us grace has been given") is a teaching verse but still not the canonical EPH.2.8-9. The keyword matching component is pulling salutation verses that contain "grace" as a word but don't teach the doctrine. EPH.2.8-9 ("for it is by grace you have been saved, through faith") should be the strongest semantic match but was out-ranked.

**Fix path:** Investigate why EPH.2.8-9 underranks for "grace" query — the full text includes "grace", "saved", "faith", "gift of God". Possible causes: salutation verses have short text with high "grace" density; embedding space conflates. Reranker or BM25 weight adjustment may help. Near-term: add EPH.4.7 to acceptable clusters.

---

## Failure 6 — aion_028

**Question:** What does the Bible say about fear?  
**Category:** thematic  
**Label:** `acceptable_cluster_missing` + `semantic_drift`

**Gold clusters:** ISA.41.10, 2TI.1.7, PSA.23.4, JHN.14.27  
**Retrieved:** 1SA.12.20, MAT.10.28, LEV.25.43, EZK.2.6, JOB.33.7

**Analysis:** MAT.10.28 ("Do not be afraid of those who kill the body but cannot kill the soul") is a direct "fear not" verse from Jesus and a valid answer. LEV.25.43 and EZK.2.6 are "do not rule with harshness / do not be afraid of them" — less canonical but not wrong. ISA.41.10 ("Fear not, for I am with you") didn't rank in top 5 despite being the most iconic fear-not verse. 2TI.1.7 ("God has not given us a spirit of fear") is in the gold and also didn't rank.

**Fix path:** Add MAT.10.28 to the fear cluster (genuinely canonical). Investigate why ISA.41.10 underranks — BSB text is "Do not fear, for I am with you" which should be a very strong semantic match for "fear".

---

## Failure 7 — aion_029

**Question:** Does Ecclesiastes 1 suggest that life is meaningless?  
**Category:** interpretive  
**Label:** `reference_parser_gap`

**Gold clusters:** ECC.1.2, ECC.1.14, ECC.12.13-14  
**Retrieved:** ECC.4.8, ECC.2.19, ECC.12.8, MRK.8.36, ECC.6.2

**Analysis:** The parser requires `Book N:V` format; "Ecclesiastes 1" is a chapter reference without a verse and returns null → hybrid search runs. The keyword "1" from "Ecclesiastes 1" doesn't help; the semantic search correctly identifies Ecclesiastes as the topic and retrieves vanity-of-vanities verses (ECC.12.8, ECC.4.8, ECC.2.19) — wrong chapter but right book and theme. ECC.12.8 ("Vanity of vanities, all is vanity") is effectively ECC.1.2's refrain — very close. Partial credit for finding the book and theme.

**Fix path:** Extend `parseReferences` to handle `Book N` (chapter reference without verse) → emit a chapter-level lookup or use first verse as anchor. Alternatively, expand cluster to include ECC.12.8 which is semantically identical to ECC.1.2.

---

## Failure 8 — aion_033

**Question:** Does 1 Corinthians 15 prove bodily resurrection?  
**Category:** interpretive  
**Label:** `reference_parser_gap` (catastrophic)

**Gold clusters:** 1CO.15.42-44, 1CO.15.51-53  
**Retrieved:** JHN.21.11, GEN.7.24, GEN.8.3, EZR.2.30, EZR.8.3

**Analysis:** This is a complete retrieval failure caused by the number "15" in the query. "1 Corinthians 15" is parsed as a chapter reference (no verse) → hybrid search. The keyword extractor likely pulled "15" as a keyword and matched it against verse numbers, chapter counts, or numbers-in-text: JHN.21.11 has 153 fish, GEN.7.24/8.3 reference 150/153-day flood periods, EZR.2.30/8.3 are census numbers. "Resurrection" likely contributed "body" or narrative matches poorly. This is the worst-performing failure in the set.

**Fix path:** High priority. Extend parser to handle chapter-only refs: `1 Corinthians 15` → expand to first N verses of 1CO chapter 15. Also: the keyword extractor should not emit pure numbers as search keywords.

---

## Failure 9 — aion_034

**Question:** What is the relationship between faith and works in James and Romans?  
**Category:** multi_hop  
**Label:** `acceptable_cluster_missing` + `retriever_miss`

**Gold clusters:** JAS.2.17+2.24, ROM.3.28, EPH.2.8-9  
**Retrieved:** 2CO.1.24, JAS.2.14, GAL.3.2, JUD.1.1, GAL.3.5

**Analysis:** JAS.2.14 ("What good is it, my brothers, if someone claims to have faith but has no deeds?") is retrieved and is the exact context of JAS.2.17 (two verses later). However the cluster starts at JAS.2.17 and JAS.2.14 is not included. ROM.3.28 ("a person is justified by faith apart from the works of the law") was not retrieved — the system found GAL.3.2/3.5 (parallel Galatians argument about law and Spirit) instead. Multi-hop requires coverage of both books; only James was approximately represented.

**Fix path:** Add JAS.2.14 to acceptable cluster (immediate context of 2.17). Add GAL.3.2 as alternative cluster for Pauline faith-without-works argument.

---

## Failure 10 — aion_035

**Question:** How do Psalm 23 and John 10 describe God as shepherd?  
**Category:** multi_hop  
**Label:** `reference_parser_gap` (catastrophic)

**Gold clusters:** PSA.23.1-4, JHN.10.11+10.14  
**Retrieved:** EZR.2.28, EZR.2.21, NEH.7.32, NUM.26.62, 1KI.20.15

**Analysis:** "Psalm 23" and "John 10" are chapter references without verse numbers → parser returns null → keyword search runs. The numbers 23 and 10 are picked up as keywords matching population counts in Ezra/Nehemiah census records (EZR.2.28 = "223 men", EZR.2.21 = "of Bethlehem, 123 men"). This is the most catastrophic failure: the system found census records because "23" matched verse content numbers. "Shepherd" as a semantic signal was overwhelmed by numeric keyword matches.

**Fix path:** Critical. Same as aion_033: extend parser for chapter-only references. Also: de-weight or ban pure-number keywords in `extractKeyword()`.

---

## Failure 11 — aion_036

**Question:** Compare the teaching on anxiety in Philippians 4 and Matthew 6.  
**Category:** multi_hop  
**Label:** `reference_parser_gap` + `acceptable_cluster_missing`

**Gold clusters:** PHP.4.6-7, MAT.6.25+6.34  
**Retrieved:** LUK.24.38, LUK.12.22, LUK.18.1, JHN.6.61, MRK.8.33

**Analysis:** "Philippians 4 and Matthew 6" are chapter references → null parse → hybrid search. LUK.12.22 ("do not worry about your life, what you will eat") is retrieved — this is the Lukan parallel to MAT.6.25, a genuinely valid anxiety verse not in the clusters. LUK.12.22 should be added to the acceptable clusters. PHP.4.6 ("do not be anxious about anything") was not retrieved despite being a canonical anxiety verse — "Philippians 4" in the query may have confused the semantic search.

**Fix path:** Add LUK.12.22 (and LUK.12.22-31 range) to the anxiety cluster as Lukan parallel to MAT.6.25. Extend parser for chapter refs.

---

## Failure Pattern Summary

| Pattern | Count | Failures |
| ------- | ----- | -------- |
| `reference_parser_gap` | 4 | aion_029, aion_033, aion_035, aion_036 (partial) |
| `acceptable_cluster_missing` | 5 | aion_019, aion_024, aion_028 (partial), aion_034, aion_036 (partial) |
| `semantic_drift` | 4 | aion_006, aion_023, aion_027, aion_028 (partial) |
| `retriever_miss` | 1 | aion_034 (ROM.3.28) |

*Note: some failures carry two labels.*

---

## Prioritised Fix List for v2

1. **[HIGH] Extend parser for chapter-only refs** — `Book N` without `:verse` should trigger chapter-level lookup (all verses in chapter N) or at least anchor to verse 1. Fixes aion_029, aion_033, aion_035, aion_036 partially.
2. **[HIGH] Ban numeric keywords** — `extractKeyword()` should not emit standalone integers. Prevents catastrophic census-record retrieval (aion_033, aion_035).
3. **[MEDIUM] Expand gold clusters** — Add JHN.13.34, JHN.15.17 (love); ROM.12.18, MRK.9.50 (peace); MAT.10.28 (fear); JAS.2.14, GAL.3.2 (faith/works); LUK.12.22 (anxiety). These are annotation misses, not retrieval failures.
4. **[MEDIUM] Investigate semantic drift for grace/strength** — EPH.2.8-9 (grace) and PHP.4.13 (strength) underrank despite being highly canonical. May require embedding analysis or BM25 weight tuning.
5. **[LOW] Expand interpretive cluster for non-violence** — ROM.12.17-21 is a valid answer for Matthew 5 / non-violence question.
