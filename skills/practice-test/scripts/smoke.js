// Smoke test for a built (or published) practice-test page.
// Usage: node smoke.js <page.html> [--quick]
// Needs jsdom@24 installed in the current folder or next to this script (npm install jsdom@24).
// --quick skips the 10-second confirmation-bar wait.
"use strict";
const fs = require("fs");
const { JSDOM, VirtualConsole } = require(require.resolve("jsdom", { paths: [process.cwd(), __dirname] }));

const file = process.argv[2];
const quick = process.argv.includes("--quick");
if (!file) { console.error("Usage: node smoke.js <page.html> [--quick]"); process.exit(2); }
const html = fs.readFileSync(file, "utf8");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, ok, info) => results.push([name, !!ok, info || ""]);

/* ---------- simulated artifact storage ----------
   One database for the artifact, keyed by document path, like the real one. Each viewer's progress lives at
   data/users/<their id>/<slug>, so a second person who opens a shared page starts blank. A "device" is one open
   page; two devices of the same user share that user's document (laptop + phone). */
function makeDb() {
  const db = { docs: {}, subs: {}, writes: {} };
  db.ref = path => {
    const snap = () => ({ exists: path in db.docs, data: () => (path in db.docs ? JSON.parse(JSON.stringify(db.docs[path])) : undefined) });
    return {
      path,
      get: async () => snap(),
      set: async d => { db.writes[path] = (db.writes[path] || 0) + 1; db.docs[path] = JSON.parse(JSON.stringify(d)); setTimeout(() => (db.subs[path] || []).forEach(f => f(snap())), 30); },
      onSnapshot: next => { (db.subs[path] = db.subs[path] || []).push(next); setTimeout(() => next(snap()), 15); return () => { db.subs[path] = db.subs[path].filter(f => f !== next); }; }
    };
  };
  return db;
}
function makeStore(db, userId) {
  const s = { db, userId };
  s.claude = { use: async n => (n === "db" ? { collection: c => ({ doc: id => db.ref(c + "/" + id) }) } : n === "user" ? { id: async () => userId } : null) };
  s.paths = () => Object.keys(db.docs).filter(p => p.startsWith("data/users/" + userId + "/"));
  s.saved = () => { const p = s.paths()[0]; return p ? JSON.parse(db.docs[p].json) : null; };
  Object.defineProperty(s, "writes", { get: () => s.paths().reduce((n, p) => n + (db.writes[p] || 0), 0) });
  return s;
}

/* ---------- open the page as one device ---------- */
async function openDevice({ store, storage } = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => errors.push(String((e && (e.stack || e.message)) || e)));
  vc.on("error", e => errors.push("console.error: " + e));
  const dom = new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc, url: "https://artifact.test/",
    beforeParse(w) {
      w.scrollTo = () => {};
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.HTMLElement.prototype.scrollIntoView = function () {};
      w.addEventListener("error", e => errors.push("window error: " + e.message));
      try { w.localStorage.clear(); if (storage) Object.entries(storage).forEach(([k, v]) => w.localStorage.setItem(k, v)); } catch (e) { errors.push("storage: " + e.message); }
      if (store) w.claude = store.claude;
    }
  });
  const w = dom.window, d = w.document;
  await sleep(350);
  const dev = {
    w, d, errors,
    Q: w.eval("QUIZ"),
    answered: () => Number(d.getElementById("sAnswered").textContent),
    total: () => d.getElementById("sTotal").textContent,
    status: () => d.getElementById("sSave").textContent,
    history: () => d.querySelectorAll("#histBody li").length,
    card: id => d.getElementById("card-" + id),
    storage: () => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; },
    close: () => w.close()
  };
  return dev;
}
const fire = (w, el, ev) => el.dispatchEvent(new w.Event(ev, { bubbles: true }));
const text = (d, h) => { const t = d.createElement("div"); t.innerHTML = h; return t.textContent.trim(); };

/* Answer question q correctly through the page's own controls, then check it. */
async function answerCorrectly(dev, q) {
  const { w, d } = dev, id = q.id, card = () => dev.card(id);
  switch (q.type) {
    case "mcq": { const r = d.getElementById(`r-${id}-${q.correct}`); r.checked = true; fire(w, r, "change"); break; }
    case "multi": q.correct.forEach(c => { const r = d.getElementById(`m-${id}-${c}`); r.checked = true; fire(w, r, "change"); }); break;
    case "tf": q.items.forEach((it, i) => { const r = d.getElementById(`t-${id}-${i}-${it.a ? "t" : "f"}`); r.checked = true; fire(w, r, "change"); }); break;
    case "match": q.answer.forEach((a, i) => { const s = d.getElementById(`s-${id}-${i}`); s.value = String(a); fire(w, s, "change"); }); break;
    case "order":
      for (let pos = 0; pos < q.items.length; pos++) {
        for (let guard = 0; guard < 60; guard++) {
          const texts = [...card().querySelectorAll(".oitem")].map(li => li.children[1].textContent.trim());
          const cur = texts.indexOf(text(d, q.items[pos]));
          if (cur === pos) break;
          card().querySelector(`[data-mv='${cur}u']`).click();
        }
      }
      break;
    case "calc": q.parts.forEach((p, i) => { const inp = d.getElementById(`c-${id}-${i}`); inp.value = String(p.ans); fire(w, inp, "input"); }); break;
    case "open": {
      const ta = d.getElementById(`o-${id}`);
      ta.value = "Answer covering: " + q.rubric.map(r => r.keys[0]).join("; ") + ".";
      fire(w, ta, "input");
      card().querySelector("[data-role=check]").click(); await sleep(20);
      card().querySelector("[data-role=confirm]").click(); await sleep(20);
      return;
    }
  }
  const btn = card().querySelector("[data-role=check]");
  if (!btn || btn.disabled) throw new Error(`${id}: Check button disabled after answering`);
  btn.click(); await sleep(20);
}
const earned = (dev, id) => { const doc = dev.w.__ptb.doc(); const a = doc.attempt.answers[id]; return a && a.locked ? a.earned : null; };

(async () => {
  /* ===== single device ===== */
  const A0 = await openDevice();
  const Q = A0.Q, N = Q.questions.length;
  const pts = q => ({ mcq: q.pts || 1, multi: q.pts || 2, tf: (q.items || []).length, match: (q.left || []).length, order: q.pts || 2,
    calc: (q.parts || []).reduce((s, p) => s + (p.pts || 1), 0), open: (q.rubric || []).reduce((s, r) => s + r.pts, 0) })[q.type];
  check("1 no script errors on load", A0.errors.length === 0, A0.errors.join(" | "));
  const cards = A0.d.querySelectorAll(".qcard");
  check("2 one card per question", cards.length === N, `${cards.length} cards, ${N} questions`);
  const bad = [];
  cards.forEach(c => { const p = c.querySelector(".qprompt"); const ctl = c.querySelectorAll("input:not([id^=g-]),select,textarea,.mv button"); if (!p || !p.textContent.trim() || !ctl.length) bad.push(c.id); });
  check("3 every card shows a prompt and answer controls", bad.length === 0, bad.join(","));
  const hintBad = [];
  Q.questions.filter(q => q.type === "calc").forEach(q => q.parts.forEach((p, i) => {
    const exp = p.int ? "±0" : (p.abs ? "±" + p.tol + " absolute" : "±" + +(p.tol * 100).toFixed(4) + "%");
    const inp = A0.d.getElementById(`c-${q.id}-${i}`), hint = inp && inp.parentElement.querySelector(".hint");
    if (!hint || hint.getAttribute("data-tol") !== exp || !hint.textContent.includes(exp)) hintBad.push(`${q.id}.${i}`);
  }));
  check("4 every calculation input shows the grader's tolerance", hintBad.length === 0, hintBad.join(","));
  const qOk = [];
  Q.questions.forEach(q => {
    if (q.type === "calc") q.parts.forEach(p => { if (!/\?\s*$/.test(text(A0.d, p.text))) qOk.push(q.id); });
    else if (q.type === "open" && !/\?/.test(text(A0.d, q.prompt)) && !/\b(explain|define|describe|compare|derive|give|state|list|justify|discuss|outline|sketch|show|prove|calculate|estimate)\b/i.test(text(A0.d, q.prompt))) qOk.push(q.id);
  });
  check("5 every calculation part asks a question and every open prompt sets a task", qOk.length === 0, qOk.join(","));

  const types = [...new Set(Q.questions.map(q => q.type))];
  const sample = types.map(t => Q.questions.find(q => q.type === t));
  const gradeBad = [];
  for (const q of sample) { try { await answerCorrectly(A0, q); } catch (e) { gradeBad.push(e.message); continue; } if (earned(A0, q.id) !== pts(q)) gradeBad.push(`${q.id} (${q.type}) earned ${earned(A0, q.id)} of ${pts(q)}`); }
  const expTotal = sample.reduce((s, q) => s + pts(q), 0);
  check(`6 a correct answer earns full points for every type present (${types.join(", ")})`, gradeBad.length === 0, gradeBad.join(" | "));
  check("7 checking updates the score strip", A0.answered() === sample.length && A0.total().startsWith(String(expTotal) + " "), `answered ${A0.answered()}, total "${A0.total()}"`);
  // wrong numeric answer shows the accepted range
  const cq = Q.questions.find(q => q.type === "calc" && !sample.includes(q) && q.parts.some(p => !p.int));
  if (cq) {
    cq.parts.forEach((p, i) => { const inp = A0.d.getElementById(`c-${cq.id}-${i}`); inp.value = String(p.ans * 1.5 + 1); fire(A0.w, inp, "input"); });
    A0.card(cq.id).querySelector("[data-role=check]").click(); await sleep(20);
    const msgs = [...A0.card(cq.id).querySelectorAll(".cres")].map(x => x.textContent);
    check("8 a wrong decimal answer shows the accepted range", msgs.some(m => m.includes("accepted")), msgs.join(" | "));
  }
  const afterAnswers = A0.storage();
  const histBefore = A0.history();
  A0.d.getElementById("btnNew").click(); await sleep(50);
  const bar = A0.d.getElementById("confirmBar");
  if (!quick) await sleep(10500);
  check(quick ? "9 confirmation bar opens (10 s wait skipped)" : "9 confirmation bar is still open after 10 s", !bar.hidden && /Archive this attempt/.test(A0.d.getElementById("confirmMsg").textContent));
  A0.d.getElementById("confirmYes").click(); await sleep(80);
  let empty2 = 0; A0.d.querySelectorAll(".qcard").forEach(c => { if (!c.querySelector(".qprompt").textContent.trim()) empty2++; });
  check("10 archiving adds to history, clears answers and re-renders every card", A0.history() === histBefore + 1 && A0.answered() === 0 && A0.d.querySelectorAll(".qcard").length === N && empty2 === 0 && bar.hidden, `history ${histBefore}→${A0.history()}`);
  A0.d.getElementById("btnReset").click(); await sleep(20);
  A0.d.dispatchEvent(new A0.w.KeyboardEvent("keydown", { key: "Escape" })); await sleep(20);
  check("11 Escape closes the confirmation bar", bar.hidden);
  check("12 no account: status says this device only", /This device only/.test(A0.status()), A0.status());
  check("13 no script errors after interaction", A0.errors.length === 0, A0.errors.join(" | "));
  A0.close();
  const R = await openDevice({ storage: afterAnswers });
  const expectReload = sample.length + (cq ? 1 : 0);
  check("14 reload on the same device restores progress from browser storage", R.answered() === expectReload, `answered ${R.answered()} of ${expectReload}`);
  R.close();

  /* ===== sync between devices ===== */
  const autoQs = Q.questions.filter(q => q.type !== "open");
  if (autoQs.length < 3) { check("sync tests need 3 auto-graded questions", false, `only ${autoQs.length}`); }
  else {
    const [q1, q2, q3] = autoQs;
    const db = makeDb();
    const store = makeStore(db, "u_owner");
    const A = await openDevice({ store });
    check("S1 first device with an empty account reports synced", /Synced/.test(A.status()), A.status());
    await answerCorrectly(A, q1); await sleep(900);
    check("S2 an answer is written to the account", store.saved() && store.saved().attempt.answers[q1.id] && store.saved().attempt.answers[q1.id].locked, `writes ${store.writes}`);

    const B = await openDevice({ store });          // fresh phone: empty browser storage
    check("S3 a fresh device loads the account progress", B.answered() === 1 && earned(B, q1.id) === pts(q1), `answered ${B.answered()}, status ${B.status()}`);
    await answerCorrectly(B, q2); await sleep(900);
    const saved = store.saved().attempt.answers;
    check("S4 answering on the fresh device keeps the earlier answers", saved[q1.id] && saved[q2.id], Object.keys(saved).join(","));
    check("S5 the other open device receives the change live", A.answered() === 2, `device A answered ${A.answered()}`);

    await Promise.all([answerCorrectly(A, q3), (async () => {})()]);
    const qB = autoQs[3] || null;
    if (qB) await answerCorrectly(B, qB);
    await sleep(1600);
    const want = qB ? 4 : 3;
    check("S6 simultaneous answers on two devices both survive", A.answered() === want && B.answered() === want && Object.keys(store.saved().attempt.answers).filter(k => store.saved().attempt.answers[k].locked).length === want, `A ${A.answered()}, B ${B.answered()}`);

    A.d.getElementById("btnNew").click(); await sleep(20); A.d.getElementById("confirmYes").click(); await sleep(1200);
    check("S7 a new attempt on one device reaches the other", B.answered() === 0 && B.history() === 1 && A.history() === 1, `B answered ${B.answered()}, history A ${A.history()} B ${B.history()}`);
    await answerCorrectly(B, q1); await sleep(900);
    A.d.getElementById("btnReset").click(); await sleep(20); A.d.getElementById("confirmYes").click(); await sleep(1200);
    check("S8 reset on one device clears the other without archiving", B.answered() === 0 && B.history() === 1 && A.answered() === 0, `B answered ${B.answered()}, history ${B.history()}`);
    await answerCorrectly(A, q2); await sleep(900);
    const ownerBefore = JSON.stringify(store.saved());
    const other = makeStore(db, "u_someone_else");
    const C = await openDevice({ store: other });     // the page shared with another person
    check("S9 another person opening the shared page starts with a blank test", C.answered() === 0 && C.history() === 0, `answered ${C.answered()}, history ${C.history()}`);
    await answerCorrectly(C, q3); await sleep(900);
    const ownerPaths = store.paths(), otherPaths = other.paths();
    check("S10 their answers go to their own private document and never touch yours", JSON.stringify(store.saved()) === ownerBefore && otherPaths.length === 1 && ownerPaths.length === 1 && otherPaths[0] !== ownerPaths[0] && A.answered() === 1, `owner ${ownerPaths.join(",")} · other ${otherPaths.join(",")} · your device answered ${A.answered()}`);
    check("S11 progress is stored under data/users/<user id>/<slug>", ownerPaths[0] === "data/users/u_owner/" + Q.meta.slug, ownerPaths[0]);
    const errs = [...A.errors, ...B.errors, ...C.errors];
    check("S12 no script errors on any device", errs.length === 0, errs.join(" | "));
    A.close(); B.close(); C.close();
  }

  let fail = 0;
  results.forEach(([n, ok, info]) => { console.log((ok ? "PASS " : "FAIL ") + n + (info ? "  [" + info + "]" : "")); if (!ok) fail++; });
  console.log(fail ? `SMOKE FAILED: ${fail} check(s)` : "SMOKE PASSED");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log("CRASH " + (e && e.stack)); process.exit(2); });
