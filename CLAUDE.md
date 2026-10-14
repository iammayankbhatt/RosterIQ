# RosterIQ

Workforce intelligence for seasonal hill hotels in India. RosterIQ builds fair staff rosters from occupancy forecasts, scores each person's workload risk with plain-language reasons (burnout early-warning), suggests a fix to the manager, and shows a monthly savings report in rupees.

Revenue is a seasonal subscription. Savings are shown as proof of value, **never used for billing**.

Team: Samlaun (AI-021) — AI-Tourism Hackathon 2026.

## Stack
Vite + React + TypeScript + Tailwind CSS (v3) + Framer Motion + Zustand + React Router + Vitest. No backend; everything runs in the browser.

Commands: `npm run dev`, `npm run build`, `npm test`.

## Money rule
**All money is in Indian rupees using lakh formatting (₹1.62 lakh); label every figure as a sample or assumption.** Use `formatINR` / `formatLakh` in `src/lib/format.ts`; never hand-format currency.

## Design rules
It must feel hand-crafted by a human designer, not an AI template.

- Colours are CSS variables (see `src/index.css`): pine #12302B (dark), forest #1F5A4C, teal #2E7D6B, saffron #F2A33A, mist #EEF4F1, paper #FBF8F1, terracotta #C8553D, stone #6F817B.
- Fonts (Google Fonts): **Fraunces** for headings and big numbers, **Instrument Sans** for body. Big numbers are always Fraunces.
- Signature details: faint topographic hill-contour SVG pattern on backgrounds; subtle paper-grain texture; saffron "highlighter" swipe behind key numbers (`<Highlight>`); hand-drawn SVG underline under section titles; cards with slightly uneven corner radii and soft warm shadows; a few elements rotated 1–2° like stickers.
- Custom inline SVG marks only (hill-and-sun logo, deodar-tree icon, status dots). **No emoji as icons, no purple gradients, no glassmorphism, no generic stock dashboards.**
- Motion: gentle springs, number count-ups, page transitions. Always respect `prefers-reduced-motion`.
- Fully responsive: desktop-first, great on tablet and phone.

## Sample data
`src/data/` holds a fictional hotel, "Deodar Heights (sample hotel)", 25 rooms, Mussoorie. 20 staff across 6 departments, 6-week shift history with seeded personas: Ravi (no weekly off 21 days, heavy overtime), Meena (late close → early open, short rests), Arjun (stagnating), plus healthy contrast staff. All of it is sample data, not real people.

## Engine (`src/engine/`, pure TypeScript, no UI)
- `demand.ts` occupancy forecast to staff per department per shift (Morning 06–14, Evening 14–22, Night 22–06). Ratios in `RATIOS`.
- `roster.ts` `generateRoster`: greedy by day scored on fairness/overtime/preferences, then local repair (swap, ejection chain, capped overtime). Hard rules (11 h rest, 6 days max, weekly off, approved leave, skills) live in `constraints.ts`, one source of truth.
- `baseline.ts` `generateManualBaseline`: the "manager on paper" roster, for a real before/after.
- `risk.ts` `scoreRisk`: transparent 0–100 **workload risk score**. Never call it a prediction. Bands: steady <20, watch 20–49, high 50+.
- `fixes.ts` `recommendFix` / `applyFix`; `savings.ts` `computeSavings` (every input is an editable assumption, savings are never used for billing).
- `npm run demo` prints a sample roster, three risk scores and the savings; `npm test` runs the suite.
