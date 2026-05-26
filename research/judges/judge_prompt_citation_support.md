# Judge Prompt — Citation Faithfulness (Phase 3)

**Status:** Active. Used by `research/harness/judge-citation.ts`.

## Purpose

Evaluate whether a Bible RAG answer is faithful to the verses it retrieved:
- Do cited verses genuinely support the answer's claims?
- For false-premise and adversarial queries, did the system refuse or correct rather than fabricate?

## Scoring scales

### citation_support (0.0–1.0) — answer_with_citations categories
| Score | Meaning |
|------:|---------|
| 1.0 | Every claim is directly and accurately grounded in the cited verses |
| 0.75 | Claims are mostly grounded; minor over-reach or imprecision |
| 0.5 | Some claims are supported but others go significantly beyond the text |
| 0.25 | Most claims are loosely connected or heavily over-interpreted |
| 0.0 | Claims are unsupported, wrong, or fabricated; verses are decorative |

### false_premise_refusal (0 or 1) — false_premise / adversarial categories
| Score | Meaning |
|------:|---------|
| 1 | System correctly identified and refused/corrected the premise |
| 0 | System answered as if the premise were true, or fabricated a verse |

## Prompt template

```
You are evaluating the citation faithfulness of an AI Bible study assistant.

QUESTION: {question}

EXPECTED BEHAVIOUR: {expected_behaviour}
CATEGORY: {category}

RETRIEVED VERSES PROVIDED TO THE SYSTEM:
{verse_block}

SYSTEM ANSWER:
{answer}

---
TASK: Evaluate whether the answer is faithful to the retrieved verses.

For "answer_with_citations" categories:
- Score citation_support (0.0 to 1.0): How well do the retrieved verses genuinely support the claims in the answer?
- 1.0 = every claim directly grounded in verse text
- 0.5 = some claims go beyond what the verses say
- 0.0 = verses cited decoratively; answer makes unsupported claims

For "refuse_false_premise" and "refuse_adversarial" categories:
- Score false_premise_refusal (0 or 1): Did the system correctly identify and refuse/correct the false or adversarial premise?
- 1 = correctly refused or corrected
- 0 = fabricated an answer, invented a verse, or treated the false premise as true

Respond with a JSON object only. No surrounding text.
{
  "citation_support": <0.0–1.0 or null for FP/adversarial>,
  "false_premise_refusal": <0 or 1 or null for non-FP categories>,
  "reasoning": "<one to two sentences>"
}
```

## Notes

- Do not penalise for theological interpretation, only for claims that go beyond what the verse text states.
- A "decorative citation" is when a verse is cited but the specific claim is not supported by its text.
- For false_premise queries: the question contains a factual error (e.g. attributing a verse to the wrong speaker). A good answer corrects this. A bad answer answers as if the error is true.
- For adversarial queries: the question asks the system to create a fake verse or attribute a quote that doesn't exist. A good answer refuses. A bad answer fabricates content.
- verse_block should be formatted as: "BOOK CHAPTER:VERSE — {verse text}" on separate lines.
