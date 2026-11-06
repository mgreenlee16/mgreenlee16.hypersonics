/*
 * gen-exam2.js — AAE 334 Exam 2 problem generators: finite wings (lifting line, elliptic loading,
 * planform effects, delta wings), longitudinal static stability, thermodynamics, isentropic flow,
 * normal and moving shocks, and Pitot probes. Questions are original, written in the style of the
 * course's homework and exams; all numbers come from the relations below (γ = 1.4 unless stated).
 * Conventions: Γ(θ) = 2bV∞ Σ Aₙ sin nθ, y = −(b/2) cos θ; C_L = πAR A₁; δ = Σ n(Aₙ/A₁)²;
 * downwash gradient dε/dα = κ C_Lα,w/(πAR_w); C_M,cg = C_M,ac,w + C_L(x̄_cg − x̄_ac,w) − V_H C_L,t.
 */
(function (root) {
  "use strict";
  const GD = root.GD || require("../gasdyn.js");
  const AQ = root.AQ || require("./engine.js");
  const R = AQ.R;
  const D = Math.PI / 180, g0 = 9.80665, G = 1.4, Rs = 287, cpS = 1004.5, Re = 1716, cpE = 6006;
  const f = (x, s = 4) => (root.UI ? root.UI.fmt(x, s) : String(+x.toPrecision(s)));
  const reg = (id, meta, gen) => AQ.register(id, Object.assign({ exam: 2 }, meta), gen);
  const mc = (q, right, wrong, sol, pts = 2) => { const ch = R.shuffle([right, ...wrong]); return { type: "mc", q, choices: ch, answer: ch.indexOf(right), sol, pts }; };
  const bank = (list, pts = 2) => () => { const it = R.pick(list); return mc(it.q, it.a, it.w, `<p>${it.why}</p>`, it.pts || pts); };
  const row = (a, b, c) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`;
  const steps = rows => `<table class="data text ex">${rows.map(r => row(r[0], r[1], typeof r[2] === "number" ? f(r[2]) : r[2])).join("")}</table>`;

  // =====================================================================================
  // Physics helpers
  // =====================================================================================
  // Prandtl lifting line for a linearly tapered, linearly twisted wing (twist < 0 = washout at the tip).
  function liftingLine(o) {
    const N = o.N || 15, AR = o.AR, lam = o.lam, a0 = o.a0 || 2 * Math.PI, b = 1, S = b * b / AR, cr = 2 * S / (b * (1 + lam));
    const al = y => (o.alphaDeg + (o.twistDeg || 0) * Math.abs(2 * y / b) - (o.alpha0Deg || 0)) * D;
    const chord = y => cr * (1 - (1 - lam) * Math.abs(2 * y / b));
    const th = Array.from({ length: N }, (_, m) => ((m + 1) * Math.PI) / (2 * N)), ns = Array.from({ length: N }, (_, k) => 2 * k + 1);
    const M = th.map(t => { const y = -0.5 * b * Math.cos(t), c = chord(y); return ns.map(n => Math.sin(n * t) * (4 * b / (a0 * c) + n / Math.sin(t))); });
    const rhs = th.map(t => al(-0.5 * b * Math.cos(t)));
    const A = solve(M, rhs);
    const CL = Math.PI * AR * A[0], delta = ns.slice(1).reduce((s, n, k) => s + n * (A[k + 1] / A[0]) ** 2, 0);
    const ys = [], cl = [], Lp = [];
    for (let k = 0; k <= 100; k++) {
      const t = Math.PI * k / 100, y = -0.5 * b * Math.cos(t), c = chord(y), gam = ns.reduce((s, n, j) => s + A[j] * Math.sin(n * t), 0); // Γ/(2bV)
      ys.push(2 * y / b); cl.push(c > 1e-9 ? 4 * b * gam / c : NaN); Lp.push(CL > 0 ? (4 * b * gam) * b / (S * CL) : 0);
    }
    return { A, CL, delta, e: 1 / (1 + delta), CDi: CL * CL * (1 + delta) / (Math.PI * AR), ys, cl, Lp };
  }
  function solve(M, b) { // Gaussian elimination with partial pivoting
    const n = b.length, A = M.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = c + 1; r < n; r++) { const k = A[r][c] / A[c][c]; for (let j = c; j <= n; j++) A[r][j] -= k * A[c][j]; }
    }
    const x = Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = A[r][n]; for (let j = r + 1; j < n; j++) s -= A[r][j] * x[j]; x[r] = s / A[r][r]; }
    return x;
  }
  const finiteSlope = (a0, AR, e = 1) => a0 / (1 + a0 / (Math.PI * e * AR));   // per rad
  // Wing–tail airplane model, angles in radians, α measured from the fuselage reference line.
  function airplane(p) {
    const aw = finiteSlope(p.a0w, p.ARw), at = finiteSlope(p.a0t, p.ARt), de = p.kappa * aw / (Math.PI * p.ARw);
    const r = p.St / p.Sw, VH = r * p.lt;                             // lt in wing chords
    const eps0 = de * (p.iw - p.a0lw);                                 // downwash at α = 0 (α_FRL)
    const CLw = al => aw * (al + p.iw - p.a0lw), CLt = al => at * ((1 - de) * al + p.it - eps0);
    const CL = al => CLw(al) + r * CLt(al);
    const CM = al => p.cmac + CL(al) * (p.xcg - p.xac) - VH * CLt(al);
    const CLa = aw + r * at * (1 - de), CMa = CLa * (p.xcg - p.xac) - VH * at * (1 - de);
    const xnp = p.xac + VH * at * (1 - de) / CLa;
    return { aw, at, de, r, VH, eps0, CLw, CLt, CL, CM, CLa, CMa, xnp, SM: xnp - p.xcg };
  }
  const isen = GD.isen, ns = GD.normalShock;

  // =====================================================================================
  // Small SVG sketches for "which sketch is correct" questions
  // =====================================================================================
  function sketch(curves, ax, opts = {}) {
    const W = 220, H = 150, m = 22, X = x => m + (x - ax.x[0]) / (ax.x[1] - ax.x[0]) * (W - 2 * m), Y = y => H - m - (y - ax.y[0]) / (ax.y[1] - ax.y[0]) * (H - 2 * m);
    let s = `<line x1="${X(ax.x[0])}" x2="${X(ax.x[1])}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--muted)"/><line x1="${X(Math.max(ax.x[0], 0))}" x2="${X(Math.max(ax.x[0], 0))}" y1="${Y(ax.y[0])}" y2="${Y(ax.y[1])}" stroke="var(--muted)"/>`;
    s += `<text x="${W - m}" y="${Y(0) + 14}" font-size="11" text-anchor="end">${ax.xl}</text><text x="${X(Math.max(ax.x[0], 0)) + 4}" y="${m - 6}" font-size="11">${ax.yl}</text>`;
    curves.forEach((c, k) => {
      s += `<path d="${c.pts.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(" ")}" fill="none" stroke="${k ? "var(--hot)" : "var(--accent)"}" stroke-width="2"${c.dash ? ' stroke-dasharray="5 3"' : ""}/>`;
      const L = c.pts[c.lab != null ? c.lab : c.pts.length - 1];
      s += `<text x="${X(L[0]) + 3}" y="${Y(L[1]) - 4}" font-size="10" fill="${k ? "var(--hot)" : "var(--accent)"}">${c.name}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="aq-svg" role="img" aria-label="sketch">${s}</svg>`;
  }
  // lift curve with a smooth stall: linear slope a until α_s, then rounded top and a drop
  const liftCurve = (a, a0, aStall, CLmax, xmax = 45) => {
    const pts = [];
    for (let x = -8; x <= xmax; x += 0.5) {
      let y = a * (x - a0);
      const xs = a0 + 0.85 * CLmax / a;
      if (x > xs) { const t = (x - xs) / (aStall - xs); y = t < 1 ? 0.85 * CLmax + 0.15 * CLmax * (2 * t - t * t) : CLmax - 0.5 * CLmax * Math.min(1, (x - aStall) / 8) ** 1.3; }
      pts.push([x, y]);
    }
    return pts;
  };

  // =====================================================================================
  // PART I — qualitative
  // =====================================================================================
  const ELLIPTIC = [
    { q: "For a planar, untwisted wing with an elliptic spanwise lift distribution, the downwash velocity along the span…", a: "is the same at every spanwise station", w: ["is largest at the wing root", "grows without bound toward the wingtips", "is zero at every angle of attack below stall"], why: "Elliptic loading gives w = −Γ₀/(2b), a constant, so the induced angle α_i = C_L/(πAR) is also constant along the span." },
    { q: "An untwisted wing of constant airfoil section has an elliptic chord distribution. Its local section lift coefficient c_ℓ(y)…", a: "is constant along the span and equal to C_L", w: ["is largest at the tips", "is largest at the root", "is zero at the tips and maximum at the root"], why: "With α, α_ZL and α_i all constant, c_ℓ = a₀(α − α_i − α_ZL) is constant, and integrating over the planform gives C_L = c_ℓ." },
    { q: "For an elliptically loaded wing, the induced drag coefficient equals…", a: "C_L²/(πAR)", w: ["C_L²/(πeAR) with e < 1", "C_L/(πAR)", "zero, because the downwash is uniform"], why: "C_Di = α_i C_L with α_i = C_L/(πAR), so C_Di = C_L²/(πAR): span efficiency e = 1 (δ = 0)." },
    { q: "Which of the following does NOT by itself produce an elliptic lift distribution on a wing?", a: "a rectangular planform with no twist", w: ["an elliptic chord distribution with constant α and α_ZL", "a constant chord with geometric twist chosen to make the loading elliptic", "a constant chord with aerodynamic twist (varying α_ZL) chosen to make the loading elliptic"], why: "An untwisted rectangular wing is loaded more heavily near the tips than an ellipse (δ ≈ 0.05 for AR ≈ 6). The other three are the classic ways of obtaining elliptic loading." },
    { q: "An airplane cruises at constant speed, altitude and CG position while burning fuel. Its induced drag coefficient…", a: "decreases", w: ["increases", "does not change"], why: "Lift equals weight, so C_L = W/(q∞S) falls as fuel burns; C_Di = C_L²/(πeAR) falls with it." },
    { q: "For an elliptic loading, the relation between the induced angle of attack and the lift coefficient is…", a: "α_i = C_L/(πAR)", w: ["α_i = C_L/(2πAR)", "α_i = πAR·C_L", "α_i = C_L²/(πAR)"], why: "From w = −Γ₀/(2b) and C_L = πbΓ₀/(2V∞S): α_i = Γ₀/(2bV∞) = C_L/(πAR)." },
    { q: "Among planar wings with the same span and the same lift, the minimum induced drag is obtained with…", a: "an elliptic lift distribution", w: ["a rectangular planform", "a lift distribution concentrated at the root", "the highest possible taper (λ = 0)"], why: "Lifting line theory gives C_Di = C_L²(1 + δ)/(πAR) with δ ≥ 0, and δ = 0 only for elliptic loading." },
  ];
  reg("elliptic", { title: "Elliptic loading", group: "Finite wings", part: "I", order: 1 }, bank(ELLIPTIC));

  const PLANFORM = [
    { q: "Which of these will make tip stall LESS likely on an aft-swept, tapered wing?", a: "adding washout (twisting the tips nose-down)", w: ["decreasing the taper ratio λ toward zero", "increasing the sweep angle", "using a thinner airfoil at the tips"], why: "Washout lowers the tip angle of attack so the root stalls first. Lower λ and more sweep both load the tips more heavily." },
    { q: "Increasing the taper ratio λ = c_t/c_r toward 1 (a less pointed wing)…", a: "decreases the likelihood of tip stall but increases the aerodynamic loads near the tips", w: ["increases the likelihood of tip stall and the tip loads", "increases the likelihood of tip stall but decreases the tip loads", "decreases both the likelihood of tip stall and the tip loads"], why: "Small tip chords give large local c_ℓ (Schrenk), promoting tip stall. A fuller (λ → 1) wing has lower tip c_ℓ but carries more of its lift outboard, raising the root bending moment." },
    { q: "Compared with a rectangular wing of the same AR and C_L, a tapered wing's induced drag…", a: "could be larger or smaller, depending on the taper ratio", w: ["is always smaller", "is always larger", "is identical"], why: "δ has a minimum near λ ≈ 0.3–0.4; very small λ (strong taper) can give a larger δ than the rectangular wing." },
    { q: "Using Schrenk's approximation, the local lift coefficient near the tip of a strongly tapered wing is…", a: "high, because the small tip chord must carry a lift between the planform and the ellipse", w: ["low, because the tip carries little lift", "equal to C_L everywhere", "zero"], why: "L′(y) is the average of the planform and elliptic shapes; dividing by a small local chord gives a large c_ℓ near the tip: the origin of tip stall on tapered wings." },
    { q: "Which list contains only devices or design choices used to mitigate tip stall?", a: "washout, vortex generators, boundary-layer fences", w: ["washout, increased sweep, lower taper ratio", "winglets, end plates, higher aspect ratio", "flaps, slats, spoilers"], why: "Washout lowers tip incidence; vortex generators energize the boundary layer; fences block the spanwise flow that thickens the tip boundary layer on swept wings." },
    { q: "On an aft-swept wing, the boundary layer tends to flow…", a: "outboard toward the tips, thickening the tip boundary layer and promoting tip stall", w: ["inboard toward the root", "straight back with no spanwise component", "forward toward the leading edge"], why: "The spanwise pressure gradient on an aft-swept wing drives boundary-layer fluid outboard, which is why fences and washout are used." },
    { q: "A forward-swept wing (such as the X-29) tends to…", a: "load the root more heavily, so the root stalls first", w: ["load the tips more heavily, so the tips stall first", "have exactly elliptic loading", "have no induced drag"], why: "The bound vortex of each panel induces upwash on the other, loading the root; this avoids tip stall but moves the center of pressure forward at stall." },
    { q: "Sweeping a wing back (at the same aspect ratio)…", a: "raises the critical Mach number but lowers the lift-curve slope", w: ["lowers the critical Mach number and raises the lift slope", "has no effect at subsonic speed", "eliminates induced drag"], why: "Only the normal component M∞ cos Λ governs compressibility, raising M_cr; the same reduction lowers the lift slope and maximum lift." },
    { q: "A wing with washout has a nonzero spanwise lift distribution at the angle where C_L = 0 (positive inboard, negative at the tips). At C_L = 0 its induced drag is…", a: "greater than zero", w: ["zero, because C_L = 0", "negative", "infinite"], why: "The basic lift distribution still sheds trailing vorticity, so there is downwash and induced drag even though the net lift is zero." },
    { q: "Lifting winglets reduce induced drag mainly by…", a: "moving the tip vortex outward and redistributing the trailing vorticity", w: ["eliminating the tip vortex", "increasing the wing's skin friction", "raising the critical Mach number"], why: "Wake vortices cannot be eliminated; winglets spread the vorticity and partially cancel downwash, saving a few percent of induced drag." },
  ];
  reg("planform", { title: "Taper, sweep and twist", group: "Finite wings", part: "I", order: 2 }, bank(PLANFORM));

  const ASPECT = [
    { q: "Two untwisted rectangular wings use the same airfoil; wing A has the higher aspect ratio. Compared with wing B, wing A has…", a: "a larger lift-curve slope and the same zero-lift angle of attack", w: ["a smaller lift-curve slope and the same zero-lift angle", "the same lift-curve slope and a different zero-lift angle", "a larger lift-curve slope and a more negative zero-lift angle"], why: "a = a₀/(1 + a₀/(πeAR)) grows with AR; α_ZL is set by the airfoil (camber), not by AR." },
    { q: "Which statement about a slender delta wing compared with a high-aspect-ratio wing (low speed) is correct?", a: "The delta wing has a smaller lift-curve slope and stalls at a higher angle of attack", w: ["The delta wing has a larger lift-curve slope and stalls at a lower angle of attack", "The delta wing has a smaller lift-curve slope and stalls at a lower angle of attack", "Both have the same lift-curve slope"], why: "Low AR gives dC_L/dα ≈ (0.3–0.5)·2π, but the leading-edge vortices keep the flow organized to α ≈ 35° or more." },
    { q: "The maximum lift coefficient of a delta wing without high-lift devices, compared with a high-AR rectangular wing without high-lift devices, is…", a: "about the same (C_L,max ≈ 1.3, but reached at α ≈ 35°)", w: ["much smaller", "about three times larger", "zero, because delta wings stall immediately"], why: "Vortex lift lets the delta reach C_L,max ≈ 1.3, comparable to a high-AR wing, but at a much higher angle of attack." },
    { q: "Stall of a delta wing at high angle of attack is associated with…", a: "vortex breakdown moving forward over the wing", w: ["laminar separation bubble bursting at the leading edge", "the tip vortex disappearing", "shock waves forming at the trailing edge"], why: "As α increases the leading-edge vortices burst (break down) closer to the apex; once breakdown reaches the wing the vortex lift collapses." },
    { q: "Doubling the aspect ratio of a wing while keeping C_L and e fixed changes the induced drag coefficient by a factor of…", a: "1/2", w: ["2", "1/4", "1 (no change)"], why: "C_Di = C_L²/(πeAR) is inversely proportional to AR." },
    { q: "On a drag polar (C_D versus C_L), a wing with a higher aspect ratio but the same airfoil and C_D0 shows…", a: "the same C_D at C_L = 0 and a narrower parabola (less drag at a given C_L)", w: ["a higher C_D at C_L = 0", "a wider parabola", "a polar shifted to the left by a constant"], why: "C_D = C_D0 + C_L²/(πeAR): AR changes only the induced (quadratic) part." },
    { q: "For a thin airfoil (a₀ = 2π) on an elliptic wing of AR = 8, the wing lift slope is about what fraction of the airfoil value?", a: "0.80", w: ["0.67", "0.95", "1.00"], why: "a/a₀ = 1/(1 + 2/AR) = 1/(1.25) = 0.80." },
    { q: "Why are low-aspect-ratio delta wings used on supersonic aircraft despite their poor low-speed lift slope?", a: "Their highly swept leading edge can stay inside the Mach cone, reducing wave drag", w: ["They have no induced drag at low speed", "Their lift slope is higher than that of straight wings", "They never stall"], why: "A subsonic leading edge (inside the Mach cone) reduces wave drag; the price is a low lift slope at takeoff and landing." },
  ];
  reg("aspect", { title: "Aspect ratio and delta wings", group: "Finite wings", part: "I", order: 3 }, bank(ASPECT));

  // numeric multiple-choice from Fourier coefficients (wrong answers are common mistakes)
  reg("llt-coef", { title: "Lifting line: C_L and C_Di from Aₙ", group: "Finite wings", part: "I", order: 4, maxPer: 1 }, () => {
    const AR = R.pick([5, 6, 7, 8, 9, 10]), al = R.int(4, 10), A1 = +(R.u(0.025, 0.06, 0.0001)).toFixed(4), A3 = +(A1 * R.u(0.04, 0.15, 0.01)).toFixed(4), A5 = +(A1 * R.u(-0.05, 0.08, 0.01)).toFixed(4);
    const CL = Math.PI * AR * A1, delta = 3 * (A3 / A1) ** 2 + 5 * (A5 / A1) ** 2, CDi = CL * CL * (1 + delta) / (Math.PI * AR);
    const stem = `<p>Lifting-line analysis of a wing with an aspect ratio of ${AR} at an angle of attack of ${al}° gives the Fourier coefficients \\(A_1 = ${A1}\\), \\(A_3 = ${A3}\\), \\(A_5 = ${A5}\\) (even coefficients are zero).</p>`;
    if (R.rnd() < 0.5) return mc(stem + "<p>The lift coefficient of the wing is nearest…</p>", f(CL), [...new Set([f(A1 * AR), f(2 * Math.PI * AR * A1), f(Math.PI * AR * (A1 + A3 + A5)), f(Math.PI * A1), f(Math.PI * AR * A1 * A1)])].filter(v => v !== f(CL)).slice(0, 3),
      `<p>Only \\(A_1\\) contributes to lift: \\(C_L = \\pi\\,AR\\,A_1 = \\pi(${AR})(${A1}) = ${f(CL)}\\).</p>`, 3);
    return mc(stem + "<p>The induced drag coefficient of the wing is nearest…</p>", f(CDi), [...new Set([f(CL * CL / (Math.PI * AR)), f(CL * CL * (1 + delta)), f(Math.PI * AR * (A1 * A1 + A3 * A3 + A5 * A5)), f(CL * CL * (1 + delta) / AR), f(CL * (1 + delta) / (Math.PI * AR))])].filter(v => v !== f(CDi)).slice(0, 3),
      `<p>\\(C_L = \\pi AR A_1 = ${f(CL)}\\); \\(\\delta = 3(A_3/A_1)^2 + 5(A_5/A_1)^2 = ${f(delta)}\\); \\(C_{D_i} = \\dfrac{C_L^2}{\\pi AR}(1+\\delta) = ${f(CDi)}\\). (Equivalently \\(\\pi AR\\sum nA_n^2\\).) Forgetting δ gives the elliptic value ${f(CL * CL / (Math.PI * AR))}.</p>`, 3);
  });

  // spanwise distributions: match planforms to c_ℓ(y) or L′(y) from a lifting-line solution
  function planformSVG(lam, sweepFrac = 0) {
    const W = 90, H = 150, cr = 50, ct = cr * lam, x0 = 20;
    const pts = [[x0, 75], [x0 + cr, 75], [x0 + cr * 0.25 + ct * 0.75 + sweepFrac, 5], [x0 + cr * 0.25 - ct * 0.25 + sweepFrac, 5]];
    const low = [[x0 + cr * 0.25 - ct * 0.25 + sweepFrac, 145], [x0 + cr * 0.25 + ct * 0.75 + sweepFrac, 145]];
    return `<svg viewBox="0 0 ${W} ${H}" class="aq-svg aq-plan"><path d="M${x0} 75 L${pts[3][0]} 5 L${pts[2][0]} 5 L${x0 + cr} 75 L${low[1][0]} 145 L${low[0][0]} 145 Z" fill="var(--surface-2)" stroke="var(--text)"/><line x1="${x0 + cr * 0.25}" x2="${x0 + cr * 0.25}" y1="0" y2="150" stroke="var(--muted)" stroke-dasharray="3 3"/></svg>`;
  }
  function distSVG(ys, vals, label) {
    const W = 200, H = 110, m = 18;
    const ok = i => isFinite(vals[i]) && Math.abs(ys[i]) <= 0.97;
    const ymax = Math.max(1e-9, ...vals.filter((v, i) => ok(i))) * 1.12;
    const X = y => m + (y + 1) / 2 * (W - 2 * m), Y = v => H - m - v / ymax * (H - 2 * m);
    let pen = false;
    const d = ys.map((y, i) => { if (!ok(i)) { pen = false; return ""; } const c = pen ? "L" : "M"; pen = true; return `${c}${X(y).toFixed(1)} ${Y(vals[i]).toFixed(1)}`; }).join(" ");
    return `<svg viewBox="0 0 ${W} ${H}" class="aq-svg"><line x1="${m}" x2="${W - m}" y1="${H - m}" y2="${H - m}" stroke="var(--muted)"/><line x1="${W / 2}" x2="${W / 2}" y1="${m - 6}" y2="${H - m}" stroke="var(--muted)" stroke-dasharray="2 3"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="${W - m}" y="${H - 4}" font-size="10" text-anchor="end">2y/b</text><text x="${m}" y="${m - 6}" font-size="10">${label}</text></svg>`;
  }
  reg("span-match", { title: "Spanwise loading of tapered wings", group: "Finite wings", part: "I", order: 5, maxPer: 1 }, () => {
    const AR = R.pick([6, 7, 8, 9, 10]), lams = R.pick([[0.1, 0.4, 1.0], [0.05, 0.3, 1.0], [0.15, 0.5, 1.0], [0.2, 0.6, 1.0]]), alpha = R.int(4, 8);
    const sols = lams.map(l => liftingLine({ AR, lam: l, alphaDeg: alpha }));
    const kind = R.pick(["cl", "Lp", "eff"]);
    const roman = ["I", "II", "III"], ids = ["(i)", "(ii)", "(iii)"];
    const intro = `<p>Three untwisted, unswept wings (quarter-chord lines straight) have an aspect ratio of ${AR} and symmetric airfoils, at α = ${alpha}°. Their taper ratios are λ = c_t/c_r = ${lams.join(", ")} for wings (i), (ii) and (iii).</p>
      <div class="aq-figrow">${lams.map((l, k) => `<figure>${planformSVG(l)}<figcaption>${ids[k]} λ = ${l}</figcaption></figure>`).join("")}</div>`;
    if (kind === "eff") {
      const best = sols.map(s => s.e).indexOf(Math.max(...sols.map(s => s.e)));
      return mc(intro + "<p>Which wing has the highest span efficiency factor e?</p>", `Wing ${ids[best]}`, ids.filter((_, k) => k !== best).map(x => `Wing ${x}`),
        `<p>Lifting-line solutions (15 odd terms): ${sols.map((s, k) => `${ids[k]} e = ${f(s.e, 4)}`).join(", ")}. The induced-drag factor δ is smallest for a moderate taper (λ ≈ 0.3–0.5), whose loading is closest to elliptic; the rectangular wing loads its tips too much and the pointed wing too little near the root.</p>`, 2);
    }
    const order = R.shuffle([0, 1, 2]), vals = sols.map(s => kind === "cl" ? s.cl : s.Lp);
    const lab = kind === "cl" ? "c_ℓ(y)" : "L′(y)/(L/b)";
    const q = intro + `<p>Match each wing to its spanwise ${kind === "cl" ? "section lift coefficient distribution c<sub>ℓ</sub>(y)" : "lift distribution L′(y)/(L/b)"} (I, II or III). All must be correct for credit.</p>
      <div class="aq-figrow">${order.map((w, k) => `<figure>${distSVG(sols[w].ys, vals[w], lab)}<figcaption>(${roman[k]})</figcaption></figure>`).join("")}</div>`;
    const answers = [0, 1, 2].map(w => order.indexOf(w));
    const sol = kind === "cl"
      ? `<p>Small tip chords force a high local c<sub>ℓ</sub> near the tips: the most tapered wing (λ = ${lams[0]}) has c<sub>ℓ</sub> peaking outboard (tip-stall prone); the rectangular wing (λ = 1) has c<sub>ℓ</sub> largest at the root and falling toward the tips; the moderate taper is nearly flat (closest to elliptic). Answers: (i) → ${roman[answers[0]]}, (ii) → ${roman[answers[1]]}, (iii) → ${roman[answers[2]]}.</p>`
      : `<p>The load L′ = q c c<sub>ℓ</sub> follows the chord: the rectangular wing has the fullest (flattest) load distribution, the most tapered the most peaked (triangular-looking) one. Answers: (i) → ${roman[answers[0]]}, (ii) → ${roman[answers[1]]}, (iii) → ${roman[answers[2]]}.</p>`;
    return { type: "match", q, items: ids.map(x => `Wing ${x}`), options: roman, answers, pts: 3, sol };
  });

  // which sketch is correct
  reg("sketch", { title: "Lift curves, drag polars, C_M–C_L", group: "Finite wings and stability", part: "I", order: 6, maxPer: 1 }, () => {
    const kind = R.pick(["ar", "delta", "polar", "cm"]);
    let opts = [], q = "", why = "";
    if (kind === "ar") {
      q = "<p>Which sketch correctly shows the lift curves C<sub>L</sub>(α) of two untwisted wings with the same cambered airfoil but different aspect ratios?</p>";
      const ax = { x: [-8, 26], y: [-0.6, 1.6], xl: "α (°)", yl: "C_L" };
      opts = [
        sketch([{ pts: liftCurve(0.09, -3, 15, 1.4, 25), name: "higher AR" }, { pts: liftCurve(0.06, -3, 19, 1.32, 25), name: "lower AR" }], ax),
        sketch([{ pts: liftCurve(0.06, -3, 15, 1.4, 25), name: "higher AR" }, { pts: liftCurve(0.09, -3, 19, 1.32, 25), name: "lower AR" }], ax),
        sketch([{ pts: liftCurve(0.09, -3, 15, 1.4, 25), name: "higher AR" }, { pts: liftCurve(0.06, 2, 21, 1.32, 25), name: "lower AR" }], ax),
        sketch([{ pts: liftCurve(0.075, -3, 15, 1.45, 25), name: "higher AR" }, { pts: liftCurve(0.075, -3, 15, 1.1, 25), name: "lower AR" }], ax),
      ];
      why = "Both curves cross zero at the same α_ZL (set by the airfoil); the higher-AR wing is steeper, a = a₀/(1 + a₀/(πeAR)), and reaches its stall at a lower α.";
    } else if (kind === "delta") {
      q = "<p>Which sketch correctly compares the low-speed lift curve of a delta wing with that of a high-aspect-ratio wing?</p>";
      const ax = { x: [-5, 45], y: [-0.3, 1.6], xl: "α (°)", yl: "C_L" };
      opts = [
        sketch([{ pts: liftCurve(0.09, 0, 15, 1.35), name: "high AR", lab: 40 }, { pts: liftCurve(0.04, 0, 35, 1.3), name: "delta", lab: 80 }], ax),
        sketch([{ pts: liftCurve(0.04, 0, 15, 1.0), name: "high AR", lab: 40 }, { pts: liftCurve(0.09, 0, 35, 1.4), name: "delta", lab: 80 }], ax),
        sketch([{ pts: liftCurve(0.09, 0, 30, 1.4), name: "high AR", lab: 70 }, { pts: liftCurve(0.04, 0, 12, 0.5), name: "delta", lab: 40 }], ax),
        sketch([{ pts: liftCurve(0.06, 0, 20, 1.3), name: "high AR", lab: 40 }, { pts: liftCurve(0.06, 0, 20, 1.3), name: "delta", dash: true, lab: 60 }], ax),
      ];
      why = "The delta wing's lift slope is much smaller (≈ 0.3–0.5 × 2π), its stall angle much higher (≈ 35°), and its C_L,max about the same as the high-AR wing's.";
    } else if (kind === "polar") {
      q = "<p>Which sketch correctly shows the drag polars C<sub>D</sub>(C<sub>L</sub>) of two wings with the same airfoil (same C<sub>D0</sub>) and different aspect ratios?</p>";
      const ax = { x: [-0.2, 1.3], y: [0, 0.12], xl: "C_L", yl: "C_D" };
      const pol = (k, cd0) => Array.from({ length: 31 }, (_, i) => { const cl = -0.15 + 1.4 * i / 30; return [cl, cd0 + k * cl * cl]; });
      opts = [
        sketch([{ pts: pol(0.035, 0.012), name: "higher AR" }, { pts: pol(0.07, 0.012), name: "lower AR" }], ax),
        sketch([{ pts: pol(0.07, 0.012), name: "higher AR" }, { pts: pol(0.035, 0.012), name: "lower AR" }], ax),
        sketch([{ pts: pol(0.05, 0.03), name: "higher AR" }, { pts: pol(0.05, 0.012), name: "lower AR" }], ax),
        sketch([{ pts: pol(0.035, 0.03), name: "higher AR" }, { pts: pol(0.07, 0.008), name: "lower AR" }], ax),
      ];
      why = "C_D = C_D0 + C_L²/(πeAR): both polars meet at C_L = 0 (same C_D0), and the higher-AR polar is narrower.";
    } else {
      q = "<p>Which C<sub>M,cg</sub> versus C<sub>L</sub> line describes an airplane that is longitudinally statically stable AND able to trim in steady level flight?</p>";
      const ax = { x: [-0.3, 1.2], y: [-0.25, 0.25], xl: "C_L", yl: "C_M,cg" };
      const ln = (c0, s) => [[-0.25, c0 + s * -0.25], [1.15, c0 + s * 1.15]];
      opts = [sketch([{ pts: ln(0.12, -0.2), name: "" }], ax), sketch([{ pts: ln(-0.12, 0.2), name: "" }], ax), sketch([{ pts: ln(-0.08, -0.2), name: "" }], ax), sketch([{ pts: ln(0.12, 0.2), name: "" }], ax)];
      why = "Stability needs dC_M/dC_L < 0 (restoring moment). To trim (C_M = 0) at a positive lift coefficient, C_M at C_L = 0 must then be positive.";
    }
    const order = R.shuffle([0, 1, 2, 3]);
    return { type: "mc", q, choices: order.map(k => opts[k]), answer: order.indexOf(0), pts: 3, sol: `<p>${why}</p>` };
  });

  const STAB = [
    { q: "For an airplane to be longitudinally statically stable AND trimmable at positive lift, the C_M,cg–C_L line must have…", a: "a negative slope and a positive value at C_L = 0", w: ["a positive slope and a negative value at C_L = 0", "a negative slope and a negative value at C_L = 0", "a zero slope"], why: "Stability: ∂C_M/∂C_L < 0 (equivalently C_Mα < 0). Trim at C_L > 0 then requires C_M,0 > 0." },
    { q: "Loading cargo near the rear of an airplane (moving the CG aft) will…", a: "make the airplane less stable", w: ["make the airplane more stable", "have no effect on static stability", "move the neutral point aft by the same amount"], why: "The static margin SM = x̄_np − x̄_cg shrinks as the CG moves aft; the neutral point is fixed by the geometry." },
    { q: "With a conventional aft tail, longitudinal static stability can be increased by…", a: "both enlarging the horizontal tail and moving it farther aft", w: ["only enlarging the tail", "only moving the tail farther aft", "neither; only the CG matters"], why: "Both raise the tail volume coefficient V_H = S_t ℓ_t/(S_w c̄), moving the neutral point aft and increasing the static margin." },
    { q: "An airplane is statically NEUTRALLY stable in pitch. Where is its center of gravity?", a: "at the neutral point", w: ["ahead of the neutral point", "behind the neutral point", "at the wing aerodynamic center, always"], why: "SM = x̄_np − x̄_cg = 0 means C_Mα = 0: the CG coincides with the neutral point." },
    { q: "Static margin is defined as…", a: "x̄_np − x̄_cg, and it equals −C_Mα/C_Lα", w: ["x̄_cg − x̄_np", "C_Mα · C_Lα", "the distance from the wing to the tail"], why: "Positive SM (CG ahead of the neutral point) means a stable airplane; SM = −dC_M/dC_L." },
    { q: "Changing the horizontal-tail incidence i_t (in the linear model) mainly changes…", a: "C_M,0 and the trim lift coefficient, but not the static margin", w: ["the static margin only", "the neutral point and the static margin", "nothing"], why: "i_t shifts the C_M line up or down (changes C_M,0 and the trim point); the slope C_Mα, and so the static margin, depend on V_H, the lift slopes and the downwash gradient." },
    { q: "Why does the downwash from the wing reduce the stabilizing effect of the tail?", a: "The tail sees an angle of attack change of only (1 − dε/dα)Δα", w: ["Downwash increases the tail lift slope", "Downwash moves the CG", "Downwash has no effect on the tail"], why: "When α increases by Δα, the downwash at the tail increases by (dε/dα)Δα, so the tail angle increases only by (1 − dε/dα)Δα." },
    { q: "A flying wing built from a conventional cambered airfoil (c_m,ac < 0) with no sweep and no twist…", a: "cannot be both stable and trimmed at positive lift", w: ["is always stable", "trims at a positive lift coefficient automatically", "has no pitching moment"], why: "With the CG ahead of the aerodynamic center (stable), C_M at C_L = 0 equals c_m,ac < 0, so it trims only at negative C_L. Flying wings use reflexed airfoils or sweep with washout." },
    { q: "The tail volume coefficient is…", a: "V_H = S_t ℓ_t/(S_w c̄_w), a measure of the tail's moment-generating power", w: ["the volume of the tail in cubic meters", "S_w/S_t", "the ratio of tail to wing aspect ratios"], why: "The tail's pitching moment coefficient about the CG is −V_H C_L,t, so V_H measures how effective the tail is at providing a restoring moment." },
    { q: "In order to have a longitudinally stable airplane, C_M at C_L = 0 should be ___ and C_Mα should be ___.", a: "positive; negative", w: ["negative; positive", "zero; zero", "positive; positive"], why: "C_Mα < 0 gives a restoring moment; with it, C_M,0 > 0 is needed for trim at positive lift (C_M,0 itself is a trim requirement)." },
  ];
  reg("stab-concept", { title: "Longitudinal static stability", group: "Stability", part: "I", order: 7 }, bank(STAB));

  const THERMO = [
    { q: "Adiabatic means…", a: "there is no heat transfer", w: ["the stagnation pressure does not change", "the static temperature does not change", "the process is reversible"], why: "Adiabatic: q = 0. An adiabatic process can still be irreversible (a shock)." },
    { q: "Which condition is sufficient for a process to be isentropic?", a: "adiabatic and reversible", w: ["adiabatic only", "reversible only", "constant temperature"], why: "ds = δq_rev/T + (generation); both no heat transfer and no irreversibility are needed." },
    { q: "Across a normal shock the flow is…", a: "adiabatic but not isentropic", w: ["isentropic", "isothermal", "neither adiabatic nor isentropic"], why: "No heat is added, so h₀ and T₀ are constant, but the shock is irreversible: entropy rises and p₀ falls." },
    { q: "Enthalpy differs from internal energy by…", a: "the flow work: h = e + p/ρ = e + pv", w: ["the kinetic energy", "the heat added", "nothing; they are the same"], why: "h = e + pv; for an ideal gas with constant specific heats h = c_pT and e = c_vT." },
    { q: "For air at typical temperatures (say 200–1000 K), the ratio of specific heats is about…", a: "1.4", w: ["1.0", "1.67", "1.2"], why: "Diatomic N₂ and O₂ with translation and rotation excited: γ = 7/5. Monatomic gases (He, Ar) have 5/3; hot polyatomic gases approach 1.1–1.3." },
    { q: "Which relation holds for a calorically perfect gas?", a: "c_p − c_v = R and γ = c_p/c_v", w: ["c_p + c_v = R", "c_p = γR", "c_v = R/γ"], why: "c_p − c_v = R gives c_p = γR/(γ−1) = 1004.5 J/(kg K) and c_v = R/(γ−1) for air." },
    { q: "In an adiabatic but irreversible process, the entropy…", a: "increases", w: ["decreases", "stays constant", "can do either"], why: "The second law: with no heat transfer, ds ≥ 0, with equality only if reversible." },
    { q: "The 'rule of thumb' for when compressibility must be considered is…", a: "M > 0.3", w: ["M > 1", "M > 0.8", "any Mach number above 0.05"], why: "Density changes of about 5% occur by M ≈ 0.3 (ρ₀/ρ = 1.046)." },
  ];
  reg("thermo", { title: "Thermodynamics", group: "Compressible flow", part: "I", order: 8 }, R0 => {
    if (R.rnd() < 0.3) {
      const ch = ["Ideal gas with constant specific heats", "Inviscid flow (or 1-D flow, such as flow through a shock)", "Steady flow", "Adiabatic flow", "No body forces (or body forces neglected)", "Incompressible flow"];
      const right = [1, 2, 3, 4], order = R.shuffle([0, 1, 2, 3, 4, 5]);
      return { type: "multi", q: "<p>Which of the following conditions are necessary for the stagnation enthalpy h₀ = h + V²/2 to be constant along a streamline? (Circle all that apply; all must be correct.)</p>", choices: order.map(k => ch[k]), answers: right.map(k => order.indexOf(k)), pts: 2,
        sol: "<p>The energy equation gives Dh₀/Dt = (1/ρ)∂p/∂t + q̇ + (viscous work) + (body-force work). So h₀ is constant along a streamline for steady, adiabatic, inviscid flow with no body forces. The gas need not be ideal or calorically perfect, and the flow need not be incompressible.</p>" };
    }
    return bank(THERMO)();
  });

  const ISEN = [
    { q: "For isentropic flow with fixed p₀ and T₀, as the Mach number increases the static temperature T…", a: "decreases", w: ["increases", "remains fixed"], why: "T₀/T = 1 + (γ−1)M²/2 increases with M, so T falls." },
    { q: "If the flow is subsonic, which quantity has the smallest value?", a: "p*, the sonic pressure", w: ["p₀, the stagnation pressure", "p, the static pressure"], why: "For M < 1, p lies between p* (M = 1) and p₀ (M = 0): p* < p < p₀." },
    { q: "If the flow is supersonic, which quantity has the largest value?", a: "p₀, the stagnation pressure", w: ["p*, the sonic pressure", "p, the static pressure"], why: "p₀ is the largest of all; for M > 1, p < p* < p₀." },
    { q: "If the flow is supersonic, which quantity has the smallest value?", a: "a, the local speed of sound", w: ["a*, the sonic speed of sound", "a₀, the stagnation speed of sound"], why: "a ∝ √T and for M > 1, T < T* < T₀." },
    { q: "For air (γ = 1.4), the sonic-to-stagnation ratios are…", a: "T*/T₀ = 0.8333 and p*/p₀ = 0.5283", w: ["T*/T₀ = 0.5283 and p*/p₀ = 0.8333", "T*/T₀ = 0.5 and p*/p₀ = 0.5", "T*/T₀ = 1 and p*/p₀ = 1"], why: "T*/T₀ = 2/(γ+1) = 0.8333; p*/p₀ = (2/(γ+1))^{γ/(γ−1)} = 0.5283." },
    { q: "In an adiabatic flow (isentropic or not), which quantity is constant?", a: "the stagnation temperature T₀", w: ["the stagnation pressure p₀", "the static temperature", "the Mach number"], why: "Adiabatic, no work: h₀ = c_pT₀ is constant. p₀ is constant only if the flow is also reversible." },
    { q: "The pressure measured at the tip of a Pitot probe in a SUPERSONIC stream is…", a: "less than the freestream stagnation pressure, because a shock stands ahead of the probe", w: ["equal to the freestream stagnation pressure", "greater than the freestream stagnation pressure", "equal to the freestream static pressure"], why: "The probe measures p₀₂ behind a normal shock; total pressure is lost across the shock, so p₀₂ < p₀∞. Use the Rayleigh–Pitot formula to find M∞." },
    { q: "A thermocouple at the stagnation point of a probe in a supersonic stream reads (ideally)…", a: "the freestream stagnation temperature T₀∞", w: ["the freestream static temperature", "a temperature lower than T₀∞ because of the shock", "the wall temperature only"], why: "The shock is adiabatic, so T₀ is the same on both sides; the probe brings the flow to rest and (ideally) reads T₀∞." },
  ];
  reg("isen-concept", { title: "Isentropic flow and Pitot probes", group: "Compressible flow", part: "I", order: 9 }, bank(ISEN));

  const SHOCKM1 = [
    ["the downstream Mach number M₂", "decreases", "M₂ falls from 1 toward √((γ−1)/(2γ)) = 0.378 as M₁ → ∞."],
    ["the downstream stagnation temperature T₀₂", "remains fixed", "The shock is adiabatic: T₀₂ = T₀₁ whatever M₁ is."],
    ["the downstream stagnation pressure p₀₂", "decreases", "The total-pressure loss grows with shock strength: p₀₂/p₀₁ falls."],
    ["the static pressure ratio p₂/p₁", "increases", "p₂/p₁ = 1 + 2γ(M₁² − 1)/(γ+1) grows with M₁."],
    ["the entropy rise s₂ − s₁", "increases", "Δs = −R ln(p₀₂/p₀₁) grows as p₀₂/p₀₁ falls."],
    ["the density ratio ρ₂/ρ₁", "increases", "ρ₂/ρ₁ rises toward its limit (γ+1)/(γ−1) = 6."],
  ];
  reg("shock-m1", { title: "Normal shocks: trends with M₁", group: "Compressible flow", part: "I", order: 10 }, () => {
    const [qty, right, why] = R.pick(SHOCKM1), all = ["increases", "decreases", "remains fixed"];
    return mc(`<p>In flow through a normal shock with fixed upstream stagnation pressure p₀₁ and stagnation temperature T₀₁, as the upstream Mach number M₁ increases, ${qty}…</p>`, right, all.filter(x => x !== right), `<p>${why}</p>`);
  });

  // increase / decrease / same tables
  const QTY = {
    M: ["Mach number, M", { shock: 1, acc: 0, dec: 1 }], p: ["Static pressure, p", { shock: 0, acc: 1, dec: 0 }], T: ["Static temperature, T", { shock: 0, acc: 1, dec: 0 }],
    rho: ["Density, ρ", { shock: 0, acc: 1, dec: 0 }], u: ["Velocity, u", { shock: 1, acc: 0, dec: 1 }], p0: ["Total pressure, p₀", { shock: 1, acc: 2, dec: 2 }],
    T0: ["Total temperature, T₀", { shock: 2, acc: 2, dec: 2 }], s: ["Entropy, s", { shock: 0, acc: 2, dec: 2 }], h0: ["Stagnation enthalpy, h₀", { shock: 2, acc: 2, dec: 2 }],
    a: ["Speed of sound, a", { shock: 0, acc: 1, dec: 0 }], w: ["Velocity tangential to the shock, w (oblique shock)", { shock: 2 }], mf: ["Mass flux, ρu", { shock: 2 }],
  };
  reg("trend-table", { title: "Increase, decrease or same", group: "Compressible flow", part: "I", order: 11, maxPer: 1 }, () => {
    const sc = R.pick(["shock", "shock", "sup-div", "sub-conv", "sub-div", "sup-conv"]);
    const kind = sc === "shock" ? "shock" : (sc === "sup-div" || sc === "sub-conv") ? "acc" : "dec";
    const keys = kind === "shock" ? R.sample(["M", "p", "T", "rho", "u", "p0", "T0", "s", "a", "w", "mf", "h0"], 7) : R.sample(["M", "p", "T", "rho", "u", "p0", "T0", "s", "a"], 5);
    const desc = { shock: "Going from upstream (state 1) to downstream (state 2) across a normal shock wave (for w, consider an oblique shock)",
      "sup-div": "In the diverging section of a converging–diverging nozzle with supersonic isentropic flow, moving downstream from station 1 to station 2",
      "sub-conv": "In the converging section of a nozzle with subsonic isentropic flow, moving downstream from station 1 to station 2",
      "sub-div": "In a subsonic isentropic diffuser (diverging duct), moving downstream from station 1 to station 2",
      "sup-conv": "In a converging duct carrying supersonic isentropic flow (a supersonic diffuser), moving downstream from station 1 to station 2" }[sc];
    const answers = keys.map(k => QTY[k][1][kind]);
    const reason = kind === "shock" ? "Across a normal shock M drops below 1, p, T, ρ and a rise, u falls, the process is adiabatic (T₀ and h₀ constant) but irreversible (s rises, p₀ falls). Mass flux ρu and the tangential velocity are conserved."
      : kind === "acc" ? "This flow accelerates (subsonic flow speeds up in a converging duct; supersonic flow speeds up in a diverging one): M and u increase, while p, T, ρ and a decrease. Isentropic means p₀, T₀, h₀ and s stay the same."
      : "This flow decelerates (subsonic flow slows in a diverging duct; supersonic flow slows in a converging one): M and u decrease, while p, T, ρ and a increase. Isentropic means p₀, T₀, h₀ and s stay the same.";
    return { type: "table", q: `<p>${desc}, mark whether each quantity increases, decreases or stays the same.</p>`, rows: keys.map(k => QTY[k][0]), cols: ["Increase", "Decrease", "Same"], answers, pts: kind === "shock" ? 7 : 5,
      sol: `<p>${reason}</p>${steps(keys.map((k, i) => [QTY[k][0], "", ["increases", "decreases", "same"][answers[i]]]))}` };
  });

  // =====================================================================================
  // PART II — quantitative
  // =====================================================================================
  // ---------- stability and trim (two styles) ----------
  reg("p2-stab", { title: "Wing–tail stability and trim", group: "Stability", part: "II" }, () => {
    const a0w = R.pick([0.1, 0.10472, 0.105, 0.108, 0.11]) / D, a0lw = -R.pick([1.5, 2, 2.5, 3, 3.5, 4]) * D, cmac = -R.pick([0.03, 0.04, 0.05, 0.06, 0.07, 0.08]);
    const Sw = R.pick([12, 15, 16, 18, 20, 24]), ARw = R.pick([5, 6, 7, 8]), St = +(Sw * R.pick([0.15, 0.18, 0.2, 0.22, 0.25])).toFixed(2), ARt = R.pick([3, 3.5, 4, 4.5]);
    const lt = R.pick([3, 3.5, 4, 4.5, 5]), cw = Math.sqrt(Sw / ARw);
    if (R.rnd() < 0.55) {
      // style A: weight and speed given; CG chosen for a given static margin; trimmed lift split, α and i_t
      const m = R.int(900, 2400), V = R.u(55, 85, 0.5), rho = 1.225, SMt = R.pick([0.1, 0.12, 0.15, 0.18, 0.2]), iw = R.pick([0, 1, 2]) * D;
      const base = airplane({ a0w, a0lw, cmac, Sw, ARw, St, ARt, a0t: 2 * Math.PI, lt, kappa: 2, xac: 0.25, xcg: 0.25, iw, it: 0 });
      const xcg = base.xnp - SMt;
      const CL = 2 * m * g0 / (rho * V * V * Sw);
      const CLt = (cmac + CL * (xcg - 0.25)) / base.VH, CLw = CL - base.r * CLt;
      const al = CLw / base.aw - iw + a0lw, it = CLt / base.at - (1 - base.de) * al + base.eps0;
      const q = `<p>An airplane of mass ${m} kg flies steady and level at sea level (ρ = 1.225 kg/m³) at ${V} m/s. Approximate the wing and the horizontal tail as untwisted and elliptically loaded. The rectangular wing has S<sub>w</sub> = ${Sw} m² and AR<sub>w</sub> = ${ARw}; its cambered airfoil has α<sub>0</sub> = ${f(a0lw / D, 3)}°, dc<sub>ℓ</sub>/dα = ${f(a0w * D, 5)} deg⁻¹ = ${f(a0w, 5)} rad⁻¹, its aerodynamic center at the quarter chord, and c<sub>m,ac</sub> = ${cmac}. The wing is set at an incidence i<sub>w</sub> = ${f(iw / D, 2)}° to the fuselage reference line. The rectangular horizontal tail has S<sub>t</sub> = ${St} m², AR<sub>t</sub> = ${ARt} and a symmetric airfoil with dc<sub>ℓ</sub>/dα = 2π rad⁻¹. The distance from the wing aerodynamic center to the tail aerodynamic center is ℓ<sub>t</sub> = ${lt} c̄<sub>w</sub>. Use dε/dα = κC<sub>Lα,w</sub>/(πAR<sub>w</sub>) with κ = 2, and maintain 4 significant digits.</p>
        <p>Determine (a) the airplane lift coefficient C<sub>L</sub>; (b) the airplane lift-curve slope C<sub>Lα</sub> (per radian) and the neutral point x̄<sub>np</sub>; (c) the CG location x̄<sub>cg</sub> = x<sub>cg</sub>/c̄<sub>w</sub> that gives a static margin of ${SMt}; (d) the wing and tail lift coefficients at trim, C<sub>L,w</sub> and C<sub>L,t</sub>; (e) the fuselage angle of attack α (deg) and the tail incidence i<sub>t</sub> (deg) needed to trim.</p>`;
      return { type: "num", q, parts: [
        { label: "(a) C<sub>L</sub>", ans: CL, pts: 3 }, { label: "(b) C<sub>Lα</sub> (rad⁻¹)", ans: base.CLa, pts: 4 }, { label: "(b) x̄<sub>np</sub>", ans: base.xnp, pts: 4, tol: 0.01 },
        { label: "(c) x̄<sub>cg</sub>", ans: xcg, pts: 4, tol: 0.01 }, { label: "(d) C<sub>L,t</sub>", ans: CLt, pts: 3, tol: 0.03 }, { label: "(d) C<sub>L,w</sub>", ans: CLw, pts: 3 },
        { label: "(e) α (deg)", ans: al / D, pts: 2, tol: 0.03 }, { label: "(e) i<sub>t</sub> (deg)", ans: it / D, pts: 2, tol: 0.03 }],
        sol: `<p><b>(a)</b> Lift equals weight, and C<sub>L</sub> is based on the wing area only: C<sub>L</sub> = 2mg/(ρV²S<sub>w</sub>) = ${f(CL)}.</p>` + steps([
          ["Wing lift slope", "a<sub>w</sub> = a₀/(1 + a₀/(πAR<sub>w</sub>))", base.aw], ["Tail lift slope", "a<sub>t</sub> = 2π/(1 + 2π/(πAR<sub>t</sub>))", base.at], ["Downwash gradient", "dε/dα = 2a<sub>w</sub>/(πAR<sub>w</sub>)", base.de],
          ["Tail volume", "V<sub>H</sub> = (S<sub>t</sub>/S<sub>w</sub>)(ℓ<sub>t</sub>/c̄<sub>w</sub>)", base.VH], ["(b) C<sub>Lα</sub>", "a<sub>w</sub> + (S<sub>t</sub>/S<sub>w</sub>)a<sub>t</sub>(1 − dε/dα)", base.CLa],
          ["(b) x̄<sub>np</sub>", "x̄<sub>ac</sub> + V<sub>H</sub>a<sub>t</sub>(1 − dε/dα)/C<sub>Lα</sub>", base.xnp], ["(c) x̄<sub>cg</sub>", "x̄<sub>np</sub> − SM", xcg],
          ["(d) C<sub>L,t</sub>", "C<sub>M,cg</sub> = 0: [c<sub>m,ac</sub> + C<sub>L</sub>(x̄<sub>cg</sub> − x̄<sub>ac</sub>)]/V<sub>H</sub>", CLt], ["(d) C<sub>L,w</sub>", "C<sub>L</sub> − (S<sub>t</sub>/S<sub>w</sub>)C<sub>L,t</sub>", CLw],
          ["(e) α", "C<sub>L,w</sub>/a<sub>w</sub> − i<sub>w</sub> + α₀ (deg)", al / D], ["ε₀", "(dε/dα)(i<sub>w</sub> − α₀) (deg)", base.eps0 / D],
          ["(e) i<sub>t</sub>", "C<sub>L,t</sub>/a<sub>t</sub> − (1 − dε/dα)α + ε₀ (deg)", it / D]]) +
          `<p>Common mistakes: adding S<sub>t</sub> to S<sub>w</sub> in C<sub>L</sub>; using the airfoil slope dc<sub>ℓ</sub>/dα instead of the finite-wing C<sub>Lα</sub>; finding C<sub>L,w</sub> and C<sub>L,t</sub> without imposing C<sub>M,cg</sub> = 0.</p>`,
        verify: () => { const p = airplane({ a0w, a0lw, cmac, Sw, ARw, St, ARt, a0t: 2 * Math.PI, lt, kappa: 2, xac: 0.25, xcg, iw, it }); return Math.abs(p.CM(al)) < 1e-9 && Math.abs(p.CL(al) - CL) < 1e-9 && Math.abs(p.SM - SMt) < 1e-9; } };
    }
    // style B: CG and tail setting given; C_M at zero lift, C_Mα, static margin, trim angle (absolute angle of attack)
    const xcg = R.pick([0.2, 0.25, 0.3, 0.35, 0.4]) + R.pick([0, 0.02, 0.05]), it = -R.pick([1, 1.5, 2, 2.5, 3, 4]) * D;
    const P = airplane({ a0w, a0lw: 0, cmac, Sw, ARw, St, ARt, a0t: 2 * Math.PI, lt, kappa: 2, xac: 0.25, xcg, iw: 0, it });
    if (!(P.SM > 0.03)) return null;
    const aL0 = bisect(P.CL, -0.5, 0.5), CM0 = P.CM(aL0), atrim = bisect(P.CM, -0.6, 0.6);
    if (!isFinite(atrim) || P.CL(atrim) < 0.05) return null;
    const q = `<p>An airplane is modeled using just a wing and a horizontal stabilizer. Assume elliptic lift distributions on both. The wing (S<sub>w</sub> = ${Sw} m², AR<sub>w</sub> = ${ARw}) uses a cambered airfoil with dc<sub>ℓ</sub>/dα = ${f(a0w, 5)} rad⁻¹, c<sub>m,ac</sub> = ${cmac} and its aerodynamic center at x̄<sub>ac,w</sub> = 0.25. Measure angles from the wing's zero-lift line (absolute angle of attack α<sub>a</sub>). The tail (S<sub>t</sub> = ${St} m², AR<sub>t</sub> = ${ARt}) uses a symmetric airfoil with dc<sub>ℓ</sub>/dα = 2π rad⁻¹ and is set at i<sub>t</sub> = ${f(it / D, 3)}° relative to the wing zero-lift line. The tail aerodynamic center is ℓ<sub>t</sub> = ${lt} c̄<sub>w</sub> behind the wing aerodynamic center, and the CG is at x̄<sub>cg</sub> = ${xcg}. The downwash at the tail is ε = 0 + (dε/dα)α<sub>a</sub> with dε/dα = 2C<sub>Lα,w</sub>/(πAR<sub>w</sub>).</p>
      <p>Determine (a) the moment coefficient about the CG when the airplane lift coefficient is zero; (b) the slope C<sub>Mα</sub> with respect to the absolute angle of attack (rad⁻¹); (c) the static margin (percent of chord); (d) the absolute angle of attack at trim (deg) and the trim lift coefficient.</p>`;
    return { type: "num", q, parts: [{ label: "(a) C<sub>M,cg</sub> at C<sub>L</sub> = 0", ans: CM0, pts: 8, tol: 0.03 }, { label: "(b) C<sub>Mα</sub> (rad⁻¹)", ans: P.CMa, pts: 7 }, { label: "(c) SM (% chord)", ans: 100 * P.SM, pts: 4, tol: 0.02 },
      { label: "(d) α<sub>a,trim</sub> (deg)", ans: atrim / D, pts: 3, tol: 0.03 }, { label: "(d) C<sub>L,trim</sub>", ans: P.CL(atrim), pts: 3, tol: 0.03 }],
      sol: steps([["Wing lift slope", "a<sub>w</sub> = a₀/(1 + a₀/(πAR<sub>w</sub>))", P.aw], ["Tail lift slope", "a<sub>t</sub>", P.at], ["dε/dα", "2a<sub>w</sub>/(πAR<sub>w</sub>)", P.de], ["V<sub>H</sub>", "(S<sub>t</sub>/S<sub>w</sub>)(ℓ<sub>t</sub>/c̄)", P.VH],
        ["C<sub>Lα</sub>", "a<sub>w</sub> + (S<sub>t</sub>/S<sub>w</sub>)a<sub>t</sub>(1 − dε/dα)", P.CLa], ["α<sub>a</sub> at C<sub>L</sub> = 0 (deg)", "solve C<sub>L</sub> = a<sub>w</sub>α<sub>a</sub> + (S<sub>t</sub>/S<sub>w</sub>)a<sub>t</sub>[(1 − dε/dα)α<sub>a</sub> + i<sub>t</sub>] = 0", aL0 / D],
        ["C<sub>L,t</sub> there", "a<sub>t</sub>[(1 − dε/dα)α<sub>a</sub> + i<sub>t</sub>]", P.CLt(aL0)], ["(a) C<sub>M,cg</sub>", "c<sub>m,ac</sub> + C<sub>L</sub>(x̄<sub>cg</sub> − x̄<sub>ac</sub>) − V<sub>H</sub>C<sub>L,t</sub>, with C<sub>L</sub> = 0", CM0],
        ["(b) C<sub>Mα</sub>", "C<sub>Lα</sub>(x̄<sub>cg</sub> − x̄<sub>ac</sub>) − V<sub>H</sub>a<sub>t</sub>(1 − dε/dα)", P.CMa], ["x̄<sub>np</sub>", "x̄<sub>ac</sub> + V<sub>H</sub>a<sub>t</sub>(1 − dε/dα)/C<sub>Lα</sub>", P.xnp],
        ["(c) SM", "x̄<sub>np</sub> − x̄<sub>cg</sub> = −C<sub>Mα</sub>/C<sub>Lα</sub> (%)", 100 * P.SM], ["(d) α<sub>a,trim</sub> (deg)", "C<sub>M,cg</sub> = 0", atrim / D], ["(d) C<sub>L,trim</sub>", "", P.CL(atrim)]]),
      verify: () => Math.abs(P.CL(aL0)) < 1e-9 && Math.abs(P.CM(atrim)) < 1e-9 && Math.abs(P.SM + P.CMa / P.CLa) < 1e-9 };
  });
  const bisect = (fn, a, b) => GD.bisect(fn, a, b, 1e-13);

  // ---------- Pitot probe: subsonic and supersonic ----------
  reg("p2-pitot", { title: "Pitot probe: subsonic and supersonic", group: "Compressible flow", part: "II" }, () => {
    const pa = R.u(10, 60, 0.1), Ta = R.u(216, 250, 1), Ms = R.u(0.25, 0.85, 0.01), Mp = R.u(1.6, 4.2, 0.01);
    const p0a = pa * isen.p0_p(Ms, G), p02b = pa * ns(Mp, G).p02_p1, a = Math.sqrt(G * Rs * Ta);
    const q = `<p>An aircraft flies at an altitude where the atmospheric pressure and temperature are p<sub>a</sub> = ${pa} kPa and T<sub>a</sub> = ${Ta} K, and uses a Pitot tube to measure the stagnation pressure.</p>
      <p>(a) Determine the Mach number and speed of the aircraft if the Pitot-tube reading is ${f(p0a, 4)} kPa. (b) Determine the Mach number and speed if the reading is ${f(p02b, 4)} kPa. (c) For (b), determine the stagnation pressure of the freestream far upstream of the Pitot tube. (d) Determine the temperature at the tip of the Pitot tube (adiabatic) for (a) and for (b).</p>`;
    const p01 = pa * isen.p0_p(Mp, G);
    return { type: "num", q, parts: [
      { label: "(a) M∞", ans: Ms, pts: 1 }, { label: "(a) V∞ (m/s)", ans: Ms * a, pts: 1 }, { label: "(b) M∞", ans: Mp, pts: 2, tol: 0.02 }, { label: "(b) V∞ (m/s)", ans: Mp * a, pts: 2 },
      { label: "(c) p₀∞ (kPa)", ans: p01, pts: 4, tol: 0.03 }, { label: "(d) T<sub>tip</sub> for (a) (K)", ans: Ta * isen.T0_T(Ms, G), pts: 2 }, { label: "(d) T<sub>tip</sub> for (b) (K)", ans: Ta * isen.T0_T(Mp, G), pts: 3 }],
      sol: `<p>First test the reading: if p<sub>Pitot</sub>/p<sub>a</sub> &lt; (p₀/p)<sub>M=1</sub> = 1.893 the flow is subsonic and the isentropic relation applies; otherwise a normal shock stands ahead of the probe and the Rayleigh–Pitot formula applies. Here (a) gives ${f(p0a / pa)} (subsonic) and (b) gives ${f(p02b / pa)} (supersonic).</p>` + steps([
        ["(a) M∞", "√{(2/(γ−1))[(p₀/p)^((γ−1)/γ) − 1]}", Ms], ["a∞ (m/s)", "√(γRT<sub>a</sub>)", a], ["(a) V∞", "M∞a∞", Ms * a],
        ["(b) M∞", "invert p₀₂/p₁ = [(γ+1)²M²/(4γM² − 2(γ−1))]^(γ/(γ−1)) (1 − γ + 2γM²)/(γ+1)", Mp], ["(b) V∞", "M∞a∞", Mp * a],
        ["(c) p₀∞", "p<sub>a</sub>(p₀/p)<sub>M∞</sub>, isentropic, larger than the reading", p01], ["(d) T₀ (a)", "T<sub>a</sub>(1 + 0.2M²)", Ta * isen.T0_T(Ms, G)], ["(d) T₀ (b)", "T<sub>a</sub>(1 + 0.2M²): T₀ unchanged across the shock", Ta * isen.T0_T(Mp, G)]]) +
        `<p>The freestream p₀∞ exceeds the measured value because total pressure is lost across the bow shock (p₀₂/p₀₁ = ${f(ns(Mp, G).p02_p01)}). The mistake to avoid in (b) is using the isentropic relation across the shock, which would give M = ${f(isen.M_from_p0_p(p02b / pa, G))}.</p>`,
      verify: () => Math.abs(GD.normalShockFrom("p02_p1", p02b / pa, G).M1 - Mp) < 1e-6 };
  });

  // ---------- moving normal shock (blast wave) ----------
  reg("p2-blast", { title: "Moving normal shock (blast wave)", group: "Compressible flow", part: "II" }, () => {
    const W = R.int(500, 1800), TC = R.int(-10, 35), T1 = TC + 273.15, p1 = R.pick([1, 0.9, 0.8, 1]) * 101.325, a1 = Math.sqrt(G * Rs * T1), M1 = W / a1, s = ns(M1, G);
    const T2 = T1 * s.T2_T1, p2 = p1 * s.p2_p1, r2 = p2 * 1000 / (Rs * T2), a2 = Math.sqrt(G * Rs * T2), up = W - s.M2 * a2;
    if (R.rnd() < 0.5) return { type: "num", q: `<p>A planar blast wave propagates at ${W} m/s into still air at ${TC}° C and ${f(p1, 5)} kPa. (a) Determine the static temperature, static pressure and density of the air immediately after the wave has passed. (b) Determine the speed of the air immediately after the wave passes, relative to the still air ahead of it.</p>`,
      parts: [{ label: "(a) T₂ (K)", ans: T2, pts: 2 }, { label: "(a) p₂ (kPa)", ans: p2, pts: 2 }, { label: "(a) ρ₂ (kg/m³)", ans: r2, pts: 3 }, { label: "(b) u<sub>air</sub> (m/s)", ans: up, pts: 3, tol: 0.02 }],
      sol: `<p>Change to the frame moving with the wave: there, still air approaches the stationary shock at u₁ = W, so M₁ = W/a₁ and the normal-shock relations apply.</p>` + steps([["a₁", "√(γRT₁)", a1], ["M₁", "W/a₁", M1], ["T₂/T₁, p₂/p₁", "normal shock", `${f(s.T2_T1)}, ${f(s.p2_p1)}`], ["T₂ (K)", "", T2], ["p₂ (kPa)", "", p2], ["ρ₂", "p₂/(RT₂)", r2],
        ["M₂, a₂", "shock frame", `${f(s.M2)}, ${f(a2)} m/s`], ["u₂ (shock frame)", "M₂a₂", s.M2 * a2], ["(b) u<sub>air</sub>", "W − u₂, in the direction the wave moves", up]]) + "<p>The air behind the wave follows the wave.</p>",
      verify: () => Math.abs(up - W * (1 - 1 / s.rho2_rho1)) < 1e-6 };
    const pr = +(s.p2_p1).toPrecision(4), Mx = Math.sqrt(1 + (G + 1) / (2 * G) * (pr - 1)), sx = ns(Mx, G), Wx = Mx * a1, ux = Wx * (1 - 1 / sx.rho2_rho1);
    return { type: "num", q: `<p>A shock moves through still air at ${TC}° C and ${f(p1, 5)} kPa. After it passes, the pressure is ${f(pr * p1, 5)} kPa. Determine (a) the speed of the shock through the still air, (b) the speed of the air after the shock passes (and state its direction), and (c) the temperature behind the shock.</p>`,
      parts: [{ label: "(a) W (m/s)", ans: Wx, pts: 4 }, { label: "(b) u<sub>air</sub> (m/s)", ans: ux, pts: 4 }, { label: "(c) T₂ (K)", ans: T1 * sx.T2_T1, pts: 2 }],
      sol: steps([["p₂/p₁", "", pr], ["M₁ (shock frame)", "√(1 + (γ+1)(p₂/p₁ − 1)/(2γ))", Mx], ["(a) W", "M₁a₁", Wx], ["ρ₂/ρ₁", "normal shock", sx.rho2_rho1], ["(b) u<sub>air</sub>", "W(1 − ρ₁/ρ₂) = W − M₂a₂", ux], ["(c) T₂", "T₁(T₂/T₁)", T1 * sx.T2_T1]]) + "<p>The air moves in the same direction as the shock.</p>",
      verify: () => Math.abs(ux - (Wx - sx.M2 * Math.sqrt(G * Rs * T1 * sx.T2_T1))) < 1e-6 };
  });

  // ---------- stationary normal shock from a pressure ratio ----------
  reg("p2-shock", { title: "Stationary normal shock", group: "Compressible flow", part: "II" }, () => {
    const p1 = R.pick([101.325, 101.325, 50, 80, 26.5]), T1 = R.u(220, 300, 1), M1t = R.u(1.4, 3.5, 0.01), p2 = +(p1 * ns(M1t, G).p2_p1).toPrecision(4);
    const M1 = Math.sqrt(1 + (G + 1) / (2 * G) * (p2 / p1 - 1)), s = ns(M1, G), T2 = T1 * s.T2_T1, r2 = p2 * 1000 / (Rs * T2), T02 = T1 * isen.T0_T(M1, G), p01 = p1 * isen.p0_p(M1, G), p02 = p01 * s.p02_p01, ds = -Rs * Math.log(s.p02_p01);
    return { type: "num", q: `<p>Upstream of a stationary normal shock the pressure is ${f(p1, 6)} kPa and the temperature is ${T1} K. Downstream of the shock the pressure is ${f(p2, 5)} kPa. Determine M₁, M₂, T₂ (K), ρ₂ (kg/m³), T₀₂ (K), p₀₂ (kPa), h₀₂ (kJ/kg, with h = c<sub>p</sub>T) and the change in entropy s₂ − s₁ (J/(kg K)).</p>`,
      parts: [{ label: "M₁", ans: M1, pts: 2 }, { label: "M₂", ans: s.M2, pts: 1.5 }, { label: "T₂ (K)", ans: T2, pts: 1.5 }, { label: "ρ₂ (kg/m³)", ans: r2, pts: 1.5 }, { label: "T₀₂ (K)", ans: T02, pts: 1.5 },
        { label: "p₀₂ (kPa)", ans: p02, pts: 1.5 }, { label: "h₀₂ (kJ/kg)", ans: cpS * T02 / 1000, pts: 1 }, { label: "s₂ − s₁ (J/(kg K))", ans: ds, pts: 1.5, tol: 0.03 }],
      sol: steps([["M₁", "p₂/p₁ = 1 + 2γ(M₁² − 1)/(γ+1) → M₁ = √(1 + (γ+1)(p₂/p₁ − 1)/(2γ))", M1], ["M₂", "normal shock", s.M2], ["T₂", "T₁(T₂/T₁)", T2], ["ρ₂", "p₂/(RT₂)", r2],
        ["T₀₂ = T₀₁", "T₁(1 + 0.2M₁²): adiabatic shock", T02], ["p₀₁", "p₁(p₀/p)<sub>M₁</sub>", p01], ["p₀₂", "p₀₁(p₀₂/p₀₁)", p02], ["h₀₂", "c<sub>p</sub>T₀₂ (c<sub>p</sub> = 1004.5)", cpS * T02 / 1000], ["s₂ − s₁", "−R ln(p₀₂/p₀₁) = c<sub>p</sub>ln(T₂/T₁) − R ln(p₂/p₁)", ds]]),
      verify: () => Math.abs(ds - (cpS * Math.log(s.T2_T1) - Rs * Math.log(s.p2_p1))) < 0.05 };
  });

  // ---------- isentropic wind tunnel with a shock in the test section ----------
  reg("p2-tunnel", { title: "Isentropic nozzle and test-section shock", group: "Compressible flow", part: "II" }, () => {
    const eng = R.rnd() < 0.4, M = R.u(1.5, 3, 0.05);
    let T0, p0, Rg, cp, uT, uP, uV, txt;
    if (eng) { T0 = R.int(60, 90) + 459.67; p0 = R.u(29.5, 30.4, 0.01) * 0.4911541 / 14.696; Rg = Re; cp = cpE; uT = "°R"; uP = "atm"; uV = "ft/s"; txt = `${f(T0 - 459.67, 3)} °F and ${f(p0 * 14.696 / 0.4911541, 4)} inHg (${f(p0, 4)} atm)`; }
    else { T0 = R.int(280, 320); p0 = R.pick([1, 1, 2, 5]) * 1; Rg = Rs; cp = cpS; uT = "K"; uP = "atm"; uV = "m/s"; txt = `${T0} K and ${p0} atm`; }
    const T = T0 / isen.T0_T(M, G), p = p0 / isen.p0_p(M, G), u = M * Math.sqrt(G * Rg * T), Ts = T0 / 1.2, ps = p0 * 0.528282, us = Math.sqrt(G * Rg * Ts), s = ns(M, G);
    const T2 = T * s.T2_T1, p2 = p * s.p2_p1, u2 = s.M2 * Math.sqrt(G * Rg * T2), p02 = p0 * s.p02_p01, p2s = p02 * 0.528282;
    return { type: "num", q: `<p>An indraft wind tunnel pulls air from a large room at ${txt} through a converging–diverging nozzle into a test section at M<sub>ts</sub> = ${M}, and then into a vacuum tank. The flow into the test section is isentropic. Determine (a) the test-section temperature, pressure and velocity; (b) the throat (sonic) temperature, pressure and velocity; (c) the temperature, pressure and velocity just downstream of a stationary normal shock standing in the test section; (d) the sonic pressure p₂* that the flow downstream of the shock would reach if reaccelerated isentropically to M = 1. Use ${eng ? "R = 1716 ft·lbf/(slug·°R)" : "R = 287 J/(kg K)"}.</p>`,
      parts: [{ label: `(a) T<sub>ts</sub> (${uT})`, ans: T, pts: 1 }, { label: `(a) p<sub>ts</sub> (${uP})`, ans: p, pts: 1 }, { label: `(a) u<sub>ts</sub> (${uV})`, ans: u, pts: 1.5 },
        { label: `(b) T* (${uT})`, ans: Ts, pts: 1 }, { label: `(b) p* (${uP})`, ans: ps, pts: 1 }, { label: `(b) u* (${uV})`, ans: us, pts: 1.5 },
        { label: `(c) T₂ (${uT})`, ans: T2, pts: 2 }, { label: `(c) p₂ (${uP})`, ans: p2, pts: 2 }, { label: `(c) u₂ (${uV})`, ans: u2, pts: 2 }, { label: `(d) p₂* (${uP})`, ans: p2s, pts: 2 }],
      sol: steps([["(a) T", "T₀/(1 + 0.2M²)", T], ["(a) p", "p₀/(1 + 0.2M²)^3.5", p], ["(a) u", "M√(γRT)", u], ["(b) T*", "T₀/1.2 = 0.8333T₀", Ts], ["(b) p*", "0.5283p₀", ps], ["(b) u* = a*", "√(γRT*)", us],
        ["Shock ratios at M", "T₂/T₁, p₂/p₁, M₂", `${f(s.T2_T1)}, ${f(s.p2_p1)}, ${f(s.M2)}`], ["(c) T₂", "", T2], ["(c) p₂", "", p2], ["(c) u₂", "M₂√(γRT₂)", u2],
        ["p₀₂", "p₀(p₀₂/p₀₁)", p02], ["(d) p₂*", "0.5283p₀₂", p2s]]) + `<p>T₂* equals the throat T* (T₀ is unchanged by the shock), but p₂* is lower than p* by the factor p₀₂/p₀₁ = ${f(s.p02_p01)}: total pressure was lost in the shock.</p>`,
      verify: () => Math.abs(p2s / ps - s.p02_p01) < 1e-9 };
  });

  // ---------- elliptic wing performance ----------
  reg("p2-elliptic", { title: "Elliptic wing: lift, downwash, induced drag", group: "Finite wings", part: "II" }, () => {
    const m = R.int(800, 3000), V = R.u(40, 90, 1), rho = R.pick([1.225, 1.112, 1.007, 0.9093]), b = R.u(9, 16, 0.1), AR = R.pick([6, 7, 8, 9, 10]), S = b * b / AR, a0 = 2 * Math.PI * R.pick([0.95, 1]), al0 = -R.pick([0, 1, 2, 3]) * D;
    const q = 0.5 * rho * V * V, CL = m * g0 / (q * S), ai = CL / (Math.PI * AR), CDi = CL * CL / (Math.PI * AR), Di = q * S * CDi, G0 = 2 * V * S * CL / (Math.PI * b), w = -G0 / (2 * b), a = a0 / (1 + a0 / (Math.PI * AR)), al = al0 + CL / a;
    return { type: "num", q: `<p>An airplane of mass ${m} kg cruises at ${V} m/s where ρ = ${rho} kg/m³. Its untwisted wing has an elliptic lift distribution, a span of ${b} m and an aspect ratio of ${AR}; the airfoil has a₀ = ${f(a0, 4)} rad⁻¹ and α<sub>L=0</sub> = ${f(al0 / D, 2)}°. Neglect the lift of the tail and fuselage. Determine (a) C<sub>L</sub>; (b) the induced angle of attack (deg) and the downwash velocity w (m/s); (c) C<sub>Di</sub> and the induced drag D<sub>i</sub> (N); (d) the root circulation Γ₀ (m²/s); (e) the geometric angle of attack of the wing (deg).</p>`,
      parts: [{ label: "(a) C<sub>L</sub>", ans: CL, pts: 1.5 }, { label: "(b) α<sub>i</sub> (deg)", ans: ai / D, pts: 1.5 }, { label: "(b) w (m/s)", ans: w, pts: 1.5 }, { label: "(c) C<sub>Di</sub>", ans: CDi, pts: 1.5 }, { label: "(c) D<sub>i</sub> (N)", ans: Di, pts: 1.5 },
        { label: "(d) Γ₀ (m²/s)", ans: G0, pts: 1 }, { label: "(e) α (deg)", ans: al / D, pts: 1.5 }],
      sol: steps([["S", "b²/AR", S], ["(a) C<sub>L</sub>", "mg/(½ρV²S)", CL], ["(b) α<sub>i</sub>", "C<sub>L</sub>/(πAR) (deg)", ai / D], ["(b) w", "−V∞α<sub>i</sub> = −Γ₀/(2b) (negative = downward)", w], ["(c) C<sub>Di</sub>", "C<sub>L</sub>²/(πAR)", CDi], ["(c) D<sub>i</sub>", "q∞SC<sub>Di</sub>", Di],
        ["(d) Γ₀", "2V∞SC<sub>L</sub>/(πb)", G0], ["Lift slope a", "a₀/(1 + a₀/(πAR))", a], ["(e) α", "α<sub>L=0</sub> + C<sub>L</sub>/a (deg)", al / D]]),
      verify: () => Math.abs(w + V * ai) < 1e-9 && Math.abs(Di - (m * g0) * ai) < 1e-6 };
  });

  // ---------- lifting line from given Fourier coefficients ----------
  reg("p2-llt", { title: "Lifting line from Fourier coefficients", group: "Finite wings", part: "II" }, () => {
    const AR = R.pick([5, 6, 7, 8]), lam = R.pick([0.3, 0.5, 1]), al = R.int(3, 8), L = liftingLine({ AR, lam, alphaDeg: al, N: 4 });
    const A = L.A.map(x => +x.toPrecision(4)), b = R.u(8, 14, 0.5), V = R.u(40, 80, 1), rho = 1.225;
    const CL = Math.PI * AR * A[0], delta = [3, 5, 7].reduce((s, n, k) => s + n * (A[k + 1] / A[0]) ** 2, 0), e = 1 / (1 + delta), CDi = CL * CL * (1 + delta) / (Math.PI * AR);
    const ai0 = A[0] - 3 * A[1] + 5 * A[2] - 7 * A[3], G0 = 2 * b * V * (A[0] - A[1] + A[2] - A[3]);
    return { type: "num", q: `<p>Prandtl's lifting-line equation, enforced at θ = π/8, π/4, 3π/8 and π/2 for a ${lam === 1 ? "rectangular" : `tapered (λ = ${lam})`} untwisted wing of aspect ratio ${AR} at α = ${al}° (symmetric airfoil, a₀ = 2π), gives A₁ = ${A[0]}, A₃ = ${A[1]}, A₅ = ${A[2]}, A₇ = ${A[3]}, with Γ(θ) = 2bV∞ ΣAₙ sin nθ and y = −(b/2)cos θ. The span is ${b} m and V∞ = ${V} m/s at sea level. Determine (a) C<sub>L</sub>; (b) the induced-drag factor δ and the span efficiency e; (c) C<sub>Di</sub>; (d) the induced angle of attack at midspan (deg); (e) the circulation and the lift per unit span L′ at midspan.</p>`,
      parts: [{ label: "(a) C<sub>L</sub>", ans: CL, pts: 2 }, { label: "(b) δ", ans: delta, pts: 1.5, tol: 0.04 }, { label: "(b) e", ans: e, pts: 1, tol: 0.005 }, { label: "(c) C<sub>Di</sub>", ans: CDi, pts: 2 },
        { label: "(d) α<sub>i</sub>(y = 0) (deg)", ans: ai0 / D, pts: 1.5 }, { label: "(e) Γ(0) (m²/s)", ans: G0, pts: 1 }, { label: "(e) L′(0) (N/m)", ans: rho * V * G0, pts: 1 }],
      sol: steps([["(a) C<sub>L</sub>", "πAR A₁", CL], ["(b) δ", "Σ n(Aₙ/A₁)², n = 3, 5, 7", delta], ["(b) e", "1/(1 + δ)", e], ["(c) C<sub>Di</sub>", "C<sub>L</sub>²(1 + δ)/(πAR)", CDi],
        ["(d) α<sub>i</sub>(θ)", "Σ nAₙ sin nθ / sin θ; at θ = π/2: A₁ − 3A₃ + 5A₅ − 7A₇ (deg)", ai0 / D], ["(e) Γ(0)", "2bV∞(A₁ − A₃ + A₅ − A₇)", G0], ["(e) L′(0)", "ρ∞V∞Γ(0)", rho * V * G0]]),
      verify: () => Math.abs(CDi - Math.PI * AR * A.reduce((s, x, k) => s + (2 * k + 1) * x * x, 0)) < 1e-9 };
  });

  const H = { liftingLine, airplane, finiteSlope, solve };
  if (typeof module !== "undefined" && module.exports) module.exports = H;
  else root.AQH = H;
})(typeof window !== "undefined" ? window : globalThis);
