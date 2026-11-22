# EEG-Jev results

Aggregate results of the paper "EEG-Jev: A Unified Decision Model for EEG". One evaluation on the held-out test split of 35 sources; EEG-Jev is one checkpoint (seed 8), B1 and B2 are per-source baselines (seeds 7 and 8). No per-window data are included. Definitions of every column and metric: `data-dictionary.md`.

## Files

| File | Content |
|---|---|
| `metrics-long.csv` | All computed metrics: source x model x seed x output stage x metric (5,124 rows; 156 explicit gaps with a reason). |
| `metrics-by-seed.csv` | The same values for each actual training run, one column per metric. |
| `metrics-wide-by-source.csv` | One row per source: counts, raw metrics of the three models, final-stage metrics of EEG-Jev, paired difference on the display metric. |
| `paired-differences.csv` | EEG-Jev against B1 and B2 with paired 95% intervals, resampling unit and count, interval status (74 rows). |
| `per-source-results.csv` | Three rows per source (EEG-Jev, B1, B2) with the main raw and final metrics. |
| `table-core-results.csv` | Cells of Table 2. |
| `table-calibration.csv` | Cells of Table 3, with the value after the prior correction and the share of each step. |
| `inference-benchmark.csv` | Timing per source and batch size for the recommended configuration and the reference execution. |
| `neuralbench-reference.csv` | Reported NeuralBench values used as the external reference of Table 2. |
| `facts.json` | Every number quoted in the text: unrounded value, display string, unit, origin. |
| `data-source-registry.csv`, `data-source-registry.md` | One row per source: dataset name and version, access point, DOI, citations, licence and conditions of use. |
| `data-dictionary.md` | Columns, metrics, stages, thresholds, intervals, application summaries. |
| `rebuild_tables_from_public.py` | Rebuilds the numbers of Tables 1 to 3 and Table A4 from the CSV files above and checks them against the table extracts. |

## Where the numbers of the paper come from

| Paper item | File | Rows |
|---|---|---|
| Table 1, sources per application and protocol scope | `metrics-wide-by-source.csv` | count rows by `application` and `protocol` |
| Table 1, test subjects and windows | `metrics-wide-by-source.csv` | sum `test_independent_units`, `test_windows` by `application` |
| Table 2, EEG-Jev, B1, B2 (motor imagery, sleep, pain) | `metrics-long.csv` | core source, `output_stage` = raw, `metric` = balanced_accuracy or mae; EEG-Jev `seed` = 8, baselines `seed` = mean of 7 and 8 |
| Table 2, seizure row | `metrics-long.csv` | `source` = dan2023bids, raw, balanced_accuracy, `threshold_rule` = fixed 0.5 |
| Table 2, NeuralBench best | `neuralbench-reference.csv` | one row per core task |
| Table 2, dagger marks; intervals quoted in the text | `paired-differences.csv` | core source, `interval_excludes_zero` |
| Table 2 caption, seizure AUROC | `metrics-long.csv` / `paired-differences.csv` | dan2023bids, `metric` = auroc |
| Table 3 | `metrics-long.csv` | core source, EEG-Jev, `stage_role` = raw output and final (frozen post-processing); nll, ece, balanced_accuracy, auroc, crps_over_range, coverage_80, mae |
| Table 3, share of the prior correction and of the temperature | `table-calibration.csv` | `share_of_change_from_*` |
| Table A1 (sources) | `metrics-wide-by-source.csv` | all rows |
| Table A3 (inference benchmark); latency numbers of the abstract and results | `inference-benchmark.csv` | `configuration` = recommended; per source and `source` = source-equal mean |
| Reference-execution latency quoted in the results | `inference-benchmark.csv` | `configuration` = reference |
| Table A4 (per-source results) | `paired-differences.csv` | all rows; seizure has two metrics |
| Pain constant-prediction reference | `metrics-long.csv` | `metric` = constant_prediction_mae |
| Any number in the text | `facts.json` | key by topic (`core.*`, `calibration.*`, `efficiency.*`, `training.*`, `scope.*`) |

## Reading the uncertainty

Paired intervals describe sampling of test subjects within a source and are omitted for the 9 sources with fewer than five independent test units. They do not include variation between training seeds: EEG-Jev has one seed, each baseline two. See `data-dictionary.md`.

## Rebuilding the tables

```
python -I rebuild_tables_from_public.py --results . --check
```

The script needs only the Python standard library and the CSV files of this directory. It prints the cells of Tables 1 to 3 and Table A4 and, with `--check`, compares them with `table-core-results.csv`, `table-calibration.csv` and `per-source-results.csv`.
