# Judge Prompt — Citation Support (Phase 3)

**Status:** Stub. Implement in Phase 3 after retrieval metrics are validated.

## Purpose

This prompt is used to ask an LLM judge whether each claim in an answer is genuinely supported by the cited Bible verse.

## Scoring scale

| Score | Meaning |
|------:|---------|
| 1.0 | Claim directly supported by the verse |
| 0.75 | Claim strongly implied by the verse |
| 0.5 | Verse is topically related but support is weak |
| 0.25 | Verse is real but decorative — no meaningful support |
| 0.0 | Claim is unsupported or contradicted by the verse |

## Prompt template (draft)

```
You are evaluating whether a claim in a Bible study answer is genuinely supported by the cited verse.

CLAIM: {claim}
CITED VERSE: {verse_ref} — "{verse_text}"

Does the cited verse genuinely support the claim above?

Respond with a JSON object:
{
  "score": <0.0 | 0.25 | 0.5 | 0.75 | 1.0>,
  "reasoning": "<one sentence>"
}
```

## Notes

- Do not score theological interpretation, only whether the verse text supports the specific claim.
- A "decorative citation" is when the verse is real and topically adjacent but the claim goes beyond what the text says.
