/*
 * ui.js — site chrome (top bar, γ, theme, text size), control wiring, presets, tabs, quizzes,
 * SVG plotting and math rendering. Every page sets <body data-root="./" or "../">.
 */
(function () {
  "use strict";
  const ROOT = document.body.dataset.root || "./";
  const store = {
    get(k, d) { try { const v = localStorage.getItem("hx." + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("hx." + k, v); } catch (e) { /* storage unavailable */ } },
  };

  // ---------- site map ----------
  const LESSONS = [
    { part: "Part I · One-dimensional compressible flow" },
    { slug: "isentropic", n: 1, title: "Compressible Flow & Isentropic Relations",
      blurb: "Thermodynamics of a perfect gas, entropy, compressibility, the speed of sound, total conditions and the isentropic relations.",
      tags: ["7 interactives", "worked examples", "self-check"] },
    { slug: "normal-shock", n: 2, title: "Normal Shock Waves",
      blurb: "Jump conditions, the Prandtl relation, the Hugoniot curve, entropy and total-pressure loss, Pitot probes and moving shocks.",
      tags: ["6 interactives", "worked examples", "self-check"] },
    { slug: "nozzles", n: 3, title: "Nozzles, Diffusers & Choked Flow",
      blurb: "Quasi-one-dimensional flow, the area–Mach relation, choking, nozzle design, and converging–diverging nozzles across every back pressure.",
      tags: ["5 interactives", "worked examples", "self-check"] },
    { slug: "duct-flow", n: 4, title: "Heat Addition & Friction in Ducts",
      blurb: "Rayleigh and Fanno flow, the starred reference states, thermal and frictional choking, and generalized 1-D flow.",
      tags: ["4 interactives", "worked examples", "self-check"] },
    { part: "Part II · Two-dimensional supersonic flow" },
    { slug: "oblique-shock", n: 5, title: "Oblique Shock Waves",
      blurb: "The θ–β–M relation, shock polars, detachment, reflection and intersection, and multi-shock compression.",
      tags: ["5 interactives", "worked examples", "self-check"] },
    { slug: "expansion", n: 6, title: "Expansion Waves & Shock-Expansion Theory",
      blurb: "Mach waves, Prandtl–Meyer expansion, isentropic compression, and shock-expansion theory for supersonic airfoils.",
      tags: ["4 interactives", "worked examples", "self-check"] },
    { part: "Part III · Compressible airfoils" },
    { slug: "linearized", n: 7, title: "Compressibility Corrections & Critical Mach",
      blurb: "Linearized potential flow, Prandtl–Glauert, Kármán–Tsien and Laitone, critical Mach number, drag divergence, sweep and the area rule.",
      tags: ["5 interactives", "worked examples", "self-check"] },
    { part: "Part IV · Experimental compressible aerodynamics" },
    { slug: "wind-tunnels", n: 8, title: "Supersonic Wind Tunnels",
      blurb: "Blowdown, indraft and continuous tunnels, nozzle and diffuser sizing, starting, run time, condensation, Reynolds-number range, and instrumentation from Pitot rakes to schlieren.",
      tags: ["7 interactives", "worked examples", "self-check"] },
  ];
  const CALCS = [
    { slug: "isentropic", kicker: "Isentropic flow", title: "Isentropic Flow", blurb: "M, p₀/p, T₀/T, ρ₀/ρ, A/A*, Mach angle and ν from any one of them." },
    { slug: "normal-shock", kicker: "Normal shock", title: "Normal Shock", blurb: "Downstream Mach number and every ratio across the shock, including the Pitot ratio, from any one of them." },
    { slug: "oblique-shock", kicker: "Oblique shock", title: "Oblique Shock", blurb: "Any two of M, θ, β give the third, weak or strong, with the property ratios." },
    { slug: "prandtl-meyer", kicker: "Expansion", title: "Prandtl–Meyer", blurb: "ν(M), Mach angle, and the flow after a turn, expansion or compression." },
    { slug: "rayleigh", kicker: "Heat addition", title: "Rayleigh Flow", blurb: "Constant-area heat addition: the starred ratios, and the exit state for a given total-temperature rise." },
    { slug: "fanno", kicker: "Friction", title: "Fanno Flow", blurb: "Adiabatic duct flow with friction: 4fL*/D and the starred ratios." },
    { slug: "atmosphere", kicker: "Standard atmosphere", title: "Standard Atmosphere", blurb: "1976 U.S. Standard Atmosphere to 86 km, plus Mach → velocity, dynamic pressure, total conditions and Reynolds number." },
    { slug: "wind-tunnel", kicker: "Experiment", title: "Supersonic Wind Tunnel", blurb: "Test-section conditions, mass flow, starting requirements, second-throat size and blowdown run time." },
  ];
  const GLYPH = {
    isentropic: '<path d="M10 22 Q60 22 90 32 T170 42" class="fan"/><path d="M10 42 Q60 42 90 32 T170 22" class="fan"/><text x="12" y="58" class="small">p, T, M</text><text x="120" y="58" class="small">p₀, T₀</text>',
    "normal-shock": '<line x1="90" y1="6" x2="90" y2="56" class="shock"/><text x="18" y="35" class="label">M₁ > 1</text><text x="110" y="35" class="label">M₂ < 1</text>',
    "oblique-shock": '<path d="M20 52 L80 52 L170 20 L170 52 Z" class="body"/><line x1="80" y1="52" x2="160" y2="4" class="shock"/><text x="14" y="30" class="label">M₁</text>',
    expansion: '<path d="M10 30 L80 30 L170 58 L170 62 L10 62 Z" class="body"/><g class="fan"><line x1="80" y1="30" x2="120" y2="2"/><line x1="80" y1="30" x2="140" y2="6"/><line x1="80" y1="30" x2="160" y2="14"/></g>',
    nozzles: '<path d="M10 8 Q60 8 80 26 Q100 34 170 4" class="body" style="fill:none"/><path d="M10 56 Q60 56 80 38 Q100 30 170 60" class="body" style="fill:none"/><line x1="125" y1="20" x2="125" y2="44" class="shock"/>',
    "duct-flow": '<rect x="20" y="16" width="140" height="32" class="body" style="fill:none"/><g class="shock" style="stroke-width:1.5"><path d="M60 40 q5 -16 10 0 q5 -16 10 0"/><path d="M95 40 q5 -16 10 0 q5 -16 10 0"/></g><text x="24" y="60" class="small">q → T₀ ↑, M → 1</text>',
    linearized: '<path d="M20 34 Q50 14 100 18 Q140 22 165 34 Q140 38 100 40 Q50 42 20 34 Z" class="body"/><line x1="92" y1="10" x2="96" y2="20" class="shock" style="stroke-width:1.8"/><text x="22" y="60" class="small">M∞ → M_cr</text>',
    "wind-tunnels": '<path d="M4 14 L30 14 Q45 14 52 24 Q58 28 70 20 L110 20 L130 26 Q140 30 150 26 L176 14" class="body" style="fill:none"/><path d="M4 50 L30 50 Q45 50 52 40 Q58 36 70 44 L110 44 L130 38 Q140 34 150 38 L176 50" class="body" style="fill:none"/><path d="M84 32 l8 -6 l8 6 z" class="accfill"/><line x1="140" y1="27" x2="140" y2="37" class="shock" style="stroke-width:1.6"/><text x="74" y="60" class="small">test section</text>',
  };

  // ---------- chrome ----------
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  applyTheme(store.get("theme", "auto"));
  let fsPx = parseFloat(store.get("fs", "17"));
  document.documentElement.style.setProperty("--fs", fsPx + "px");

  const listeners = [];
  let gamma = parseFloat(store.get("gamma", "1.4"));
  if (!(gamma > 1 && gamma < 1.7)) gamma = 1.4;

  function buildTopbar() {
    const here = document.body.dataset.section || "";
    const header = document.createElement("header");
    header.className = "topbar";
    const themeIcon = { auto: "◐", light: "☀", dark: "☾" };
    header.innerHTML = `
      <div class="topbar-inner">
        <a class="brand" href="${ROOT}index.html">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12 L15 9.2 L22.5 12 L15 14.8 Z" fill="var(--accent)"/><path d="M1 3.5 Q9 6 13.5 9.4 M1 20.5 Q9 18 13.5 14.6" stroke="var(--hot)" fill="none" stroke-width="1.7"/></svg>
          Compressible Flow Lab
        </a>
        <nav>
          <a href="${ROOT}index.html#lessons" ${here === "lessons" ? 'aria-current="page"' : ""}>Lessons</a>
          <a href="${ROOT}index.html#calculators" ${here === "calculators" ? 'aria-current="page"' : ""}>Calculators</a>
          <a href="${ROOT}about.html" ${here === "about" ? 'aria-current="page"' : ""}>About</a>
        </nav>
        <div class="tools">
          ${document.body.dataset.gamma === "off" ? "" : `<label for="gammaInput" title="Ratio of specific heats used on this page">γ</label>
          <input id="gammaInput" type="number" step="0.01" min="1.05" max="1.67" value="${gamma}">`}
          <button id="fsDown" title="Smaller text" aria-label="Smaller text">A−</button>
          <button id="fsUp" title="Larger text" aria-label="Larger text">A+</button>
          <button id="themeBtn" title="Theme: ${store.get("theme", "auto")}" aria-label="Change theme">${themeIcon[store.get("theme", "auto")] || "◐"}</button>
        </div>
      </div>`;
    document.body.prepend(header);
    const gi = header.querySelector("#gammaInput");
    if (gi) gi.addEventListener("change", () => {
      const v = parseFloat(gi.value);
      if (!(v > 1 && v < 1.7)) { gi.value = gamma; return; }
      gamma = v; store.set("gamma", String(v));
      listeners.forEach(fn => fn(gamma));
    });
    header.querySelector("#fsDown").onclick = () => setFs(fsPx - 1);
    header.querySelector("#fsUp").onclick = () => setFs(fsPx + 1);
    const tb = header.querySelector("#themeBtn");
    tb.onclick = () => {
      const order = ["auto", "light", "dark"];
      const next = order[(order.indexOf(store.get("theme", "auto")) + 1) % 3];
      store.set("theme", next); applyTheme(next);
      tb.title = "Theme: " + next; tb.textContent = themeIcon[next];
    };
  }
  function setFs(v) {
    fsPx = Math.min(24, Math.max(13, v));
    store.set("fs", String(fsPx));
    document.documentElement.style.setProperty("--fs", fsPx + "px");
  }
  // Programmatic γ change (used by worked examples that fix γ = 1.4)
  function setGamma(v) {
    gamma = v; store.set("gamma", String(v));
    const gi = document.getElementById("gammaInput");
    if (gi) gi.value = v;
    listeners.forEach(fn => fn(gamma));
  }

  function buildFooter() {
    const f = document.createElement("footer");
    f.innerHTML = `<div class="inner">
      <b style="color:var(--chrome-text)">Compressible Flow Lab</b> — interactive notes on compressible aerodynamics and supersonic testing.
      Values come from closed-form relations for a calorically perfect gas unless a page says otherwise; they are for learning, not design.
      Main references: J. D. Anderson, <i>Fundamentals of Aerodynamics</i> and <i>Modern Compressible Flow</i>; Liepmann &amp; Roshko, <i>Elements of Gasdynamics</i>;
      Pope &amp; Goin, <i>High-Speed Wind Tunnel Testing</i>; NACA Report 1135.
      Code under the MIT License; text and figures under CC BY 4.0.</div>`;
    document.body.append(f);
  }

  function buildPager() {
    const slug = document.body.dataset.lesson;
    if (!slug) return;
    const list = LESSONS.filter(l => l.slug);
    const i = list.findIndex(l => l.slug === slug);
    if (i < 0) return;
    const prev = list[i - 1], next = list[i + 1];
    const nav = document.createElement("nav");
    nav.className = "pager";
    nav.innerHTML = `<span>${prev ? `<a href="${prev.slug}.html">← ${prev.n}. ${prev.title}</a>` : `<a href="${ROOT}index.html#lessons">← All lessons</a>`}</span>
      <span>${next ? `<a href="${next.slug}.html">${next.n}. ${next.title} →</a>` : `<a href="${ROOT}index.html#calculators">Calculators →</a>`}</span>`;
    document.querySelector("main").append(nav);
  }

  // ---------- math ----------
  let mathReady = false;
  function loadMath() {
    const base = ROOT + "assets/vendor/katex/"; // KaTeX 0.16.9, vendored (MIT)
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = base + "katex.min.css";
    document.head.append(link);
    const s1 = document.createElement("script");
    s1.src = base + "katex.min.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src = base + "auto-render.min.js";
      s2.onload = () => { mathReady = true; typeset(document.querySelector("main")); };
      document.head.append(s2);
    };
    document.head.append(s1);
  }
  function typeset(el) {
    if (!mathReady || !el) return;
    window.renderMathInElement(el, {
      delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }],
      throwOnError: false,
    });
  }

  // ---------- helpers ----------
  function fmt(x, sig = 4) {
    if (x === null || x === undefined || Number.isNaN(x)) return "—";
    if (typeof x !== "number") return String(x);
    if (!isFinite(x)) return "∞";
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e6 || a < 1e-3)) return x.toExponential(sig - 1).replace(/e\+?(-?\d+)/, (m, e) => "×10" + sup(e));
    return Number(x.toPrecision(sig)).toString();
  }
  function sup(e) {
    const map = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    return String(e).split("").map(c => map[c]).join("");
  }
  const $ = (sel, el = document) => el.querySelector(sel);
  const val = id => parseFloat(document.getElementById(id).value);

  function setSeg(seg, v) {
    seg.dataset.value = v;
    seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x.dataset.value === String(v) ? "true" : "false"));
  }

  // Wire every range/number/select inside `scope` to render(); keep <output> in sync; handle presets.
  function wire(scope, render) {
    const root = typeof scope === "string" ? document.querySelector(scope) : scope;
    const inputs = root.querySelectorAll("input, select");
    const sync = () => {
      inputs.forEach(inp => {
        const out = root.querySelector(`output[for="${inp.id}"]`);
        if (out) {
          const d = inp.dataset.dec !== undefined ? +inp.dataset.dec : 2;
          out.textContent = parseFloat(inp.value).toFixed(d) + (inp.dataset.unit || "");
        }
      });
      render();
    };
    inputs.forEach(inp => { inp.addEventListener("input", sync); if (inp.tagName === "SELECT") inp.addEventListener("change", sync); });
    root.querySelectorAll(".seg").forEach(seg => {
      seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { setSeg(seg, b.dataset.value); sync(); }));
    });
    root.querySelectorAll("[data-preset]").forEach(btn => btn.addEventListener("click", () => {
      const p = JSON.parse(btn.dataset.preset);
      Object.entries(p).forEach(([k, v]) => {
        if (k === "gamma") { setGamma(v); return; }
        const el = document.getElementById(k);
        if (!el) return;
        if (el.classList.contains("seg")) setSeg(el, v); else el.value = v;
      });
      sync();
    }));
    listeners.push(sync);
    sync();
    return sync;
  }
  const seg = id => document.getElementById(id).dataset.value;
  const live = (labSel, html) => { const el = document.querySelector(labSel + " .live"); if (el) el.innerHTML = html; };

  function readout(el, items) {
    (typeof el === "string" ? document.querySelector(el) : el).innerHTML =
      items.map(([k, v, note]) => `<div><span>${k}</span><b>${typeof v === "number" ? fmt(v) : v}</b>${note ? `<small>${note}</small>` : ""}</div>`).join("");
  }
  // rows: [label, value] or [label, relation, value] (3 columns) or {sub: "heading"}
  function table(el, head, rows, cls = "") {
    (typeof el === "string" ? document.querySelector(el) : el).innerHTML =
      `<table class="data ${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
      rows.map(r => r.sub ? `<tr class="sub"><td colspan="${head.length}">${r.sub}</td></tr>`
        : `<tr>${r.map(c => `<td>${typeof c === "number" ? fmt(c) : c}</td>`).join("")}</tr>`).join("") +
      "</tbody></table>";
  }

  // ---------- tabs ----------
  function initTabs(root = document) {
    root.querySelectorAll(".tabs").forEach(t => {
      if (t.dataset.ready) return;
      t.dataset.ready = "1";
      const btns = t.querySelectorAll(".tablist button"), panels = t.querySelectorAll(".panel");
      const show = i => {
        btns.forEach((b, k) => b.setAttribute("aria-selected", k === i ? "true" : "false"));
        panels.forEach((p, k) => p.classList.toggle("active", k === i));
      };
      btns.forEach((b, i) => b.addEventListener("click", () => show(i)));
      show(0);
    });
  }

  // ---------- self-check quiz ----------
  // items: [{ q, opts: [...], a: index, why }]
  function quiz(target, items) {
    const el = document.querySelector(target);
    el.classList.add("quiz");
    el.innerHTML = `<span class="score">0 / ${items.length}</span><b>Pick an answer to see whether it is right, and why.</b><ol>` +
      items.map((it, i) => `<li data-i="${i}"><div class="qtext">${it.q}</div><div class="opts">${it.opts.map((o, k) => `<button data-k="${k}">${o}</button>`).join("")}</div><div class="why">${it.why}</div></li>`).join("") + "</ol>";
    const done = new Set(), right = new Set();
    el.querySelectorAll("li").forEach(li => {
      const it = items[+li.dataset.i];
      li.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        const k = +b.dataset.k;
        li.querySelectorAll("button").forEach(x => x.classList.remove("right", "wrong"));
        b.classList.add(k === it.a ? "right" : "wrong");
        li.querySelectorAll("button")[it.a].classList.add("right");
        const why = li.querySelector(".why");
        why.innerHTML = (k === it.a ? "<b style='color:var(--good)'>Correct.</b> " : "<b style='color:var(--bad)'>Not quite.</b> ") + it.why;
        why.classList.add("show");
        typeset(why);
        if (!done.has(li.dataset.i)) { done.add(li.dataset.i); if (k === it.a) right.add(li.dataset.i); }
        el.querySelector(".score").textContent = `${right.size} / ${items.length} right first time`;
      }));
    });
  }

  // ---------- plotting ----------
  function niceTicks(a, b, n = 6) {
    const span = b - a;
    if (!(span > 0)) return [a];
    const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return out;
  }
  function logTicks(lo, hi) {
    const L0 = Math.log10(lo), L1 = Math.log10(hi), ks = L1 - L0 > 3 ? [1] : [1, 2, 5], out = [];
    for (let e = Math.floor(L0); e <= Math.ceil(L1); e++) for (const k of ks) {
      const v = k * Math.pow(10, e);
      if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v);
    }
    return out;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  let clipId = 0;

  /*
   * plot(target, opts)
   *  opts: { w, h, xlabel, ylabel, xlim, ylim, logx, logy, series:[{x,y,label,c,dash,width,fill}],
   *          points:[{x,y,c,label}], vlines:[{x,label,c}], hlines:[{y,label,c}], bands:[{x0,x1,label}],
   *          notes:[{x,y,text,anchor}], legend:"tr"|"tl"|"br"|"bl"|false }
   */
  function plot(target, o) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    const W = o.w || 640, H = o.h || 360, m = { l: o.logy ? 70 : 60, r: 16, t: 14, b: 44 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const finite = v => typeof v === "number" && isFinite(v);
    const xs = [], ys = [];
    (o.series || []).forEach(s => s.x.forEach((x, i) => { if (finite(x) && finite(s.y[i])) { xs.push(x); ys.push(s.y[i]); } }));
    const xlim = o.xlim || [Math.min(...xs), Math.max(...xs)];
    let ylim = o.ylim;
    if (!ylim) {
      const lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * 0.06 || 1;
      ylim = o.logy ? [lo, hi] : [lo - pad, hi + pad];
    }
    const tx = o.logx ? v => Math.log10(v) : v => v, ty = o.logy ? v => Math.log10(v) : v => v;
    const X0 = tx(xlim[0]), X1 = tx(xlim[1]), Y0 = ty(ylim[0]), Y1 = ty(ylim[1]);
    const X = x => m.l + ((tx(x) - X0) / (X1 - X0)) * pw;
    const Y = y => m.t + ph - ((ty(y) - Y0) / (Y1 - Y0)) * ph;
    const cid = "clip" + (++clipId);
    const parts = [`<defs><clipPath id="${cid}"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath></defs>`];
    const xt = o.xticks || (o.logx ? logTicks(xlim[0], xlim[1]) : niceTicks(xlim[0], xlim[1], o.nx || 7));
    const yt = o.yticks || (o.logy ? logTicks(ylim[0], ylim[1]) : niceTicks(ylim[0], ylim[1], o.ny || 6));
    const g = [`<g class="axis">`];
    (o.bands || []).forEach(b => g.push(`<rect x="${X(b.x0)}" y="${m.t}" width="${X(b.x1) - X(b.x0)}" height="${ph}" fill="var(--surface-2)"/>` +
      (b.label ? `<text class="ticklabel" x="${(X(b.x0) + X(b.x1)) / 2}" y="${m.t + 12}" text-anchor="middle">${esc(b.label)}</text>` : "")));
    xt.forEach(v => g.push(`<line class="gridline" x1="${X(v)}" x2="${X(v)}" y1="${m.t}" y2="${m.t + ph}"/>`,
      `<text class="ticklabel" x="${X(v)}" y="${m.t + ph + 16}" text-anchor="middle">${fmt(v, 4)}</text>`));
    yt.forEach(v => g.push(`<line class="gridline" x1="${m.l}" x2="${m.l + pw}" y1="${Y(v)}" y2="${Y(v)}"/>`,
      `<text class="ticklabel" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, 3)}</text>`));
    g.push(`<path d="M${m.l} ${m.t}V${m.t + ph}H${m.l + pw}" fill="none"/>`);
    if (o.xlabel) g.push(`<text class="axlabel" x="${m.l + pw / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xlabel)}</text>`);
    if (o.ylabel) g.push(`<text class="axlabel" transform="translate(14 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle">${esc(o.ylabel)}</text>`);
    g.push("</g>");
    parts.push(g.join(""));
    const body = [`<g clip-path="url(#${cid})">`];
    (o.series || []).forEach((s, k) => {
      let d = "", pen = false, first = null, last = null;
      s.x.forEach((x, i) => {
        const y = s.y[i];
        if (!finite(x) || !finite(y) || (o.logy && y <= 0) || (o.logx && x <= 0)) { pen = false; return; }
        const px = X(x).toFixed(1), py = Y(y).toFixed(1);
        d += (pen ? "L" : "M") + px + " " + py;
        if (!first) first = px; last = px;
        pen = true;
      });
      const c = s.c || (k % 6) + 1;
      if (s.fill && first) body.push(`<path class="area c${c}" d="${d}L${last} ${Y(o.logy ? ylim[0] : Math.max(ylim[0], 0))}L${first} ${Y(o.logy ? ylim[0] : Math.max(ylim[0], 0))}Z"/>`);
      body.push(`<path class="series c${c}${s.dash ? " dash" : ""}" d="${d}"${s.width ? ` style="stroke-width:${s.width}"` : ""}/>`);
    });
    (o.vlines || []).forEach(v => body.push(`<line class="series c${v.c || 6} dash" style="stroke-width:1.2" x1="${X(v.x)}" x2="${X(v.x)}" y1="${m.t}" y2="${m.t + ph}"/>` +
      (v.label ? `<text class="ticklabel" x="${X(v.x) + 4}" y="${m.t + 12}">${esc(v.label)}</text>` : "")));
    (o.hlines || []).forEach(v => body.push(`<line class="series c${v.c || 6} dash" style="stroke-width:1.2" x1="${m.l}" x2="${m.l + pw}" y1="${Y(v.y)}" y2="${Y(v.y)}"/>` +
      (v.label ? `<text class="ticklabel" x="${m.l + pw - 4}" y="${Y(v.y) - 4}" text-anchor="end">${esc(v.label)}</text>` : "")));
    (o.notes || []).forEach(n => body.push(`<text class="ticklabel" x="${X(n.x)}" y="${Y(n.y)}" text-anchor="${n.anchor || "start"}" style="fill:var(--text)">${esc(n.text)}</text>`));
    (o.points || []).forEach(p => {
      if (!finite(p.x) || !finite(p.y)) return;
      body.push(`<circle class="marker c${p.c || 1}" cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.r || 5}"/>`);
      if (p.label) body.push(`<text class="ticklabel" x="${X(p.x) + 8}" y="${Y(p.y) - 8}" style="fill:var(--text)">${esc(p.label)}</text>`);
    });
    body.push("</g>");
    parts.push(body.join(""));
    const named = (o.series || []).map((s, k) => ({ ...s, c: s.c || (k % 6) + 1 })).filter(s => s.label);
    if (named.length && o.legend !== false) {
      const pos = o.legend || "tr", lw = o.legendWidth || 160, lh = 16 * named.length + 8;
      const lx = pos.includes("r") ? m.l + pw - lw - 6 : m.l + 8;
      const ly = pos.includes("t") ? m.t + 6 : m.t + ph - lh - 6;
      const L = [`<g class="legend"><rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="6" fill="var(--surface)" stroke="var(--border)" opacity=".94"/>`];
      named.forEach((s, i) => L.push(`<line class="series c${s.c}${s.dash ? " dash" : ""}" x1="${lx + 8}" x2="${lx + 30}" y1="${ly + 12 + 16 * i}" y2="${ly + 12 + 16 * i}"/>`,
        `<text x="${lx + 36}" y="${ly + 16 + 16 * i}">${esc(s.label)}</text>`));
      L.push("</g>");
      parts.push(L.join(""));
    }
    el.innerHTML = `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || o.ylabel || "plot")}">${parts.join("")}</svg>`;
    return { X, Y };
  }
  const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  const logspace = (a, b, n) => linspace(Math.log10(a), Math.log10(b), n).map(v => Math.pow(10, v));

  // ---------- home page cards ----------
  function cards(target, kind) {
    const el = document.querySelector(target);
    if (!el) return;
    if (kind === "lessons") {
      let html = "";
      LESSONS.forEach(l => {
        if (l.part) { html += `${html ? "</div>" : ""}<h3 class="eyebrow" style="margin-top:1.6rem">${l.part}</h3><div class="grid">`; return; }
        html += `<a class="card" href="lessons/${l.slug}.html"><div class="glyph"><svg class="diagram" viewBox="0 0 180 64">${GLYPH[l.slug] || ""}</svg></div>
          <span class="kicker">Lesson ${l.n}</span><h3>${l.title}</h3><p>${l.blurb}</p>
          <div class="tags">${(l.tags || []).map(t => `<span class="pill">${t}</span>`).join("")}</div></a>`;
      });
      el.innerHTML = html + "</div>";
    } else {
      el.innerHTML = `<div class="grid">${CALCS.map(c => `<a class="card" href="calculators/${c.slug}.html">
        <span class="kicker">${c.kicker}</span><h3>${c.title}</h3><p>${c.blurb}</p></a>`).join("")}</div>`;
    }
  }

  window.UI = {
    gamma: () => gamma, setGamma, onGamma: fn => listeners.push(fn), wire, val, seg, setSeg, live, fmt, readout, table, plot,
    linspace, logspace, cards, quiz, initTabs, typeset, $, LESSONS, CALCS, store,
  };

  buildTopbar();
  initTabs();
  document.addEventListener("DOMContentLoaded", () => { buildPager(); buildFooter(); loadMath(); });
})();
