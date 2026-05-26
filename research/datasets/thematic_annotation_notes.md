# Thematic Annotation Notes

**Date:** 2026-05-26  
**Status:** Draft — coords marked `needs_review` require BSB corpus verification before locking  
**Purpose:** Guide for co-annotation of thematic questions in `aion_bibleqa_gold_40_draft.jsonl`

---

## Why thematic questions need clusters

Thematic queries ("What does the Bible say about forgiveness?") have no single correct verse. Multiple passages are valid, and many valid passages may not appear in any fixed gold set. Scoring with a single gold verse risks two kinds of annotation failure:

- **False negative:** System retrieves a genuinely valid verse not in the gold set → scored as 0 when it should be 1
- **False positive:** System retrieves a decorative verse that is topically adjacent but does not actually support the claim → scored as 1 when it should be 0

The cluster structure in `BenchmarkQuestion` handles the first failure. The LLM-as-judge (Phase 3) handles the second. Until Phase 3 is built, the cluster approach gives a conservative lower bound on retrieval quality.

---

## Cluster design principles

**Primary gold verses** — the most canonical passage(s). If a system retrieves nothing else, it should retrieve these.

**Acceptable clusters** — each inner array is a set of coords that would count as a valid hit for that cluster. For thematic queries, each cluster represents one distinct "angle" on the theme (e.g. definition, example, promise, command). A hit on any one verse in any cluster counts toward Recall@5 and Precision@5.

**Near-miss verses** (annotation note only, not in schema) — verses that are topically adjacent but do not directly address the question. Retrieving these is not penalised in retrieval metrics, but would score low in the Phase 3 citation-support judge. Document them in notes.

**Invalid decorative verses** (annotation note only) — verses that are frequently attached to this theme despite not supporting the claim. Classic example: PHP.4.13 cited to support "you can do anything" rather than its actual context (contentment in all circumstances).

---

## Thematic clusters by question

### Forgiveness (aion_003)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Conditional forgiveness | MAT.6.14, MAT.6.15 | "If you forgive others, your Father will forgive you" |
| Active forgiveness | EPH.4.32 | "Forgiving each other as God in Christ forgave you" |
| Bearing with each other | COL.3.13 | "Forgiving whatever grievances you have against one another" |
| Repeated forgiveness | LUK.17.3, LUK.17.4 | Seven times — verify verse count in BSB |
| Confession and forgiveness | 1JN.1.9 | "Faithful and just to forgive us our sins" |

Near-miss: PSA.103.12 (as far as east from west) — topically related but not an instruction to forgive.  
Decorative risk: MAT.18.22 (seventy times seven) — verify this is in BSB and at what verse.

---

### Anxiety (aion_004)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Present-moment prayer | PHP.4.6, PHP.4.7 | "Do not be anxious about anything, but in every situation, by prayer..." |
| Casting care on God | 1PE.5.7 | "Cast all your anxiety on him because he cares for you" |
| Do not worry about tomorrow | MAT.6.25, MAT.6.34 | "Do not worry about your life" / "Do not worry about tomorrow" |
| Entrust burdens to God | PSA.55.22 | "Cast your cares on the Lord and he will sustain you" |

Near-miss: ISA.41.10 — addresses fear, not anxiety specifically.  
Decorative risk: PHP.4.13 — often cited alongside PHP.4.6-7 but is about contentment, not anxiety.

**IMPORTANT:** Verify MAT.6.25 and MAT.6.34 are separate verses in BSB (some BSB editions may differ in verse numbering).

---

### Love (aion_019)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Love defined | 1CO.13.4, 1CO.13.5, 1CO.13.6, 1CO.13.7 | Love chapter — may be retrieved as a block |
| God's love demonstrated | JHN.3.16 | Foundational; direct reference also handles this |
| God is love | 1JN.4.8 | Verify: "God is love" — check exact verse number in BSB |
| Nothing separates from love | ROM.8.38, ROM.8.39 | Love's permanence — two-verse unit |

Near-miss: 1JN.4.19 ("We love because he first loved us") — valid but secondary.

---

### Faith (aion_020)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Faith defined | HEB.11.1 | "Now faith is confidence in what we hope for..." |
| Faith by grace not works | EPH.2.8, EPH.2.9 | "saved through faith... not from yourselves, it is the gift of God" |
| Faith comes from hearing | ROM.10.17 | "faith comes from hearing the message" |
| Faith without works | JAS.2.17 | "faith by itself, if it is not accompanied by action, is dead" |

Near-miss: MAT.17.20 (faith like a mustard seed) — about size/power of faith, not definition.  
Annotation note: JAS.2.17 and EPH.2.8-9 appear contradictory — this is intentional tension. The system should cite both without fabricating a resolution.

---

### Prayer (aion_021)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Prayer instead of anxiety | PHP.4.6, PHP.4.7 | Direct instruction |
| The Lord's Prayer | MAT.6.9–MAT.6.13 | 5-verse block — verify exact verse range in BSB |
| Pray without ceasing | 1TH.5.17 | Single verse |
| Righteous person's prayer | JAS.5.16 | "The prayer of a righteous person is powerful" |

**IMPORTANT:** The Lord's Prayer verse range (MAT.6.9-13) needs BSB verification — some editions end at verse 13, others extend to verse 14. Check whether verse 13 is "deliver us from evil" or includes "for thine is the kingdom."

---

### Hope (aion_022)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Hope defined | ROM.8.24, ROM.8.25 | "hope that is seen is no hope at all" |
| Plans and future | JER.29.11 | "plans to give you hope and a future" |
| Faith and hope | HEB.11.1 | Also faith — dual-cluster overlap is intentional |
| God of hope | ROM.15.13 | "May the God of hope fill you with all joy and peace" — verify in BSB |

Near-miss: LAM.3.22-23 ("Great is your faithfulness") — often cited in hope context.

---

### Strength (aion_023)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Strength through Christ | PHP.4.13 | Context: contentment in all circumstances — citation-faithfulness risk |
| Renewed strength | ISA.40.31 | "Those who hope in the Lord will renew their strength" |
| God as refuge and strength | PSA.46.1 | "God is our refuge and strength, an ever-present help in trouble" |
| Strong in the Lord | EPH.6.10 | "Be strong in the Lord and in his mighty power" |

**CRITICAL ANNOTATION NOTE for PHP.4.13:** This verse is a prime hallucination-by-decoration candidate. Its context (PHP.4.11-12) is about contentment in poverty and plenty. Citing it to support "you can do anything you want" is textually unfaithful. Phase 3 judge should specifically test whether the system's answer contextualises this verse correctly.

---

### Peace (aion_024)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Peace beyond understanding | PHP.4.7 | "peace of God, which transcends all understanding" |
| Peace Jesus gives | JHN.14.27 | "Peace I leave with you; my peace I give you" |
| Perfect peace | ISA.26.3 | "You will keep in perfect peace those whose minds are steadfast" |
| Peace with God | ROM.5.1 | "we have peace with God through our Lord Jesus Christ" — different concept from inner peace |

Annotation note: ISA.26.3 and ROM.5.1 represent different peace concepts (psychological vs. relational/soteriological). Ideally the system distinguishes them.

---

### Wisdom (aion_025)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Trust over understanding | PRO.3.5, PRO.3.6 | Wisdom as trust in God |
| Ask for wisdom | JAS.1.5 | "If any of you lacks wisdom, let them ask God" |
| God gives wisdom | PRO.2.6 | "For the Lord gives wisdom" |
| Beginning of wisdom | PSA.111.10 | "The fear of the Lord is the beginning of wisdom" — verify exact verse in BSB |

Near-miss: ECC.12.13 ("Fear God and keep his commandments") — wisdom-adjacent conclusion of Ecclesiastes.

---

### Joy (aion_026)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Rejoice always | PHP.4.4 | "Rejoice in the Lord always. I will say it again: Rejoice!" |
| Joy of the Lord | NEH.8.10 | "the joy of the Lord is your strength" — verify exact text in BSB |
| Fullness of joy | PSA.16.11 | "you will fill me with joy in your presence" |
| Complete joy | JHN.15.11 | "that my joy may be in you and that your joy may be complete" |

---

### Grace (aion_027)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Saved by grace through faith | EPH.2.8, EPH.2.9 | Primary grace-salvation text |
| Not under law but grace | ROM.6.14 | "you are not under the law, but under grace" |
| Sufficient grace | 2CO.12.9 | "My grace is sufficient for you, for my power is made perfect in weakness" |
| Grace appeared to all | TIT.2.11 | "the grace of God has appeared that offers salvation to all people" |

---

### Fear (aion_028)

| Cluster | Verses | Notes |
|---------|--------|-------|
| Fear not, I am with you | ISA.41.10 | Primary fear-not text |
| Spirit not of fear | 2TI.1.7 | "God gave us a spirit not of fear, but of power and love and self-control" |
| Valley of the shadow | PSA.23.4 | "Even though I walk through the darkest valley, I will fear no evil" |
| Peace not fear | JHN.14.27 | "Do not let your hearts be troubled and do not be afraid" |

---

## BSB verification checklist

Before locking any `needs_review` question, verify these coords exist in the `bible_verses` table:

```sql
SELECT book_id, chapter, verse, content
FROM bible_verses
WHERE (book_id = 'MAT' AND chapter = 6 AND verse IN (9,10,11,12,13))
   OR (book_id = 'PSA' AND chapter = 111 AND verse = 10)
   OR (book_id = 'NEH' AND chapter = 8 AND verse = 10)
   OR (book_id = 'ROM' AND chapter = 15 AND verse = 13)
   OR (book_id = 'LAM' AND chapter = 3 AND verse IN (22,23))
   OR (book_id = 'TIT' AND chapter = 2 AND verse = 11)
   OR (book_id = '1JN' AND chapter = 4 AND verse = 8)
ORDER BY book_id, chapter, verse;
```

---

## Annotation status legend

| Status | Meaning |
|--------|---------|
| `verified` | Coords confirmed in BSB corpus, clusters reviewed |
| `needs_review` | Clusters drafted but coords not yet verified in BSB |
| `disputed` | Cluster membership is debatable — flag for human review |

---

## Phase 3 priority list (citation-faithfulness)

These questions have the highest risk of **hallucination by decoration** and should be prioritised for LLM-as-judge annotation:

1. `aion_023` — PHP.4.13 in strength context (frequent decontextualisation)
2. `aion_032` — Romans 6 antinomianism (claim refuted in the same passage)
3. `aion_015` — PHP.4.13 direct lookup (baseline for out-of-context citation detection)
4. `aion_031` — James vs Romans on faith (system may cite only one side)
5. `aion_030` — John 14:6 exclusivism (strong interpretive claim from single verse)
