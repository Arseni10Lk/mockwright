---
name: "practice-test"
description: "Build an interactive practice exam artifact for any exam or subject from the user's course material: mixed question types that test recall rather than reading, instant marking, per-area scoring, weak-topic tracking, reshuffled attempts and progress synced privately across the user's devices. Also update a test, or analyze a finished attempt and the user's comments."
---

# MockWright practice test

Use this when the user asks for a practice test, mock exam or self-assessment for any exam or subject, asks to update one, or says they finished one and want feedback.

Write all page text in the user's language (from their preferences and instructions) unless they ask for another.

## 1. Gather the scope first

- Read every scope source before writing questions: project docs and files, attached PDFs and slides, topic lists, and the exam poster or announcement. When several documents describe the scope, they **complement each other**. Merge them and never drop a topic because one list leaves it out.
- Find out how the exam is scored (separate areas, sections) and mirror that structure in the test.
- Find out the exam's question formats and their weight (for example "two open questions worth 6 points each, the rest multiple choice"). The practice test copies that mix. Nothing about the structure is fixed: the number of areas, the number of questions and the count of each question type all come from the exam, never from a default pattern or from a previous test.
- Find out the exam conditions: closed or open book, formula sheet or not, calculator or not. They decide what a question may hand the user (see "Test recall, not reading" below). If the sources don't say, assume closed book with no formula sheet.
- Ask at most 1–3 short questions, and only when the answer would change what you build (for example, an unknown exam format or which areas to include). Otherwise start building.

## 2. Write the questions

Coverage:
- Cover every topic in the merged scope with at least one question. Tag each question with its area and a specific topic name, because the focus list groups mistakes by topic.
- Mix question types within each area, in the proportions the real exam uses: single-choice MCQ, select-all-that-apply, true/false sets, matching (with one or two extra unused options), ordering, calculations, and open questions. Add others where the subject calls for them (for example, reading a drawing or graph, or spotting the error in a statement). Draw figures (beams, circuits, sections, symbols, diagrams) as inline SVG that uses theme colors.
- Calculations use realistic numbers and units, are split into parts (a), (b) with their own points, accept a tolerance (about ±1–3%, or an absolute tolerance for percentages and small values), and accept comma or dot decimals and `e` notation. Every calculation's feedback shows the formula, the substitution and the result. List the common wrong answers (for example, leaving out one term) in the part's `wrong` field; the build fails if one falls inside the tolerance.
- Open questions have a rubric of 4–6 elements with explicit points each. Include a model answer.

Test recall, not reading (required). A question must test the knowledge the exam tests, not the user's ability to copy from the prompt:
- Never put in the prompt the formula, equation, definition or rule that the question assesses, whether it is written out (O = (W − F + 2P)/S + 1), given as a pattern (m·(n + 1)), or quoted "as printed on the slides". Once the formula is given, all that is left is a calculator exercise, and the question is worthless. The formula goes in the feedback, shown after the user answers.
- The prompt gives only the situation and the data: the system, the dimensions, the values, the units. Choosing the formula, deciding which terms count (biases, channels, losses, supports) and setting it up correctly is what the question tests.
- When two conventions exist (for example one bias per filter vs per channel slice), name the convention in words in the prompt ("count one bias per filter"), never as the expression. Put the other convention in the feedback.
- Hand over a formula only when the real exam would (a formula sheet in an open-book exam), or when the formula is a tool and not the learning target. In that case, say in the prompt that it is given as on the exam's formula sheet.
- The same applies to every other question type: an MCQ or true/false prompt must not state the fact that one of its options or items tests.
- Before publishing, reread every prompt and part with one question: if the given formula or fact were deleted, could someone who knows the material still answer? If yes, and the formula is the learning target, delete it.

Every question must actually ask something (required):
- Every prompt, and every part of a multi-part question, ends with an explicit question or instruction that names what to give, for example "How many trainable parameters does the first layer have, biases included?" A prompt that only describes a setup, with the real question hidden in short part labels ("(a) First layer"), is not acceptable.
- Each part's text must read on its own as a complete question, because the user reads parts one at a time while answering.

Required precision must always be visible (required). The template shows each part's accepted tolerance and form next to its input, generated from the same `int`/`tol`/`abs`/`sig` fields the grader uses, shows the accepted range after a wrong answer, and states the general rules (decimal comma or dot, e-notation) at the top. Your part of the job:
- Choose the tolerance and significant figures deliberately for every part, and use `int: true` for exact counts.
- When the tolerance is tight enough that sensible rounding would fail (for example 1.02e-8 must not be rounded to 1e-8, or a result that only differs from a common shortcut in the third digit), add a `note`: "keep 3 significant figures; do not round to one digit".

Answer options must not give the answer away. This is the most important quality rule:
- The wording of an option must carry **no signal about correctness in either direction**. Length, level of detail, qualifiers ("usually", "mainly") and technical vocabulary must not correlate with being right or with being wrong. A rule like "the longest option is never correct" is just as much a giveaway as "the longest option is correct".
- Aim for options of about the same length, specificity and grammatical form. Where they inevitably differ, make every distractor as precise and technical as the correct answer, so that each option is a fully specified, confident claim.
- Across the whole test, the correct answer must land at every length rank (longest, shortest, in between) at roughly the rate chance would give. The build computes the length rank of every correct option and fails when they are skewed; when it does, rewrite option sets until they are not (never pass `--allow-skew` to get past it).
- Distractors are real misconceptions or near-misses from the subject (a swapped definition, a wrong but sensible formula, a neighboring standard), not obviously silly statements.
- Avoid giveaway words (always, never, only) unless they appear evenly across right and wrong options. Avoid "all of the above" and "none of the above".
- Before publishing, reread every option set and ask: could someone who knows nothing about the subject pick the answer, or rule one out, from wording alone? If yes, rewrite it.

Feedback:
- For calculations, the feedback is where the formula lives: formula, substitution, result, and the most common wrong setup with its value (for example "putting the bias on the input side gives 784·301 = 235,984"), so the user can match a wrong answer to its cause.
- Each question's explanation says why the right answer is right and why the tempting wrong answers are wrong.
- Spell out every acronym and define every term of art the first time it appears in an explanation (for example, NDT = non-destructive testing, CMM = coordinate measuring machine). The questions themselves can use the jargon without definitions, since knowing the terms is part of the test.
- Keep the course's people out of the test: no lecturer or student names, and no personal details. Cite material by topic, not by who taught it.

## 3. Build the page from the template

Never hand-write the page. This skill ships a tested template; you only write the question data.

Files in this skill's base directory:
- `assets/template.html`: page shell, styles and engine (rendering, marking, shuffling, scoring, attempts, sync). Do not edit it for one test; if it needs a change, change it for every test and rerun the example.
- `scripts/build.js`: checks the data and injects it into the template.
- `scripts/smoke.js`: scripted test of a built or published page, including multi-device sync.
- `references/question-format.md`: the data format. Read it before writing questions.
- `examples/minimal.quiz.js`: a complete small quiz to copy the shape from.

Steps:
1. Write the quiz as `<slug>.quiz.js` in a scratch folder (or in the user's project if they ask), exporting `{ meta, areas, questions }`. Give every calculation a `noGiveaway` list of the formulas it assesses and a `wrong` list of common wrong answers.
2. Run `node <skill>/scripts/build.js <slug>.quiz.js <slug>.html`. It fails, with one line per problem, on: a missing or duplicate field; a calculation part that is not a complete question ending with "?"; a prompt that asks nothing; a `noGiveaway` string visible before answering; a common wrong answer inside the tolerance; open-question keys that are too short; and correct options skewed by length (more than half of them the longest or the shortest). Fix the data, not the checks, and rebuild until it passes. It also prints the structure and the length-rank counts; read them.
3. Run the smoke test (section 4), then publish `<slug>.html` (never the `.preview.html` copy) as an artifact with `capabilities: {db: {}, user: {}}`.
4. After publishing, read the artifact back and run the smoke test on that file too.

What the template guarantees (keep these true if you ever change it):
- Questions are inline data, each card is built from its own element reference, and a missing element throws instead of failing silently.
- "Check answer" marks every option, row, part or step and shows the explanation; "Show answer (0 pts)"; an "I guessed" toggle on every question; the open-question flow (write, "Mark my answer" with rubric pre-ticked from specific key terms, adjust, confirm); partial credit as described in the format reference.
- A score strip with total, accuracy on answered questions, points from guesses and one bar per area (hidden for a single area). On phones, a one-line score bar stays pinned and the full strip scrolls away.
- A "Where to focus" list of topics below 75%, weakest first, with question links, plus guessed questions.
- Per-attempt seeded shuffling of options, matching columns, ordering items and question order within each area; answers are stored by original index.
- "Start new attempt" and "Reset answers" open a confirmation bar that stays until Confirm, Cancel or Escape (no timeout, no native dialogs). New attempts are archived into a visible history.
- Sync: progress lives in the viewer's private document `data/users/<viewer id>/<slug>`, so a person the user shares the page with gets their own blank test and never sees or changes the user's. A device that has changed nothing defers to the account copy; nothing is written before the account copy has been read; answers merge one by one (a checked answer beats a draft, otherwise the newest wins); an attempt is replaced only when another device archived or reset it; open pages receive changes live. Browser storage is only a cache. The status shows "Synced to your account", "Saving…" or an amber "This device only" with the reason.
- Changing a question's content means bumping its `v`; only that question's saved answer is dropped.
- Keyboard focus rings sit on the inputs (`:focus-visible`), never on labels through `:focus-within` and never where `overflow: hidden` clips them. `[hidden]` always hides.

## 4. Test before publishing (required)

1. Install jsdom once in a scratch folder (`npm install jsdom@24`) and run `node <skill>/scripts/smoke.js <slug>.html` from that folder. It must print `SMOKE PASSED`. It checks: no script errors; one card per question with a prompt and controls; every calculation input shows the grader's tolerance; every calculation part asks a question and every open prompt sets a task; a correct answer earns full points for every question type present; the strip updates; a wrong decimal answer shows the accepted range; the confirmation bar is still open after 10 seconds; archiving clears and re-renders; a reload restores progress; and, against a simulated account, that a fresh device loads saved progress, never overwrites it, two devices answering at once both keep their answers, new attempts and resets reach the other device, and another person opening the shared page starts blank in their own private document. `--quick` skips the 10-second wait while iterating; the final run is without it.
2. jsdom does not render CSS. Before the first publish of a test that uses a question type or figure not yet seen in a real browser, open the `.preview.html` copy the build writes (it has the publish wrapper: charset, mobile viewport, reset) in a real browser through a local server bound to 127.0.0.1, at desktop width in dark mode and at phone width in light mode. Look at one card of each type selected and checked: radio and checkbox options, true/false toggles, matching selects, ordering buttons, calculation inputs, figures. Selected states must be clean fills with no clipped or doubled outline, nothing may overflow the phone width, and the confirmation bar must be hidden until opened. Stop the server and remove any temporary config you created afterwards.
3. Tell the user in one line that the build checks and the smoke test passed on the published page, and what you looked at in the browser.

## 5. When the user finishes an attempt

- Read the user's saved document from the artifact's database (collection `data/users/me`, document id = the quiz slug; its `json` field holds `{ attempt: { answers }, history }`, answers keyed by question id with `resp`, `earned`, `locked`, `revealed`, `guessed`) and read all comment threads on the artifact. Comments are notes for you: they mark terms the user doesn't know, guesses, or flawed questions.
- Report per-area scores and accuracy in a small table, then the patterns behind lost points (for example, missing formulas vs. concept mix-ups), specific facts to fix with the correct version stated briefly, guessed-but-correct questions, and the terms from the comments with short definitions. End with the user's strengths and one concrete next step (for example, a formula sheet or a targeted retest).
- Separate real mistakes from precision misses: if a numeric answer was right in method but fell outside the tolerance only through rounding, say so instead of counting it as a knowledge gap, and don't put the test's own precision rules into the revision notes.
- Fix any question the comments show is flawed (giveaway options, ambiguity, errors, unstated precision, a given-away formula, a prompt that asks nothing) in the quiz data, bump its `v`, rebuild, run the smoke test, and republish to the same URL. A flaw in how the page behaves is fixed in the template, for every test.
- When a comment points to a pattern rather than a one-off (the same flaw in several questions, or a flaw this skill's rules allowed), name the pattern, fix every question that has it, and propose the rule change for this skill in your reply.
- Don't treat odd-looking answers as low effort without asking; there may be a reason (for example, re-entering lost answers from memory).
