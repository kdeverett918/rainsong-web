# Bundled fonts

Both families are licensed under the **SIL Open Font License 1.1**. The full license text sits next to each family (`fraunces/OFL.txt`, `atkinson/OFL.txt`). OFL fonts may be bundled, embedded and redistributed with the app; they may not be sold on their own. Neither upstream copyright line declares a Reserved Font Name, so the subset files keep their original family names.

| Family | Files | Copyright | Source | Version |
|---|---|---|---|---|
| Fraunces (variable, roman + italic; axes `opsz` 9–144, `wght` 100–900, `SOFT` 0–100, `WONK` 0–1) | `fraunces/Fraunces-Roman-VF.woff2`, `fraunces/Fraunces-Italic-VF.woff2` | Copyright 2018 The Fraunces Project Authors (https://github.com/undercasetype/Fraunces) | github.com/google/fonts `ofl/fraunces` | 1.000 |
| Atkinson Hyperlegible (Regular, Bold, Italic, Bold Italic) | `atkinson/AtkinsonHyperlegible-{Regular,Bold,Italic,BoldItalic}.woff2` | Copyright 2020 Braille Institute of America, Inc. | github.com/google/fonts `ofl/atkinsonhyperlegible` | 1.006 |

## Modification

Downloaded 2026-10-12 as TTF and converted to WOFF2 with fontTools `pyftsubset`, subset to Latin + Latin Extended for v1 (all OpenType layout features kept):

```
U+0000-00FF, U+0100-024F, U+0259, U+02B0-02FF, U+0300-036F, U+1E00-1EFF,
U+2000-206F, U+20A0-20CF, U+2100-214F, U+2190-2199, U+2212, U+2215,
U+2248, U+2260, U+2264, U+2265, U+25CC, U+FEFF, U+FFFD
```

Localization that needs other scripts should re-subset from the upstream TTFs.

## Suggested @font-face

```css
@font-face { font-family: "Fraunces"; src: url("/fonts/fraunces/Fraunces-Roman-VF.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }
@font-face { font-family: "Fraunces"; src: url("/fonts/fraunces/Fraunces-Italic-VF.woff2") format("woff2"); font-weight: 100 900; font-style: italic; font-display: swap; }
@font-face { font-family: "Atkinson Hyperlegible"; src: url("/fonts/atkinson/AtkinsonHyperlegible-Regular.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }
@font-face { font-family: "Atkinson Hyperlegible"; src: url("/fonts/atkinson/AtkinsonHyperlegible-Bold.woff2") format("woff2"); font-weight: 700; font-style: normal; font-display: swap; }
@font-face { font-family: "Atkinson Hyperlegible"; src: url("/fonts/atkinson/AtkinsonHyperlegible-Italic.woff2") format("woff2"); font-weight: 400; font-style: italic; font-display: swap; }
@font-face { font-family: "Atkinson Hyperlegible"; src: url("/fonts/atkinson/AtkinsonHyperlegible-BoldItalic.woff2") format("woff2"); font-weight: 700; font-style: italic; font-display: swap; }
```

Atkinson Hyperlegible ships only Regular and Bold weights; "semibold" buttons (art bible 10.2) should use 700 or let the browser synthesize.
