# Related Work

<!-- Status: CITATIONS VERIFIED 2026-06-04 via ArXiv + ACL Anthology + Google Scholar + MDPI -->
<!-- All [UNVERIFIED] markers resolved. Lima et al. 2025 BibTeX added. -->

## Retrieval-Augmented Generation

Lewis et al. \cite{lewis2020rag} introduced RAG as a parametric–nonparametric hybrid: a dense retrieval component fetches supporting documents, and a seq2seq generator conditions on both the query and retrieved content.
Subsequent work improved dense retrieval representations \cite{karpukhin2020dpr} and showed that generative models benefit from conditioning on multiple retrieved passages simultaneously \cite{izacard2021fid}.
RAG has been extended to multi-hop settings where answers require aggregating evidence across documents \cite{tang2024multihoprag}.
A recurring finding is that retrieval quality caps answer quality — systems cannot answer faithfully from content they did not retrieve.

Our work extends this: we show that retrieval quality and citation faithfulness are separable, and that a system can retrieve the right chapter while citing the wrong verse within it.

## Faithfulness and Grounding Evaluation

Faithfulness — whether an answer is entailed by its supporting context — is distinct from correctness \cite{maynez2020faithfulness}.
RAGAS \cite{es2023ragas} decomposes RAG evaluation into faithfulness, answer relevance, and context precision, using an LLM to judge each dimension without requiring ground-truth annotations.
G-Eval \cite{liu2023geval} demonstrates strong correlation between GPT-4 judgments and human ratings for faithfulness-like criteria across summarization and dialogue tasks.
We follow this line by using a Gemini judge to score citation_support, and we add false_premise_refusal as an orthogonal robustness metric.

A known limitation of LLM-as-judge is same-model bias: a judge tends to rate outputs from the same model family higher \cite{zheng2023judging}.
Our judge is from the same model family as the answer model; we acknowledge this as a limitation (Section 7) and flag human annotation as necessary future work.

## Bible NLP

The Bible is among the most studied multilingual corpora in NLP.
Resnik et al. \cite{resnik1999bible} established the Bible as a parallel corpus for cross-lingual alignment research, a line extended by the eBible Corpus \cite{akerman2023ebible} covering 833 languages.
Lima et al. \cite{lima2025biblicalai} survey AI applications to biblical text analysis and identify semantic search and question answering as emerging tasks with limited benchmark coverage.
A search of ACL Anthology and arXiv through June 2026 found no prior work applying citation-faithfulness evaluation to Bible RAG systems; to our knowledge, Aion-BibleQA is the first benchmark of this type.

## False-Premise Robustness

Robustness to false premises has received growing attention in QA.
Hu et al. \cite{hu2023falsepremise} construct a dataset of false-premise questions and show that current systems often answer as if the false premise were true rather than detecting and correcting it.
Bible QA has a specific form of this problem: users frequently misquote or misattribute verses — for example, "Spare the rod, spoil the child" and "God helps those who help themselves" do not appear in scripture.
We include both false-premise and adversarial categories in gold_40 to measure whether the system refuses fabrication requests and corrects misattributions.

---

## References

<!-- BibTeX entries — verified from ArXiv / ACL Anthology. DO NOT cite from memory. -->

```bibtex
@inproceedings{lewis2020rag,
  title     = {Retrieval-Augmented Generation for Knowledge-Intensive {NLP} Tasks},
  author    = {Lewis, Patrick and Perez, Ethan and Piktus, Aleksandra and
               Petroni, Fabio and Karpukhin, Vladimir and Goyal, Naman and
               K{\"u}ttler, Heinrich and Lewis, Mike and Yih, Wen-tau and
               Rockt{\"a}schel, Tim and Riedel, Sebastian and Kiela, Douwe},
  booktitle = {Advances in Neural Information Processing Systems},
  year      = {2020},
  note      = {arXiv:2005.11401}
}

@inproceedings{karpukhin2020dpr,
  title     = {Dense Passage Retrieval for Open-Domain Question Answering},
  author    = {Karpukhin, Vladimir and O{\u{g}}uz, Barlas and Min, Sewon and
               Lewis, Patrick and Wu, Ledell and Edunov, Sergey and Chen, Danqi and Yih, Wen-tau},
  booktitle = {Proceedings of the 2020 Conference on Empirical Methods in Natural Language Processing},
  year      = {2020},
  note      = {EMNLP 2020. arXiv:2004.04906}
}

@inproceedings{izacard2021fid,
  title     = {Leveraging Passage Retrieval with Generative Models for Open Domain Question Answering},
  author    = {Izacard, Gautier and Grave, Edouard},
  booktitle = {Proceedings of the 16th Conference of the European Chapter of the
               Association for Computational Linguistics},
  year      = {2021},
  note      = {EACL 2021. arXiv:2007.01282}
}

@inproceedings{tang2024multihoprag,
  title     = {{MultiHop-RAG}: Benchmarking Retrieval-Augmented Generation for Multi-Hop Queries},
  author    = {Tang, Yixuan and Yang, Yi},
  year      = {2024},
  note      = {arXiv:2401.15391}
}

@inproceedings{maynez2020faithfulness,
  title     = {On Faithfulness and Factuality in Abstractive Summarization},
  author    = {Maynez, Joshua and Narayan, Shashi and Bohnet, Bernd and McDonald, Ryan},
  booktitle = {Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics},
  year      = {2020},
  note      = {ACL 2020. arXiv:2005.00661}
}

@article{es2023ragas,
  title  = {{RAGAS}: Automated Evaluation of Retrieval Augmented Generation},
  author = {Es, Shahul and James, Jithin and Espinosa-Anke, Luis and Schockaert, Steven},
  year   = {2023},
  note   = {arXiv:2309.15217}
}

@inproceedings{liu2023geval,
  title     = {{G-Eval}: {NLG} Evaluation using {GPT-4} with Better Human Alignment},
  author    = {Liu, Yang and Iter, Dan and Xu, Yichong and Wang, Shuohang and
               Xu, Ruochen and Zhu, Chenguang},
  booktitle = {Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing},
  year      = {2023},
  note      = {EMNLP 2023. arXiv:2303.16634}
}

@inproceedings{zheng2023judging,
  title     = {Judging {LLM}-as-a-Judge with {MT-Bench} and {Chatbot Arena}},
  author    = {Zheng, Lianmin and Chiang, Wei-Lin and Sheng, Ying and Zhuang, Siyuan and
               Wu, Zhanghao and Zhuang, Yonghao and Lin, Zi and Li, Zhuohan and
               Li, Dacheng and Xing, Eric and Zhang, Hao and Gonzalez, Joseph E. and Stoica, Ion},
  booktitle = {Advances in Neural Information Processing Systems},
  year      = {2023},
  note      = {NeurIPS 2023 Datasets and Benchmarks Track. arXiv:2306.05685}
}

@article{resnik1999bible,
  title   = {The {Bible} as a Parallel Corpus: Annotating the `{Book} of 2000 Tongues'},
  author  = {Resnik, Philip and Olsen, Mari Broman and Diab, Mona},
  journal = {Computers and the Humanities},
  year    = {1999},
  volume  = {33},
  number  = {1--2}
}

@article{akerman2023ebible,
  title  = {The {eBible} Corpus: Data and Model Benchmarks for {Bible} Translation
            for Low-Resource Languages},
  author = {Akerman, Vesa and Baines, David and Daspit, Damian and Hermjakob, Ulf},
  year   = {2023},
  note   = {arXiv:2304.09919}
}

@inproceedings{hu2023falsepremise,
  title     = {Won't Get Fooled Again: Answering Questions with False Premises},
  author    = {Hu, Shengding and Luo, Yulong and Wang, Huadong and
               Cheng, Xingyi and Liu, Zhiyuan},
  booktitle = {Proceedings of the 61st Annual Meeting of the Association for Computational Linguistics},
  year      = {2023},
  note      = {ACL 2023}
}

@article{lima2025biblicalai,
  title   = {Artificial Intelligence Applied to the Analysis of Biblical Scriptures:
             A Systematic Review},
  author  = {Lima, B. C. and Omar, N. and Avansi, I. and de Castro, L. N.},
  journal = {Analytics},
  volume  = {4},
  number  = {2},
  pages   = {13},
  year    = {2025},
  doi     = {10.3390/analytics4020013}
}
```
