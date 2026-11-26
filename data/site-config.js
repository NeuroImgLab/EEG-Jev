/* EEG-Jev demo: page content that follows the paper. This is the single place to edit.
   - paper.arxiv: null before the preprint is public. Set it to the arXiv address (https://arxiv.org/abs/...)
     and the Paper button links there; nothing else has to change.
   - paper.pdf / paper.pdf_zh: reading copies inside the site, used while paper.arxiv is null.
   - code.href: null while the repository is not public (the entry is then shown as not yet released,
     never as a link). Set it to the repository address to turn it into a link.
   - title, authors, abstract_html, figure: written by sync_paper_content.py from the manuscript sources.
   The value assigned below must stay strict JSON. */
window.EEGJevSite = {
  "title": "EEG-Jev: A Unified Single-Pass Decision Model for EEG",
  "authors": "Zhifei Zhu, Hongtao Zhang, Yu Ren, Wei Zhou, Zeping Xie, Yi He",
  "abstract_html": [
    "EEG analysis spans choosing alternatives, judging statements, and rating ordered attributes, requiring calibratable probabilities with explicit meaning. We present EEG-Jev, a unified single-pass decision model for EEG. Given an EEG window, a question and an answer specification, one forward pass returns a typed readout: Choice gives a candidate distribution, Noul a proposition probability, and Score an ordered-level distribution and expectation. One checkpoint is trained jointly and evaluated once on held-out splits of 35 public sources. Core raw outputs reach 54.08% balanced accuracy on Stieger2021 motor imagery, 70.45% on Sleep-EDF-SC sleep staging, 72.11% per window at threshold 0.5 on CHB-MIT seizure detection with 0.825 AUROC, and 1.700 MAE on 0–10 ds005292 pain ratings. Prior correction and temperature scaling lower negative log-likelihood from 0.766 to 0.606 on Sleep-EDF-SC and 0.166 to 0.019 on CHB-MIT, while direct readout cuts batch-1 latency from 122.43 to 63.11 ms (1.94-fold) against a matched-backbone generative comparator."
  ],
  "abstract_open": true,
  "paper": {
    "label": "Paper",
    "arxiv": "https://arxiv.org/abs/2611.31875",
    "tag_arxiv": "arXiv",
    "pdf": null,
    "tag_pdf": "PDF",
    "note_pdf": "Preprint manuscript (PDF); arXiv link will be added upon posting.",
    "pdf_zh": null,
    "label_zh": "中文稿",
    "pending": "coming soon",
    "note_pending": "The preprint link will be added once posted."
  },
  "code": {
    "label": "Code",
    "href": null,
    "pending": "coming soon",
    "note_pending": "Code will be released upon publication."
  },
  "benchmark": {
    "label": "NeuralBench",
    "href": "https://facebookresearch.github.io/neuroai/neuralbench/index.html",
    "scope": "EEG-Jev is evaluated on selected NeuralBench datasets, not on the whole benchmark: 21 of its 35 sources follow NeuralBench windows, labels and partitions (the 17 motor-imagery sources, three sleep sources and CHB-MIT). The other 14 (four sleep sources, Siena and the nine pain sources) use their own subject-level partitions."
  },
  "figure": {
    "label": "Model architecture",
    "src": "assets/img/fig1-architecture.svg",
    "full": "assets/img/fig1-architecture.svg",
    "width": 1600,
    "height": 814,
    "alt": "Architecture of EEG-Jev: a frozen REVE-L encoder and a trainable MLP connector turn the EEG window into embeddings; they enter Qwen3.5-2B (frozen base weights, trainable LoRA) in one input row with the question, the answer specification and a learned readout marker; the state at the marker feeds the one readout selected by the answer type: Choice, Noul or Score.",
    "caption_html": "EEG-Jev architecture and typed readouts. (a) A prefix with the system prompt, EEG embeddings, a natural-language question, an answer specification and a readout marker ⟨<i>R</i>⟩ form one input row. (b) A frozen REVE-L encoder processes multichannel EEG with electrode positions and time; a trainable connector maps its features to the language-model dimension. (c) The Qwen3.5-2B hybrid backbone has a frozen base and trainable LoRA adapters; <i>u</i> is the final normalized state at ⟨<i>R</i>⟩. (d) Each question selects one readout. Choice matches a trainable projection of <i>u</i> against the candidates’ keys, <i>c</i>̂<sub><i>k</i></sub> = <span class = \"math-frac\"><span><i>c</i><sub><i>k</i></sub></span><span>rms(<i>c</i><sub><i>k</i></sub>)</span></span>, where <i>c</i><sub><i>k</i></sub> is the mean of their frozen text embeddings and <i>d</i> is the state dimension; Noul gives the probability that a proposition holds, <i>p</i>(yes), shown as p(true); Score gives a distribution over task-specified numerical values <i>v</i><sub><i>j</i></sub> and their probability-weighted expectation. The 0–10 bars and expected rating 5.42 illustrate a pain-rating example. Probabilities, scores, EEG traces and the scalp sketch are illustrative."
  }
};
