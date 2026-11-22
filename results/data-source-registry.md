# EEG-Jev data-source registry: access, licence and citation

Checked on 12 November 2026. The machine-readable version is `data-source-registry.csv` (35 rows, same fields).

- One entry per public source used in the paper. Licences are those stated by the hosting record or the page of the provider; listings in toolboxes (MOABB, NeuralBench) are supporting evidence only, and both are given where they differ.
- Four uses are assessed: use in the paper with aggregate results; release of code; release of aggregate result files; redistribution of processed display excerpts with model outputs in the public demonstration. Values: allowed, conditional, not allowed, undetermined. These are readings of the public licence texts, not legal advice.
- All 35 sources can be downloaded without an application or a signed data-use agreement. Shin2017A and Dornhege2004 ask users to accept terms on the download page.
- This work publishes aggregate results and the dataset provenance registry. Trained model weights remain private. Dataset access and permitted uses follow each source’s terms.
- Status vocabulary: `verified` (licence read from the hosting record or provider page); `conflicting-records` (public records disagree; all are kept, with their origin); `pending-author-confirmation` (an item that only the authors of this study or of the dataset can settle; see the notes).

## Overview

| Application | Source | Access point | Version | Licence | Access | Demo excerpts | Status |
|---|---|---|---|---|---|---|---|
| Motor imagery | Stieger2021 | https://doi.org/10.6084/m9.figshare.13123148 | figshare record, version 1 (the only version; posted 2021-02-13, metadata updated 2023-05-30) | CC BY 4.0 (hosting record); the licence file of the authors' code repository states CC BY-NC 4.0 for "code and data" | direct download, no registration | conditional | conflicting-records; pending-author-confirmation |
| Motor imagery | EEGMMIDB | https://physionet.org/content/eegmmidb/1.0.0/ | 1.0.0 (2009-09-09) | ODC-By 1.0 | direct download, no registration | allowed | verified |
| Motor imagery | BCI-IV-2a | https://bnci-horizon-2020.eu/database/data-sets | no version number | CC BY-ND 4.0 | direct download, no registration | not allowed | verified |
| Motor imagery | Dreyer2023 | https://doi.org/10.5281/zenodo.8089820 | Zenodo record 8089820 (version label "To use (1)") | CC BY 4.0 | direct download, no registration | allowed | verified |
| Motor imagery | Lee2019 | http://gigadb.org/dataset/100542 | GigaDB 100542 (2019-01-24) | CC0 1.0 | direct download, no registration | allowed | verified |
| Motor imagery | Cho2017 | http://gigadb.org/dataset/100295 | GigaDB 100295 (2017-05-05) | CC0 1.0 | direct download, no registration | allowed | verified |
| Motor imagery | Liu2022 | https://doi.org/10.6084/m9.figshare.21679035.v5 | figshare record, version 5 (2023-09-14) | CC BY 4.0 | direct download, no registration | allowed | verified |
| Motor imagery | Shin2017A | http://doc.ml.tu-berlin.de/hBCI | page updated 2017-02-21 | GNU GPL v3 (the download page requires ticking "I have read and agree with the GNU license terms") | acceptance of the GNU licence terms on the download page; no registration or application | undetermined | verified; pending-author-confirmation |
| Motor imagery | Faller2012 | https://bnci-horizon-2020.eu/database/data-sets<br>https://doi.org/10.82901/nemar.nm000140 | BNCI: no version number; NEMAR mirror nm000140 version 1.0.2 | CC BY-NC-ND 4.0 | direct download, no registration | not allowed | verified |
| Motor imagery | Scherer2012 | https://bnci-horizon-2020.eu/database/data-sets | no version number | CC BY-ND 4.0 | direct download, no registration | not allowed | verified |
| Motor imagery | BNCI2014-004 | https://bnci-horizon-2020.eu/database/data-sets | no version number | CC BY-ND 4.0 | direct download, no registration | not allowed | verified |
| Motor imagery | GrosseWentrup2009 | https://doi.org/10.5281/zenodo.1217449 | Zenodo record 1217449 (2018-04-12) | CC BY 4.0 | direct download, no registration | allowed | verified |
| Motor imagery | Barachant2012 | https://doi.org/10.5281/zenodo.806023 | Zenodo record 806023 (2012-03-25) | CC BY-SA 4.0 | direct download, no registration | conditional | verified |
| Motor imagery | Dornhege2004 | https://www.bbci.de/competition/iii/ | no version number | No standard licence; download terms: give reference to the group that recorded the data, cite the listed paper, and report publications to the organisers | acceptance of the terms on the download page; no registration or application | undetermined | conflicting-records; pending-author-confirmation |
| Motor imagery | Zhou2016 | https://zenodo.org/records/16534752 | Zenodo record 16534752 (2025-07-28) | CC BY 4.0 | direct download, no registration | allowed | verified |
| Motor imagery | BEETL-A | https://doi.org/10.6084/m9.figshare.14839650<br>https://doi.org/10.6084/m9.figshare.16586213<br>https://doi.org/10.6084/m9.figshare.21602622 | figshare records 14839650 (2021-06-24), 16586213 (2021-09-08), 21602622 (2022-11-22) | CC BY 4.0 | direct download, no registration | allowed | verified |
| Motor imagery | BEETL-B | https://doi.org/10.6084/m9.figshare.14839650<br>https://doi.org/10.6084/m9.figshare.16586213<br>https://doi.org/10.6084/m9.figshare.21602622 | figshare records 14839650 (2021-06-24), 16586213 (2021-09-08), 21602622 (2022-11-22) | CC BY 4.0 | direct download, no registration | allowed | verified |
| Sleep staging | Sleep-EDF-SC | https://physionet.org/content/sleep-edfx/1.0.0/ | 1.0.0 (2013-10-24) | ODC-By 1.0 | direct download, no registration | allowed | verified |
| Sleep staging | HMC | https://physionet.org/content/hmc-sleep-staging/1.1/ | 1.1 (2022-03-18) | CC BY 4.0 | direct download, no registration | allowed | verified |
| Sleep staging | CinC2018 | https://physionet.org/content/challenge-2018/1.0.0/ | 1.0.0 (2018-02-21) | ODC-By 1.0 | direct download, no registration | allowed | verified |
| Sleep staging | CAP | https://physionet.org/content/capslpdb/1.0.0/ | 1.0.0 | ODC-By 1.0 | direct download, no registration | allowed | verified |
| Sleep staging | DOD-H | https://doi.org/10.5281/zenodo.15900394 | Zenodo record 15900394 (2025-07-15) | MIT License | direct download, no registration | allowed | verified |
| Sleep staging | DOD-O | https://doi.org/10.5281/zenodo.15900394 | Zenodo record 15900394 (2025-07-15) | MIT License | direct download, no registration | allowed | verified |
| Sleep staging | Sleep-EDF-ST | https://physionet.org/content/sleep-edfx/1.0.0/ | 1.0.0 (2013-10-24) | ODC-By 1.0 | direct download, no registration | allowed | verified |
| Seizure detection | CHB-MIT | https://physionet.org/content/chbmit/1.0.0/<br>https://doi.org/10.5281/zenodo.10259996 | PhysioNet 1.0.0 (2010-06-09); BIDS conversion Zenodo v1.0.0 (2023-12-05) | ODC-By 1.0 (PhysioNet database); the Zenodo record of the BIDS conversion states CC BY 4.0 in its metadata and ODC-By 1.0 in its description | direct download, no registration | allowed | verified |
| Seizure detection | Siena | https://physionet.org/content/siena-scalp-eeg/1.0.0/ | 1.0.0 (2020-08-11) | CC BY 4.0 | direct download, no registration | allowed | verified |
| Pain rating | ds005292 | https://openneuro.org/datasets/ds005292/versions/1.0.0 | 1.0.0 (2024-06-27) | CC0 1.0 | direct download, no registration | allowed | verified; pending-author-confirmation |
| Pain rating | ds005280 | https://openneuro.org/datasets/ds005280/versions/1.0.0 | 1.0.0 (2024-06-26) | CC0 1.0 | direct download, no registration | allowed | verified; pending-author-confirmation |
| Pain rating | ds005284 | https://openneuro.org/datasets/ds005284/versions/1.0.0 | 1.0.0 (2024-06-26) | CC0 1.0 | direct download, no registration | allowed | verified; pending-author-confirmation |
| Pain rating | ds005285 | https://openneuro.org/datasets/ds005285/versions/1.0.0 | 1.0.0 (2024-06-26) | CC0 1.0 | direct download, no registration | allowed | verified; pending-author-confirmation |
| Pain rating | ds005286 | https://openneuro.org/datasets/ds005286/versions/1.0.0 | 1.0.0 (2024-06-26) | CC0 1.0 | direct download, no registration | allowed | verified; pending-author-confirmation |
| Pain rating | ds005289 | https://openneuro.org/datasets/ds005289/versions/1.0.0 | 1.0.0 (2024-06-26) | CC0 1.0 | direct download, no registration | allowed | verified; pending-author-confirmation |
| Pain rating | ds005291 | https://openneuro.org/datasets/ds005291/versions/1.0.0 | 1.0.0 (2024-06-26) | CC0 1.0 | direct download, no registration | allowed | verified; pending-author-confirmation |
| Pain rating | ds005293 | https://openneuro.org/datasets/ds005293/versions/1.0.0 | 1.0.0 (2024-07-29) | CC0 1.0 | direct download, no registration | allowed | verified; pending-author-confirmation |
| Pain rating | ds005473 | https://openneuro.org/datasets/ds005473/versions/1.0.0 | 1.0.0 (2024-09-11) | CC0 1.0 | direct download, no registration | allowed | verified; pending-author-confirmation |

## Motor imagery (17 sources)

### Stieger2021

- Dataset: Human EEG Dataset for Brain-Computer Interface and Meditation
- Version: figshare record, version 1 (the only version; posted 2021-02-13, metadata updated 2023-05-30)
- Access point: https://doi.org/10.6084/m9.figshare.13123148
- Dataset DOI: 10.6084/m9.figshare.13123148
- Citation: Stieger, Engel & He (2021) Scientific Data 8:98; the data record also asks users to cite Stieger et al. (2021) Cerebral Cortex 31(1):426-438 (DOI: 10.1038/s41597-021-00883-1; 10.1093/cercor/bhaa234)
- BibTeX keys: stieger2021; stieger2021data; stieger2021mindfulness
- Licence: CC BY 4.0 (hosting record); the licence file of the authors' code repository states CC BY-NC 4.0 for "code and data"
- Licence page: https://creativecommons.org/licenses/by/4.0/ ; https://creativecommons.org/licenses/by-nc/4.0/ (accessed 2026-11-12)
- Evidence: DataCite record 10.6084/m9.figshare.13123148.v1 (rights: cc-by-4.0); figshare OAI-PMH record oai:figshare.com:article/13123148 (rights: CC BY 4.0); https://github.com/bfinl/BCI_Data_Paper/blob/main/License.txt (CC BY-NC 4.0); data paper https://www.nature.com/articles/s41597-021-00883-1
- Access: direct download, no registration
- Version used in this study: figshare record 13123148, version 1, 598 files, downloaded October 2026
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, conditional (both licences allow non-commercial redistribution with attribution, licence link and statement of changes; under the stricter CC BY-NC reading no commercial use)
- Status: conflicting-records; pending-author-confirmation
- Notes: Two licence statements by the dataset authors. MOABB up to 1.7.2, NeuralBench 0.4.0 and the NEMAR mirror list CC BY-NC 4.0, taken from the License.txt of the code repository; the MOABB development branch changed to CC-BY-4.0 on 2026-11-08. This study treats the data as non-commercial. Pending: confirmation that the demonstration is a non-commercial use.

### EEGMMIDB

- Dataset: EEG Motor Movement/Imagery Dataset
- Version: 1.0.0 (2009-09-09)
- Access point: https://physionet.org/content/eegmmidb/1.0.0/
- Dataset DOI: 10.13026/C28G6P
- Citation: Schalk et al. (2004) IEEE Trans. Biomed. Eng. 51(6):1034-1043; PhysioNet standard citation Pollard et al. (2026) (DOI: 10.1109/TBME.2004.827072)
- BibTeX keys: schalk2004; eegmmidb; physionet2026
- Licence: ODC-By 1.0
- Licence page: https://physionet.org/content/eegmmidb/view-license/1.0.0/ (accessed 2026-11-12)
- Evidence: PhysioNet project page (License: Open Data Commons Attribution License v1.0)
- Access: direct download, no registration
- Version used in this study: PhysioNet 1.0.0
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (source and licence notice as in ODC-By section 4.3, with licence link)
- Status: verified

### BCI-IV-2a

- Dataset: Four class motor imagery (001-2014); BCI Competition IV data set 2a
- Version: no version number
- Access point: https://bnci-horizon-2020.eu/database/data-sets
- Citation: Tangermann et al. (2012) Frontiers in Neuroscience 6:55 (DOI: 10.3389/fnins.2012.00055)
- BibTeX keys: tangermann2012
- Licence: CC BY-ND 4.0
- Licence page: https://creativecommons.org/licenses/by-nd/4.0/ (accessed 2026-11-12)
- Evidence: licence line of the data set on the BNCI Horizon 2020 data-sets page (page copy saved 2026-10-02; the live page could not be reached on 2026-11-12); consistent with the DataCite record of the NEMAR deposit of the same data set read on 2026-11-12 (10.82901/nemar.nm000139)
- Access: direct download, no registration
- Version used in this study: MAT files published by BNCI Horizon 2020
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, not allowed (adapted material may not be shared; display excerpts are filtered, downsampled and cut)
- Status: verified
- Notes: Licensor: Graz University of Technology. Verified from a saved page copy and the NEMAR record; live page not reachable on the access date.

### Dreyer2023

- Dataset: A large EEG database with users' profile information for motor imagery Brain-Computer Interface research
- Version: Zenodo record 8089820 (version label "To use (1)")
- Access point: https://doi.org/10.5281/zenodo.8089820
- Dataset DOI: 10.5281/zenodo.8089820
- Citation: Dreyer et al. (2023) Scientific Data 10:580 (DOI: 10.1038/s41597-023-02445-z)
- BibTeX keys: dreyer2023; dreyer2023data
- Licence: CC BY 4.0
- Licence page: https://creativecommons.org/licenses/by/4.0/ (accessed 2026-11-12)
- Evidence: DataCite record 10.5281/zenodo.8089820 (rights: cc-by-4.0); Zenodo record page
- Access: direct download, no registration
- Version used in this study: original Zenodo archive and the BIDS copy distributed through MOABB
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (attribution, licence link, statement of changes)
- Status: verified

### Lee2019

- Dataset: Supporting data for "EEG Dataset and OpenBMI Toolbox for Three BCI Paradigms: An Investigation into BCI Illiteracy" (motor imagery part)
- Version: GigaDB 100542 (2019-01-24)
- Access point: http://gigadb.org/dataset/100542
- Dataset DOI: 10.5524/100542
- Citation: Lee et al. (2019) GigaScience 8(5):giz002 (DOI: 10.1093/gigascience/giz002)
- BibTeX keys: lee2019; lee2019data
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: DataCite record 10.5524/100542 (rights: cc0-1.0)
- Access: direct download, no registration
- Version used in this study: GigaDB 100542
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (CC0 has no conditions; attribution recommended)
- Status: verified
- Notes: MOABB and NeuralBench 0.4.0 list GPL-3.0, which is the licence of the OpenBMI toolbox released with the data; the data record is CC0.

### Cho2017

- Dataset: Supporting data for "EEG datasets for motor imagery brain computer interface"
- Version: GigaDB 100295 (2017-05-05)
- Access point: http://gigadb.org/dataset/100295
- Dataset DOI: 10.5524/100295
- Citation: Cho et al. (2017) GigaScience 6(7):gix034 (DOI: 10.1093/gigascience/gix034)
- BibTeX keys: cho2017; cho2017data
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: DataCite record 10.5524/100295 (rights: cc0-1.0)
- Access: direct download, no registration
- Version used in this study: GigaDB 100295
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (CC0 has no conditions; attribution recommended)
- Status: verified
- Notes: NeuralBench 0.4.0 lists the licence as UNKNOWN.

### Liu2022

- Dataset: EEG datasets of stroke patients
- Version: figshare record, version 5 (2023-09-14)
- Access point: https://doi.org/10.6084/m9.figshare.21679035.v5
- Dataset DOI: 10.6084/m9.figshare.21679035.v5
- Citation: Liu et al. (2024) Scientific Data 11:131 (DOI: 10.1038/s41597-023-02787-8)
- BibTeX keys: liu2024; liu2024data
- Licence: CC BY 4.0
- Licence page: https://creativecommons.org/licenses/by/4.0/ (accessed 2026-11-12)
- Evidence: DataCite record 10.6084/m9.figshare.21679035.v5 (rights: cc-by-4.0)
- Access: direct download, no registration
- Version used in this study: figshare record 21679035, version 5
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (attribution, licence link, statement of changes)
- Status: verified
- Notes: The paper keeps the source name Liu2022; NeuralBench calls it Liu2024Imagery; the data paper appeared in 2024.

### Shin2017A

- Dataset: Open access dataset for EEG+NIRS single-trial classification, dataset A (motor imagery)
- Version: page updated 2017-02-21
- Access point: http://doc.ml.tu-berlin.de/hBCI
- Citation: Shin et al. (2017) IEEE Trans. Neural Syst. Rehabil. Eng. 25(10):1735-1745 (DOI: 10.1109/TNSRE.2016.2628057)
- BibTeX keys: shin2017
- Licence: GNU GPL v3 (the download page requires ticking "I have read and agree with the GNU license terms")
- Licence page: http://www.gnu.org/licenses/gpl.txt (accessed 2026-11-12)
- Evidence: TU Berlin download page https://doc.ml.tu-berlin.de/hBCI/ (the tick box links to gnu.org/licenses/gpl.txt)
- Access: acceptance of the GNU licence terms on the download page; no registration or application
- Version used in this study: EEG files from the TU Berlin download page
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, undetermined (GPL applied to data: redistribution would have to be under GPL-3.0 with the licence text; whether this suits waveform excerpts is unclear)
- Status: verified; pending-author-confirmation
- Notes: Licence verified. Pending: record of who accepted the terms on the download page and when.

### Faller2012

- Dataset: Autocalibration and recurrent adaptation (001-2015)
- Version: BNCI: no version number; NEMAR mirror nm000140 version 1.0.2
- Access point: https://bnci-horizon-2020.eu/database/data-sets ; https://doi.org/10.82901/nemar.nm000140
- Dataset DOI: 10.82901/nemar.nm000140
- Citation: Faller et al. (2012) IEEE Trans. Neural Syst. Rehabil. Eng. 20(3):313-319 (DOI: 10.1109/TNSRE.2012.2189584)
- BibTeX keys: faller2012
- Licence: CC BY-NC-ND 4.0
- Licence page: https://creativecommons.org/licenses/by-nc-nd/4.0/ (accessed 2026-11-12)
- Evidence: licence line of the data set on the BNCI Horizon 2020 data-sets page (page copy saved 2026-10-02; the live page could not be reached on 2026-11-12); consistent with the DataCite record of the NEMAR deposit of the same data set read on 2026-11-12 (10.82901/nemar.nm000140, rights: cc-by-nc-nd-4.0)
- Access: direct download, no registration
- Version used in this study: byte-identical upstream files in NEMAR nm000140 v1.0.2
- Uses: paper and aggregate results, allowed (cite as requested); non-commercial research; code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, not allowed (no adapted material, non-commercial only)
- Status: verified
- Notes: Licensor: Graz University of Technology. Verified from a saved page copy and the NEMAR record; live page not reachable on the access date.

### Scherer2012

- Dataset: Two class motor imagery (002-2014)
- Version: no version number
- Access point: https://bnci-horizon-2020.eu/database/data-sets
- Citation: Steyrl et al. (2016) Biomedical Engineering / Biomedizinische Technik 61(1):77-86; Scherer et al. (2012) Soft Computing 17(2):317-331 (DOI: 10.1515/bmt-2014-0117; 10.1007/s00500-012-0895-4)
- BibTeX keys: steyrl2016; scherer2012
- Licence: CC BY-ND 4.0
- Licence page: https://creativecommons.org/licenses/by-nd/4.0/ (accessed 2026-11-12)
- Evidence: licence line of the data set on the BNCI Horizon 2020 data-sets page (page copy saved 2026-10-02; the live page could not be reached on 2026-11-12); consistent with the DataCite record of the NEMAR deposit of the same data set read on 2026-11-12 (10.82901/nemar.nm000171)
- Access: direct download, no registration
- Version used in this study: training-session MAT files published by BNCI Horizon 2020
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, not allowed (adapted material may not be shared; display excerpts are filtered, downsampled and cut)
- Status: verified
- Notes: Both papers are the citations NeuralBench 0.4.0 registers for this data set. Verified from a saved page copy and the NEMAR record; live page not reachable on the access date.

### BNCI2014-004

- Dataset: Two class motor imagery (004-2014); BCI Competition IV data set 2b
- Version: no version number
- Access point: https://bnci-horizon-2020.eu/database/data-sets
- Citation: Leeb et al. (2007) IEEE Trans. Neural Syst. Rehabil. Eng. 15(4):473-482; Tangermann et al. (2012) (DOI: 10.1109/TNSRE.2007.906956; 10.3389/fnins.2012.00055)
- BibTeX keys: leeb2007; tangermann2012
- Licence: CC BY-ND 4.0
- Licence page: https://creativecommons.org/licenses/by-nd/4.0/ (accessed 2026-11-12)
- Evidence: licence line of the data set on the BNCI Horizon 2020 data-sets page (page copy saved 2026-10-02; the live page could not be reached on 2026-11-12); consistent with the DataCite record of the NEMAR deposit of the same data set read on 2026-11-12 (10.82901/nemar.nm000135)
- Access: direct download, no registration
- Version used in this study: MAT files published by BNCI Horizon 2020
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, not allowed (adapted material may not be shared; display excerpts are filtered, downsampled and cut)
- Status: verified
- Notes: Verified from a saved page copy and the NEMAR record; live page not reachable on the access date.

### GrosseWentrup2009

- Dataset: Beamforming in Noninvasive Brain-Computer Interfaces Dataset
- Version: Zenodo record 1217449 (2018-04-12)
- Access point: https://doi.org/10.5281/zenodo.1217449
- Dataset DOI: 10.5281/zenodo.1217449
- Citation: Grosse-Wentrup et al. (2009) IEEE Trans. Biomed. Eng. 56(4):1209-1219 (DOI: 10.1109/TBME.2008.2009768)
- BibTeX keys: grossewentrup2009; grossewentrup2009data
- Licence: CC BY 4.0
- Licence page: https://creativecommons.org/licenses/by/4.0/ (accessed 2026-11-12)
- Evidence: DataCite record 10.5281/zenodo.1217449 (Creative Commons Attribution 4.0); Zenodo record page (asks users to cite the paper)
- Access: direct download, no registration
- Version used in this study: Zenodo record 1217449
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (attribution, licence link, statement of changes)
- Status: verified

### Barachant2012

- Dataset: EEG Motor Imagery Dataset from the PhD Thesis "Commande robuste d'un effecteur par une interface cerveau machine EEG asynchrone"
- Version: Zenodo record 806023 (2012-03-25)
- Access point: https://doi.org/10.5281/zenodo.806023
- Dataset DOI: 10.5281/zenodo.806023
- Citation: Data record: Barachant (2012), Zenodo; the bibliographic details of the thesis were not verified
- BibTeX keys: barachant2012data
- Licence: CC BY-SA 4.0
- Licence page: https://creativecommons.org/licenses/by-sa/4.0/ (accessed 2026-11-12)
- Evidence: DataCite record 10.5281/zenodo.806023 (Creative Commons Attribution Share-Alike 4.0); Zenodo record page
- Access: direct download, no registration
- Version used in this study: Zenodo record 806023
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, conditional (attribution; adapted excerpts must be offered under CC BY-SA 4.0)
- Status: verified
- Notes: Licence verified; the citation of the thesis itself is still to be completed.

### Dornhege2004

- Dataset: BCI Competition III, data set IVa
- Version: no version number
- Access point: https://www.bbci.de/competition/iii/
- Citation: Dornhege et al. (2004) IEEE Trans. Biomed. Eng. 51(6):993-1002; Blankertz et al. (2006) IEEE Trans. Neural Syst. Rehabil. Eng. 14(2):153-159 (DOI: 10.1109/TBME.2004.827088; 10.1109/TNSRE.2006.875642)
- BibTeX keys: dornhege2004; blankertz2006
- Licence: No standard licence; download terms: give reference to the group that recorded the data, cite the listed paper, and report publications to the organisers
- Licence page: https://www.bbci.de/competition/iii/ (accessed 2026-11-12)
- Evidence: section "Download of data sets" of the competition page (read 2026-11-12); MOABB and NeuralBench 0.4.0 list CC BY 4.0, which the page of the provider does not state
- Access: acceptance of the terms on the download page; no registration or application
- Version used in this study: data set IVa archives (five subjects) from the competition site
- Uses: paper and aggregate results, conditional (reference and citation as in the terms; the terms must have been accepted); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, undetermined (the provider grants no redistribution licence)
- Status: conflicting-records; pending-author-confirmation
- Notes: Terms verified. The CC BY 4.0 label of third-party registries could not be confirmed with the provider. Pending: record of who accepted the terms and when.

### Zhou2016

- Dataset: Zhou2016 - BIDS (BIDS version of the motor imagery data of Zhou et al. 2016)
- Version: Zenodo record 16534752 (2025-07-28)
- Access point: https://zenodo.org/records/16534752
- Citation: Zhou et al. (2016) PLOS ONE 11(9):e0162657 (DOI: 10.1371/journal.pone.0162657)
- BibTeX keys: zhou2016
- Licence: CC BY 4.0
- Licence page: https://creativecommons.org/licenses/by/4.0/ (accessed 2026-11-12)
- Evidence: metadata of Zenodo record 16534752 (license: cc-by-4.0; its DOI field points to the paper); the paper is open access under CC BY 4.0
- Access: direct download, no registration
- Version used in this study: Zenodo record 16534752
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (attribution, licence link, statement of changes)
- Status: verified
- Notes: The Zenodo record was prepared by the MOABB maintainers and has no data DOI of its own.

### BEETL-A

- Dataset: BEETL competition motor imagery data (leaderboardMI, finalMI and final test labels); data set A
- Version: figshare records 14839650 (2021-06-24), 16586213 (2021-09-08), 21602622 (2022-11-22)
- Access point: https://doi.org/10.6084/m9.figshare.14839650 ; https://doi.org/10.6084/m9.figshare.16586213 ; https://doi.org/10.6084/m9.figshare.21602622
- Dataset DOI: 10.6084/m9.figshare.14839650; 10.6084/m9.figshare.16586213; 10.6084/m9.figshare.21602622
- Citation: Wei et al. (2022) Proc. NeurIPS 2021 Competitions and Demonstrations Track, PMLR 176:205-219
- BibTeX keys: wei2022beetl
- Licence: CC BY 4.0
- Licence page: https://creativecommons.org/licenses/by/4.0/ (accessed 2026-11-12)
- Evidence: DataCite metadata of the three figshare records (rights: cc-by-4.0); the competition site https://beetl.ai/data could not be reached on the access date
- Access: direct download, no registration
- Version used in this study: files of the three figshare records
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (attribution, licence link, statement of changes)
- Status: verified
- Notes: Verified from the figshare records; terms on the competition site were not read.

### BEETL-B

- Dataset: BEETL competition motor imagery data (leaderboardMI, finalMI and final test labels); data set B
- Version: figshare records 14839650 (2021-06-24), 16586213 (2021-09-08), 21602622 (2022-11-22)
- Access point: https://doi.org/10.6084/m9.figshare.14839650 ; https://doi.org/10.6084/m9.figshare.16586213 ; https://doi.org/10.6084/m9.figshare.21602622
- Dataset DOI: 10.6084/m9.figshare.14839650; 10.6084/m9.figshare.16586213; 10.6084/m9.figshare.21602622
- Citation: Wei et al. (2022) Proc. NeurIPS 2021 Competitions and Demonstrations Track, PMLR 176:205-219
- BibTeX keys: wei2022beetl
- Licence: CC BY 4.0
- Licence page: https://creativecommons.org/licenses/by/4.0/ (accessed 2026-11-12)
- Evidence: DataCite metadata of the three figshare records (rights: cc-by-4.0); the competition site https://beetl.ai/data could not be reached on the access date
- Access: direct download, no registration
- Version used in this study: files of the three figshare records
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (attribution, licence link, statement of changes)
- Status: verified
- Notes: Verified from the figshare records; terms on the competition site were not read.


## Sleep staging (7 sources)

### Sleep-EDF-SC

- Dataset: Sleep-EDF Database Expanded, sleep-cassette part
- Version: 1.0.0 (2013-10-24)
- Access point: https://physionet.org/content/sleep-edfx/1.0.0/
- Dataset DOI: 10.13026/C2X676
- Citation: Kemp et al. (2000) IEEE Trans. Biomed. Eng. 47(9):1185-1194; PhysioNet standard citation Pollard et al. (2026) (DOI: 10.1109/10.867928)
- BibTeX keys: sleepedf; sleepedfresource; physionet2026
- Licence: ODC-By 1.0
- Licence page: https://physionet.org/content/sleep-edfx/view-license/1.0.0/ (accessed 2026-11-12)
- Evidence: PhysioNet project page (License: Open Data Commons Attribution License v1.0)
- Access: direct download, no registration
- Version used in this study: PhysioNet 1.0.0
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (source and licence notice as in ODC-By section 4.3, with licence link)
- Status: verified
- Notes: Used in the public demonstration.

### HMC

- Dataset: Haaglanden Medisch Centrum sleep staging database
- Version: 1.1 (2022-03-18)
- Access point: https://physionet.org/content/hmc-sleep-staging/1.1/
- Dataset DOI: 10.13026/t79q-fr32
- Citation: Alvarez-Estevez & Rijsman (2021) PLOS ONE 16(8):e0256111; PhysioNet standard citation Pollard et al. (2026) (DOI: 10.1371/journal.pone.0256111)
- BibTeX keys: alvarezestevez2021hmc; hmc; physionet2026
- Licence: CC BY 4.0
- Licence page: https://physionet.org/content/hmc-sleep-staging/view-license/1.1/ (accessed 2026-11-12)
- Evidence: PhysioNet project page (License: Creative Commons Attribution 4.0 International Public License)
- Access: direct download, no registration
- Version used in this study: PhysioNet 1.1
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (attribution, licence link, statement of changes)
- Status: verified

### CinC2018

- Dataset: You Snooze You Win: The PhysioNet/Computing in Cardiology Challenge 2018 (public training set)
- Version: 1.0.0 (2018-02-21)
- Access point: https://physionet.org/content/challenge-2018/1.0.0/
- Dataset DOI: 10.13026/6phb-r450
- Citation: Ghassemi et al. (2018) Computing in Cardiology 45:1-4; PhysioNet standard citation Pollard et al. (2026) (DOI: 10.22489/CinC.2018.049)
- BibTeX keys: ghassemi2018; cinc2018; physionet2026
- Licence: ODC-By 1.0
- Licence page: https://physionet.org/content/challenge-2018/view-license/1.0.0/ (accessed 2026-11-12)
- Evidence: PhysioNet project page (License: Open Data Commons Attribution License v1.0)
- Access: direct download, no registration
- Version used in this study: annotated training set of PhysioNet 1.0.0
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (source and licence notice as in ODC-By section 4.3, with licence link)
- Status: verified

### CAP

- Dataset: CAP Sleep Database
- Version: 1.0.0
- Access point: https://physionet.org/content/capslpdb/1.0.0/
- Dataset DOI: 10.13026/C2VC79
- Citation: Terzano et al. (2001) Sleep Medicine 2(6):537-553; PhysioNet standard citation Pollard et al. (2026) (DOI: 10.1016/S1389-9457(01)00149-6)
- BibTeX keys: terzano2001; capslpdb; physionet2026
- Licence: ODC-By 1.0
- Licence page: https://physionet.org/content/capslpdb/view-license/1.0.0/ (accessed 2026-11-12)
- Evidence: PhysioNet project page (License: Open Data Commons Attribution License v1.0)
- Access: direct download, no registration
- Version used in this study: PhysioNet 1.0.0
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (source and licence notice as in ODC-By section 4.3, with licence link)
- Status: verified

### DOD-H

- Dataset: Dreem Open Datasets, healthy volunteers (DOD-H)
- Version: Zenodo record 15900394 (2025-07-15)
- Access point: https://doi.org/10.5281/zenodo.15900394
- Dataset DOI: 10.5281/zenodo.15900394
- Citation: Guillot et al. (2020) IEEE Trans. Neural Syst. Rehabil. Eng. 28(9):1955-1965 (DOI: 10.1109/TNSRE.2020.3011181)
- BibTeX keys: guillot2020; dreemopendatasets
- Licence: MIT License
- Licence page: https://opensource.org/licenses/MIT (accessed 2026-11-12)
- Evidence: DataCite record 10.5281/zenodo.15900394 (rights: MIT License); Zenodo record page; the companion code repository Dreem-Organization/dreem-learning-open is also MIT
- Access: direct download, no registration
- Version used in this study: Zenodo record 15900394
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (keep the copyright and licence notice)
- Status: verified
- Notes: MIT is a software licence; the publisher applies it to the data record.

### DOD-O

- Dataset: Dreem Open Datasets, patients with obstructive sleep apnoea (DOD-O)
- Version: Zenodo record 15900394 (2025-07-15)
- Access point: https://doi.org/10.5281/zenodo.15900394
- Dataset DOI: 10.5281/zenodo.15900394
- Citation: Guillot et al. (2020) IEEE Trans. Neural Syst. Rehabil. Eng. 28(9):1955-1965 (DOI: 10.1109/TNSRE.2020.3011181)
- BibTeX keys: guillot2020; dreemopendatasets
- Licence: MIT License
- Licence page: https://opensource.org/licenses/MIT (accessed 2026-11-12)
- Evidence: DataCite record 10.5281/zenodo.15900394 (rights: MIT License); Zenodo record page; the companion code repository Dreem-Organization/dreem-learning-open is also MIT
- Access: direct download, no registration
- Version used in this study: Zenodo record 15900394
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (keep the copyright and licence notice)
- Status: verified
- Notes: MIT is a software licence; the publisher applies it to the data record.

### Sleep-EDF-ST

- Dataset: Sleep-EDF Database Expanded, sleep-telemetry part
- Version: 1.0.0 (2013-10-24)
- Access point: https://physionet.org/content/sleep-edfx/1.0.0/
- Dataset DOI: 10.13026/C2X676
- Citation: Kemp et al. (2000) IEEE Trans. Biomed. Eng. 47(9):1185-1194; PhysioNet standard citation Pollard et al. (2026) (DOI: 10.1109/10.867928)
- BibTeX keys: sleepedf; sleepedfresource; physionet2026
- Licence: ODC-By 1.0
- Licence page: https://physionet.org/content/sleep-edfx/view-license/1.0.0/ (accessed 2026-11-12)
- Evidence: PhysioNet project page (License: Open Data Commons Attribution License v1.0)
- Access: direct download, no registration
- Version used in this study: PhysioNet 1.0.0
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (source and licence notice as in ODC-By section 4.3, with licence link)
- Status: verified


## Seizure detection (2 sources)

### CHB-MIT

- Dataset: CHB-MIT Scalp EEG Database, used in its BIDS conversion (BIDS CHB-MIT Scalp EEG Database)
- Version: PhysioNet 1.0.0 (2010-06-09); BIDS conversion Zenodo v1.0.0 (2023-12-05)
- Access point: https://physionet.org/content/chbmit/1.0.0/ ; https://doi.org/10.5281/zenodo.10259996
- Dataset DOI: 10.13026/C2K01R; 10.5281/zenodo.10259996
- Citation: Shoeb (2009) PhD thesis, MIT; Guttag (2010) PhysioNet data record; Dan & Shoeb (2023) Zenodo; PhysioNet standard citation Pollard et al. (2026)
- BibTeX keys: shoeb2009; chbmit; chbmitbids; physionet2026
- Licence: ODC-By 1.0 (PhysioNet database); the Zenodo record of the BIDS conversion states CC BY 4.0 in its metadata and ODC-By 1.0 in its description
- Licence page: https://physionet.org/content/chbmit/view-license/1.0.0/ ; https://creativecommons.org/licenses/by/4.0/ (accessed 2026-11-12)
- Evidence: PhysioNet project page; DataCite record 10.5281/zenodo.10259996 (rights: cc-by-4.0); description of the Zenodo record ("released under the Open Data Commons Attribution License v1.0")
- Access: direct download, no registration
- Version used in this study: BIDS archive of Zenodo 10259996 v1.0.0
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (both statements require attribution only: ODC-By section 4.3 notice, plus attribution of the BIDS conversion with a CC BY 4.0 link)
- Status: verified
- Notes: Used in the public demonstration. The two licence statements of the conversion are both recorded; attribution satisfies either.

### Siena

- Dataset: Siena Scalp EEG Database
- Version: 1.0.0 (2020-08-11)
- Access point: https://physionet.org/content/siena-scalp-eeg/1.0.0/
- Dataset DOI: 10.13026/5d4a-j060
- Citation: Detti et al. (2020) Processes 8(7):846; PhysioNet standard citation Pollard et al. (2026) (DOI: 10.3390/pr8070846)
- BibTeX keys: detti2020; siena; physionet2026
- Licence: CC BY 4.0
- Licence page: https://physionet.org/content/siena-scalp-eeg/view-license/1.0.0/ (accessed 2026-11-12)
- Evidence: PhysioNet project page (License: Creative Commons Attribution 4.0 International Public License)
- Access: direct download, no registration
- Version used in this study: PhysioNet 1.0.0
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (attribution, licence link, statement of changes)
- Status: verified


## Pain rating (9 sources)

### ds005292

- Dataset: OpenNeuro ds005292, "142 by Biosemi"
- Version: 1.0.0 (2024-06-27)
- Access point: https://openneuro.org/datasets/ds005292/versions/1.0.0
- Dataset DOI: 10.18112/openneuro.ds005292.v1.0.0
- Citation: Data record: Zhao et al. (2024), OpenNeuro; no data paper was found
- BibTeX keys: ds005292
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: dataset_description.json of the OpenNeuro record (License: CC0); DataCite record 10.18112/openneuro.ds005292.v1.0.0
- Access: direct download, no registration
- Version used in this study: raw BIDS files of OpenNeuro 1.0.0; per-trial ratings from the supplementary repository published by the dataset authors
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (EEG excerpts: CC0, attribution recommended); the per-trial ratings shown next to an excerpt come from the supplementary repository of the dataset authors, which carries no licence statement
- Status: verified; pending-author-confirmation
- Notes: EEG licence verified. Per-trial ratings: https://github.com/XiangyueZhao/Supplement-Data (no licence file). The raw BIDS files of the record have no rating column (events.tsv columns: onset, duration, sample, value; participants.tsv holds demographic and stimulation fields only; column headers checked 2026-11-12, event values and derivatives not inspected), so the ratings were taken from that repository. Pending: confirmation of its terms with the dataset authors. Used in the public demonstration.

### ds005280

- Dataset: OpenNeuro ds005280, "223 By BP"
- Version: 1.0.0 (2024-06-26)
- Access point: https://openneuro.org/datasets/ds005280/versions/1.0.0
- Dataset DOI: 10.18112/openneuro.ds005280.v1.0.0
- Citation: Data record: Zhao et al. (2024), OpenNeuro; no data paper was found
- BibTeX keys: ds005280
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: dataset_description.json of the OpenNeuro record (License: CC0); DataCite record 10.18112/openneuro.ds005280.v1.0.0
- Access: direct download, no registration
- Version used in this study: raw BIDS files of OpenNeuro 1.0.0; per-trial ratings from the supplementary repository published by the dataset authors
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (EEG excerpts: CC0, attribution recommended); the per-trial ratings shown next to an excerpt come from the supplementary repository of the dataset authors, which carries no licence statement
- Status: verified; pending-author-confirmation
- Notes: EEG licence verified. Per-trial ratings: https://github.com/XiangyueZhao/Supplement-Data (no licence file). The raw BIDS files of the record have no rating column (events.tsv columns: onset, duration, sample, value; participants.tsv holds demographic and stimulation fields only; column headers checked 2026-11-12, event values and derivatives not inspected), so the ratings were taken from that repository. Pending: confirmation of its terms with the dataset authors.

### ds005284

- Dataset: OpenNeuro ds005284, "26 By Biosemi"
- Version: 1.0.0 (2024-06-26)
- Access point: https://openneuro.org/datasets/ds005284/versions/1.0.0
- Dataset DOI: 10.18112/openneuro.ds005284.v1.0.0
- Citation: Data record: Zhao et al. (2024), OpenNeuro; related publication listed by the record: Lu et al. (2019) Journal of Pain Research 12:3331-3342 (DOI: 10.2147/JPR.S212080)
- BibTeX keys: ds005284; lu2019music
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: dataset_description.json of the OpenNeuro record (License: CC0); DataCite record 10.18112/openneuro.ds005284.v1.0.0
- Access: direct download, no registration
- Version used in this study: raw BIDS files of OpenNeuro 1.0.0; per-trial ratings from the supplementary repository published by the dataset authors
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (EEG excerpts: CC0, attribution recommended); the per-trial ratings shown next to an excerpt come from the supplementary repository of the dataset authors, which carries no licence statement
- Status: verified; pending-author-confirmation
- Notes: EEG licence verified. Per-trial ratings: https://github.com/XiangyueZhao/Supplement-Data (no licence file). The raw BIDS files of the record have no rating column (events.tsv columns: onset, duration, sample, value; participants.tsv holds demographic and stimulation fields only; column headers checked 2026-11-12, event values and derivatives not inspected), so the ratings were taken from that repository. Pending: confirmation of its terms with the dataset authors.

### ds005285

- Dataset: OpenNeuro ds005285, "29 By ANT"
- Version: 1.0.0 (2024-06-26)
- Access point: https://openneuro.org/datasets/ds005285/versions/1.0.0
- Dataset DOI: 10.18112/openneuro.ds005285.v1.0.0
- Citation: Data record: Zhao et al. (2024), OpenNeuro; related publication listed by the record: Bi et al. (2023) General Psychiatry 36(6):e101164 (DOI: 10.1136/gpsych-2023-101164)
- BibTeX keys: ds005285; bi2023vrtens
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: dataset_description.json of the OpenNeuro record (License: CC0); DataCite record 10.18112/openneuro.ds005285.v1.0.0
- Access: direct download, no registration
- Version used in this study: raw BIDS files of OpenNeuro 1.0.0; per-trial ratings from the supplementary repository published by the dataset authors
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (EEG excerpts: CC0, attribution recommended); the per-trial ratings shown next to an excerpt come from the supplementary repository of the dataset authors, which carries no licence statement
- Status: verified; pending-author-confirmation
- Notes: EEG licence verified. Per-trial ratings: https://github.com/XiangyueZhao/Supplement-Data (no licence file). The raw BIDS files of the record have no rating column (events.tsv columns: onset, duration, sample, value; participants.tsv holds demographic and stimulation fields only; column headers checked 2026-11-12, event values and derivatives not inspected), so the ratings were taken from that repository. Pending: confirmation of its terms with the dataset authors.

### ds005286

- Dataset: OpenNeuro ds005286, "30 By ANT"
- Version: 1.0.0 (2024-06-26)
- Access point: https://openneuro.org/datasets/ds005286/versions/1.0.0
- Dataset DOI: 10.18112/openneuro.ds005286.v1.0.0
- Citation: Data record: Zhao et al. (2024), OpenNeuro; no data paper was found
- BibTeX keys: ds005286
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: dataset_description.json of the OpenNeuro record (License: CC0); DataCite record 10.18112/openneuro.ds005286.v1.0.0
- Access: direct download, no registration
- Version used in this study: raw BIDS files of OpenNeuro 1.0.0; per-trial ratings from the supplementary repository published by the dataset authors
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (EEG excerpts: CC0, attribution recommended); the per-trial ratings shown next to an excerpt come from the supplementary repository of the dataset authors, which carries no licence statement
- Status: verified; pending-author-confirmation
- Notes: EEG licence verified. Per-trial ratings: https://github.com/XiangyueZhao/Supplement-Data (no licence file). The raw BIDS files of the record have no rating column (events.tsv columns: onset, duration, sample, value; participants.tsv holds demographic and stimulation fields only; column headers checked 2026-11-12, event values and derivatives not inspected), so the ratings were taken from that repository. Pending: confirmation of its terms with the dataset authors.

### ds005289

- Dataset: OpenNeuro ds005289, "39 By BP"
- Version: 1.0.0 (2024-06-26)
- Access point: https://openneuro.org/datasets/ds005289/versions/1.0.0
- Dataset DOI: 10.18112/openneuro.ds005289.v1.0.0
- Citation: Data record: Zhao et al. (2024), OpenNeuro; related publication listed by the record: Lu et al. (2021) Ann. N.Y. Acad. Sci. 1497(1):39-56 (DOI: 10.1111/nyas.14587)
- BibTeX keys: ds005289; lu2021movement
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: dataset_description.json of the OpenNeuro record (License: CC0); DataCite record 10.18112/openneuro.ds005289.v1.0.0
- Access: direct download, no registration
- Version used in this study: raw BIDS files of OpenNeuro 1.0.0; per-trial ratings from the supplementary repository published by the dataset authors
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (EEG excerpts: CC0, attribution recommended); the per-trial ratings shown next to an excerpt come from the supplementary repository of the dataset authors, which carries no licence statement
- Status: verified; pending-author-confirmation
- Notes: EEG licence verified. Per-trial ratings: https://github.com/XiangyueZhao/Supplement-Data (no licence file). The raw BIDS files of the record have no rating column (events.tsv columns: onset, duration, sample, value; participants.tsv holds demographic and stimulation fields only; column headers checked 2026-11-12, event values and derivatives not inspected), so the ratings were taken from that repository. Pending: confirmation of its terms with the dataset authors.

### ds005291

- Dataset: OpenNeuro ds005291, "65 By ANT"
- Version: 1.0.0 (2024-06-26)
- Access point: https://openneuro.org/datasets/ds005291/versions/1.0.0
- Dataset DOI: 10.18112/openneuro.ds005291.v1.0.0
- Citation: Data record: Zhao et al. (2024), OpenNeuro; no data paper was found
- BibTeX keys: ds005291
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: dataset_description.json of the OpenNeuro record (License: CC0); DataCite record 10.18112/openneuro.ds005291.v1.0.0
- Access: direct download, no registration
- Version used in this study: raw BIDS files of OpenNeuro 1.0.0; per-trial ratings from the supplementary repository published by the dataset authors
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (EEG excerpts: CC0, attribution recommended); the per-trial ratings shown next to an excerpt come from the supplementary repository of the dataset authors, which carries no licence statement
- Status: verified; pending-author-confirmation
- Notes: EEG licence verified. Per-trial ratings: https://github.com/XiangyueZhao/Supplement-Data (no licence file). The raw BIDS files of the record have no rating column (events.tsv columns: onset, duration, sample, value; participants.tsv holds demographic and stimulation fields only; column headers checked 2026-11-12, event values and derivatives not inspected), so the ratings were taken from that repository. Pending: confirmation of its terms with the dataset authors.

### ds005293

- Dataset: OpenNeuro ds005293, "95 By BP"
- Version: 1.0.0 (2024-07-29)
- Access point: https://openneuro.org/datasets/ds005293/versions/1.0.0
- Dataset DOI: 10.18112/openneuro.ds005293.v1.0.0
- Citation: Data record: Zhao et al. (2024), OpenNeuro; no data paper was found
- BibTeX keys: ds005293
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: dataset_description.json of the OpenNeuro record (License: CC0); DataCite record 10.18112/openneuro.ds005293.v1.0.0
- Access: direct download, no registration
- Version used in this study: raw BIDS files of OpenNeuro 1.0.0; per-trial ratings from the supplementary repository published by the dataset authors
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (EEG excerpts: CC0, attribution recommended); the per-trial ratings shown next to an excerpt come from the supplementary repository of the dataset authors, which carries no licence statement
- Status: verified; pending-author-confirmation
- Notes: EEG licence verified. Per-trial ratings: https://github.com/XiangyueZhao/Supplement-Data (no licence file). The raw BIDS files of the record have no rating column (events.tsv columns: onset, duration, sample, value; participants.tsv holds demographic and stimulation fields only; column headers checked 2026-11-12, event values and derivatives not inspected), so the ratings were taken from that repository. Pending: confirmation of its terms with the dataset authors.

### ds005473

- Dataset: OpenNeuro ds005473, "29 By BP"
- Version: 1.0.0 (2024-09-11)
- Access point: https://openneuro.org/datasets/ds005473/versions/1.0.0
- Dataset DOI: 10.18112/openneuro.ds005473.v1.0.0
- Citation: Data record: Zhao et al. (2024), OpenNeuro; related publication listed by the record: Hu et al. (2014) Journal of Neuroscience 34(34):11439-11451 (DOI: 10.1523/JNEUROSCI.1355-14.2014)
- BibTeX keys: ds005473; hu2014concomitant
- Licence: CC0 1.0
- Licence page: https://creativecommons.org/publicdomain/zero/1.0/ (accessed 2026-11-12)
- Evidence: dataset_description.json of the OpenNeuro record (License: CC0); DataCite record 10.18112/openneuro.ds005473.v1.0.0
- Access: direct download, no registration
- Version used in this study: raw BIDS files of OpenNeuro 1.0.0; per-trial ratings from the supplementary repository published by the dataset authors
- Uses: paper and aggregate results, allowed (cite as requested); code release, allowed (the code contains no data); aggregate result files, allowed (aggregate metrics only); demo excerpts, allowed (EEG excerpts: CC0, attribution recommended); the per-trial ratings shown next to an excerpt come from the supplementary repository of the dataset authors, which carries no licence statement
- Status: verified; pending-author-confirmation
- Notes: EEG licence verified. Per-trial ratings: https://github.com/XiangyueZhao/Supplement-Data (no licence file). The raw BIDS files of the record have no rating column (events.tsv columns: onset, duration, sample, value; participants.tsv holds demographic and stimulation fields only; column headers checked 2026-11-12, event values and derivatives not inspected), so the ratings were taken from that repository. Pending: confirmation of its terms with the dataset authors.

