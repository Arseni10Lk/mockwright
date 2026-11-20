# MockWright

MockWright turns your course material into an interactive practice exam. Give Claude your slides, notes or topic list and tell it what the exam looks like; it writes a mock exam that tests what you actually have to recall on the day, publishes it as a private page you can use on your laptop and phone, and analyzes your attempt when you are done.

## What you get

- **Questions shaped like your exam.** The number of areas, questions and question types follows the real exam if you provide this data: single choice, select all, true/false, matching, ordering, multi-part calculations and open questions with a marking rubric and a model answer.
- **Questions that test recall, not reading.** A calculation never hands you the formula it is testing, every part asks an explicit question, and answer options are checked so that their length or wording does not give the right one away.
- **Instant marking.** Each question is marked when you check it, with an explanation of why the right answer is right and why the tempting wrong ones are wrong. Calculations show the formula, the substitution, the most common wrong setup and the accepted range.
- **A clear picture of where you stand.** A score strip with one bar per exam area, a "Where to focus" list of your weakest topics, an "I guessed" toggle so lucky guesses still count as topics to review, and a history of your attempts.
- **Fresh attempts.** Every new attempt reshuffles the options and the question order.
- **Progress that follows you.** Your answers sync privately through your Claude account, so you can start on your laptop and continue on your phone. If you share the page, each person gets their own blank test and never sees your answers.

## Requirements

- A Claude plan with artifacts, used in an environment where Claude can run commands.
- Node.js 18 or newer, and npm for the one-time test dependency.

## Install

**In Claude Code** (the command line, or the Code tab of the Claude desktop app), install straight from GitHub. On Claude Code 2.1.275 or later, type in a session:

```
/plugin install mockwright --marketplace Arseni10Lk/mockwright
```

On older versions, add the marketplace first, then install:

```
/plugin marketplace add Arseni10Lk/mockwright
/plugin install mockwright@mockwright
```

The same works from a terminal:

```bash
claude plugin marketplace add Arseni10Lk/mockwright
claude plugin install mockwright@mockwright
```

Start a new session afterwards. Claude uses MockWright on its own whenever you ask for a practice test or mock exam, and you can also call it directly with `/mockwright:practice-test`.

**From Claude's plugin directory:** once MockWright is listed there, you can install it with one click from the directory instead.

## How to use it

1. **Give Claude the material.** Point it to your slides, PDFs, notes or a topic list, for example: *"Make me a practice test for my deep learning exam from the PDFs in this folder."*
2. **Describe the exam.** Say what you know: how long it is, how it is scored, which question formats it uses, whether it is closed book, and any topics the lecturer has confirmed. Claude asks short questions only if something important is missing.
3. **Take the test.** Answer, check, and read the explanations. Tick "I guessed" whenever you were not sure, even if you were right.
4. **Leave comments.** Comment directly on the page wherever a question is unclear, a term is new to you, or a question seems wrong. Claude reads these comments.
5. **Ask for feedback.** Tell Claude you finished the attempt. It reads your saved answers and your comments and reports your score per area, the patterns behind lost points, the facts to fix, and one concrete next step. It also fixes any flawed question and republishes the page at the same link.
6. **Go again.** Start a new attempt for a reshuffled run; your earlier scores stay in the history.

## How I use it

I originally created it to prepare for exams in various engineering subjects from Environment Protection to Deep Learning and it greatly helped me in building understanding and identifying my weak spots. Through iterative changes I think it reached a point where it might be useful for anybody preparing for tests or exams.

## What MockWright runs, stores and connects to

- **Local scripts.** Claude runs `scripts/build.js` (checks the question data and builds the page) and `scripts/smoke.js` (an automated test of the page) with Node.js, in a scratch folder. They read only the quiz file and the page they are given.
- **One test dependency.** For the automated test, Claude installs `jsdom@24` from the npm registry into that scratch folder.
- **A temporary local server.** For a visual check of the page, Claude may start a web server bound to `127.0.0.1` on your machine, look at the page in its browser, and then stop the server.
- **Your page.** The test is published as a claude.ai artifact, private to you until you share it.
- **Your progress.** Answers are stored in the artifact's own database, in each viewer's private area (`data/users/<viewer id>/<test name>`), and cached in the browser. Claude reads your record only when you ask it to analyze an attempt.
- **Fonts.** The page loads its fonts from Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`). It makes no other network requests and has no analytics or tracking.

## Repository layout

```
.claude-plugin/plugin.json          plugin manifest
.claude-plugin/marketplace.json     lets Claude Code install the plugin straight from this repository
skills/practice-test/SKILL.md       how Claude writes, builds, tests and reviews a practice test
skills/practice-test/assets/        the page template (engine, styles, sync)
skills/practice-test/scripts/       build.js (data checks and build) and smoke.js (automated test)
skills/practice-test/references/    the question data format
skills/practice-test/examples/      a complete example quiz
```

## License and attribution

Copyright 2026 Arseni Lysak. Licensed under the [Apache License, Version 2.0](LICENSE).

You may use, change and share MockWright, including commercially. If you redistribute it or a work based on it, you must keep the copyright notice, include the license, state the changes you made, and carry the attributions in the [NOTICE](NOTICE) file.
