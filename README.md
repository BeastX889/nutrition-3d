# 🥗 Nutrition Atlas 3D

An interactive 3D "nutrient galaxy" — explore everything your body runs on.

**Live demo:** https://beastx889.github.io/nutrition-3d/

## What's inside

- **5 Macronutrients** — Protein, Carbohydrates, Fats, Fiber, Water
- **13 Vitamins** — A, B1, B2, B3, B5, B6, B7 (Biotin), B9 (Folate), B12, C, D, E, K
- **10 Minerals** — Calcium, Iron, Magnesium, Zinc, Potassium, Sodium, Phosphorus, Iodine, Selenium, Copper

Every nutrient card covers: what it does, daily requirement (RDA), best food sources, deficiency signs, excess/toxicity risks, and a fun fact.

## Features

- 3D orbital galaxy built with Three.js — drag to orbit, scroll to zoom
- Click any nutrient sphere to fly the camera in and open its full detail panel
- Live search (dims non-matching nutrients in 3D and in the list)
- Grouped sidebar list, auto-rotation toggle, camera reset
- Fully responsive, zero build step — plain HTML + ES modules

## Run locally

Any static server works:

```bash
python3 -m http.server 5195
```

Then open http://localhost:5195

## Stack

- [Three.js](https://threejs.org/) r160 (CDN, import maps)
- CSS2DRenderer for crisp DOM labels in 3D space
- Vanilla JS + CSS — no framework, no build

## Disclaimer

Educational content only — not medical advice. RDA values are for typical healthy adults; individual needs vary.
