/*
 * validate-334.js — checks the AAE 334 exam-review generators.
 * Run:  node tests/validate-334.js
 */
"use strict";
const GD = require("../assets/js/gasdyn.js");
global.GD = GD;
const AQ = require("../assets/js/aae334/engine.js");
global.AQ = AQ;
const H = require("../assets/js/aae334/gen-exam2.js");
let n = 0, fails = 0;
function check(name, got, want, tol) {
  n++; const ok = Math.abs(got - want) <= tol * Math.abs(want || 1); if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}: ${+got.toPrecision(6)} (expected ${want})`);
}
const D = Math.PI / 180, isen = GD.isen, ns = GD.normalShock;

// Lifting line, rectangular wing AR = 6, a0 = 2π, 4 collocation points (lecture 15 / Kuethe & Chow example)
const L = H.liftingLine({ AR: 6, lam: 1, alphaDeg: 1, N: 4 });
check("rectangular AR 6: C_L per radian", L.CL / D, 4.5273, 2e-3);
check("rectangular AR 6: δ", L.delta, 0.0464, 0.03);
check("elliptic lift slope, AR 8, a0 = 2π: a/a0", H.finiteSlope(2 * Math.PI, 8) / (2 * Math.PI), 0.8, 1e-9);

// Spring 2026 Exam 2 style checks (published grading values). The grading key reads the normal-shock table at the
// closest entry (M = 4.5 for the blast wave, whose exact M is 4.493), so table-based values differ by up to ~0.5%.
{ const T1 = 296.15, a1 = Math.sqrt(1.4 * 287 * T1), M = 1550 / a1, s = ns(M, 1.4), T2 = T1 * s.T2_T1;
  check("blast wave 1550 m/s: T2 (K)", T2, 1444, 0.005);
  check("blast wave: p2 (atm)", s.p2_p1, 23.46, 0.005);
  check("blast wave: ρ2", s.p2_p1 * 101325 / (287 * T2), 5.74, 0.003);
  check("blast wave: air speed (m/s)", 1550 - s.M2 * Math.sqrt(1.4 * 287 * T2), 1228, 0.002); }
{ const M = isen.M_from_p0_p(28.2 / 26.5, 1.4), a = Math.sqrt(1.4 * 287 * 224);
  check("Pitot subsonic: V (m/s)", M * a, 90, 0.01);
  const Mb = GD.normalShockFrom("p02_p1", 418.4 / 26.5, 1.4).M1;
  check("Pitot supersonic: M", Mb, 3.45, 0.005);
  check("Pitot supersonic: V (m/s)", Mb * a, 1035, 0.003);
  check("Pitot supersonic: freestream p0 (kPa)", 26.5 * isen.p0_p(Mb, 1.4), 1881, 0.005);
  check("Pitot supersonic: tip T (K)", 224 * isen.T0_T(Mb, 1.4), 757, 0.004); }
// stability, same data as that exam's problem 25: S_w 18, AR 6, a0 6/rad, S_t 3, AR_t 4, ℓ_t = 4 c̄, SM 0.20
{ const p = H.airplane({ a0w: 6, a0lw: -3 * D, cmac: -0.05, Sw: 18, ARw: 6, St: 3, ARt: 4, a0t: 2 * Math.PI, lt: 4, kappa: 2, xac: 0.25, xcg: 0.25, iw: 0, it: 0 });
  check("exam-style trim: C_L = W/(qS_w)", 2 * 14131 / (1.225 * 67.056 ** 2 * 18), 0.2850, 0.002);
  console.log(`      (finite-wing slopes a_w = ${p.aw.toFixed(4)}, a_t = ${p.at.toFixed(4)}; x̄_np = ${p.xnp.toFixed(4)}, x̄_cg for SM 0.2 = ${(p.xnp - 0.2).toFixed(4)})`); }

// every generator: builds, has finite answers, and passes its own verify()
for (const id of AQ.ORDER) {
  let bad = 0, made = 0, ver = 0;
  for (let k = 0; k < 300; k++) {
    let p; try { p = AQ.make(id); } catch (e) { bad++; if (bad < 2) console.log("   error in", id, e.message); continue; }
    if (!p) { bad++; continue; }
    made++;
    if (p.type === "num" && !p.parts.every(x => isFinite(x.ans))) bad++;
    if (p.type === "mc" && !(p.answer >= 0 && p.answer < p.choices.length && new Set(p.choices).size === p.choices.length)) { bad++; if (bad < 3) console.log("   mc issue", id, p.choices); }
    if (p.type === "table" && p.answers.some(a => !(a >= 0 && a < 3))) bad++;
    if (p.type === "match" && new Set(p.answers).size !== p.answers.length) bad++;
    if (p.verify) { ver++; if (!p.verify()) bad++; }
  }
  n++; if (bad) fails++;
  console.log(`${bad ? "FAIL" : "ok  "}  generator ${id}: ${made} built, ${ver} verified, ${bad} problems`);
}
console.log(`\n${n - fails} of ${n} checks passed`);
process.exit(fails ? 1 : 0);
