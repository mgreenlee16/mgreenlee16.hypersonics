/*
 * lessons.js — AAE 334 lesson pages: lesson list, previous/next pager and the per-lesson practice generator.
 * A lesson page sets <body data-l334="slug"> and calls AQL.practice("#gen", [topic ids]).
 */
(function (root) {
  "use strict";
  const LIST = [
    { slug: "lifting-line", n: 1, title: "Finite wings and lifting-line theory", lec: "Lecture 13", exam: 2, blurb: "Downwash, induced angle, Prandtl's equation, elliptic loading, aspect ratio." },
    { slug: "fourier-llt", n: 2, title: "General loading: the Fourier solution", lec: "Lectures 14–15", exam: 2, blurb: "Fourier sine series, collocation, C_L = πAR A₁, δ and e, the rectangular wing." },
    { slug: "planform", n: 3, title: "Taper, twist and aspect-ratio scaling", lec: "Lecture 15", exam: 2, blurb: "Taper ratio and δ, c_ℓ(y) and tip stall, Schrenk, washout, rescaling polars." },
    { slug: "sweep-delta", n: 4, title: "Sweep, delta wings and wingtip devices", lec: "Lectures 11, 16", exam: 2, blurb: "Effects of sweep, tip-stall fixes, winglets, delta-wing vortex lift and breakdown, L/D." },
    { slug: "stability", n: 5, title: "Longitudinal static stability", lec: "HW 7", exam: 2, blurb: "C_M–α line, wing and tail contributions, V_H, neutral point, static margin, trim." },
    { slug: "thermo", n: 6, title: "Thermodynamics review", lec: "Lecture 19", exam: 2, blurb: "Perfect gas, e and h, γ and degrees of freedom, first and second laws, entropy." },
    { slug: "isentropic", n: 7, title: "Energy equation and isentropic flow", lec: "Lecture 21", exam: 2, blurb: "h₀, T₀, p₀, sonic conditions, speed of sound, when compressibility matters." },
    { slug: "shocks", n: 8, title: "Normal and moving shocks", lec: "Lectures 21–22", exam: 2, blurb: "Jump relations, trends with M₁, entropy and p₀ loss, frame changes for moving shocks." },
    { slug: "pitot", n: 9, title: "Pitot probes", lec: "Lecture 22", exam: 2, blurb: "Incompressible, subsonic compressible and supersonic (Rayleigh–Pitot) probe analysis." },
    { slug: "nozzles", n: 10, title: "Quasi-1D flow and nozzles", lec: "Lectures 23–24", exam: "F", blurb: "Area–velocity relation, A/A*, choking, mass flow, over- and underexpanded nozzles." },
  ];

  function pager() {
    const slug = document.body.dataset.l334;
    const i = LIST.findIndex(l => l.slug === slug);
    if (i < 0) return;
    const prev = LIST[i - 1], next = LIST[i + 1];
    const nav = document.createElement("nav");
    nav.className = "pager";
    nav.innerHTML = `<span>${prev ? `<a href="${prev.slug}.html">← ${prev.n}. ${prev.title}</a>` : `<a href="../index.html#lessons">← All AAE 334 lessons</a>`}</span>
      <span>${next ? `<a href="${next.slug}.html">${next.n}. ${next.title} →</a>` : `<a href="../exam2.html">Exam 2 review →</a>`}</span>`;
    document.querySelector("main").append(nav);
  }

  // Practice generator for one lesson: an endless drill restricted to the lesson's topics.
  function practice(sel, ids) {
    if (!root.AQ) return;
    root.AQ.drill(sel, { ids, title: "Practice problem generator" });
  }

  // Simple "self-check" questions with hidden answers, written in the page as
  // <div class="sc"><p>question</p><details><summary>Answer</summary>…</details></div>; nothing to do here
  // except numbering.
  function numberChecks() {
    document.querySelectorAll(".selfcheck").forEach(box => box.querySelectorAll(".sc").forEach((q, k) => {
      const b = document.createElement("b"); b.className = "scn"; b.textContent = `Q${k + 1}. `; q.firstElementChild.prepend(b);
    }));
  }

  function cards(sel) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.innerHTML = LIST.map(l => `<a class="card" href="lessons/${l.slug}.html"><span class="kicker">Lesson ${l.n} · ${l.lec}${l.exam === "F" ? " · for the final" : ""}</span><h3>${l.title}</h3><p>${l.blurb}</p></a>`).join("");
  }

  const run = () => { pager(); numberChecks(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  root.AQL = { LIST, practice, cards };
})(window);
