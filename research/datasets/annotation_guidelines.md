# Annotation Guidelines — Aion-BibleQA-Faithfulness

Describes `aion_bibleqa_gold_40_v0.3.jsonl`, the current dataset (40 questions). Earlier files in this folder: `aion_bibleqa_gold_40.jsonl` (v0.1), `aion_bibleqa_gold_40_v0.2.jsonl` and `stub_10.jsonl` (the ten-question scaffold).

## Who annotated

One annotator: the author of the system under test. There is no second annotator, no adjudication step and no inter-annotator agreement figure. Gold verses and clusters for thematic questions are one person's judgement.

## Fields

| Field | Meaning |
|-------|---------|
| `schema_version` | The dataset version in which the row last changed: `"0.1"` on 32 rows, `"0.2"` on 6, `"0.3"` on 2. The row layout itself has not changed since v0.1. |
| `id` | `aion_001` to `aion_040` |
| `question` | The question text. Unchanged across v0.1, v0.2 and v0.3. |
| `category` | `direct` (10), `interpretive` (7), `thematic` (12), `multi_hop` (5), `false_premise` (4), `adversarial` (2) |
| `difficulty` | `easy`, `medium` or `hard` (see below) |
| `gold_verses` | The primary verses, as `{book_id, chapter, verse}` objects |
| `acceptable_verse_clusters` | Lists of coordinate strings that also count as a hit |
| `expected_behaviour` | See the table below |
| `false_premise` | `true` on the four false-premise rows |
| `annotation_status` | `"verified"` on all 40 rows: the annotator's record that the coordinates were checked against the live `bible_verses` table |
| `notes` | Free text written while annotating. Not read by any script. See "Stale notes" below. |

## Gold verse assignment

A verse is a **gold verse** if:
1. It directly and unambiguously answers the question, AND
2. It is the primary textual evidence a reader would cite

## Acceptable verse clusters

A cluster is a set of interchangeable verses that all count as a valid retrieval hit.

Use clusters when:
- Adjacent verses provide the same information (e.g. Matthew 6:14 and 6:15 both address conditional forgiveness)
- Multiple canonical passages cover the same theme equally well

A retrieved verse matches if it appears in ANY coord string across ANY cluster. Recall@5 and MRR read only the first five retrieved verses.

## How the clusters changed between versions

Clusters were widened twice, both times after looking at what a system had retrieved:

- **v0.1 → v0.2:** six questions (`aion_006`, `aion_019`, `aion_024`, `aion_028`, `aion_034`, `aion_036`), after the v1 run. Their notes say so ("retrieved by v1 but absent from v0.1 annotation").
- **v0.2 → v0.3:** two questions (`aion_023`, `aion_033`), after the v3 failure analysis.

Widening gold after seeing system output makes the benchmark a development set, not a held-out test: a verse a system retrieved is more likely to be accepted than one it did not. `aion_027` was deliberately left unpatched because its failure is a real retrieval error. The effect of each widening on the scores is tabulated in `research/README.md` ("Every run against every gold version").

## Stale notes

Ten rows carry a drafting-time reminder to check a coordinate ("All coords need BSB verification before locking", "Verify ROM.15.13 exists in BSB") while the same row is marked `annotation_status: "verified"`: `aion_003`, `aion_004`, `aion_019`, `aion_020`, `aion_021`, `aion_022`, `aion_025`, `aion_026`, `aion_027`, `aion_033`. The reminders were written before the status field was set and were not removed. They do not affect any score, because no script reads `notes`.

The file is left as it is: it is the dataset behind the published numbers and the Zenodo record, and editing it, even in a notes field, would make it a different file from the one that was scored. What can be checked offline: 57 of the 122 distinct gold and cluster coordinates occur in at least one frozen retrieved list in `research/results/`, so those coordinates exist in the BSB table the system queries. The other 65 cannot be rechecked from this repository, because the BSB text is not redistributed here.

`thematic_annotation_notes.md` is the working document from the first annotation pass and is kept for provenance.

## Expected behaviour labels

| Label | When to use |
|-------|-------------|
| `answer_with_citations` | A correct answer exists and should be verse-grounded (34 rows) |
| `refuse_false_premise` | The question contains a false claim about scripture (4 rows) |
| `refuse_adversarial` | The question is an instruction-injection or fabrication prompt (2 rows) |
| `clarify_ambiguous` | The question is ambiguous and needs clarification before answering (defined, but no row uses it) |

## False-premise and adversarial questions

`gold_verses` MUST be `[]`.
`acceptable_verse_clusters` MUST be `[]`.
A correct system response: declines the premise, corrects the claim, or says "the Bible does not say this."
An incorrect response: accepts the premise or fabricates a verse.

## Difficulty

| Level | Meaning |
|-------|---------|
| `easy` | Single verse, unambiguous, well-known |
| `medium` | Thematic retrieval, 2–3 candidate clusters |
| `hard` | Interpretive, multi-hop, false-premise, or adversarial |

## Coord format

All coordinates are normalised as `BOOK_ID.CHAPTER.VERSE` (e.g. `MAT.6.14`).
Book IDs follow the BSB standard (see BOOK_NAME_TO_ID in metrics-retrieval.ts).
