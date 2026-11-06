/*
 * gen-lessons.js — extra AAE 334 problem generators used by the lesson pages (conceptual and numerical).
 * They are registered with exam: "L" so the Exam 2 practice-exam generator keeps its own pool; each lesson's
 * practice section mixes these with the exam-style generators in gen-exam2.js.
 * Questions are original. γ = 1.4 and R = 287 J/(kg K) unless a problem says otherwise.
 */
(function (root) {
  "use strict";
  const GD = root.GD || require("../gasdyn.js");
  const AQ = root.AQ || require("./engine.js");
  const AQH = root.AQH || require("./gen-exam2.js");
  const R = AQ.R;
  const D = Math.PI / 180, g0 = 9.80665, G = 1.4, Rs = 287, cpS = 1004.5, RE = 1716, cpE = 6006;
  const f = (x, s = 4) => (root.UI ? root.UI.fmt(x, s) : String(+x.toPrecision(s)));
  const reg = (id, meta, gen) => AQ.register(id, Object.assign({ exam: "L", part: "I" }, meta), gen);
  const mc = (q, right, wrong, sol, pts = 2) => {
    const w = [...new Set(wrong.filter(x => x !== right))].slice(0, 4);
    const ch = R.shuffle([right, ...w]); return { type: "mc", q, choices: ch, answer: ch.indexOf(right), sol, pts };
  };
  const bank = list => () => { const it = R.pick(list); return mc(it.q, it.a, it.w, `<p>${it.why}</p>`); };
  const steps = rows => `<table class="data text ex">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${typeof r[2] === "number" ? f(r[2]) : r[2]}</td></tr>`).join("")}</table>`;
  const isen = GD.isen, NS = GD.normalShock;
  const fs = AQH.finiteSlope;

  // =====================================================================================
  // Lesson 1 — finite wings and lifting-line theory
  // =====================================================================================
  reg("L1-angles", { title: "Angles of attack, downwash and the lifting line", group: "Lesson 1 · Lifting line" }, bank([
    { q: "In Prandtl's lifting-line theory the geometric angle of attack α at a spanwise station equals…", a: "α_eff + α_i", w: ["α_eff − α_i", "α_i − α_eff", "α_eff · α_i"], why: "The downwash tilts the local relative wind downward by α_i, so the airfoil section only 'sees' α_eff = α − α_i; rearranged, α = α_eff + α_i." },
    { q: "The induced angle of attack α_i at a station is caused by…", a: "the downwash w induced there by the trailing vortex sheet", w: ["the boundary layer displacement thickness", "the bound vortex at that same station", "the camber of the airfoil section"], why: "A straight bound vortex induces no velocity on itself; the trailing vortices shed wherever dΓ/dy ≠ 0 induce w, and α_i ≈ −w/V∞." },
    { q: "Trailing vortices are shed from a lifting line wherever…", a: "the circulation changes along the span (dΓ/dy ≠ 0)", w: ["the chord is constant", "the local lift coefficient is largest", "the flow separates"], why: "Helmholtz: a vortex filament cannot end in the fluid. Each change dΓ in the bound circulation leaves a trailing filament of strength dΓ, so the vortex sheet strength is −dΓ/dy." },
    { q: "The local section lift per unit span on a lifting line is related to the circulation by…", a: "L′(y) = ρ∞V∞Γ(y)", w: ["L′(y) = ½ρ∞V∞²Γ(y)", "L′(y) = ρ∞Γ(y)²", "L′(y) = ρ∞V∞Γ(y)c(y)"], why: "Kutta–Joukowski applied strip by strip. Dividing by q∞c gives c_ℓ = 2Γ/(V∞c)." },
    { q: "Which assumption is NOT part of Prandtl's classical lifting-line theory?", a: "the wing may be highly swept or have low aspect ratio", w: ["the flow is inviscid and incompressible", "each section behaves like a 2-D airfoil at its effective angle of attack", "the trailing wake is flat and leaves the wing in the freestream direction"], why: "Lifting-line theory is for unswept (or mildly swept), moderate-to-high aspect ratio wings in attached, low-speed flow. Swept and delta wings need a lifting-surface (vortex-lattice) method." },
    { q: "Compared with the same airfoil in 2-D flow at the same geometric α, a finite wing produces…", a: "less lift and some induced drag", w: ["more lift and no extra drag", "the same lift and less drag", "the same lift and more drag"], why: "The downwash reduces the effective angle (less lift) and tilts the local lift vector back by α_i (induced drag D_i′ = L′α_i)." },
    { q: "Induced drag on a finite wing is best described as…", a: "the streamwise component of the local lift, tilted back by the downwash", w: ["skin-friction drag caused by the wingtip vortices", "pressure drag from flow separation at the tips", "wave drag from the tip vortices"], why: "In inviscid theory D_i′ = L′ sin α_i ≈ L′α_i; the energy goes into the kinetic energy of the trailing vortex wake. It is drag due to lift." },
    { q: "The Biot–Savart velocity induced at y₀ by a semi-infinite trailing filament of strength dΓ starting at y is…", a: "dΓ / [4π(y₀ − y)]  (half that of an infinite filament)", w: ["dΓ / [2π(y₀ − y)]  (same as an infinite filament)", "dΓ / [4π(y₀ − y)²]", "zero, because the filament is parallel to V∞"], why: "An infinite line vortex induces Γ/(2πh); a filament that starts at the lifting line and runs to +∞ induces half of that at a point on the line. With the sign convention, dw = −(dΓ/dy)dy/[4π(y₀ − y)]." },
  ]));
  reg("L1-ell-num", { title: "Elliptic wing: slope, α_i and α_eff", group: "Lesson 1 · Lifting line" }, () => {
    const AR = R.pick([4, 5, 6, 7, 8, 9, 10, 12]), a0 = R.pick([0.1, 0.105, 0.108, 0.11]) / D, al0 = -R.pick([0, 1, 1.5, 2, 2.5, 3]), al = R.int(2, 9);
    const a = fs(a0, AR), CL = a * (al - al0) * D, ai = CL / (Math.PI * AR), CDi = CL * CL / (Math.PI * AR), aeff = al - ai / D;
    return { type: "num", pts: 6,
      q: `<p>An untwisted wing with an elliptic lift distribution has an aspect ratio of ${AR}. Its airfoil has a lift slope a₀ = ${f(a0 * D, 4)} per degree and α<sub>L=0</sub> = ${al0}°. The wing is at a geometric angle of attack of ${al}°.</p><p>Find (a) the wing lift slope a (per degree), (b) C<sub>L</sub>, (c) the induced angle α<sub>i</sub> (deg), (d) the effective angle α<sub>eff</sub> (deg) and (e) C<sub>Di</sub>.</p>`,
      parts: [{ label: "(a) a (deg⁻¹)", ans: a * D, pts: 1.5 }, { label: "(b) C<sub>L</sub>", ans: CL, pts: 1 }, { label: "(c) α<sub>i</sub> (deg)", ans: ai / D, pts: 1.5 }, { label: "(d) α<sub>eff</sub> (deg)", ans: aeff, pts: 1, tol: 0.01 }, { label: "(e) C<sub>Di</sub>", ans: CDi, pts: 1 }],
      sol: steps([["a₀ in rad⁻¹", "a₀ × 180/π", a0], ["(a) a", "a₀/(1 + a₀/(πAR)), back to deg⁻¹", a * D], ["(b) C<sub>L</sub>", "a(α − α<sub>L=0</sub>)", CL], ["(c) α<sub>i</sub>", "C<sub>L</sub>/(πAR) (convert to deg)", ai / D], ["(d) α<sub>eff</sub>", "α − α<sub>i</sub>", aeff], ["(e) C<sub>Di</sub>", "C<sub>L</sub>²/(πAR)", CDi]]) +
        `<p>Check: the section lift c<sub>ℓ</sub> = a₀(α<sub>eff</sub> − α<sub>L=0</sub>) = ${f(a0 * (aeff - al0) * D)} equals C<sub>L</sub>, as it must for an untwisted elliptic wing. Forgetting to convert a₀ to per radian inside a₀/(πAR) is the classic slip.</p>`,
      verify: () => Math.abs(a0 * (aeff - al0) * D - CL) < 1e-9 };
  });
  reg("L1-ar-compare", { title: "Effect of aspect ratio (elliptic wings)", group: "Lesson 1 · Lifting line" }, () => {
    const A1 = R.pick([4, 5, 6]), A2 = R.pick([8, 10, 12, 14]), a0 = 2 * Math.PI, CL = R.pick([0.4, 0.5, 0.6, 0.8]);
    const a1 = fs(a0, A1), a2 = fs(a0, A2), al1 = CL / a1 / D, al2 = CL / a2 / D, C1 = CL * CL / (Math.PI * A1), C2 = CL * CL / (Math.PI * A2);
    return { type: "num", pts: 5,
      q: `<p>Two untwisted, elliptically loaded wings use the same symmetric thin airfoil (a₀ = 2π rad⁻¹). Wing A has AR = ${A1} and wing B has AR = ${A2}. Both fly at C<sub>L</sub> = ${CL}.</p><p>Find (a) the lift slope of each wing (rad⁻¹), (b) the angle of attack each needs (deg) and (c) the induced drag coefficient of each.</p>`,
      parts: [{ label: "(a) a<sub>A</sub>", ans: a1 }, { label: "(a) a<sub>B</sub>", ans: a2 }, { label: "(b) α<sub>A</sub> (deg)", ans: al1 }, { label: "(b) α<sub>B</sub> (deg)", ans: al2 }, { label: "(c) C<sub>Di,A</sub>", ans: C1 }, { label: "(c) C<sub>Di,B</sub>", ans: C2 }],
      sol: steps([["(a) a", "2π/(1 + 2/AR)", `${f(a1)} and ${f(a2)}`], ["(b) α", "C<sub>L</sub>/a (deg)", `${f(al1)}° and ${f(al2)}°`], ["(c) C<sub>Di</sub>", "C<sub>L</sub>²/(πAR)", `${f(C1)} and ${f(C2)}`]]) +
        `<p>The higher-AR wing has the steeper lift curve (closer to 2π) and, at the same C<sub>L</sub>, ${f(A2 / A1, 3)}× less induced drag. On a drag polar its parabola is narrower; on a lift curve its line is steeper. Both pass through the same α<sub>L=0</sub>.</p>` };
  });

  // =====================================================================================
  // Lesson 2 — general loading: Fourier solution
  // =====================================================================================
  reg("L2-concept", { title: "Fourier-series solution: concepts", group: "Lesson 2 · General loading" }, bank([
    { q: "With y = −(b/2)cos θ, the wing root (y = 0) and the right wingtip (y = +b/2) correspond to…", a: "θ = π/2 and θ = π", w: ["θ = 0 and θ = π/2", "θ = π and θ = 0", "θ = π/4 and θ = π/2"], why: "cos(π/2) = 0 gives y = 0; cos π = −1 gives y = +b/2. θ = 0 is the left tip." },
    { q: "For a wing whose loading is symmetric about the root, which Fourier coefficients are zero?", a: "all even ones: A₂, A₄, A₆, …", w: ["all odd ones: A₁, A₃, A₅, …", "all except A₁", "none of them"], why: "sin nθ with n even is antisymmetric about θ = π/2 (the root), so it cannot appear in a symmetric Γ. Only odd terms remain." },
    { q: "Which coefficient(s) contribute to the wing lift coefficient?", a: "only A₁: C_L = πAR·A₁", w: ["all of them: C_L = πAR·ΣAₙ", "only the odd ones: C_L = πAR(A₁ + A₃ + …)", "A₁ and A₂ only"], why: "C_L = (2b²/S)ΣAₙ∫₀^π sin nθ sin θ dθ, and orthogonality leaves only n = 1, giving πAR·A₁. The higher harmonics redistribute lift without changing the total." },
    { q: "Because δ = Σ n(Aₙ/A₁)² (n ≥ 2) is a sum of squares, the span efficiency e = 1/(1 + δ)…", a: "is at most 1, equal to 1 only for elliptic loading", w: ["can exceed 1 for well-tapered wings", "is always exactly 1 for untwisted wings", "is negative for twisted wings"], why: "δ ≥ 0 so e ≤ 1. Any harmonic beyond A₁ adds induced drag at fixed lift and span, so the elliptic distribution (A₁ only) minimizes induced drag." },
    { q: "When the lifting-line equation is truncated to N terms, the Aₙ are found by…", a: "enforcing the equation at N spanwise stations and solving N linear equations", w: ["integrating the equation once over the span", "using a single station at the root", "choosing Aₙ = 0 for n > 1"], why: "Collocation: pick θ₀ stations (avoiding the tips, where sin θ₀ = 0), write Σ Aₙ sin nθ₀ [2b/(πc) + n/sin θ₀] = α − α_L=0 at each, and solve the N × N system." },
    { q: "For an elliptic distribution written as Γ = 2bV∞ΣAₙ sin nθ, the coefficients are…", a: "A₁ = Γ₀/(2bV∞) and Aₙ = 0 for n ≥ 2", w: ["A₁ = Γ₀/(bV∞) and A₃ = A₁/3", "Aₙ = Γ₀/(2bV∞n) for all n", "A₁ = 0 and A₂ = Γ₀/(2bV∞)"], why: "Γ₀√(1 − (2y/b)²) = Γ₀ sin θ, so only the first harmonic appears." },
    { q: "The induced angle of attack at the station θ is…", a: "α_i(θ) = Σ nAₙ sin nθ / sin θ", w: ["α_i(θ) = Σ Aₙ sin nθ", "α_i(θ) = A₁ at every station", "α_i(θ) = Σ Aₙ cos nθ / n"], why: "Substituting dΓ/dy into the downwash integral and using Glauert's integral gives α_i = Σ nAₙ sin nθ / sin θ. It is constant (= A₁) only for elliptic loading." },
  ]));
  reg("L2-station", { title: "Γ, α_i and w at a spanwise station", group: "Lesson 2 · General loading" }, () => {
    const AR = R.pick([6, 7, 8]), lam = R.pick([0.4, 0.6, 1]), alpha = R.int(4, 9), L = AQH.liftingLine({ AR, lam, alphaDeg: alpha, N: 3 });
    const A = L.A.map(x => +x.toPrecision(4)), b = R.u(8, 16, 0.5), V = R.int(35, 80), eta = R.pick([0, 0.3, 0.5, 0.7]);
    const th = Math.acos(-eta), ns = [1, 3, 5];
    const gam = 2 * b * V * ns.reduce((s, n, k) => s + A[k] * Math.sin(n * th), 0), ai = ns.reduce((s, n, k) => s + n * A[k] * Math.sin(n * th), 0) / Math.sin(th);
    const CL = Math.PI * AR * A[0];
    return { type: "num", pts: 6,
      q: `<p>A three-term lifting-line solution for a wing of span ${b} m and aspect ratio ${AR}, flying at V∞ = ${V} m/s, gives A₁ = ${A[0]}, A₃ = ${A[1]} and A₅ = ${A[2]}, with Γ(θ) = 2bV∞ΣAₙ sin nθ and y = −(b/2)cos θ.</p><p>At the station 2y/b = ${eta} on the right wing find (a) θ (deg), (b) Γ (m²/s), (c) the induced angle α<sub>i</sub> (deg) and (d) the downwash w (m/s). Also find (e) the wing C<sub>L</sub>.</p>`,
      parts: [{ label: "(a) θ (deg)", ans: th / D, tol: 0.005 }, { label: "(b) Γ (m²/s)", ans: gam }, { label: "(c) α<sub>i</sub> (deg)", ans: ai / D }, { label: "(d) w (m/s)", ans: -V * ai }, { label: "(e) C<sub>L</sub>", ans: CL }],
      sol: steps([["(a) θ", "cos θ = −2y/b", th / D], ["(b) Γ", "2bV∞(A₁ sin θ + A₃ sin 3θ + A₅ sin 5θ)", gam], ["(c) α<sub>i</sub>", "(A₁ sin θ + 3A₃ sin 3θ + 5A₅ sin 5θ)/sin θ (rad → deg)", ai / D], ["(d) w", "−V∞α<sub>i</sub> (negative = downward)", -V * ai], ["(e) C<sub>L</sub>", "πAR A₁", CL]]) +
        `<p>Keep the calculator in radians for sin nθ, and remember α<sub>i</sub> uses nAₙ while Γ uses Aₙ.</p>` };
  });
  reg("L2-rect", { title: "Rectangular wing results (AR 6)", group: "Lesson 2 · General loading" }, () => {
    const al = R.int(3, 10), V = R.int(30, 70), rho = 1.225, S = R.pick([12, 16, 18, 24]);
    const CL = 4.5273 * al * D, CDi = 1.1378 * (al * D) ** 2, q = 0.5 * rho * V * V;
    return { type: "num", pts: 5,
      q: `<p>For an untwisted rectangular wing of aspect ratio 6 with a thin symmetric airfoil, the four-term lifting-line solution (stations θ = π/8, π/4, 3π/8, π/2) gives C<sub>L</sub> = 4.5273α (α in radians) and δ = 0.0464.</p><p>The wing (S = ${S} m²) flies at α = ${al}° and ${V} m/s at sea level. Find (a) C<sub>L</sub>, (b) the span efficiency e, (c) C<sub>Di</sub>, (d) the induced drag (N) and (e) how many percent more induced drag it has than an elliptic wing at the same C<sub>L</sub> and AR.</p>`,
      parts: [{ label: "(a) C<sub>L</sub>", ans: CL }, { label: "(b) e", ans: 1 / 1.0464, tol: 0.003 }, { label: "(c) C<sub>Di</sub>", ans: CDi }, { label: "(d) D<sub>i</sub> (N)", ans: q * S * CDi }, { label: "(e) % more", ans: 4.64, tol: 0.03 }],
      sol: steps([["(a) C<sub>L</sub>", "4.5273 α (α in rad)", CL], ["(b) e", "1/(1 + δ)", 1 / 1.0464], ["(c) C<sub>Di</sub>", "C<sub>L</sub>²(1 + δ)/(πAR)", CDi], ["(d) D<sub>i</sub>", "½ρV²S C<sub>Di</sub>", q * S * CDi], ["(e)", "100δ", "4.64 %"]]) +
        `<p>The rectangular wing's lift slope is 4.5273/2π = 0.72 of the airfoil value; an elliptic AR 6 wing would have 2π/(1 + 2/6) = 4.712 rad⁻¹.</p>` };
  });

  // =====================================================================================
  // Lesson 3 — taper, twist, aspect-ratio scaling
  // =====================================================================================
  reg("L3-concept", { title: "Taper, twist and tip stall", group: "Lesson 3 · Planform" }, bank([
    { q: "For an untwisted, unswept tapered wing, lifting-line theory gives the smallest induced drag factor δ near…", a: "λ ≈ 0.3", w: ["λ = 0 (pointed tips)", "λ = 1 (rectangular)", "λ = 2 (bow-tie)"], why: "δ(λ) has a shallow minimum near λ ≈ 0.3 for typical aspect ratios; λ = 0 overloads the tips and λ = 1 underloads them." },
    { q: "A rectangular wing and a tapered wing have the same airfoil, AR and C_L. Which is true?", a: "The tapered wing may have larger or smaller induced drag, depending on λ", w: ["The tapered wing always has less induced drag", "The tapered wing always has more induced drag", "They always have the same induced drag"], why: "Moderate taper (λ ≈ 0.3–0.5) beats a rectangle, but extreme taper (λ → 0) has a larger δ than λ = 1." },
    { q: "Heavily tapered wings are prone to tip stall because…", a: "the small tip chords run a higher local c_ℓ than the root", w: ["the tips carry most of the lift force", "the tip vortex removes the boundary layer", "the induced angle is largest at the root"], why: "Lift per span falls toward the tip, but the chord falls faster, so c_ℓ = L′/(q∞c) peaks outboard and the tip reaches c_ℓ,max first, with a loss of aileron control." },
    { q: "Washout (twisting the tips nose-down relative to the root) is used mainly to…", a: "lower the tip c_ℓ so the root stalls first", w: ["raise the lift slope", "eliminate induced drag", "move the neutral point aft"], why: "Washout unloads the tips. It is one of three standard tip-stall fixes, along with vortex generators and boundary-layer fences (or a change of airfoil toward the tip)." },
    { q: "The basic lift distribution of a twisted wing is the loading at…", a: "zero total lift (it integrates to zero across the span)", w: ["the design lift coefficient", "the stall angle of attack", "zero geometric angle of attack at the root"], why: "Γ = Γ_a + Γ_b. The additional part scales with the wing's absolute angle α_aw; the basic part is set by twist alone and gives ∫Γ_b dy = 0. With washout it is positive inboard and negative at the tips, which is why a twisted wing has induced drag even at C_L = 0." },
    { q: "Which of these produces an elliptic load distribution without an elliptic planform?", a: "a constant-chord wing with geometric twist varying elliptically", w: ["a constant-chord untwisted wing", "a linearly tapered wing with λ = 0", "a delta wing"], why: "Elliptic loading needs c(y)[α(y) − α_L=0(y)] to be elliptic: elliptic chord, elliptic geometric twist or elliptic aerodynamic twist (or a combination). All are costlier to build than straight taper." },
    { q: "Schrenk's approximation takes the spanwise lift distribution as…", a: "the average of the actual chord distribution and an ellipse of the same span and area", w: ["the chord distribution itself", "an ellipse of the same span and area", "the product of the chord and an ellipse"], why: "L′(y) ∝ ½[c(y) + (4S/πb)√(1 − (2y/b)²)]. It is quick, and it reproduces the tip-stall tendency of tapered wings." },
    { q: "One structural advantage of tapering a wing is…", a: "lower root bending moment, because the lift moves inboard", w: ["higher tip c_ℓ", "more fuel volume at the tips", "a larger induced drag"], why: "Taper shifts lift and weight inboard, cutting bending moment and structural weight, and gives a deep root for spars and fuel. The costs: tip-stall tendency and more complex manufacturing." },
  ]));
  reg("L3-scale-cd", { title: "Rescale a drag polar to a new aspect ratio", group: "Lesson 3 · Planform" }, () => {
    const AR2 = R.pick([5, 6, 7, 8]), AR1 = R.pick([9, 10, 12, 4, 3].filter(x => x !== AR2)), e = R.pick([0.95, 0.9, 1]), CL = R.pick([0.4, 0.6, 0.8, 1.0]), CD2 = +R.u(0.025, 0.09, 0.0005).toFixed(4);
    const CD1 = CD2 + CL * CL / (Math.PI * e) * (1 / AR1 - 1 / AR2);
    const a2 = 0.1 * R.pick([0.95, 1]) / D, alpha2 = R.int(4, 10);
    const al1 = alpha2 + (CL / (Math.PI * e)) * (1 / AR1 - 1 / AR2) / D;
    return { type: "num", pts: 4,
      q: `<p>Wind-tunnel tests of a wing of aspect ratio ${AR2} give C<sub>L</sub> = ${CL} and C<sub>D</sub> = ${CD2} at α = ${alpha2}°. Assume the same airfoil, the same profile drag at a given C<sub>L</sub>, and e = ${e} for both wings.</p><p>Predict, for a wing of aspect ratio ${AR1} at the same C<sub>L</sub>, (a) C<sub>D</sub> and (b) the angle of attack (deg).</p>`,
      parts: [{ label: "(a) C<sub>D</sub>", ans: CD1, tol: 0.01 }, { label: "(b) α (deg)", ans: al1, tol: 0.01 }],
      sol: steps([["(a) C<sub>D,1</sub>", "C<sub>D,2</sub> + C<sub>L</sub>²/(πe)·(1/AR₁ − 1/AR₂)", CD1], ["(b) α₁", "α₂ + C<sub>L</sub>/(πe)·(1/AR₁ − 1/AR₂) (rad → deg)", al1]]) +
        `<p>Profile drag and α<sub>eff</sub> are the same at equal C<sub>L</sub>; only the induced parts C<sub>L</sub>²/(πeAR) and α<sub>i</sub> = C<sub>L</sub>/(πeAR) change. ${AR1 > AR2 ? "Higher AR: less drag and a smaller angle." : "Lower AR: more drag and a larger angle."}</p>` };
  });
  reg("L3-schrenk", { title: "Schrenk's approximation", group: "Lesson 3 · Planform" }, () => {
    const b = R.u(9, 14, 0.5), lam = R.pick([0.3, 0.4, 0.5, 0.6]), AR = R.pick([6, 7, 8]), S = b * b / AR, cr = 2 * S / (b * (1 + lam)), eta = R.pick([0.6, 0.7, 0.8, 0.9]);
    const W = R.int(6, 20) * 1000, V = R.int(40, 70), q = 0.5 * 1.225 * V * V;
    const c = y => cr * (1 - (1 - lam) * y), cse = y => 4 * S / (Math.PI * b) * Math.sqrt(1 - y * y);
    const L0 = 0.5 * (c(0) + cse(0)) * W / S, Le = 0.5 * (c(eta) + cse(eta)) * W / S, CL = W / (q * S);
    return { type: "num", pts: 5,
      q: `<p>A linearly tapered wing (span ${b} m, AR ${AR}, λ = ${lam}) carries a lift of ${W} N at ${V} m/s at sea level. Use Schrenk's approximation, L′(y) = ½[c(y) + (4S/πb)√(1 − (2y/b)²)]·L/S.</p><p>Find (a) the root chord c<sub>r</sub> (m), (b) L′ at the root (N/m), (c) L′ at 2y/b = ${eta} (N/m), and the local lift coefficients (d) at the root and (e) at 2y/b = ${eta}. (f) Compare with the wing C<sub>L</sub>.</p>`,
      parts: [{ label: "(a) c<sub>r</sub> (m)", ans: cr }, { label: "(b) L′(0) (N/m)", ans: L0 }, { label: "(c) L′ (N/m)", ans: Le }, { label: "(d) c<sub>ℓ</sub>(0)", ans: L0 / (q * c(0)) }, { label: "(e) c<sub>ℓ</sub>", ans: Le / (q * c(eta)) }, { label: "(f) C<sub>L</sub>", ans: CL }],
      sol: steps([["S", "b²/AR", S], ["(a) c<sub>r</sub>", "2S/[b(1 + λ)]", cr], ["Ellipse root chord", "4S/(πb)", cse(0)], ["(b) L′(0)", "½[c<sub>r</sub> + 4S/(πb)]·L/S", L0], ["c at station", "c<sub>r</sub>[1 − (1 − λ)(2y/b)]", c(eta)], ["(c) L′", "½[c + c<sub>ellipse</sub>]·L/S", Le], ["(d) c<sub>ℓ</sub>(0)", "L′/(q∞c)", L0 / (q * c(0))], ["(e) c<sub>ℓ</sub>", "L′/(q∞c)", Le / (q * c(eta))], ["(f) C<sub>L</sub>", "L/(q∞S)", CL]]) +
        `<p>${Le / (q * c(eta)) > CL ? "The outboard c<sub>ℓ</sub> exceeds C<sub>L</sub>: this station will reach c<sub>ℓ,max</sub> before the wing does, the tip-stall tendency of a tapered wing." : "Here the outboard c<sub>ℓ</sub> is below C<sub>L</sub>; with less taper the tips are lightly loaded."}</p>` };
  });

  // =====================================================================================
  // Lesson 4 — sweep, delta wings, wingtip devices, airplane drag polar
  // =====================================================================================
  reg("L4-concept", { title: "Sweep, delta wings and wingtip devices", group: "Lesson 4 · Sweep and deltas" }, bank([
    { q: "Which is NOT an effect of sweeping a wing aft?", a: "a higher lift-curve slope", w: ["a higher critical Mach number", "increased loading toward the tips", "spanwise flow of the boundary layer toward the tips"], why: "Sweep reduces the lift slope (and C_L), raises M_crit, loads the tips (the bound vortex of one wing induces downwash on the other) and drives spanwise boundary-layer flow outboard, all of which promote tip stall." },
    { q: "A forward-swept wing tends to stall first…", a: "at the root", w: ["at the tips", "uniformly along the span", "never, because it has no tip vortices"], why: "Forward sweep loads the root (each wing induces upwash on the other near the centerline) and drives the boundary layer inboard, so the root stalls first and aileron control is kept (X-29, HFB-320)." },
    { q: "Compared with a high-aspect-ratio straight wing, a slender delta wing has…", a: "a smaller lift slope, a much higher stall angle and about the same C_L,max", w: ["a larger lift slope and a lower stall angle", "the same lift slope and a lower C_L,max", "a smaller lift slope and a lower stall angle"], why: "Low AR gives a low slope, but the leading-edge vortices keep adding (nonlinear) vortex lift up to α ≈ 35°, so C_L,max ends up similar while α_stall is far larger." },
    { q: "The extra lift on a delta wing at moderate angle of attack comes from…", a: "suction under the leading-edge vortices on the upper surface", w: ["a stronger trailing-edge flap effect", "lower skin friction", "a normal shock on the lower surface"], why: "The flow separates at the sharp leading edge and rolls up into two strong vortices. The low pressure beneath them adds vortex lift (Polhamus' suction analogy)." },
    { q: "Delta-wing stall at high angle of attack is caused by…", a: "vortex breakdown moving forward over the wing", w: ["laminar separation bubbles at the leading edge", "trailing-edge stall of the root airfoil", "a shock forming at the apex"], why: "As α rises the breakdown point (where the vortex core suddenly expands and becomes turbulent) moves upstream from the wake onto the wing. Once it reaches the apex region the vortex suction is lost." },
    { q: "Why are delta wings used on supersonic aircraft?", a: "to keep the leading edge inside the Mach cone (and for low thickness and structural depth)", w: ["because they have the highest subsonic L/D", "because they cannot stall", "to maximize the lift slope"], why: "A swept leading edge inside the Mach cone is subsonic-edged, which lowers wave drag. The price is a low lift slope and high landing angles of attack (Concorde, Space Shuttle)." },
    { q: "Lifting winglets reduce induced drag mainly by…", a: "spreading the tip vorticity and cancelling some downwash (an effective span increase)", w: ["eliminating the trailing vortices", "reducing skin friction at the tips", "increasing the wing's chord"], why: "Trailing vorticity cannot be removed, only redistributed. Winglets give a few percent induced-drag reduction; end plates mostly add viscous drag." },
    { q: "Which is a standard way to mitigate tip stall?", a: "vortex generators or boundary-layer fences on the outboard wing", w: ["increasing the taper (smaller λ)", "sweeping the wing further aft", "moving the CG forward"], why: "The three standard fixes are washout, vortex generators (energize the boundary layer) and fences (block spanwise flow). More taper or aft sweep makes tip stall worse." },
  ]));
  reg("L4-ld", { title: "Airplane drag polar and (L/D)max", group: "Lesson 4 · Sweep and deltas" }, () => {
    const CD0 = +R.u(0.018, 0.035, 0.001).toFixed(3), AR = R.pick([6, 7, 8, 9, 10]), e = R.pick([0.75, 0.8, 0.85]), m = R.int(900, 6000), S = R.int(12, 40), rho = R.pick([1.225, 1.007, 0.7364]);
    const K = 1 / (Math.PI * e * AR), CLs = Math.sqrt(CD0 / K), LD = 1 / (2 * Math.sqrt(K * CD0)), V = Math.sqrt(2 * m * g0 / (rho * S * CLs));
    return { type: "num", pts: 5,
      q: `<p>An airplane has the drag polar C<sub>D</sub> = C<sub>D0</sub> + KC<sub>L</sub>² with C<sub>D0</sub> = ${CD0}, AR = ${AR} and Oswald efficiency e = ${e}. Its mass is ${m} kg and S = ${S} m², flying where ρ = ${rho} kg/m³.</p><p>Find (a) K, (b) the C<sub>L</sub> for maximum L/D, (c) (L/D)<sub>max</sub> and (d) the flight speed for (L/D)<sub>max</sub> (m/s).</p>`,
      parts: [{ label: "(a) K", ans: K }, { label: "(b) C<sub>L</sub>*", ans: CLs }, { label: "(c) (L/D)<sub>max</sub>", ans: LD }, { label: "(d) V (m/s)", ans: V }],
      sol: steps([["(a) K", "1/(πeAR)", K], ["(b) C<sub>L</sub>*", "√(C<sub>D0</sub>/K): induced drag = zero-lift drag", CLs], ["(c) (L/D)<sub>max</sub>", "1/(2√(KC<sub>D0</sub>))", LD], ["(d) V", "√(2W/(ρSC<sub>L</sub>*))", V]]) };
  });
  reg("L4-stall", { title: "C_L,max and stall speed", group: "Lesson 4 · Sweep and deltas" }, () => {
    const m = R.int(700, 3000), S = R.int(10, 25), CLc = R.pick([1.3, 1.4, 1.5, 1.6]), CLf = +(CLc + R.pick([0.5, 0.7, 0.9])).toFixed(1), rho = R.pick([1.225, 1.112]);
    const v1 = Math.sqrt(2 * m * g0 / (rho * S * CLc)), v2 = Math.sqrt(2 * m * g0 / (rho * S * CLf));
    return { type: "num", pts: 3,
      q: `<p>An airplane of mass ${m} kg has a wing area of ${S} m². Clean, C<sub>L,max</sub> = ${CLc}; with flaps and slats deployed, C<sub>L,max</sub> = ${CLf} (based on the clean wing area). Air density is ${rho} kg/m³.</p><p>Find the stall speed (a) clean and (b) with high-lift devices, in m/s, and (c) the percent reduction.</p>`,
      parts: [{ label: "(a) V<sub>stall</sub> clean", ans: v1 }, { label: "(b) V<sub>stall</sub> flaps", ans: v2 }, { label: "(c) % reduction", ans: 100 * (1 - v2 / v1) }],
      sol: steps([["(a)", "√(2W/(ρSC<sub>L,max</sub>))", v1], ["(b)", "same with the flapped C<sub>L,max</sub>", v2], ["(c)", "100(1 − √(C<sub>L,clean</sub>/C<sub>L,flap</sub>))", 100 * (1 - v2 / v1)]]) +
        `<p>Stall speed scales as 1/√C<sub>L,max</sub>. Coefficients use the clean (cruise) wing area by convention even when Fowler flaps add area.</p>` };
  });

  // =====================================================================================
  // Lesson 5 — longitudinal static stability
  // =====================================================================================
  reg("L5-concept", { title: "Stability: definitions and trends", group: "Lesson 5 · Stability" }, bank([
    { q: "For a longitudinally statically stable airplane that can be trimmed at positive lift, the C_M,cg–α line must have…", a: "C_M0 > 0 and C_Mα < 0", w: ["C_M0 < 0 and C_Mα < 0", "C_M0 > 0 and C_Mα > 0", "C_M0 = 0 and C_Mα = 0"], why: "C_Mα < 0 gives a restoring moment after a disturbance; C_M0 > 0 is then needed so that C_M = 0 (trim) happens at positive α_a, i.e., positive lift." },
    { q: "The neutral point is the CG location at which…", a: "C_Mα = 0 (neutral stability)", w: ["C_M,cg = 0 at every α", "the tail carries no lift", "the wing's aerodynamic center lies"], why: "The neutral point is the airplane's aerodynamic center. Moving the CG aft toward it reduces −C_Mα to zero; aft of it the airplane is unstable." },
    { q: "Static margin is defined as…", a: "x̄_np − x̄_cg, and it must be positive for static stability", w: ["x̄_cg − x̄_np, and it must be positive", "x̄_ac − x̄_cg, and it must be negative", "the tail volume coefficient divided by C_Lα"], why: "SM = x̄_np − x̄_cg = −C_Mα/C_Lα. Positive SM (CG ahead of the neutral point) means stable; typical values are 5–15% of the chord." },
    { q: "Increasing the horizontal-tail volume coefficient V_H = (S_t ℓ_t)/(S_w c̄) (everything else fixed)…", a: "moves the neutral point aft and increases the static margin", w: ["moves the neutral point forward", "has no effect on stability, only on trim", "reduces C_M0 to zero"], why: "x̄_np = x̄_ac + V_H a_t(1 − dε/dα)/C_Lα, so a bigger or longer-armed tail pushes the neutral point aft." },
    { q: "Changing the tail incidence angle i_t in the linear wing–tail model…", a: "shifts C_M0 and the trim C_L but leaves C_Mα and the static margin unchanged", w: ["changes the static margin but not the trim point", "changes both C_Mα and C_M0", "has no effect on either"], why: "i_t enters C_L,t as a constant, so it moves the C_M line up or down (C_M0) without changing its slope. More negative i_t raises C_M0 and the trim C_L." },
    { q: "A conventional flying wing (no tail) with a positively cambered airfoil and the CG ahead of the AC…", a: "is stable but cannot trim at positive lift, because C_M0 = c_m,ac < 0", w: ["is stable and trims at positive lift", "is unstable but trims easily", "is neutral at every CG location"], why: "With CG ahead of the AC, C_Mα < 0 (stable), but C_M0 = c_m,ac < 0 so trim needs negative lift. Flying wings use reflexed airfoils or swept wings with washout to get C_M0 > 0." },
    { q: "Moving the CG aft (still ahead of the neutral point)…", a: "reduces the static margin and the airplane becomes more responsive but less stable", w: ["increases the static margin", "moves the neutral point aft by the same amount", "has no effect on C_Mα"], why: "C_Mα = C_Lα(x̄_cg − x̄_np) becomes less negative. The neutral point is a property of the configuration and does not move with the CG." },
    { q: "The downwash at the tail reduces the tail's contribution to stability because…", a: "the tail angle of attack changes by only (1 − dε/dα) per unit change in α", w: ["it increases the tail lift slope", "it moves the tail aerodynamic center forward", "it makes c_m,ac positive"], why: "α_t = α − ε + i_t with ε = ε₀ + (dε/dα)α, so dα_t/dα = 1 − dε/dα < 1. That factor multiplies the tail's restoring term V_H a_t." },
  ]));
  reg("L5-np", { title: "Neutral point and static margin", group: "Lesson 5 · Stability" }, () => {
    const a0 = 2 * Math.PI * R.pick([0.95, 1]), ARw = R.pick([6, 7, 8, 9]), ARt = R.pick([3, 4, 5]), Sr = R.pick([0.15, 0.18, 0.2, 0.25]), lt = R.pick([2.5, 3, 3.5, 4, 4.5]), xac = 0.25, xcg = R.pick([0.25, 0.28, 0.3, 0.32, 0.35]);
    const aw = fs(a0, ARw), at = fs(2 * Math.PI, ARt), de = 2 * aw / (Math.PI * ARw), VH = Sr * lt, CLa = aw + Sr * at * (1 - de), xnp = xac + VH * at * (1 - de) / CLa, SM = xnp - xcg, CMa = -CLa * SM;
    return { type: "num", pts: 6,
      q: `<p>An airplane has a wing with AR<sub>w</sub> = ${ARw} and airfoil slope a₀ = ${f(a0, 4)} rad⁻¹, and a horizontal tail with AR<sub>t</sub> = ${ARt} (thin airfoil, 2π rad⁻¹). S<sub>t</sub>/S<sub>w</sub> = ${Sr}, the tail arm is ℓ<sub>t</sub> = ${lt}c̄, x̄<sub>ac</sub> = ${xac} and x̄<sub>cg</sub> = ${xcg}. Assume elliptic loading on both surfaces and dε/dα = 2a<sub>w</sub>/(πAR<sub>w</sub>).</p><p>Find (a) a<sub>w</sub> and a<sub>t</sub>, (b) dε/dα, (c) V<sub>H</sub>, (d) C<sub>Lα</sub>, (e) x̄<sub>np</sub> and (f) the static margin and C<sub>Mα</sub>.</p>`,
      parts: [{ label: "(a) a<sub>w</sub>", ans: aw }, { label: "(a) a<sub>t</sub>", ans: at }, { label: "(b) dε/dα", ans: de }, { label: "(c) V<sub>H</sub>", ans: VH }, { label: "(d) C<sub>Lα</sub>", ans: CLa }, { label: "(e) x̄<sub>np</sub>", ans: xnp, tol: 0.01 }, { label: "(f) SM", ans: SM, tol: 0.04 }, { label: "(f) C<sub>Mα</sub>", ans: CMa, tol: 0.04 }],
      sol: steps([["(a) a<sub>w</sub>", "a₀/(1 + a₀/(πAR<sub>w</sub>))", aw], ["(a) a<sub>t</sub>", "2π/(1 + 2/AR<sub>t</sub>)", at], ["(b) dε/dα", "2a<sub>w</sub>/(πAR<sub>w</sub>)", de], ["(c) V<sub>H</sub>", "(S<sub>t</sub>/S<sub>w</sub>)(ℓ<sub>t</sub>/c̄)", VH], ["(d) C<sub>Lα</sub>", "a<sub>w</sub> + (S<sub>t</sub>/S<sub>w</sub>)a<sub>t</sub>(1 − dε/dα)", CLa], ["(e) x̄<sub>np</sub>", "x̄<sub>ac</sub> + V<sub>H</sub>a<sub>t</sub>(1 − dε/dα)/C<sub>Lα</sub>", xnp], ["(f) SM", "x̄<sub>np</sub> − x̄<sub>cg</sub>", SM], ["(f) C<sub>Mα</sub>", "−C<sub>Lα</sub>·SM", CMa]]) +
        `<p>${SM > 0 ? "SM > 0 and C<sub>Mα</sub> < 0: statically stable." : "SM < 0: the CG is behind the neutral point and the airplane is statically unstable."}</p>` };
  });
  reg("L5-trim", { title: "Trim from the C_M–C_L line", group: "Lesson 5 · Stability" }, () => {
    const CM0 = +R.u(0.03, 0.12, 0.005).toFixed(3), SM = R.pick([0.05, 0.08, 0.1, 0.12, 0.15]), CLa = +R.u(4.2, 5.2, 0.05).toFixed(2), m = R.int(1000, 5000), S = R.int(14, 30), rho = 1.225;
    const CLt = CM0 / SM, alT = CLt / CLa / D, V = Math.sqrt(2 * m * g0 / (rho * S * CLt));
    return { type: "num", pts: 4,
      q: `<p>A wind-tunnel test of an airplane model gives a linear C<sub>M,cg</sub> = ${CM0} − ${SM}C<sub>L</sub>, and C<sub>Lα</sub> = ${CLa} rad⁻¹ with α<sub>a</sub> measured from the zero-lift line.</p><p>Find (a) the static margin, (b) C<sub>Mα</sub> (rad⁻¹), (c) the trim C<sub>L</sub>, (d) the trim absolute angle of attack (deg) and (e) the speed at which the full-scale airplane (m = ${m} kg, S = ${S} m²) trims at sea level.</p>`,
      parts: [{ label: "(a) SM", ans: SM, tol: 0.001 }, { label: "(b) C<sub>Mα</sub>", ans: -SM * CLa }, { label: "(c) C<sub>L,trim</sub>", ans: CLt }, { label: "(d) α<sub>a,trim</sub> (deg)", ans: alT }, { label: "(e) V (m/s)", ans: V }],
      sol: steps([["(a) SM", "−dC<sub>M</sub>/dC<sub>L</sub>", SM], ["(b) C<sub>Mα</sub>", "(dC<sub>M</sub>/dC<sub>L</sub>)·C<sub>Lα</sub>", -SM * CLa], ["(c) C<sub>L,trim</sub>", "C<sub>M0</sub>/SM (set C<sub>M</sub> = 0)", CLt], ["(d) α<sub>a,trim</sub>", "C<sub>L,trim</sub>/C<sub>Lα</sub>", alT], ["(e) V", "√(2mg/(ρSC<sub>L,trim</sub>))", V]]) +
        `<p>Positive C<sub>M0</sub> with a negative slope: stable and trimmable at positive lift. To fly faster (lower trim C<sub>L</sub>) the pilot must reduce C<sub>M0</sub> with elevator, or move the CG forward.</p>` };
  });

  // =====================================================================================
  // Lesson 6 — thermodynamics
  // =====================================================================================
  const GASES = [{ n: "argon", g: 5 / 3, M: 39.95 }, { n: "helium", g: 5 / 3, M: 4.003 }, { n: "nitrogen", g: 1.4, M: 28.01 }, { n: "carbon dioxide", g: 1.289, M: 44.01 }, { n: "air", g: 1.4, M: 28.97 }];
  reg("L6-concept", { title: "Processes, specific heats and γ", group: "Lesson 6 · Thermodynamics" }, bank([
    { q: "An isentropic process is one that is…", a: "both adiabatic and reversible", w: ["adiabatic only", "reversible only", "at constant temperature"], why: "ds = δq/T + ds_irrev. Zero entropy change with no cooling requires δq = 0 (adiabatic) and ds_irrev = 0 (reversible)." },
    { q: "Flow through a normal shock is…", a: "adiabatic but not isentropic", w: ["isentropic", "isothermal", "neither adiabatic nor steady"], why: "No heat crosses the control volume (h₀ is constant), but viscous dissipation and heat conduction inside the thin shock raise the entropy." },
    { q: "A calorically perfect gas is one with…", a: "constant c_p and c_v, so e = c_vT and h = c_pT", w: ["e and h depending on T and p", "c_p = c_v", "γ that varies with temperature"], why: "Thermally perfect: e = e(T), h = h(T). Calorically perfect adds constant specific heats. Air at moderate temperature is both." },
    { q: "Using γ = (n + 2)/n with n active degrees of freedom, a diatomic gas near room temperature has…", a: "n = 5 (3 translation + 2 rotation), γ = 1.4", w: ["n = 3, γ = 5/3", "n = 7, γ = 1.29", "n = 6, γ = 1.33"], why: "Vibration is frozen near room temperature. Above about 600 K for air it starts to contribute and γ falls toward 9/7 ≈ 1.29." },
    { q: "Enthalpy differs from internal energy by…", a: "the flow work: h = e + p/ρ", w: ["the kinetic energy: h = e + V²/2", "nothing; they are equal for a perfect gas", "the entropy: h = e + Ts"], why: "h = e + pv is the natural energy variable for open systems and flows. The stagnation enthalpy adds the kinetic energy: h₀ = h + V²/2." },
    { q: "Which process necessarily increases the entropy of a fixed mass?", a: "an adiabatic irreversible process", w: ["a reversible adiabatic process", "a reversible process with heat removal", "any process at constant pressure"], why: "With δq = 0, ds = ds_irrev ≥ 0, and equality only if reversible. Cooling can lower entropy locally." },
    { q: "The rule of thumb for when compressibility must be included is…", a: "M > 0.3, where ρ₀/ρ∞ differs from 1 by about 5%", w: ["M > 1 only", "V > 100 m/s regardless of temperature", "Re > 10⁶"], why: "ρ₀/ρ∞ = (1 + 0.2M²)^2.5 = 1.046 at M = 0.3. Below that the density change is negligible for most purposes." },
    { q: "Specific heat ratio γ for a substance that is incompressible is…", a: "1.0", w: ["1.4", "5/3", "infinite"], why: "c_p = c_v for an incompressible substance (no expansion work), so γ = 1." },
  ]));
  reg("L6-entropy", { title: "Entropy change and isentropic states", group: "Lesson 6 · Thermodynamics" }, () => {
    const T1 = R.int(260, 400), p1 = R.int(80, 200), T2 = R.int(300, 800), p2 = R.int(100, 900), Ti = T1 * Math.pow(p2 / p1, 0.4 / 1.4);
    const ds = cpS * Math.log(T2 / T1) - Rs * Math.log(p2 / p1), r2 = p2 * 1000 / (Rs * T2);
    return { type: "num", pts: 4,
      q: `<p>Air (calorically perfect, c<sub>p</sub> = 1004.5 J/(kg K), R = 287 J/(kg K)) goes from state 1 (T₁ = ${T1} K, p₁ = ${p1} kPa) to state 2 (T₂ = ${T2} K, p₂ = ${p2} kPa).</p><p>Find (a) s₂ − s₁ (J/(kg K)), (b) the density at state 2 (kg/m³) and (c) the temperature an isentropic process from state 1 would reach at p₂. (d) Could the actual process be adiabatic?</p>`,
      parts: [{ label: "(a) Δs", ans: ds, tol: 0.02 }, { label: "(b) ρ₂", ans: r2 }, { label: "(c) T₂,s (K)", ans: Ti }],
      sol: steps([["(a) Δs", "c<sub>p</sub> ln(T₂/T₁) − R ln(p₂/p₁)", ds], ["(b) ρ₂", "p₂/(RT₂)", r2], ["(c) T₂,s", "T₁(p₂/p₁)<sup>(γ−1)/γ</sup>", Ti]]) +
        `<p>(d) ${ds >= 0 ? "Δs ≥ 0, so an adiabatic (irreversible) process is possible." : "Δs < 0: an adiabatic process cannot do this (second law); heat must have been removed."}</p>` };
  });
  reg("L6-gas", { title: "Perfect-gas properties", group: "Lesson 6 · Thermodynamics" }, () => {
    const gas = R.pick(GASES), T = R.int(250, 600), p = R.int(50, 300), Rg = 8314 / gas.M, cv = Rg / (gas.g - 1), cp = gas.g * cv, a = Math.sqrt(gas.g * Rg * T);
    return { type: "num", pts: 4,
      q: `<p>${gas.n[0].toUpperCase() + gas.n.slice(1)} (molar mass ${gas.M} kg/kmol, γ = ${f(gas.g, 4)}) is at ${T} K and ${p} kPa. Treat it as a calorically perfect gas with ℛ = 8314 J/(kmol K).</p><p>Find (a) R, (b) c<sub>v</sub> and c<sub>p</sub>, (c) ρ, (d) h = c<sub>p</sub>T and (e) the speed of sound.</p>`,
      parts: [{ label: "(a) R (J/kg K)", ans: Rg }, { label: "(b) c<sub>v</sub>", ans: cv }, { label: "(b) c<sub>p</sub>", ans: cp }, { label: "(c) ρ (kg/m³)", ans: p * 1000 / (Rg * T) }, { label: "(d) h (J/kg)", ans: cp * T }, { label: "(e) a (m/s)", ans: a }],
      sol: steps([["(a) R", "ℛ/ℳ", Rg], ["(b) c<sub>v</sub>", "R/(γ − 1)", cv], ["(b) c<sub>p</sub>", "γR/(γ − 1)", cp], ["(c) ρ", "p/(RT)", p * 1000 / (Rg * T)], ["(d) h", "c<sub>p</sub>T", cp * T], ["(e) a", "√(γRT)", a]]) };
  });

  // =====================================================================================
  // Lesson 7 — energy equation, isentropic flow, stagnation and sonic conditions
  // =====================================================================================
  reg("L7-stag", { title: "Stagnation conditions in flight", group: "Lesson 7 · Isentropic flow" }, () => {
    if (R.rnd() < 0.5) {
      const T = R.pick([216.65, 223.25, 236.2, 249.2, 262.2, 288.15]), p = R.pick([12.1, 19.4, 26.5, 35.6, 47.2, 101.3]), V = R.int(150, 700);
      const a = Math.sqrt(G * Rs * T), M = V / a, T0 = T * isen.T0_T(M, G), p0 = p * isen.p0_p(M, G), h0 = cpS * T + V * V / 2;
      return { type: "num", pts: 5, q: `<p>An airplane flies at ${V} m/s where the ambient temperature is ${T} K and the pressure is ${p} kPa (air, c<sub>p</sub> = 1004.5 J/(kg K)).</p><p>Find (a) the Mach number, (b) the stagnation enthalpy h₀ (J/kg), (c) T₀ (K) and (d) p₀ (kPa). (e) What would Bernoulli's equation give for p₀?</p>`,
        parts: [{ label: "(a) M", ans: M }, { label: "(b) h₀ (J/kg)", ans: h0 }, { label: "(c) T₀ (K)", ans: T0 }, { label: "(d) p₀ (kPa)", ans: p0 }, { label: "(e) Bernoulli p₀", ans: p + 0.5 * (p * 1000 / (Rs * T)) * V * V / 1000 }],
        sol: steps([["a", "√(γRT)", a], ["(a) M", "V/a", M], ["(b) h₀", "c<sub>p</sub>T + V²/2", h0], ["(c) T₀", "T(1 + 0.2M²) = h₀/c<sub>p</sub>", T0], ["(d) p₀", "p(1 + 0.2M²)<sup>3.5</sup>", p0], ["(e)", "p + ½ρV² (wrong for compressible flow)", p + 0.5 * (p * 1000 / (Rs * T)) * V * V / 1000]]) +
          `<p>Bernoulli underestimates p₀ by ${f(100 * (1 - (p + 0.5 * (p * 1000 / (Rs * T)) * V * V / 1000) / p0), 3)}% here. Use the isentropic relation whenever M > 0.3.</p>` };
    }
    const T = R.pick([389.97, 411.8, 447.4, 483.0, 518.7]), p = R.pick([2.72, 4.37, 6.76, 10.1, 14.7]), V = R.int(400, 1600);
    const a = Math.sqrt(G * RE * T), M = V / a, T0 = T * isen.T0_T(M, G), p0 = p * isen.p0_p(M, G), h0 = cpE * T + V * V / 2;
    return { type: "num", pts: 5, q: `<p>An airplane flies at ${V} ft/s where the pressure is ${p} psia and the temperature is ${T} °R. Use R = 1716 ft·lbf/(slug·°R) and c<sub>p</sub> ≈ 6006 ft·lbf/(slug·°R).</p><p>Find (a) the speed of sound (ft/s), (b) M, (c) h₀ (ft²/s²), (d) T₀ (°R) and (e) p₀ (psia).</p>`,
      parts: [{ label: "(a) a (ft/s)", ans: a }, { label: "(b) M", ans: M }, { label: "(c) h₀ (ft²/s²)", ans: h0 }, { label: "(d) T₀ (°R)", ans: T0 }, { label: "(e) p₀ (psia)", ans: p0 }],
      sol: steps([["(a) a", "√(γRT)", a], ["(b) M", "V/a", M], ["(c) h₀", "c<sub>p</sub>T + V²/2", h0], ["(d) T₀", "T(1 + 0.2M²)", T0], ["(e) p₀", "p(1 + 0.2M²)<sup>3.5</sup>", p0]]) +
        `<p>In English units 1 ft·lbf/slug = 1 ft²/s², so h₀ comes out in ft²/s² directly. T₀ from h₀/c<sub>p</sub> agrees with T(1 + 0.2M²) to within the rounding of c<sub>p</sub>.</p>` };
  });
  reg("L7-sonic", { title: "Sonic (critical) conditions", group: "Lesson 7 · Isentropic flow" }, () => {
    const p0 = R.int(150, 1500), T0 = R.int(280, 900), Ts = T0 / 1.2, ps = p0 * 0.528282, rs = ps * 1000 / (Rs * Ts), as = Math.sqrt(G * Rs * Ts);
    return { type: "num", pts: 4, q: `<p>Air flows isentropically from a reservoir at p₀ = ${p0} kPa and T₀ = ${T0} K and reaches M = 1 at a nozzle throat.</p><p>Find at the throat (a) T* (K), (b) p* (kPa), (c) ρ* (kg/m³) and (d) the velocity u* (m/s).</p>`,
      parts: [{ label: "(a) T* (K)", ans: Ts }, { label: "(b) p* (kPa)", ans: ps }, { label: "(c) ρ*", ans: rs }, { label: "(d) u* (m/s)", ans: as }],
      sol: steps([["(a) T*", "T₀·2/(γ + 1) = 0.8333T₀", Ts], ["(b) p*", "p₀[2/(γ + 1)]<sup>γ/(γ−1)</sup> = 0.5283p₀", ps], ["(c) ρ*", "p*/(RT*) (also 0.6339ρ₀)", rs], ["(d) u*", "a* = √(γRT*)", as]]) };
  });
  reg("L7-concept", { title: "Energy equation and isentropic trends", group: "Lesson 7 · Isentropic flow" }, bank([
    { q: "In steady, adiabatic flow with no work or body forces, along a streamline…", a: "h₀ = h + V²/2 (and T₀ for a perfect gas) is constant, even through shocks", w: ["p₀ is constant everywhere", "the static temperature is constant", "the entropy must decrease"], why: "The energy equation needs only adiabatic, no work. Viscous dissipation inside a shock converts kinetic to internal energy but does not change h₀. p₀ is constant only if the flow is also isentropic." },
    { q: "As an isentropic flow accelerates, the static pressure, temperature and density…", a: "all decrease, while p₀, T₀ and ρ₀ stay fixed", w: ["all increase", "stay the same", "p falls but T rises"], why: "p₀/p, T₀/T and ρ₀/ρ all increase with M; with the stagnation values fixed, the static values must fall." },
    { q: "Stagnation pressure can be defined at a point even when the flow is not isentropic because…", a: "it is the pressure the fluid would reach if brought to rest isentropically from that local state", w: ["it is always equal to the reservoir pressure", "it equals p + ½ρV² in any flow", "shocks do not change it"], why: "p₀ is a property of the local state (p, T, V). It is constant only along isentropic paths; across a shock it drops." },
    { q: "For air (γ = 1.4), the pressure at a sonic throat is about what fraction of the reservoir stagnation pressure?", a: "0.528", w: ["0.833", "0.634", "1.893"], why: "p*/p₀ = (2/2.4)^3.5 = 0.5283, T*/T₀ = 0.8333 and ρ*/ρ₀ = 0.6339. The inverse, p₀/p* = 1.893, is the Pitot subsonic/supersonic dividing line." },
    { q: "The speed of sound in a perfect gas depends on…", a: "temperature only (for a given gas): a = √(γRT)", w: ["pressure only", "density only", "pressure and velocity"], why: "a² = (∂p/∂ρ)_s = γp/ρ = γRT. At fixed T, raising p raises ρ in proportion, leaving a unchanged." },
    { q: "Using Bernoulli's equation to find p₀ for air at M = 0.8…", a: "underestimates p₀ (by about 4%)", w: ["overestimates p₀ by about 50%", "gives the exact answer", "gives a negative pressure"], why: "p₀ − p = ½ρV²(1 + M²/4 + M⁴/40 + …). At M = 0.8 the bracket is ≈ 1.17, so the dynamic pressure term is 17% low and p₀ is underestimated by about 4%." },
  ]));

  // =====================================================================================
  // Lesson 8 — normal and moving shocks
  // =====================================================================================
  reg("L8-concept", { title: "Shock-wave concepts", group: "Lesson 8 · Shocks" }, bank([
    { q: "Why do shocks form in supersonic flow but not in subsonic flow?", a: "disturbances travel at the speed of sound and cannot run upstream to warn the flow when M > 1", w: ["supersonic flow is always turbulent", "the viscosity of air rises sharply at M = 1", "the energy equation fails above M = 1"], why: "In subsonic flow pressure signals propagate upstream and the flow adjusts gradually. In supersonic flow they cannot, so the adjustment happens abruptly in a shock." },
    { q: "A normal shock in air at standard conditions is about how thick?", a: "a few mean free paths (well under a micrometer)", w: ["about a boundary-layer thickness", "about one chord length", "zero, exactly"], why: "The shock is a thin non-equilibrium region a few mean free paths thick (≈ 0.1–0.3 μm at sea level). On the scale of the flow it is a discontinuity." },
    { q: "The normal-shock relations evaluated with M₁ < 1 predict…", a: "an entropy decrease, so such an 'expansion shock' is impossible", w: ["a weaker compression shock", "no change at all", "an increase in stagnation pressure that is physically allowed"], why: "The algebra admits M₁ < 1, but it gives s₂ < s₁ (and ρ₂ < ρ₁), violating the second law. Only compression shocks with M₁ > 1 exist." },
    { q: "As M₁ → ∞ for γ = 1.4, the density ratio across a normal shock approaches…", a: "6", w: ["infinity", "1", "2.4"], why: "ρ₂/ρ₁ → (γ + 1)/(γ − 1) = 6, and M₂ → √((γ − 1)/(2γ)) = 0.378. Pressure and temperature ratios grow without bound." },
    { q: "How many equations relate the upstream and downstream states of a normal shock in a perfect gas?", a: "five: mass, momentum, energy, p = ρRT and h = c_pT", w: ["three: mass, momentum and energy", "two: mass and energy", "four, because entropy is constant"], why: "With upstream state known, the unknowns are ρ₂, u₂, p₂, T₂ and h₂: five equations for five unknowns." },
    { q: "In the lab frame, still air is hit by a normal shock moving at W. After it passes, the air…", a: "moves in the same direction as the shock, at W − u₂ (shock-frame u₂)", w: ["stays at rest", "moves opposite to the shock", "moves at the shock speed W"], why: "In the shock frame the air enters at u₁ = W and leaves at u₂ = W/(ρ₂/ρ₁). Back in the lab frame it moves at W − u₂ toward the direction of shock travel." },
    { q: "Which quantity is the same for an observer at rest and an observer moving with a shock?", a: "the static temperature (and static pressure and density)", w: ["the stagnation temperature", "the Mach number", "the stagnation pressure"], why: "Static properties are frame-independent. Anything built from the velocity (M, T₀, p₀, h₀) changes with the frame." },
  ]));
  reg("L8-behind", { title: "Stagnation conditions behind a shock", group: "Lesson 8 · Shocks" }, () => {
    const M1 = R.pick([1.5, 1.8, 2, 2.2, 2.5, 3, 3.5, 4]), p1 = R.int(10, 100), T1 = R.int(200, 300), s = NS(M1, G);
    const p01 = p1 * isen.p0_p(M1, G), p02 = p01 * s.p02_p01, T0 = T1 * isen.T0_T(M1, G), ds = -Rs * Math.log(s.p02_p01);
    return { type: "num", pts: 5, q: `<p>Air at M₁ = ${M1}, p₁ = ${p1} kPa and T₁ = ${T1} K passes through a normal shock and is then brought to rest isentropically (state 3).</p><p>Find (a) p₀₁ (kPa), (b) p₃ = p₀₂ (kPa), (c) T₃ = T₀₂ (K), (d) M₂ and (e) s₂ − s₁ (J/(kg K)).</p>`,
      parts: [{ label: "(a) p₀₁", ans: p01 }, { label: "(b) p₀₂", ans: p02 }, { label: "(c) T₀₂ (K)", ans: T0 }, { label: "(d) M₂", ans: s.M2 }, { label: "(e) Δs", ans: ds }],
      sol: steps([["(a) p₀₁", "p₁(p₀/p)<sub>M₁</sub> (isentropic table)", p01], ["p₀₂/p₀₁", "normal-shock table at M₁", s.p02_p01], ["(b) p₀₂", "p₀₁ × (p₀₂/p₀₁) (or p₁ × p₀₂/p₁)", p02], ["(c) T₀₂", "T₀₁ = T₁(1 + 0.2M₁²): adiabatic shock", T0], ["(d) M₂", "normal-shock table", s.M2], ["(e) Δs", "−R ln(p₀₂/p₀₁)", ds]]) +
        `<p>Two traps: p₀₂ is not p₂ (it is p₂ raised isentropically from M₂), and T₀ does not change across the shock.</p>` };
  });
  reg("L8-moving", { title: "Moving shock: change of frame", group: "Lesson 8 · Shocks" }, () => {
    const T1 = R.int(260, 300), p1 = +R.u(80, 101.3, 0.1).toFixed(1), Ms = R.pick([1.3, 1.5, 1.8, 2, 2.4, 3]), a1 = Math.sqrt(G * Rs * T1), W = Ms * a1, s = NS(Ms, G);
    const T2 = T1 * s.T2_T1, a2 = Math.sqrt(G * Rs * T2), u2s = s.M2 * a2, up = W - u2s, Mlab = up / a2;
    return { type: "num", pts: 5, q: `<p>A normal shock moves at ${f(W, 4)} m/s into still air at ${T1} K and ${p1} kPa.</p><p>Find (a) the shock Mach number M<sub>s</sub> = W/a₁, (b) the static pressure and (c) temperature behind it, (d) the velocity of the air behind the shock in the lab frame (m/s) and (e) the Mach number of that air relative to the ground.</p>`,
      parts: [{ label: "(a) M<sub>s</sub>", ans: Ms, tol: 0.005 }, { label: "(b) p₂ (kPa)", ans: p1 * s.p2_p1 }, { label: "(c) T₂ (K)", ans: T2 }, { label: "(d) u<sub>p</sub> (m/s)", ans: up }, { label: "(e) M (lab)", ans: Mlab }],
      sol: steps([["a₁", "√(γRT₁)", a1], ["(a) M<sub>s</sub>", "W/a₁ (shock frame: air enters at M₁ = M<sub>s</sub>)", Ms], ["(b) p₂", "p₁(p₂/p₁)", p1 * s.p2_p1], ["(c) T₂", "T₁(T₂/T₁)", T2], ["Shock-frame exit speed", "u₂ = M₂√(γRT₂)", u2s], ["(d) u<sub>p</sub>", "W − u₂", up], ["(e) M (lab)", "u<sub>p</sub>/a₂", Mlab]]) +
        `<p>Static p and T are the same in both frames; velocities and Mach numbers are not. ${Mlab > 1 ? "Here the induced flow is itself supersonic relative to the ground." : ""}</p>` };
  });

  // =====================================================================================
  // Lesson 9 — Pitot probes
  // =====================================================================================
  reg("L9-branch", { title: "Which Pitot formula?", group: "Lesson 9 · Pitot probes" }, () => {
    const sup = R.rnd() < 0.5, M = sup ? R.pick([1.3, 1.6, 2, 2.5, 3]) : R.pick([0.3, 0.5, 0.7, 0.85, 0.95]);
    const ratio = sup ? NS(M, G).p02_p1 : isen.p0_p(M, G);
    return mc(`<p>A Pitot probe reads p₀ = ${f(ratio * 50, 4)} kPa while a static port reads ${50} kPa. Which relation gives the freestream Mach number?</p>`,
      sup ? "the Rayleigh–Pitot formula (a normal shock stands ahead of the probe)" : "the isentropic relation p₀/p = (1 + 0.2M²)^3.5",
      [sup ? "the isentropic relation p₀/p = (1 + 0.2M²)^3.5" : "the Rayleigh–Pitot formula (a normal shock stands ahead of the probe)", "Bernoulli's equation p₀ − p = ½ρV²", "the normal-shock pressure ratio p₂/p₁"],
      `<p>p₀/p = ${f(ratio, 4)}, which is ${sup ? "greater" : "less"} than 1.893 (the value at M = 1), so the flow is ${sup ? "supersonic: a detached normal shock sits in front of the probe mouth and the probe reads p₀₂. Rayleigh–Pitot (normal-shock table column p₀₂/p₁) gives" : "subsonic and the deceleration into the probe is isentropic, giving"} M = ${M}.</p>`);
  });
  reg("L9-tc", { title: "Pitot probe plus thermocouple", group: "Lesson 9 · Pitot probes" }, () => {
    const sup = R.rnd() < 0.5, M = sup ? R.u(1.3, 3.5, 0.01) : R.u(0.3, 0.95, 0.01), p = R.int(20, 100), T0 = R.int(290, 700);
    const r = sup ? NS(M, G).p02_p1 : isen.p0_p(M, G), pp = +(p * r).toFixed(1), Mx = sup ? GD.normalShockFrom("p02_p1", pp / p, G).M1 : isen.M_from_p0_p(pp / p, G);
    const T = T0 / isen.T0_T(Mx, G), V = Mx * Math.sqrt(G * Rs * T);
    return { type: "num", pts: 4, q: `<p>In a wind tunnel a Pitot probe reads ${pp} kPa, a wall static tap reads ${p} kPa, and a stagnation-temperature thermocouple reads ${T0} K.</p><p>Find (a) the freestream Mach number, (b) the static temperature (K) and (c) the velocity (m/s).</p>`,
      parts: [{ label: "(a) M∞", ans: Mx, tol: 0.01 }, { label: "(b) T∞ (K)", ans: T }, { label: "(c) V∞ (m/s)", ans: V }],
      sol: steps([["p<sub>Pitot</sub>/p", "", pp / p], ["Regime", "compare with 1.893", sup ? "supersonic → Rayleigh–Pitot" : "subsonic → isentropic"], ["(a) M∞", sup ? "solve p₀₂/p₁ = ratio (normal-shock table)" : "M = √(5[(p₀/p)<sup>2/7</sup> − 1])", Mx], ["(b) T∞", "T₀/(1 + 0.2M²) (T₀ unchanged by the shock)", T], ["(c) V∞", "M√(γRT)", V]]) };
  });
  reg("L9-concept", { title: "Pitot probe concepts", group: "Lesson 9 · Pitot probes" }, bank([
    { q: "In supersonic flow a Pitot probe measures…", a: "the stagnation pressure behind a normal shock, p₀₂", w: ["the freestream stagnation pressure p₀₁", "the static pressure p₂ behind the shock", "the freestream static pressure"], why: "A bow shock stands ahead of the blunt mouth; near the centerline it is normal, and the flow behind it decelerates isentropically into the probe. So the probe reads p₀₂ < p₀₁." },
    { q: "A thermocouple stagnation probe in supersonic flow measures the freestream T₀ because…", a: "the shock is adiabatic, so T₀₂ = T₀₁", w: ["the shock is isentropic", "the thermocouple is upstream of the shock", "temperature does not change across a shock"], why: "Static T rises across the shock, but T₀ (h₀) does not change in adiabatic flow." },
    { q: "Using Bernoulli's equation with a Pitot reading at M = 0.9 would give a velocity that is…", a: "too high, because the probe pressure includes compressibility", w: ["exactly right", "too low by a factor of 2", "negative"], why: "The compressible p₀ − p is larger than ½ρV², so solving Bernoulli for V overestimates it (about 9–10% too high at M = 0.9)." },
    { q: "The dividing value of p_Pitot/p between subsonic and supersonic Pitot analysis for air is…", a: "1.893", w: ["1.000", "0.528", "6.000"], why: "At M = 1 both formulas agree: p₀/p = (1.2)^3.5 = 1.893. Below it use the isentropic relation; above it Rayleigh–Pitot." },
  ]));

  // =====================================================================================
  // Lesson 10 — quasi-1D flow and nozzles
  // =====================================================================================
  reg("L10-concept", { title: "Area–velocity relation and nozzle flow", group: "Lesson 10 · Nozzles" }, bank([
    { q: "In a supersonic (M > 1) isentropic flow, a diverging duct (dA > 0)…", a: "accelerates the flow", w: ["decelerates the flow", "leaves the velocity unchanged", "always produces a shock"], why: "dA/A = (M² − 1)du/u. For M > 1 the bracket is positive, so dA > 0 gives du > 0. Density falls faster than velocity rises." },
    { q: "Sonic flow (M = 1) in a quasi-1D isentropic duct can only occur where…", a: "the area is a minimum (the throat)", w: ["the area is a maximum", "the area is changing fastest", "anywhere"], why: "At M = 1 the area–velocity relation gives dA = 0, which must be a minimum for a smooth acceleration from subsonic to supersonic." },
    { q: "A converging nozzle fed from p₀ is choked when the back pressure falls to…", a: "p_b/p₀ = 0.528; lowering p_b further does not increase the mass flow", w: ["p_b/p₀ = 0.833", "p_b = 0", "p_b/p₀ = 1.893"], why: "Once the exit is sonic, information from downstream cannot reach upstream, so ṁ = p₀A*√(γ/RT₀)(2/(γ+1))^3 is fixed. The exit pressure stays at p*." },
    { q: "An overexpanded nozzle has…", a: "exit pressure below the back pressure, so shocks form at or after the exit", w: ["exit pressure above the back pressure", "exit pressure equal to the back pressure", "subsonic flow throughout"], why: "Overexpanded: p_e < p_b, oblique shocks (or a Mach disk) raise the pressure. Underexpanded: p_e > p_b, expansion fans outside (always the case in space)." },
    { q: "For a given supersonic exit Mach number, the needed area ratio A_e/A*…", a: "grows rapidly with Mach number (1.69 at M = 2, 10.7 at M = 4)", w: ["is always 1", "decreases with Mach number", "is the same for subsonic and supersonic exits"], why: "A/A* has two solutions for each value above 1, one subsonic and one supersonic, and grows quickly at high M; high-Mach tunnels need very small throats." },
  ]));
  reg("L10-aastar", { title: "Area ratio and exit conditions", group: "Lesson 10 · Nozzles" }, () => {
    const Me = R.pick([1.5, 2, 2.5, 3, 3.5, 4]), p0 = R.int(200, 2000), T0 = R.int(300, 600), At = +R.u(0.002, 0.05, 0.0005).toFixed(4);
    const AA = isen.A_Astar(Me, G), pe = p0 / isen.p0_p(Me, G), Te = T0 / isen.T0_T(Me, G), Ve = Me * Math.sqrt(G * Rs * Te);
    const mdot = p0 * 1000 * At * Math.sqrt(G / (Rs * T0)) * Math.pow(2 / (G + 1), (G + 1) / (2 * (G - 1)));
    return { type: "num", pts: 5, q: `<p>A converging–diverging nozzle is designed for an exit Mach number of ${Me} with reservoir conditions p₀ = ${p0} kPa and T₀ = ${T0} K. The throat area is ${At} m².</p><p>Find (a) A<sub>e</sub>/A*, (b) p<sub>e</sub> (kPa), (c) T<sub>e</sub> (K), (d) V<sub>e</sub> (m/s) and (e) the mass flow (kg/s).</p>`,
      parts: [{ label: "(a) A<sub>e</sub>/A*", ans: AA }, { label: "(b) p<sub>e</sub>", ans: pe }, { label: "(c) T<sub>e</sub>", ans: Te }, { label: "(d) V<sub>e</sub>", ans: Ve }, { label: "(e) ṁ (kg/s)", ans: mdot }],
      sol: steps([["(a) A<sub>e</sub>/A*", "(1/M)[(2/(γ+1))(1 + 0.2M²)]<sup>3</sup>", AA], ["(b) p<sub>e</sub>", "p₀/(1 + 0.2M²)<sup>3.5</sup>", pe], ["(c) T<sub>e</sub>", "T₀/(1 + 0.2M²)", Te], ["(d) V<sub>e</sub>", "M<sub>e</sub>√(γRT<sub>e</sub>)", Ve], ["(e) ṁ", "p₀A*√(γ/(RT₀))(2/(γ+1))<sup>(γ+1)/(2(γ−1))</sup> = 0.0404p₀A*/√T₀", mdot]]) };
  });

  if (typeof module !== "undefined" && module.exports) module.exports = {};
})(typeof window !== "undefined" ? window : globalThis);
