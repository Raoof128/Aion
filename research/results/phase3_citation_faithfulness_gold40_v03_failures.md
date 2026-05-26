# Phase 3 Citation-Faithfulness Failures — gold_40 v0.3

**Date:** 2026-05-26  
**System:** v3 direct-chapter  
**Dataset:** `aion_bibleqa_gold_40_v0.3.jsonl` (40 Qs)  
**Input run:** `v3_direct_chapter_gold40_v03.jsonl`  
**Judged output:** `phase3_citation_faithfulness_gold40_v03.jsonl`

Two rows scored below cs=1.0. Zero rows scored below cs=0.5 except aion_035 (cs=0.50).  
Zero false-premise/adversarial failures.

---

## aion_021 — thematic | cs=0.75

**Question:** What does the Bible say about gratitude?

**Gold verse(s):** 1TH.5.18, PHP.4.6, COL.3.15

**Failure mode:** `citation_overreach`

**Retrieved verses (relevant to failure):** EPH.6.19 was included in the context.

**Judge reasoning:**  
The answer is well-supported by the provided verses, but the system incorrectly cites Ephesians 6:19 as support for the general practice of thanking God for others. That verse specifically records Paul asking for prayer for his own ministry's proclamation — it is a request, not a statement about gratitude.

**Root cause:**  
EPH.6.19 ("Pray also for me, that whenever I speak, words may be given me so that I will fearlessly make known the mystery of the gospel") sits in proximity to EPH.6.18 ("praying always..."). The semantic search surfaces both. The LLM answer over-generalises EPH.6.19 to the gratitude theme when the verse is contextually specific to Paul's apostolic request.

**Failure classification:** Minor. One citation in a set of several. Core answer is accurate.

**Fix path:**  
Prompt-level: instruct the answer model to check that cited verse content matches the specific claim, not just the thematic cluster. Not a retrieval architecture issue.

**Severity:** Low (cs=0.75 vs 1.00; single over-reach on a peripheral citation)

---

## aion_035 — multi_hop | cs=0.50

**Question:** How do Psalm 23 and John 10 describe God as shepherd?

**Gold verse(s):** PSA.23.1, JHN.10.11

**Failure mode:** `per_chapter_guarantee_wrong_verse`

**Retrieved verses (relevant to failure):**  
- PSA.23.1 ✓ — "The Lord is my shepherd; I shall not want." (per-chapter guarantee, correct)  
- JHN.10.1 ✗ — "Very truly I tell you Pharisees, anyone who does not enter the sheep pen by the gate, but climbs in by some other way, is a thief and a robber." (per-chapter guarantee, wrong verse)

**Judge reasoning:**  
The answer correctly cites Psalm 23:1. It then attributes the shepherd role to John 10:1, but that verse describes thieves and robbers approaching via the gate — not the shepherd. John 10:11 ("I am the good shepherd. The good shepherd lays down his life for the sheep.") is the theologically central verse and the gold annotation. JHN.10.1 was added to context by the per-chapter guarantee, which adds the *first verse of the chapter*. JHN.10.11 was not in the top-5 semantic results.

**Root cause:**  
The per-chapter guarantee is designed to ensure at least one verse from each referenced chapter appears in context. For JHN.10, the guarantee adds JHN.10.1 because it is the chapter's first verse. The semantic search did not surface JHN.10.11 ("I am the good shepherd") in its top results — JHN.10.11 ranked below the IVFFlat cutoff. The answer model had JHN.10.1 in context and cited it, producing a factually incorrect claim.

This is a **retrieval-faithfulness gap**: retrieval R@5=1 (PSA.23.1 is retrieved ✓) but the answer uses the wrong verse from the correct chapter.

**Failure classification:** Significant. The answer misidentifies the shepherd verse in John's gospel — the central theological citation for the question.

**Fix path (v4):**  
Replace the flat per-chapter guarantee (add first verse of chapter) with per-chapter vector search: run a constrained semantic search within JHN.10 to find the most semantically relevant verse. A query like "shepherd lays down life" would rank JHN.10.11 above JHN.10.1. Requires a `search_verses_in_chapter(embedding, book_id, chapter, k)` Supabase RPC.

**Severity:** Medium (cs=0.50; answer cites a factually wrong verse for a core claim)

---

## Summary

| ID | Category | cs | Failure Mode | Fix Tier |
|----|----------|----|--------------|----------|
| aion_021 | thematic | 0.75 | citation_overreach | prompt |
| aion_035 | multi_hop | 0.50 | per_chapter_guarantee_wrong_verse | v4 retrieval |

No retrieval architecture changes needed for aion_021. The aion_035 failure motivates v4's per-chapter vector search RPC.
