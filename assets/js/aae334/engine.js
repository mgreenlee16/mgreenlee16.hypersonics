/*
 * engine.js — AAE 334 exam-review engine (practice exams, topic drill, progress).
 *
 * Generators register with AQ.register(id, { title, group, part: "I" | "II", exam }, gen).
 * gen(R) returns one problem:
 *   { type: "mc",    q, choices: [html], answer: k, pts, sol }
 *   { type: "multi", q, choices: [html], answers: [k...], pts, sol }        (circle all that apply; all-or-nothing)
 *   { type: "table", q, rows: [html], cols: [html], answers: [colIndex...], pts, sol }   (credit per row)
 *   { type: "match", q, items: [html], options: [label], answers: [optIndex...], pts, sol } (all-or-nothing)
 *   { type: "num",   q, parts: [{ label, ans, unit, tol, pts }], sol }       (credit per part)
 * plus optional verify(): boolean, used by tests/validate-334.js.
 * Numerical answers accept "1.234e5", "1.234x10^5", "3/4", "sqrt(2)", "pi/4", "2*287*300".
 */
(function (root) {
  "use strict";
  const TOPICS = {}, ORDER = [];

  // ---------- random helpers ----------
  const R = {
    rnd: Math.random,
    int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    u: (a, b, step = 0.01) => +(a + Math.round((Math.random() * (b - a)) / step) * step).toFixed(8),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    sample(arr, n) { return R.shuffle(arr).slice(0, n); },
  };
  function register(id, meta, gen) { TOPICS[id] = Object.assign({ id, gen }, meta); ORDER.push(id); }

  // ---------- number parsing (small recursive-descent evaluator; no eval) ----------
  function parseNum(str) {
    let s = String(str).trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, "").replace(/×/g, "x").replace(/−/g, "-");
    if (!s) return NaN;
    s = s.replace(/(\d)x10\^?/g, "$1e");                       // 1.2x10^5 → 1.2e5
    let i = 0;
    const peek = () => s[i], eat = c => (s[i] === c ? (i++, true) : false);
    function num() {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));
      if (!m) return NaN;
      i += m[0].length; return parseFloat(m[0]);
    }
    function atom() {
      if (eat("(")) { const v = expr(); eat(")"); return v; }
      if (s.startsWith("pi", i)) { i += 2; return Math.PI; }
      for (const f of ["sqrt", "ln", "log", "sin", "cos", "tan", "exp"]) if (s.startsWith(f, i)) {
        i += f.length; const v = atom();
        return { sqrt: Math.sqrt, ln: Math.log, log: Math.log10, sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp }[f](v);
      }
      return num();
    }
    function power() { let b = atom(); if (eat("^")) b = Math.pow(b, unary()); return b; }
    function unary() { if (eat("-")) return -unary(); if (eat("+")) return unary(); return power(); }
    function term() { let v = unary(); for (;;) { if (eat("*")) v *= unary(); else if (eat("/")) v /= unary(); else return v; } }
    function expr() { let v = term(); for (;;) { if (eat("+")) v += term(); else if (eat("-")) v -= term(); else return v; } }
    const v = expr();
    return i === s.length ? v : NaN;
  }
  const near = (v, ans, tol) => Math.abs(v - ans) <= (tol || 0.02) * Math.max(Math.abs(ans), 1e-12) + 1e-12;

  // ---------- progress (localStorage) ----------
  const LS = {
    get(k, d = null) { try { const v = localStorage.getItem("aae334." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("aae334." + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  function record(id, frac) {
    const s = LS.get("t." + id, { n: 0, sum: 0, h: [] });
    s.n++; s.sum += frac; s.h.push(+frac.toFixed(2)); if (s.h.length > 20) s.h.shift();
    LS.set("t." + id, s);
  }
  const stats = id => LS.get("t." + id, { n: 0, sum: 0, h: [] });

  // ---------- problem construction ----------
  function make(id) {
    const T = TOPICS[id];
    for (let k = 0; k < 25; k++) {
      try { const p = T.gen(R); if (p) { p.topic = id; p.pts = p.pts || (p.parts ? p.parts.reduce((a, x) => a + (x.pts || 0), 0) : 2); return p; } }
      catch (e) { if (k === 24) throw e; }
    }
    return null;
  }
  const typeset = el => { if (root.UI && root.UI.typeset) root.UI.typeset(el); };
  const letters = "abcdefghij";

  function inputsHTML(p, uid) {
    if (p.type === "mc" || p.type === "multi") {
      return `<ol class="aq-choices" type="a">${p.choices.map((c, k) => `<li><button type="button" class="aq-ch" data-k="${k}"><span class="lt">${letters[k]})</span> <span>${c}</span></button></li>`).join("")}</ol>` +
        (p.type === "multi" ? `<p class="aq-hint">Circle all that apply; all must be correct.</p>` : "");
    }
    if (p.type === "table") {
      return `<div class="aq-tablewrap"><table class="data text aq-trend"><thead><tr><th>Quantity</th>${p.cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${p.rows.map((r, i) =>
        `<tr><td>${r}</td>${p.cols.map((c, k) => `<td class="aq-cell"><input type="radio" name="${uid}-r${i}" value="${k}" aria-label="${c}"></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    }
    if (p.type === "match") {
      return `<div class="aq-match">${p.items.map((it, i) => `<label><span>${it}</span><select data-i="${i}"><option value="">—</option>${p.options.map((o, k) => `<option value="${k}">${o}</option>`).join("")}</select></label>`).join("")}</div>`;
    }
    return `<div class="aq-parts">${p.parts.map((pt, k) => `<label><span>${pt.label}${pt.pts ? ` <em>[${pt.pts} pts]</em>` : ""}</span><span class="aq-inrow"><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-k="${k}">${pt.unit ? `<span class="aq-unit">${pt.unit}</span>` : ""}</span></label>`).join("")}</div>`;
  }
  // wire selection behaviour (no grading)
  function wireInputs(box, p) {
    if (p.type === "mc" || p.type === "multi") box.querySelectorAll(".aq-ch").forEach(b => b.addEventListener("click", () => {
      if (box.dataset.graded) return;
      if (p.type === "mc") box.querySelectorAll(".aq-ch").forEach(x => x.classList.toggle("sel", x === b));
      else b.classList.toggle("sel");
    }));
  }
  // grade one problem inside its box; returns earned points
  function grade(box, p) {
    box.dataset.graded = "1";
    let earned = 0;
    if (p.type === "mc" || p.type === "multi") {
      const btns = [...box.querySelectorAll(".aq-ch")], sel = btns.map(b => b.classList.contains("sel"));
      const right = p.type === "mc" ? [p.answer] : p.answers;
      btns.forEach((b, k) => { if (right.includes(k)) b.classList.add("right"); else if (sel[k]) b.classList.add("wrong"); });
      const ok = btns.every((b, k) => sel[k] === right.includes(k));
      earned = ok ? p.pts : 0;
    } else if (p.type === "table") {
      let good = 0;
      p.rows.forEach((r, i) => {
        const radios = [...box.querySelectorAll(`input[name$="-r${i}"]`)], v = radios.findIndex(x => x.checked);
        radios.forEach((x, k) => { const td = x.parentNode; td.classList.toggle("right", k === p.answers[i]); td.classList.toggle("wrong", x.checked && k !== p.answers[i]); x.disabled = true; });
        if (v === p.answers[i]) good++;
      });
      earned = p.pts * good / p.rows.length;
    } else if (p.type === "match") {
      let all = true;
      box.querySelectorAll(".aq-match select").forEach((s, i) => { const ok = +s.value === p.answers[i] && s.value !== ""; s.classList.toggle("ok", ok); s.classList.toggle("no", !ok); if (!ok) all = false; s.disabled = true; });
      earned = all ? p.pts : 0;
    } else {
      box.querySelectorAll(".aq-parts input").forEach((inp, k) => {
        const pt = p.parts[k], v = parseNum(inp.value), ok = isFinite(v) && near(v, pt.ans, pt.tol);
        inp.classList.toggle("ok", ok); inp.classList.toggle("no", !ok); inp.readOnly = true;
        const exp = document.createElement("span"); exp.className = "aq-exp"; exp.textContent = ok ? "✓" : `answer: ${UI.fmt(pt.ans, 4)}`;
        inp.parentNode.appendChild(exp);
        if (ok) earned += pt.pts || 0;
      });
    }
    return earned;
  }
  const ptsTxt = x => (Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(1));

  // ---------- endless topic drill ----------
  function drill(target, opts = {}) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    const all = opts.ids ? opts.ids.filter(id => TOPICS[id]) : ORDER.filter(id => !opts.exam || TOPICS[id].exam === opts.exam);
    let active = all.slice(), cur = null, nS = 0, sumS = 0;
    const groups = [];
    all.forEach(id => { if (!groups.includes(TOPICS[id].group)) groups.push(TOPICS[id].group); });
    el.className = "aq aq-drill";
    el.innerHTML = `<div class="aq-head"><b>${opts.title || "Topic drill"}</b><span class="aq-stats"></span></div>
      <div class="aq-topics">${groups.map(g => `<span class="grp">${g}</span>` + all.filter(id => TOPICS[id].group === g).map(id => `<label><input type="checkbox" value="${id}" checked>${TOPICS[id].title}</label>`).join("")).join("")}
        <span class="aq-quick"><button type="button" data-f="I">Part I only</button><button type="button" data-f="II">Part II only</button><button type="button" data-f="all">All</button></span></div>
      <div class="aq-body"></div>`;
    const body = el.querySelector(".aq-body"), st = el.querySelector(".aq-stats");
    const upd = () => { st.textContent = nS ? `this session: ${ptsTxt(sumS)} / ${nS} problems' worth (${Math.round(100 * sumS / nS)}%)` : ""; };
    function fresh() {
      const id = R.pick(active); cur = make(id);
      const T = TOPICS[id];
      body.innerHTML = `<div class="aq-q" data-i="0"><div class="aq-num">${T.group} · ${T.title} · Part ${T.part} · ${ptsTxt(cur.pts)} pts</div><div class="aq-text">${cur.q}</div>${inputsHTML(cur, "dr" + Date.now())}
        <div class="aq-actions"><button type="button" class="primary aq-check">Check</button><button type="button" class="aq-next">New problem →</button><span class="aq-verdict"></span></div>
        <div class="aq-sol"><b>Solution</b>${cur.sol}</div></div>`;
      const box = body.querySelector(".aq-q");
      wireInputs(box, cur);
      box.querySelector(".aq-check").addEventListener("click", () => {
        if (box.dataset.graded) return;
        const e = grade(box, cur), frac = e / cur.pts;
        record(cur.topic, frac); nS++; sumS += frac; upd();
        const v = box.querySelector(".aq-verdict");
        v.textContent = frac > 0.999 ? `Correct: ${ptsTxt(e)}/${ptsTxt(cur.pts)} pts` : `${ptsTxt(e)}/${ptsTxt(cur.pts)} pts`;
        v.className = "aq-verdict " + (frac > 0.999 ? "good" : frac > 0 ? "warn" : "bad");
        box.querySelector(".aq-sol").classList.add("show");
        if (opts.onAnswer) opts.onAnswer();
      });
      box.querySelector(".aq-next").addEventListener("click", fresh);
      typeset(body);
    }
    const sync = () => { active = [...el.querySelectorAll(".aq-topics input:checked")].map(c => c.value); if (!active.length) active = all.slice(); };
    el.querySelectorAll(".aq-topics input").forEach(cb => cb.addEventListener("change", () => { sync(); if (cur && !active.includes(cur.topic)) fresh(); }));
    el.querySelectorAll(".aq-quick button").forEach(b => b.addEventListener("click", () => {
      el.querySelectorAll(".aq-topics input").forEach(cb => { cb.checked = b.dataset.f === "all" || TOPICS[cb.value].part === b.dataset.f; });
      sync(); fresh();
    }));
    upd(); fresh();
  }

  // ---------- practice exam in the format of the real exam ----------
  /*
   * exam(el, { exam: 2, title, header, partI: { target: 50 }, partII: [[ids...], ...] })
   * Part I draws qualitative items until about `target` points; Part II draws one problem from each list.
   */
  function exam(target, cfg) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    let probs = [], timer = null, t0 = 0, done = false;
    el.className = "aq aq-exam";
    el.innerHTML = `<div class="aq-bar">
        <button type="button" class="primary aq-new">Generate a new practice exam</button>
        <label>Format <select class="aq-fmt"><option value="full">Full exam: Part I + Part II (100 pts, 2 h)</option><option value="half">Half exam (≈55 pts, 1 h)</option><option value="I">Part I only (qualitative, ≈50 pts)</option><option value="II">Part II only (quantitative, ≈50 pts)</option></select></label>
        <label><input type="checkbox" class="aq-timed"> Timed</label><span class="aq-timer"></span>
        <button type="button" class="aq-print">Print</button></div>
      <div class="aq-exbody"><p class="aq-muted">Press the button to draw an exam. Each one is different: new numbers, new questions and a new order.</p></div>
      <div class="aq-history"></div>`;
    const body = el.querySelector(".aq-exbody"), timerEl = el.querySelector(".aq-timer");
    const hist = () => {
      const h = LS.get("hist." + cfg.exam, []);
      el.querySelector(".aq-history").innerHTML = h.length ? `<h3>Your past practice exams</h3><table class="data"><thead><tr><th>Date</th><th>Format</th><th>Score</th><th>Time</th></tr></thead><tbody>${h.slice(-10).reverse().map(r => `<tr><td>${r.d}</td><td>${r.f}</td><td>${r.s}</td><td>${r.t}</td></tr>`).join("")}</tbody></table>` : "";
    };
    function draw() {
      const fmt = el.querySelector(".aq-fmt").value, half = fmt === "half";
      const ids1 = ORDER.filter(id => TOPICS[id].exam === cfg.exam && TOPICS[id].part === "I");
      const p1 = [], p2 = [];
      if (fmt !== "II") {
        const goal = half ? cfg.partI.target / 2 : cfg.partI.target;
        let bag = R.shuffle(ids1), tot = 0, guard = 0;
        const counts = {};
        while (tot < goal - 1 && guard++ < 200) {
          if (!bag.length) bag = R.shuffle(ids1);
          const id = bag.pop();
          if ((counts[id] || 0) >= (TOPICS[id].maxPer || 3)) continue;
          const p = make(id);
          if (tot + p.pts > goal + 2 || p1.some(x => x.q === p.q)) continue;
          counts[id] = (counts[id] || 0) + 1; p1.push(p); tot += p.pts;
        }
        // keep the exam's order: concepts of wings first, then stability, then compressible flow
        p1.sort((a, b) => (TOPICS[a.topic].order || 0) - (TOPICS[b.topic].order || 0));
      }
      if (fmt !== "I") {
        const lists = half ? R.sample(cfg.partII, 2) : cfg.partII;
        lists.forEach(list => { const free = list.filter(id => !p2.some(p => p.topic === id)); p2.push(make(R.pick(free.length ? free : list))); });
        if (half) { const s = p2.reduce((a, p) => a + p.pts, 0); if (s > 60) p2.pop(); }
      }
      probs = p1.concat(p2); done = false;
      const tot = probs.reduce((a, p) => a + p.pts, 0);
      let n = 0;
      const block = (list, part) => list.map(p => { const i = n++; return `<div class="aq-q" data-i="${i}"><div class="aq-num">${i + 1}. [${ptsTxt(p.pts)} pts] <span class="aq-tag">${TOPICS[p.topic].title}</span></div><div class="aq-text">${p.q}</div>${inputsHTML(p, "ex" + i)}<div class="aq-verdict"></div><div class="aq-sol"><b>Solution</b>${p.sol}</div></div>`; }).join("");
      body.innerHTML = `<div class="aq-cover">${cfg.header}<p><b>Total: ${ptsTxt(tot)} points.</b> ${fmt === "full" ? "Time limit: 2 hours." : half ? "Suggested time: 1 hour." : "Suggested time: 1 hour."}</p></div>` +
        (p1.length ? `<h3 class="aq-part">Part I: Qualitative</h3><p class="aq-muted">Circle the letter of the correct response, check the correct box, or write the answer in the blank.</p>${block(p1)}` : "") +
        (p2.length ? `<h3 class="aq-part">Part II: Quantitative</h3><p class="aq-muted">Show your work on paper, then enter your final answers. Keep at least 4 significant digits; answers within about 2% (the precision of the nearest table entry) are accepted. When using the tables, use the closest entry; do not interpolate.</p>${block(p2)}` : "") +
        `<div class="aq-bar"><button type="button" class="primary aq-submit">Submit and grade</button><span class="aq-score"></span></div>`;
      body.querySelectorAll(".aq-q").forEach(box => wireInputs(box, probs[+box.dataset.i]));
      body.querySelector(".aq-submit").addEventListener("click", submit);
      typeset(body);
      clearInterval(timer); timerEl.textContent = ""; t0 = Date.now();
      if (el.querySelector(".aq-timed").checked) {
        const lim = (fmt === "full" ? 120 : 60) * 60;
        timer = setInterval(() => {
          const left = Math.max(0, lim - Math.round((Date.now() - t0) / 1000));
          timerEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left`;
          if (!left) { clearInterval(timer); submit(); }
        }, 1000);
      }
      body.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    function submit() {
      if (done) return;
      done = true; clearInterval(timer);
      let sc = 0, tot = 0, s1 = 0, t1 = 0;
      body.querySelectorAll(".aq-q").forEach(box => {
        const p = probs[+box.dataset.i], e = grade(box, p);
        sc += e; tot += p.pts; if (TOPICS[p.topic].part === "I") { s1 += e; t1 += p.pts; }
        record(p.topic, e / p.pts);
        const v = box.querySelector(".aq-verdict");
        v.textContent = `${ptsTxt(e)} / ${ptsTxt(p.pts)} pts`; v.className = "aq-verdict " + (e >= p.pts - 1e-9 ? "good" : e > 0 ? "warn" : "bad");
        box.querySelector(".aq-sol").classList.add("show");
      });
      const mins = Math.round((Date.now() - t0) / 60000);
      body.querySelector(".aq-score").innerHTML = `<b>Score: ${ptsTxt(sc)} / ${ptsTxt(tot)}</b> (${Math.round(100 * sc / tot)}%)` + (t1 && tot > t1 ? ` · Part I ${ptsTxt(s1)}/${ptsTxt(t1)} · Part II ${ptsTxt(sc - s1)}/${ptsTxt(tot - t1)}` : "") + ` · ${mins} min`;
      const h = LS.get("hist." + cfg.exam, []);
      h.push({ d: new Date().toLocaleDateString(), f: el.querySelector(".aq-fmt").selectedOptions[0].textContent.split(":")[0].split("(")[0].trim(), s: `${ptsTxt(sc)}/${ptsTxt(tot)} (${Math.round(100 * sc / tot)}%)`, t: `${mins} min` });
      LS.set("hist." + cfg.exam, h.slice(-30)); hist();
      if (cfg.onGrade) cfg.onGrade();
    }
    el.querySelector(".aq-new").addEventListener("click", draw);
    el.querySelector(".aq-print").addEventListener("click", () => { document.body.classList.add("printing-exam"); window.print(); setTimeout(() => document.body.classList.remove("printing-exam"), 500); });
    hist();
  }

  // ---------- per-topic progress ----------
  function mastery(target, exam) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return { render() {} };
    const render = () => {
      const ids = ORDER.filter(id => TOPICS[id].exam === exam);
      el.innerHTML = `<div class="mastery">${ids.map(id => {
        const s = stats(id), pct = s.h.length ? Math.round(100 * s.h.reduce((a, b) => a + b, 0) / s.h.length) : 0;
        return `<div><b>${TOPICS[id].title}</b><br><span class="aq-muted">${s.n ? `${s.n} tried · last ${s.h.length}: ${pct}%` : "not tried yet"}</span><div class="bar"><span style="width:${pct}%"></span></div></div>`;
      }).join("")}</div>`;
    };
    render();
    return { render };
  }

  const AQ = { register, drill, exam, mastery, make, grade, parseNum, near, TOPICS, ORDER, R, LS };
  if (typeof module !== "undefined" && module.exports) module.exports = AQ;
  else root.AQ = AQ;
})(typeof window !== "undefined" ? window : globalThis);
