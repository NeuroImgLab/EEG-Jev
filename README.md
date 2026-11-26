<div align="center">

# EEG-Jev: A Unified Single-Pass Decision Model for EEG

**Zhifei Zhu · Hongtao Zhang · Yu Ren · Wei Zhou · Zeping Xie · Yi He**

[![Interactive Demo](https://img.shields.io/badge/Interactive%20Demo-GitHub%20Pages-0d7a70.svg)](https://neuroimglab.github.io/EEG-Jev/)
[![arXiv Preprint](https://img.shields.io/badge/arXiv-2611.31875-b31b1b.svg)](https://arxiv.org/abs/2611.31875)
[![Code](https://img.shields.io/badge/Code-Coming%20Soon-grey.svg)](https://neuroimglab.github.io/EEG-Jev/)
[![Results & Docs](https://img.shields.io/badge/Docs%20%26%20Results-CC%20BY%204.0-lightgrey.svg)](LICENSE)

*An EEG window. A natural-language question. A typed probabilistic answer — in a single forward pass.*

**3 decision types (`Choice` · `Noul` · `Score`) · 4 applications · 35 public EEG sources**

</div>

---

This repository hosts the **project website, interactive four-application recorded EEG demonstration, English preprint manuscript, and machine-readable aggregate evaluation results** for **EEG-Jev**.

> **Availability note:** Source code will be released upon publication. Model weights, raw EEG recordings, and per-window test predictions are not distributed here.

## Quick Links

- **Interactive 4-Application Demo:** [https://neuroimglab.github.io/EEG-Jev/](https://neuroimglab.github.io/EEG-Jev/)
- **Preprint (`arXiv:2611.31875`):** [https://arxiv.org/abs/2611.31875](https://arxiv.org/abs/2611.31875)
- **Aggregate Results (`results/`):** [metrics-long.csv](results/metrics-long.csv), [table-core-results.csv](results/table-core-results.csv), [table-calibration.csv](results/table-calibration.csv), [paired-differences.csv](results/paired-differences.csv), [inference-benchmark.csv](results/inference-benchmark.csv), [data-source-registry.csv](results/data-source-registry.csv)

## Contents

```text
.
├── index.html          # Interactive 4-application recorded replay & readout viewer
├── methods.html        # Data provenance, channel layouts & protocol notes
├── paper/              # Preprint manuscript (English PDF)
├── results/            # Machine-readable aggregate metrics across all 35 sources
├── material/           # Curated display-split excerpts & saved model outputs
└── assets/ & data/     # Static client-side assets and page configuration
```

## Citation

```bibtex
@article{zhu2026eegjev,
  title   = {EEG-Jev: A Unified Single-Pass Decision Model for EEG},
  author  = {Zhu, Zhifei and Zhang, Hongtao and Ren, Yu and Zhou, Wei and Xie, Zeping and He, Yi},
  journal = {arXiv preprint arXiv:2611.31875},
  year    = {2026},
  eprint  = {2611.31875},
  archivePrefix = {arXiv},
  primaryClass  = {cs.LG},
  url     = {https://arxiv.org/abs/2611.31875}
}
```

## Licence & Contact

- **Docs, preprint PDF, and aggregate results:** CC BY 4.0 ([LICENSE](LICENSE)).
- **Interactive site assets:** Apache License 2.0 ([LICENSE](LICENSE)).
- **Third-party models, dataset excerpts, fonts, and icons:** see [NOTICE.txt](NOTICE.txt).
- **Correspondence:** `y.he3@siat.ac.cn` · Website inquiries: `220254913@seu.edu.cn`
