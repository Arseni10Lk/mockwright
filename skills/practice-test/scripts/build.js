// Build a practice-test page from the template and a quiz data file.
// Usage: node build.js <quiz.js|quiz.json> <out.html> [--allow-skew]
// The quiz file exports { meta, areas, questions } (see references/question-format.md).
// Exits 1 and prints every problem when the data breaks a rule; writes nothing in that case.
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith("--")));
const [srcPath, outPath] = args.filter(a => !a.startsWith("--"));
if (!srcPath || !outPath) { console.error("Usage: node build.js <quiz.js|quiz.json> <out.html> [--allow-skew]"); process.exit(2); }

const TEMPLATE = path.join(__dirname, "..", "assets", "template.html");
const quiz = srcPath.endsWith(".json") ? JSON.parse(fs.readFileSync(srcPath, "utf8")) : require(path.resolve(srcPath));

const errors = [], warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
const strip = s => String(s == null ? "" : s).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&[a-z#0-9]+;/gi, "x").replace(/\s+/g, " ").trim();
const norm = s => strip(s).toLowerCase().replace(/\s+/g, "");
const isStr = s => typeof s === "string" && strip(s).length > 0;
const TYPES = ["mcq", "multi", "tf", "match", "order", "calc", "open"];
const OPEN_TASK = /\b(explain|define|describe|compare|derive|give|state|list|justify|discuss|outline|sketch|show|prove|calculate|estimate)\b/i;
const INSTRUCTION = /^(select|match|put|order|sort|mark|decide|choose|pick|classify|indicate|identify|arrange|rank|label|assign)\b/i;

// ---------- meta & areas ----------
const meta = quiz.meta || {};
if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(meta.slug || "")) err("meta.slug", "required, lowercase letters, digits and hyphens (it names the saved account document)");
if (!isStr(meta.title)) err("meta.title", "required (2–4 word page name)");
const areas = quiz.areas || [];
if (!Array.isArray(areas) || !areas.length) err("areas", "at least one area is required");
const areaIds = new Set();
areas.forEach((a, i) => {
  if (!isStr(a.id) || !isStr(a.name)) err(`areas[${i}]`, "needs id and name");
  if (areaIds.has(a.id)) err(`areas[${i}]`, `duplicate id ${a.id}`);
  areaIds.add(a.id);
});

// ---------- questions ----------
const qs = quiz.questions || [];
if (!Array.isArray(qs) || !qs.length) err("questions", "at least one question is required");
const ids = new Set();
const globalBan = (meta.noGiveaway || []).map(norm).filter(Boolean);
const rankCounts = { long: 0, mid: 0, short: 0 };

function checkQuestionText(where, text) {
  const t = strip(text);
  if (!t) return err(where, "empty prompt");
  return t;
}
function endsWithQ(s) { return /\?\s*$/.test(strip(s)); }

function lengthRank(q, options, correct) {
  const L = options.map(o => strip(o).length);
  const sorted = [...L].sort((a, b) => b - a);
  const avg = v => (sorted.indexOf(v) + sorted.lastIndexOf(v)) / 2;
  correct.forEach(c => {
    const rel = L.length > 1 ? avg(L[c]) / (L.length - 1) : 0.5;
    rankCounts[rel < 1 / 3 ? "long" : rel > 2 / 3 ? "short" : "mid"]++;
  });
}

qs.forEach((q, n) => {
  const w = q && q.id ? q.id : `questions[${n}]`;
  if (!q || typeof q !== "object") return err(w, "not an object");
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(q.id || "")) err(w, "id must be 1–20 letters, digits, - or _");
  if (ids.has(q.id)) err(w, "duplicate id");
  ids.add(q.id);
  if (!Number.isInteger(q.v) || q.v < 1) err(w, "v (content version) must be an integer ≥ 1; bump it whenever the question's content changes");
  if (!TYPES.includes(q.type)) return err(w, `type must be one of ${TYPES.join(", ")}`);
  if (!areaIds.has(q.area)) err(w, `area ${q.area} is not defined in areas`);
  if (!isStr(q.topic)) err(w, "topic is required (the focus list groups mistakes by topic)");
  if (!isStr(q.explain)) err(w, "explain is required (why right is right and why tempting wrong answers are wrong)");
  const prompt = checkQuestionText(w, q.prompt);

  // Every question must ask something.
  if (prompt) {
    if (q.type === "open" || q.type === "calc") {
      if (q.type === "open" && !/\?/.test(prompt) && !OPEN_TASK.test(prompt)) err(w, "an open question must ask a question ('?') or set a task (Explain, Define, Describe, Compare, Derive …)");
    } else if (!/\?/.test(prompt) && !prompt.split(/(?<=[.:;])\s+/).some(x => INSTRUCTION.test(x))) {
      err(w, "the prompt must ask a question (contain '?') or contain a sentence that opens with an instruction (Select, Match, Put, Mark …)");
    }
  }

  // Collect every text the student sees before answering, for the giveaway check.
  const visible = [q.prompt, q.figure];
  const pos = n => Number.isInteger(n) && n >= 0;
  switch (q.type) {
    case "mcq":
      if (!Array.isArray(q.options) || q.options.length < 3) err(w, "mcq needs at least 3 options");
      else if (!pos(q.correct) || q.correct >= q.options.length) err(w, "correct must index an option");
      else lengthRank(q, q.options, [q.correct]);
      visible.push(...(q.options || []));
      break;
    case "multi":
      if (!Array.isArray(q.options) || q.options.length < 4) err(w, "multi needs at least 4 options");
      else if (!Array.isArray(q.correct) || !q.correct.length || q.correct.some(c => !pos(c) || c >= q.options.length) || new Set(q.correct).size !== q.correct.length) err(w, "correct must be a non-empty list of distinct option indices");
      else { if (q.correct.length === q.options.length) warn(w, "every option is correct"); lengthRank(q, q.options, q.correct); }
      visible.push(...(q.options || []));
      break;
    case "tf":
      if (!Array.isArray(q.items) || q.items.length < 2) err(w, "tf needs at least 2 statements");
      else q.items.forEach((it, i) => { if (!isStr(it.s) || typeof it.a !== "boolean") err(w, `items[${i}] needs s (statement) and a (true/false)`); });
      if (Array.isArray(q.items) && q.items.length >= 3 && (q.items.every(it => it.a) || q.items.every(it => !it.a))) warn(w, "all statements have the same truth value");
      visible.push(...(q.items || []).map(it => it.s));
      break;
    case "match":
      if (!Array.isArray(q.left) || q.left.length < 2 || !Array.isArray(q.right)) err(w, "match needs left (≥2) and right lists");
      else {
        if (!Array.isArray(q.answer) || q.answer.length !== q.left.length || q.answer.some(a => !pos(a) || a >= q.right.length)) err(w, "answer must give one right-index per left item");
        else if (new Set(q.answer).size !== q.answer.length) warn(w, "two left items share the same right item");
        if (q.right.length <= q.left.length) warn(w, "add one or two unused right-hand options so the last match is not free");
      }
      visible.push(...(q.left || []), ...(q.right || []));
      break;
    case "order":
      if (!Array.isArray(q.items) || q.items.length < 3) err(w, "order needs at least 3 items, listed in the correct order");
      visible.push(...(q.items || []));
      break;
    case "calc":
      if (!Array.isArray(q.parts) || !q.parts.length) { err(w, "calc needs parts"); break; }
      q.parts.forEach((p, i) => {
        const pw = `${w} part ${p.label || i + 1}`;
        if (!isStr(p.text)) err(pw, "text is required");
        else if (!endsWithQ(p.text)) err(pw, "each part must be a complete question ending with '?' (say exactly what to give)");
        if (typeof p.ans !== "number" || !isFinite(p.ans)) err(pw, "ans must be a finite number");
        if (!p.int) {
          if (typeof p.tol !== "number" || !(p.tol > 0)) err(pw, "tol (> 0) is required unless int: true");
          else if (!p.abs && p.tol > 0.1) warn(pw, `relative tolerance ±${p.tol * 100}% is very loose`);
          if (!Number.isInteger(p.sig || 3)) err(pw, "sig must be an integer");
        } else if (!Number.isInteger(p.ans)) err(pw, "int: true needs an integer ans");
        if (p.wrong) [].concat(p.wrong).forEach(v => {          // common wrong answers must fall outside the tolerance
          const d = p.int ? 0 : (p.abs ? p.tol : Math.abs(p.ans) * p.tol);
          if (Math.abs(v - p.ans) <= d + 1e-12) err(pw, `the common wrong answer ${v} falls inside the tolerance`);
        });
        visible.push(p.text);
      });
      break;
    case "open":
      if (!Array.isArray(q.rubric) || q.rubric.length < 3) err(w, "open needs a rubric of at least 3 elements (4–6 recommended)");
      else q.rubric.forEach((r, i) => {
        if (!isStr(r.text) || !(r.pts > 0)) err(w, `rubric[${i}] needs text and pts > 0`);
        if (!Array.isArray(r.keys) || !r.keys.length) err(w, `rubric[${i}] needs keys (specific terms used to pre-tick it)`);
        else r.keys.forEach(k => { if (String(k).trim().length < 3) err(w, `rubric[${i}] key "${k}" is too short to be specific`); });
      });
      if (!isStr(q.model)) err(w, "open needs a model answer");
      break;
  }

  // Test recall, not reading: what the question assesses must not appear in anything shown before answering.
  const banned = [...globalBan, ...(q.noGiveaway || []).map(norm)].filter(Boolean);
  if (q.type === "calc" && !(q.noGiveaway && q.noGiveaway.length) && !q.formulaGiven) warn(w, "calc without noGiveaway: list the formula(s) it tests so the build can check they are not in the prompt");
  const seen = norm(visible.filter(Boolean).join(" "));
  banned.forEach(b => { if (b.length >= 3 && seen.includes(b)) err(w, `the prompt or options give away "${b}", which this question assesses`); });
});

// Option-length balance across the test.
const totalRanked = rankCounts.long + rankCounts.mid + rankCounts.short;
let skew = false;
if (totalRanked >= 10) {
  ["long", "short"].forEach(k => { if (rankCounts[k] / totalRanked > 0.5) skew = true; });
  if (skew) {
    const msg = `correct options are skewed by length (long ${rankCounts.long}, mid ${rankCounts.mid}, short ${rankCounts.short}); rewrite option sets`;
    if (flags.has("--allow-skew")) warn("options", msg); else err("options", msg);
  }
}

// ---------- report & output ----------
const byArea = {};
qs.forEach(q => { if (!q || !q.type) return; const k = q.area; byArea[k] = byArea[k] || {}; byArea[k][q.type] = (byArea[k][q.type] || 0) + 1; });
console.log("Structure (from the data, nothing is fixed):");
areas.forEach(a => console.log(`  ${a.id} ${a.name}: ${Object.entries(byArea[a.id] || {}).map(([t, c]) => `${c} ${t}`).join(", ") || "no questions"}`));
console.log(`Correct-option length ranks: long ${rankCounts.long}, mid ${rankCounts.mid}, short ${rankCounts.short}`);
warnings.forEach(m => console.log("WARN  " + m));
if (errors.length) { errors.forEach(m => console.log("ERROR " + m)); console.log(`BUILD FAILED: ${errors.length} error(s)`); process.exit(1); }

const tpl = fs.readFileSync(TEMPLATE, "utf8");
const escHtml = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const data = JSON.stringify({ meta, areas, questions: qs }, null, 1).replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
if (!tpl.includes("/*@@QUIZ_DATA@@*/") || !tpl.includes("@@TITLE@@")) { console.log("BUILD FAILED: template placeholders missing"); process.exit(1); }
const html = tpl.replace("@@TITLE@@", escHtml(meta.title)).replace("/*@@QUIZ_DATA@@*/", () => "const QUIZ = " + data + ";");
const missing = qs.filter(q => !html.includes(JSON.stringify(q.id)));
if (missing.length) { console.log("BUILD FAILED: ids missing from output: " + missing.map(q => q.id).join(", ")); process.exit(1); }
fs.writeFileSync(outPath, html);
// A local preview copy wrapped like the published page (charset, mobile viewport, reset), for the real-browser check.
const SKELETON_HEAD = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]{display:none!important}</style></head><body>';
const previewPath = outPath.replace(/\.html?$/i, "") + ".preview.html";
fs.writeFileSync(previewPath, SKELETON_HEAD + html + "</body></html>");
console.log(`Built ${outPath}: ${qs.length} questions in ${areas.length} area(s), ${(html.length / 1024).toFixed(1)} KB (publish this file)`);
console.log(`Preview copy for a local browser check: ${previewPath} (do not publish it)`);
