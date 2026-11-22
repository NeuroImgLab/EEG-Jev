# Data dictionary of the EEG-Jev result files

All files in this directory hold aggregate results of one evaluation on the held-out test split. They contain no per-window predictions, labels or window identities. They are written by `tables/build_tables.py` from the frozen evaluation outputs; `rebuild_tables_from_public.py` rebuilds the numbers of the paper tables from them.

## Models and seeds

- **EEG-Jev**: one shared checkpoint, training seed 8, the last training update. One value per source.
- **B1**: a readout trained per source on frozen REVE-L features. **B2**: REVE-L with its last four blocks fine-tuned per source. Each has training seeds 7 and 8. Rows with `seed` 7 or 8 are single runs; rows with `seed` = `mean of 7 and 8` average the two per-seed metric values (metrics are computed per seed first, never on averaged probabilities). The paper tables use these means.

## Two kinds of uncertainty

- **Sampling of the test population.** `paired-differences.csv` gives 95% intervals of the difference between EEG-Jev and a baseline. Test subjects (patients for seizure detection) of one source are resampled with replacement 2,000 times and both models are scored on the same resampled units (paired bootstrap). It answers how much the difference would change with other test subjects of the same source. No interval is given when a source has fewer than five independent test units (rule fixed before the test evaluation); this applies to nine sources.
- **Training-seed variation.** EEG-Jev was trained once, so its seed variation is unknown. For B1 and B2 the two per-seed values are listed (`metrics-by-seed.csv`); two seeds do not support an interval, and none is given. The paired intervals above do not include seed variation.
- No interval of a single model value was computed for any metric (`interval_status` = `not-computed`).

## Output stages

| `output_stage` | Meaning |
|---|---|
| `raw` | Model output without post-processing. Paper Table 2 and Table A4 use this stage. |
| `prior-corrected` | EEG-Jev only. Class probabilities moved from the class shares of the training draws to the class shares of the training set of the source. Final stage for motor imagery. |
| `prior+temperature` | EEG-Jev only. Prior correction followed by a temperature fitted on development data per application. Final stage for sleep staging and seizure detection. For motor imagery the stored rows of this stage use a development-fitted temperature of 1.664 that the frozen rule did not adopt (`stage_role` = `alternative, not adopted`). |
| `temperature` | A temperature applied to the raw output. Final stage of EEG-Jev for pain rating (Score has no class prior); for the other applications of EEG-Jev an alternative that was not adopted. For B1 and B2: their own development-fitted map as stored by the evaluation. |
| `pool-prior-adjusted` | B1 and B2, seizure detection only: logit shift from the class shares of their subsampled training pool to those of the training set, as stored by the evaluation. |

`stage_role` states for every row whether the stage is the raw output, an intermediate step, the final frozen post-processing or an alternative that was not adopted. All post-processing parameters were fixed before the test evaluation. `temperature` gives the temperature of the row when it is known.

## Thresholds (seizure detection)

| `threshold_rule` | Meaning |
|---|---|
| `fixed 0.5` | p(yes) >= 0.5 on the raw output; window level. The balanced accuracy of paper Table 2. EEG-Jev was trained on 1:1 class draws and the baselines on pools close to the natural prevalence, so 0.5 is not the same operating point on the two scales. On post-processed probabilities it is available for the prior-corrected and final stages of EEG-Jev only; there the probability refers to the natural prevalence and few windows exceed 0.5. Other stages: `missing_reason` = `threshold-0.5-raw-only`. |
| `development: lowest threshold with specificity >= 0.99` | Threshold set on the development predictions of the same model and applied to the test windows; `threshold_value` is on the probability scale of the row. Siena has one development patient. |
| `development: maximum Youden J` | As above, with the threshold that maximises sensitivity + specificity - 1 on development data. |

## Metrics

| `metric` | Direction | Unit | Readout | Definition |
|---|---|---|---|---|
| `accuracy` | higher | fraction | choice, noul | Share of windows whose decision equals the label. Choice: argmax of the candidate probabilities; computed here as the window-weighted mean of the top-label accuracy of the reliability bins, which cover every window. Noul: at the stated threshold, computed from sensitivity, specificity and the class counts. |
| `balanced_accuracy` | higher | fraction | choice, noul | Mean of the per-class recalls (chance 1/K). Noul: (sensitivity + specificity) / 2 at the stated threshold. |
| `macro_f1` | higher | fraction | choice | Unweighted mean of the per-class F1 scores over the classes present in the reference labels. |
| `sensitivity` | higher | fraction | noul | True-positive rate of p(yes) >= threshold. |
| `specificity` | higher | fraction | noul | True-negative rate of p(yes) >= threshold. |
| `precision` | higher | fraction | noul | TP / (TP + FP) at the stated threshold, computed from sensitivity, specificity and the class counts. |
| `f1` | higher | fraction | noul | F1 of the positive class at the stated threshold, 2TP / (2TP + FP + FN), computed from sensitivity, specificity and the class counts. |
| `auroc` | higher | fraction | noul | Area under the ROC curve of p(yes) at the natural prevalence of the test windows; threshold-free and unchanged by monotone post-processing. |
| `average_precision` | higher | fraction | noul | Average precision (area under the precision-recall curve as stepwise precision weighted by recall increments). |
| `prevalence` | none | fraction | noul | Share of positive test windows (descriptive; the same for every model). |
| `nll` | lower | nats | choice, noul | Mean negative log-likelihood of the label (natural logarithm). |
| `brier` | lower | score | choice, noul | Brier score. Choice: squared error summed over classes; Noul: squared error of p(yes). |
| `ece` | lower | fraction | choice, noul | Expected calibration error with 10 equal-mass bins (bins with fewer than 30 windows merged). Choice: confidence = largest probability; Noul: confidence = p(yes). |
| `mae` | lower | rating points | score | Mean absolute error of the expectation of the predicted distribution against the reported rating (0-10 scale). |
| `rmse` | lower | rating points | score | Root mean squared error of the expectation against the reported rating. |
| `pearson_r` | higher | correlation | score | Window-level Pearson correlation between the expectation and the reported rating. |
| `crps` | lower | rating points | score | Continuous ranked probability score of the predicted distribution in rating points. |
| `crps_over_range` | lower | fraction of range | score | CRPS divided by the range of the scale (10). |
| `coverage_50` | nominal 0.50 | fraction | score | Share of ratings inside the central 50% predictive interval. |
| `coverage_80` | nominal 0.80 | fraction | score | Share of ratings inside the central 80% predictive interval. |
| `coverage_90` | nominal 0.90 | fraction | score | Share of ratings inside the central 90% predictive interval. |
| `interpolated_cross_entropy` | lower | nats | score | Cross-entropy against the two-level target that interpolates the rating between its neighbouring integer levels. |
| `sd_expectation` | none | rating points | score | Standard deviation of the expectations over the test windows (descriptive). |
| `sd_target` | none | rating points | score | Standard deviation of the reported ratings over the test windows (descriptive; the same for every model). |
| `constant_prediction_mae` | none | rating points | score | MAE of predicting the mean rating of the training set for every test window (reference; the same for every model). |
| `expectation_change_mean` | none | rating points | score | Mean change of the expectation caused by the temperature (temperature stage minus raw). |
| `expectation_change_mean_abs` | none | rating points | score | Mean absolute change of the expectation caused by the temperature. |
| `expectation_change_max_abs` | none | rating points | score | Largest absolute change of the expectation caused by the temperature. |
| `probability_change_mean_abs` | none | fraction | score | Mean absolute change of a level probability caused by the temperature. |

Readouts: `choice` (motor imagery, sleep staging; K candidates), `noul` (seizure detection; yes/no), `score` (pain rating; 11 levels, 0-10). Direction `none` marks descriptive quantities. Values are fractions unless the unit says otherwise; the paper prints balanced accuracy in percent.

`value_origin` is `frozen evaluation` for values stored by the evaluation and names the inputs when a value was derived from stored aggregates (accuracy from reliability bins; precision, F1 and accuracy of a thresholded decision from sensitivity, specificity and class counts). Values marked `computed from the stored test predictions with the frozen rules (supplementary computation)` were not part of the first evaluation pass: they were computed afterwards from the same stored predictions with unchanged thresholds, priors and temperatures, and each such computation reproduced the already frozen values of the same files (MAE; raw decisions; Brier score) before its result was accepted.

## Missing values

`metrics-long.csv` has 5,124 rows, of which 156 have an empty `value`. They are kept so that the gap is explicit. `missing_reason` and `interval_status` use these codes:

| Code | Meaning |
|---|---|
| `not-in-frozen-evaluation` | The frozen evaluation did not compute this metric; it can be computed from the stored test predictions with the frozen rules. |
| `threshold-0.5-raw-only` | Decisions at 0.5 belong to the raw p(yes). On post-processed probabilities, which refer to the natural prevalence, they were computed only for the prior-corrected and final stages of EEG-Jev (supplementary computation); the remaining stages were not evaluated. |
| `fewer-than-5-units` | The source has fewer than five independent test units (subjects or patients); by the rule fixed before the test evaluation no paired interval is reported. |
| `interval-not-computed` | The frozen evaluation computed intervals only for paired differences of the display metric (paired-differences.csv); no interval of a single model value was computed. |

`interval_status`: `computed`; `omitted-fewer-than-5-units`; `not-computed` (no interval was computed for this quantity); `not-applicable` (descriptive quantity or missing value).

## Files and columns

### metrics-long.csv

One row per source, model, seed (or seed mean), output stage, metric and threshold rule.

| Column | Content |
|---|---|
| `source`, `source_name` | Dataset identifier used in the code and the name used in the paper. |
| `application`, `readout` | Application and readout type. |
| `protocol` | `NB core` or `NB full`: windows, labels and subject split of the NeuralBench code, release 0.4.0. `Suppl.`: supplementary source with the same signal processing and its own windows, labels and split. |
| `split` | `cross-subject`: test subjects are disjoint from training subjects. `within-subject`: partitions share subjects. |
| `classes_or_levels` | Number of candidates (Choice) or levels (Score). |
| `model`, `seed`, `aggregation` | See Models and seeds. |
| `output_stage`, `stage_role`, `temperature` | See Output stages. |
| `metric`, `value`, `direction`, `unit` | See Metrics. |
| `threshold_rule`, `threshold_value` | See Thresholds; empty for threshold-free metrics. |
| `n_windows` | Test windows (trials, epochs or windows) that enter the value. |
| `n_independent_units`, `unit_type` | Independent test units of the source: subjects, or patients for seizure detection. |
| `ci95_low`, `ci95_high`, `interval_status`, `missing_reason` | See Two kinds of uncertainty and Missing values. |
| `value_origin` | See Metrics. |

### metrics-by-seed.csv

The single-run rows of the long table (EEG-Jev seed 8; B1 and B2 seeds 7 and 8) with one column per metric. Thresholded seizure metrics carry the rule in the column name (`_at_0p5`, `_at_dev_specificity_0p99`, `_at_dev_youden`).

### metrics-wide-by-source.csv

One row per source for reading: protocol and counts, raw-output metrics of EEG-Jev, B1 and B2 (baselines: seed means; seizure decisions at 0.5), final-stage metrics of EEG-Jev, and the paired difference on the display metric (balanced accuracy; balanced accuracy at 0.5 for seizure detection; MAE for pain rating).

### paired-differences.csv

EEG-Jev against B1 and against B2 on the registered metric of every source (balanced accuracy, AUROC for seizure detection, MAE) and on seizure balanced accuracy at 0.5. `difference_eeg_jev_minus_baseline` is the plain difference; `eeg_jev_advantage` is signed so that positive values favour EEG-Jev (for MAE: baseline minus EEG-Jev); the interval refers to the advantage. `interval_status` and `missing_reason` explain every missing interval; `source_note` carries protocol caveats of the source.

### per-source-results.csv, table-core-results.csv, table-calibration.csv, inference-benchmark.csv, neuralbench-reference.csv

Table-shaped extracts: three rows per source with the raw and final metrics; the cells of paper Tables 2 and 3 (Table 2 and Table 3 values in table units: percent for balanced accuracy and coverage); the timing benchmark for the recommended and the reference execution (`configuration`); the reported NeuralBench reference values with their provenance.

### facts.json

Every number quoted in the paper text with its unrounded value, display string, unit and origin.

## Application summaries

Where an application-level number is given (facts `application.*`), the statistical object is the unweighted mean of the per-source metric values of one application (baselines: seed mean within a source first). Sources differ in protocol, class count and size and can share participants, so these means are descriptive and carry no interval. Metrics with different units (balanced accuracy, AUROC, MAE) are never averaged across applications, and the motor-imagery mean mixes two-, three- and four-class sources with different chance levels.
