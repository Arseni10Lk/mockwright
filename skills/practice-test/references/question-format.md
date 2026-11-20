# Quiz data format

A quiz is one JavaScript file that exports `{ meta, areas, questions }` (or the same object as `.json`).
`scripts/build.js` checks it and injects it into `assets/template.html`. Nothing about the structure is
fixed: any number of areas, and any number and mix of question types in each, decided by the real exam.
See `examples/minimal.quiz.js` (one area, two open questions) for a complete file.

Text fields marked *html* may contain inline HTML (`<b>`, `<sub>`, `<code>`, inline `<svg>` drawn with
`currentColor` or theme variables such as `var(--ink)` and `var(--accent)`). Do not write `<` as a
literal less-than in html text; use `&lt;` or the Unicode signs ⟨ ⟩ ≤.

## meta

| field | required | meaning |
|---|---|---|
| `slug` | yes | lowercase-hyphen id; names the saved account document `data/users/<viewer id>/<slug>`. Changing it starts everyone over. |
| `title` | yes | 2–4 word page name (browser tab, gallery) |
| `heading` | no | big heading on the page (defaults to `title`) |
| `eyebrow` | no | small line above the heading, e.g. course · exam · date |
| `intro` | no | *html*, one or two sentences on what the test covers |
| `notices` | no | `[{ text, warn? }]` pills: exam format, what is not covered. "Unofficial practice test" is always shown. |
| `footer` | no | *html* |
| `noGiveaway` | no | strings that must not appear in any question's visible text |

## areas

`[{ id, name, short? }]` in exam order. `short` labels the score bar and filter chip. With one area,
the page hides the per-area bars and chips.

## questions (shared fields)

| field | required | meaning |
|---|---|---|
| `id` | yes | unique, e.g. `B4` |
| `v` | yes | content version, starts at 1. Bump it whenever the question's content changes: saved answers to the old version are dropped, all other answers stay. |
| `area` | yes | an `areas[].id` |
| `topic` | yes | specific topic name; the "Where to focus" list groups mistakes by it |
| `type` | yes | `mcq`, `multi`, `tf`, `match`, `order`, `calc`, `open` |
| `prompt` | yes | *html*. Must ask something: contain `?` or a sentence opening with an instruction (Select, Match, Put, Mark …). Open prompts may instead set a task (Explain, Define, Compare …). |
| `figure` | no | *html* (usually inline SVG) shown under the prompt |
| `explain` | yes | *html*. Why the right answer is right and why the tempting wrong ones are wrong; for calculations: formula, substitution, result, and the common wrong setup with its value. |
| `noGiveaway` | calc: strongly advised | strings (formulas, definitions) this question assesses; the build fails if any appears in the prompt, parts, options or items |

Points: `mcq` 1 (or `pts`), `multi` 2 (or `pts`), `tf` 1 per statement, `match` 1 per row, `order` 2 (or `pts`),
`calc` sum of parts (each `pts`, default 1), `open` sum of rubric points.

## per type

**mcq**: `options: [html…]` (≥ 3), `correct: index`. Options are shuffled per attempt; grading uses the original index.

**multi**: `options` (≥ 4), `correct: [indices]`. Score = (right picks − wrong picks) / number correct × pts, never below 0.

**tf**: `items: [{ s: html, a: true|false }]` (≥ 2).

**match**: `left: [html…]`, `right: [html…]` with one or two more entries than `left`, `answer: [right index per left item]`.
The right column is shuffled; options are shown as plain text.

**order**: `items: [html…]` listed in the **correct** order (≥ 3), optional `pts`. Starts shuffled, never already correct;
score is proportional, rounded to 0.5.

**calc**: `prompt` gives the situation and data only (never the formula being tested). `parts: [{ label?, text, ans, … }]`:

| part field | meaning |
|---|---|
| `text` | *html*, a complete question ending with `?`, readable on its own |
| `ans` | expected number |
| `int: true` | exact whole number (tolerance 0; thousands separators accepted) |
| `tol` | tolerance when not `int`: relative (0.02 = ±2%) or absolute with `abs: true` |
| `sig` | significant figures to ask for (default 3) |
| `note` | extra precision hint, e.g. "keep 3 significant figures; do not round to one digit" |
| `unit` | *html* unit shown after the input |
| `wrong` | common wrong answers; the build fails if one falls inside the tolerance |
| `pts` | default 1 |

The page shows each part's accepted precision next to its input, generated from the same `int`/`tol`/`abs`/`sig`
the grader uses, and shows the accepted range after a wrong answer.

**open**: `rubric: [{ text: html, pts, keys: [specific terms] }]` (3–8 items; keys ≥ 3 characters, never common words),
`model: html` model answer. The page pre-ticks rubric items whose keys appear in the answer; the student adjusts and confirms.
