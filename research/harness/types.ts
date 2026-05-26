export type VerseCoord = {
  book_id: string;
  chapter: number;
  verse: number;
};

export type BenchmarkQuestion = {
  schema_version: "0.1";
  id: string;
  question: string;
  category: "direct" | "thematic" | "interpretive" | "multi_hop" | "false_premise" | "adversarial";
  difficulty: "easy" | "medium" | "hard";
  gold_verses: VerseCoord[];
  acceptable_verse_clusters: string[][];
  expected_behaviour:
    | "answer_with_citations"
    | "refuse_false_premise"
    | "refuse_adversarial"
    | "clarify_ambiguous";
  false_premise: boolean;
  notes: string;
};

export type RunResult = {
  id: string;
  system: "hybrid_rag";
  question: string;
  category: string;
  answer: string;
  conversation_id: string | null;
  retrieved_verses: string[];
  gold_verses: string[];
  recall_at_5: number | null;
  precision_at_5: number | null;
  mrr: number | null;
  citation_validity: number | null;
  citation_support: number | null;
  false_premise_refusal: number | null;
  latency_ms: number;
  http_status: number | null;
  error: string | null;
  run_at: string;
  dataset_path: string;
};

export type JudgedResult = RunResult & {
  judge_reasoning: string | null;
  judge_model: string | null;
  judged_at: string | null;
};

export type SSEParseResult = {
  answer: string;
  retrieved_verses: string[];
  conversation_id: string | null;
  latency_ms: number;
  http_status: number | null;
  error: string | null;
};
