/*
 * practice.js — problem generator for every lesson. Loaded by ui.js on lesson pages.
 * Each lesson has numerical generators (randomized inputs, answers from gasdyn.js / hyper.js)
 * and conceptual questions (the lesson's self-check bank, plus extra and computed questions).
 *   numerical generator: R => ({ q, ans, unit, tol, absTol, sol: [[quantity, relation, value], ...] })
 *   conceptual generator: R => ({ q, opts, a, why })
 */
(function () {
  "use strict";
  const GD = window.GD, HY = window.HY, D = Math.PI / 180, f = (x, s = 4) => UI.fmt(x, s);

  // ---------- random helpers ----------
  function makeR(seed) {
    let s = seed >>> 0 || 1;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    return {
      rnd,
      u: (a, b, step = 0.01) => +(a + Math.round((rnd() * (b - a)) / step) * step).toFixed(6),
      pick: arr => arr[Math.floor(rnd() * arr.length)],
      int: (a, b) => a + Math.floor(rnd() * (b - a + 1)),
    };
  }
  const shuffle = (R, n) => { const o = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(R.rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
  const g14 = 1.4, Rair = 287.05;

  // =====================================================================================
  // Problem bank, by lesson slug
  // =====================================================================================
  const BANK = {};

  // ---------- Lesson 1: isentropic ----------
  BANK.isentropic = {
    numeric: [
      R => { const M = R.u(0.3, 4, 0.05), T0 = R.u(280, 600, 5), T = T0 / GD.isen.T0_T(M, g14);
        return { q: `Air (γ = 1.4) flows at M = ${M} with total temperature T₀ = ${T0} K. Find the static temperature T.`, ans: T, unit: "K",
          sol: [["T₀/T", "1 + (γ−1)M²/2", GD.isen.T0_T(M, g14)], ["T", "T₀ ÷ (T₀/T)", T]] }; },
      R => { const r = R.u(1.2, 30, 0.1), M = GD.isen.M_from_p0_p(r, g14);
        return { q: `A Pitot-static tube in a subsonic or supersonic isentropic stream (no shock ahead of it) reads p₀/p = ${r}. Assuming isentropic flow, what is M? (γ = 1.4)`, ans: M, unit: "",
          sol: [["M", "√{[2/(γ−1)][(p₀/p)^((γ−1)/γ) − 1]}", M]] }; },
      R => { const M = R.u(1.2, 5, 0.05), A = GD.isen.A_Astar(M, g14);
        return { q: `Find the area ratio A/A* for isentropic flow of air at M = ${M}.`, ans: A, unit: "",
          sol: [["A/A*", "(1/M)[(2/(γ+1))(1 + (γ−1)M²/2)]^((γ+1)/(2(γ−1)))", A]] }; },
      R => { const T = R.u(200, 320, 1), M = R.u(0.5, 3.5, 0.05), a = Math.sqrt(g14 * Rair * T);
        return { q: `Air at T = ${T} K moves at M = ${M}. What is its velocity?`, ans: M * a, unit: "m/s",
          sol: [["a", "√(γRT), R = 287.05 J/(kg K)", a], ["V", "M a", M * a]] }; },
      R => { const p = R.u(20, 100, 1), M = R.u(0.4, 3, 0.05), p0 = p * GD.isen.p0_p(M, g14);
        return { q: `The static pressure is p = ${p} kPa at M = ${M}. Find the total pressure p₀ (γ = 1.4).`, ans: p0, unit: "kPa",
          sol: [["p₀/p", "(1 + (γ−1)M²/2)^(γ/(γ−1))", GD.isen.p0_p(M, g14)], ["p₀", "", p0]] }; },
      R => { const pct = R.pick([1, 2, 5, 10]), M = GD.isen.M_from_rho0_rho(1 / (1 - pct / 100), g14);
        return { q: `At what Mach number does the density of air brought isentropically to rest differ from the moving gas by ${pct}% (i.e. ρ/ρ₀ = ${1 - pct / 100})?`, ans: M, unit: "",
          sol: [["ρ₀/ρ", "1/(1 − " + pct / 100 + ")", 1 / (1 - pct / 100)], ["M", "√{[2/(γ−1)][(ρ₀/ρ)^(γ−1) − 1]}", M]] }; },
    ],
  };

  // ---------- Lesson 2: normal shock ----------
  BANK["normal-shock"] = {
    numeric: [
      R => { const M = R.u(1.2, 6, 0.05), ns = GD.normalShock(M, g14);
        return { q: `A normal shock stands in air at M₁ = ${M}. Find the downstream Mach number M₂.`, ans: ns.M2, unit: "",
          sol: [["M₂²", "[1 + (γ−1)M₁²/2]/[γM₁² − (γ−1)/2]", ns.M2 ** 2], ["M₂", "", ns.M2]] }; },
      R => { const M = R.u(1.2, 6, 0.05), ns = GD.normalShock(M, g14);
        return { q: `What fraction of the total pressure survives a normal shock at M₁ = ${M}? Give p₀₂/p₀₁.`, ans: ns.p02_p01, unit: "",
          sol: [["ρ₂/ρ₁", "(γ+1)M²/(2 + (γ−1)M²)", ns.rho2_rho1], ["p₂/p₁", "1 + 2γ(M²−1)/(γ+1)", ns.p2_p1], ["p₀₂/p₀₁", "(ρ₂/ρ₁)^(γ/(γ−1)) (p₂/p₁)^(−1/(γ−1))", ns.p02_p01]] }; },
      R => { const M = R.u(1.3, 5, 0.05), r = GD.normalShock(M, g14).p02_p1;
        return { q: `A Pitot probe in a supersonic stream reads p₀₂/p₁ = ${f(r, 4)} (Pitot pressure over freestream static). Find M₁ using the Rayleigh–Pitot formula.`, ans: M, unit: "",
          sol: [["Rayleigh–Pitot", "p₀₂/p₁ = f(M₁)", r], ["M₁", "invert numerically", M]] }; },
      R => { const M = R.u(1.5, 8, 0.1), T1 = R.u(200, 300, 1), ns = GD.normalShock(M, g14);
        return { q: `Air at T₁ = ${T1} K crosses a normal shock at M₁ = ${M}. Find T₂.`, ans: T1 * ns.T2_T1, unit: "K",
          sol: [["p₂/p₁", "1 + 2γ(M²−1)/(γ+1)", ns.p2_p1], ["ρ₂/ρ₁", "", ns.rho2_rho1], ["T₂/T₁", "(p₂/p₁)/(ρ₂/ρ₁)", ns.T2_T1], ["T₂", "", T1 * ns.T2_T1]] }; },
      R => { const r = R.u(2, 20, 0.5), T = R.u(280, 310, 1), Ms = Math.sqrt(1 + (g14 + 1) / (2 * g14) * (r - 1)), a = Math.sqrt(g14 * Rair * T);
        const up = a / g14 * (r - 1) * Math.sqrt((2 * g14 / (g14 + 1)) / (r + (g14 - 1) / (g14 + 1)));
        return { q: `A shock with pressure ratio p₂/p₁ = ${r} moves into still air at ${T} K. Find the velocity of the gas behind it (the induced velocity).`, ans: up, unit: "m/s",
          sol: [["M_s", "√(1 + (γ+1)(p₂/p₁ − 1)/(2γ))", Ms], ["a₁", "√(γRT)", a], ["u_p", "(a₁/γ)(p₂/p₁ − 1)√{[2γ/(γ+1)]/[p₂/p₁ + (γ−1)/(γ+1)]}", up]] }; },
    ],
  };

  // ---------- Lesson 3: nozzles ----------
  BANK.nozzles = {
    numeric: [
      R => { const A = R.u(1.5, 25, 0.1), M = GD.isen.M_from_A_Astar(A, g14, "sup");
        return { q: `A converging–diverging nozzle has exit-to-throat area ratio A_e/A* = ${A}. Find the supersonic design exit Mach number.`, ans: M, unit: "",
          sol: [["M_e", "invert A/A*, supersonic branch", M]] }; },
      R => { const p0 = R.u(200, 2000, 10), T0 = R.u(280, 600, 5), At = R.u(5, 100, 1), m = GD.isen.massFlowParam(1, g14, Rair) * At * 1e-4 * p0 * 1e3 / Math.sqrt(T0);
        return { q: `A choked nozzle with throat area ${At} cm² is fed with air at p₀ = ${p0} kPa and T₀ = ${T0} K. Find the mass flow.`, ans: m, unit: "kg/s",
          sol: [["ṁ√T₀/(A*p₀)", "√(γ/R)(2/(γ+1))^((γ+1)/(2(γ−1)))", GD.isen.massFlowParam(1, g14, Rair)], ["ṁ", "0.0404 A*p₀/√T₀", m]] }; },
      R => { const A = R.u(1.5, 10, 0.1), M = GD.isen.M_from_A_Astar(A, g14, "sup"), pr = 1 / GD.isen.p0_p(M, g14), ns = GD.normalShock(M, g14);
        return { q: `For a nozzle with A_e/A* = ${A}, find the back-pressure ratio p_b/p₀ that puts a normal shock exactly at the exit plane.`, ans: pr * ns.p2_p1, unit: "",
          sol: [["M_e", "supersonic A/A*", M], ["p_e/p₀", "isentropic", pr], ["p₂/p₁ at M_e", "normal shock", ns.p2_p1], ["p_b/p₀", "(p_e/p₀)(p₂/p₁)", pr * ns.p2_p1]] }; },
      R => { const A = R.u(1.2, 6, 0.1), M = GD.isen.M_from_A_Astar(A, g14, "sub");
        return { q: `Subsonic flow fills a nozzle in which A/A* = ${A} at a station. What is the (subsonic) Mach number there?`, ans: M, unit: "",
          sol: [["M", "invert A/A*, subsonic branch", M]] }; },
    ],
  };

  // ---------- Lesson 4: duct flow ----------
  BANK["duct-flow"] = {
    concept: [
      { q: "Adding heat to a supersonic flow in a constant-area duct drives the Mach number…", opts: ["up, away from 1", "down, toward 1", "to zero", "unchanged"], a: 1, why: "Rayleigh flow: heating drives M toward 1 from either side; cooling drives it away." },
      { q: "Friction in an adiabatic constant-area duct (Fanno flow) makes a subsonic flow…", opts: ["decelerate", "accelerate toward M = 1", "become supersonic", "isentropic"], a: 1, why: "Friction drives the Mach number toward 1 on both branches; a subsonic flow speeds up." },
      { q: "Across Rayleigh heating, the total temperature…", opts: ["stays constant", "rises", "falls", "equals T*"], a: 1, why: "Heat addition q = c_p(T₀₂ − T₀₁) raises T₀; it is the variable that measures heating." },
      { q: "In Fanno flow, which quantity is constant?", opts: ["total pressure", "total temperature", "static pressure", "Mach number"], a: 1, why: "Fanno flow is adiabatic, so h₀ (and T₀) is constant; total pressure falls because of friction." },
      { q: "If more heat is added than the amount that chokes a duct with subsonic inlet flow…", opts: ["the exit goes supersonic", "the inlet flow adjusts: the mass flow drops", "the heat is rejected", "nothing changes"], a: 1, why: "Thermal choking: the duct cannot pass the original mass flow, so the upstream conditions change." },
      { q: "Total pressure in Rayleigh flow with heat addition…", opts: ["rises", "falls", "stays constant", "rises only if supersonic"], a: 1, why: "Heat addition always lowers p₀; that is why burners are kept at low Mach number in ramjets." },
    ],
    numeric: [
      R => { const M = R.u(0.15, 0.8, 0.01), r = 1 / GD.rayleigh.T0_T0s(M, g14);
        return { q: `Air enters a constant-area burner at M₁ = ${M}. By what factor can the total temperature be raised before the duct chokes (T₀*/T₀₁)?`, ans: r, unit: "",
          sol: [["T₀/T₀*", "(γ+1)M²[2 + (γ−1)M²]/(1 + γM²)²", GD.rayleigh.T0_T0s(M, g14)], ["T₀*/T₀₁", "inverse", r]] }; },
      R => { const M = R.u(0.15, 0.5, 0.01), tr = R.u(1.2, 2.2, 0.05), h = GD.rayleighHeat(M, tr, g14);
        if (h.choked) return null;
        return { q: `Subsonic air at M₁ = ${M} is heated in a constant-area duct so that T₀₂/T₀₁ = ${tr}. Find the exit Mach number.`, ans: h.M2, unit: "",
          sol: [["T₀₁/T₀*", "Rayleigh", GD.rayleigh.T0_T0s(M, g14)], ["T₀₂/T₀*", "× T₀₂/T₀₁", GD.rayleigh.T0_T0s(M, g14) * tr], ["M₂", "invert, subsonic branch", h.M2]] }; },
      R => { const M = R.u(0.2, 0.8, 0.01), fl = GD.fanno.fLD(M, g14);
        return { q: `Air enters an adiabatic pipe at M₁ = ${M}. Find the friction parameter 4fL*/D needed to choke it.`, ans: fl, unit: "",
          sol: [["4fL*/D", "(1−M²)/(γM²) + [(γ+1)/(2γ)] ln{(γ+1)M²/[2 + (γ−1)M²]}", fl]] }; },
      R => { const M = R.u(1.5, 3.5, 0.05), fl = GD.fanno.fLD(M, g14), Dm = R.u(0.02, 0.1, 0.005), ff = 0.005, L = fl * Dm / (4 * ff);
        return { q: `Supersonic air at M₁ = ${M} enters a pipe of diameter ${Dm} m with friction factor f = 0.005. What length chokes it?`, ans: L, unit: "m",
          sol: [["4fL*/D", "Fanno function", fl], ["L*", "(4fL*/D) D/(4f)", L]] }; },
    ],
  };

  // ---------- Lesson 5: oblique shocks ----------
  BANK["oblique-shock"] = {
    concept: [
      { q: "Across an oblique shock, which velocity component is unchanged?", opts: ["normal to the shock", "tangential to the shock", "the magnitude", "none"], a: 1, why: "Tangential momentum gives w₁ = w₂; only the normal component jumps." },
      { q: "If a wedge angle exceeds θ_max for the Mach number…", opts: ["a strong attached shock forms", "the shock detaches as a bow shock", "an expansion forms", "the flow becomes subsonic upstream"], a: 1, why: "No straight attached shock can turn the flow that much; a curved, detached bow shock stands ahead." },
      { q: "For a given M₁ and θ < θ_max, nature normally picks…", opts: ["the strong solution", "the weak solution", "a Mach wave", "either at random"], a: 1, why: "Attached shocks on wedges and ramps are weak unless a high back pressure forces the strong solution." },
      { q: "Raising M₁ at fixed wedge angle makes the weak shock angle β…", opts: ["larger", "smaller", "unchanged", "90°"], a: 1, why: "At higher Mach number the shock leans closer to the wedge surface." },
      { q: "Compared with one strong shock, several weak shocks turning the flow the same total angle…", opts: ["lose more total pressure", "lose less total pressure", "lose the same", "cannot be supersonic"], a: 1, why: "Entropy rise grows roughly with the cube of shock strength, so many weak shocks are more efficient." },
      { q: "Regular reflection becomes impossible when…", opts: ["θ > θ_max(M₂)", "M₁ < 1", "β = 90°", "the wall is curved"], a: 0, why: "The reflected shock must turn the flow back by θ at the lower Mach number M₂; if θ exceeds θ_max there, a Mach stem forms." },
    ],
    numeric: [
      R => { const M = R.u(1.6, 6, 0.1), th = R.u(4, Math.min(30, GD.betaMax(M, g14).theta / D - 2), 0.5), o = GD.obliqueShock(M, th * D, g14);
        return { q: `A ${th}° wedge sits in a Mach ${M} air stream. Find the weak-solution shock angle β (degrees).`, ans: o.beta / D, unit: "deg", tol: 0.005,
          sol: [["β", "θ–β–M relation, weak branch", o.beta / D], ["Mₙ₁", "M₁ sin β", o.Mn1]] }; },
      R => { const M = R.u(1.6, 6, 0.1), th = R.u(4, Math.min(30, GD.betaMax(M, g14).theta / D - 2), 0.5), o = GD.obliqueShock(M, th * D, g14);
        return { q: `For the weak shock on a ${th}° wedge at M₁ = ${M}, find the pressure ratio p₂/p₁.`, ans: o.p2_p1, unit: "",
          sol: [["β (deg)", "θ–β–M", o.beta / D], ["Mₙ₁", "M₁ sin β", o.Mn1], ["p₂/p₁", "1 + 2γ(Mₙ₁² − 1)/(γ+1)", o.p2_p1]] }; },
      R => { const M = R.u(1.6, 6, 0.1), th = R.u(4, Math.min(30, GD.betaMax(M, g14).theta / D - 2), 0.5), o = GD.obliqueShock(M, th * D, g14);
        return { q: `Air at M₁ = ${M} turns through ${th}° at a compression corner (weak shock). Find M₂.`, ans: o.M2, unit: "",
          sol: [["β (deg)", "θ–β–M", o.beta / D], ["Mₙ₂", "normal shock at Mₙ₁", o.Mn2], ["M₂", "Mₙ₂/sin(β − θ)", o.M2]] }; },
      R => { const M = R.u(1.3, 8, 0.1), bm = GD.betaMax(M, g14);
        return { q: `What is the maximum wedge half-angle θ_max for an attached shock at M₁ = ${M}?`, ans: bm.theta / D, unit: "deg", tol: 0.005,
          sol: [["β at θ_max (deg)", "maximize θ(β)", bm.beta / D], ["θ_max (deg)", "", bm.theta / D]] }; },
    ],
    generated: [
      R => { const M = R.u(1.5, 4, 0.1), tm = GD.betaMax(M, g14).theta / D, th = R.pick([Math.round(tm - 4), Math.round(tm + 3)]);
        const att = th < tm;
        return { q: `At M₁ = ${M}, will a ${th}° wedge carry an attached shock?`, opts: ["Yes, attached", "No, the shock detaches"], a: att ? 0 : 1, why: `θ_max at M = ${M} is ${f(tm, 4)}°, so a ${th}° wedge ${att ? "carries an attached weak shock" : "exceeds it and the shock detaches"}.` }; },
    ],
  };

  // ---------- Lesson 6: expansion ----------
  BANK.expansion = {
    concept: [
      { q: "Which quantity stays constant through a Prandtl–Meyer expansion fan?", opts: ["static pressure", "Mach number", "total pressure", "density"], a: 2, why: "The expansion is isentropic, so p₀ and T₀ are constant." },
      { q: "A supersonic flow turning away from itself at a convex corner forms…", opts: ["an oblique shock", "a centered expansion fan", "a normal shock", "a slip line only"], a: 1, why: "Turning away from itself is an expansion: a fan of Mach waves centered on the corner." },
      { q: "A flat plate at α in inviscid supersonic flow has drag…", opts: ["zero", "wave drag with c_d = c_l tan α", "equal to its lift", "skin friction only"], a: 1, why: "The net pressure force is normal to the plate, so D/L = tan α: wave drag due to lift." },
      { q: "For the same total turn, an isentropic compression compared with a single shock reaches…", opts: ["a lower pressure", "a slightly higher pressure with no total-pressure loss", "the same entropy rise", "subsonic flow"], a: 1, why: "Isentropic compression keeps p₀, reaching a slightly higher p₂/p₁ than the shock." },
      { q: "The maximum turning angle ν_max for γ = 1.4 is about…", opts: ["45°", "90°", "130.5°", "180°"], a: 2, why: "ν_max = (π/2)(√((γ+1)/(γ−1)) − 1) = 130.45° for γ = 1.4." },
      { q: "On a symmetric diamond airfoil at α = 0, the wave drag comes from…", opts: ["the shoulder expansions reducing the rear-face pressure", "friction", "lift", "nothing: it is zero"], a: 0, why: "Front faces are compressed and rear faces expanded; the pressure difference acting on the thickness gives drag." },
    ],
    numeric: [
      R => { const M = R.u(1.1, 5, 0.05), v = GD.nu(M, g14) / D;
        return { q: `Find the Prandtl–Meyer function ν (degrees) at M = ${M} (γ = 1.4).`, ans: v, unit: "deg", tol: 0.005,
          sol: [["ν", "√((γ+1)/(γ−1)) tan⁻¹√((γ−1)(M²−1)/(γ+1)) − tan⁻¹√(M²−1)", v]] }; },
      R => { const M1 = R.u(1.2, 3.5, 0.05), th = R.u(5, 25, 0.5), M2 = GD.M_from_nu(GD.nu(M1, g14) + th * D, g14);
        return { q: `Air at M₁ = ${M1} expands around a ${th}° convex corner. Find M₂.`, ans: M2, unit: "",
          sol: [["ν(M₁) (deg)", "Prandtl–Meyer", GD.nu(M1, g14) / D], ["ν(M₂) (deg)", "ν(M₁) + θ", GD.nu(M1, g14) / D + th], ["M₂", "invert ν", M2]] }; },
      R => { const M1 = R.u(1.2, 3.5, 0.05), th = R.u(5, 25, 0.5), M2 = GD.M_from_nu(GD.nu(M1, g14) + th * D, g14), pr = GD.isen.p0_p(M1, g14) / GD.isen.p0_p(M2, g14);
        return { q: `For an expansion of air from M₁ = ${M1} through ${th}°, find the pressure ratio p₂/p₁.`, ans: pr, unit: "",
          sol: [["M₂", "Prandtl–Meyer", M2], ["p₂/p₁", "(p₀/p)₁/(p₀/p)₂", pr]] }; },
      R => { const M = R.u(1.8, 5, 0.1), a = R.u(2, 10, 0.5), r = GD.diamondAirfoil(M, a * D, 0, g14);
        return { q: `A flat plate is at α = ${a}° in a Mach ${M} air stream. Find c_l by shock-expansion theory.`, ans: r.CL, unit: "",
          sol: [["upper surface", "expansion by α", r.faces[0].p], ["lower surface", "oblique shock, θ = α", r.faces[2].p], ["c_l", "(p_l − p_u)cos α /q", r.CL], ["c_l, linear theory", "4α/√(M²−1)", r.linear.CL]] }; },
    ],
  };

  // ---------- Lesson 7: linearized ----------
  BANK.linearized = {
    concept: [
      { q: "The Prandtl–Glauert rule predicts that, as M∞ → 1, the pressure coefficient…", opts: ["goes to zero", "becomes infinite", "stays constant", "changes sign"], a: 1, why: "Cp = Cp₀/√(1 − M²) diverges at M = 1, where linear theory breaks down." },
      { q: "The critical Mach number is the freestream Mach number at which…", opts: ["the drag doubles", "the local flow first reaches M = 1 somewhere on the body", "the shock detaches", "the flow separates"], a: 1, why: "Beyond M_cr there is a pocket of supersonic flow, usually ended by a shock." },
      { q: "Sweeping a wing back by Λ raises its critical Mach number because…", opts: ["it reduces the wing area", "only the velocity component normal to the leading edge, M cos Λ, governs compressibility", "it moves the shock forward", "it increases thickness"], a: 1, why: "To first order the flow responds to the normal component, so a swept wing behaves like a thinner, slower airfoil." },
      { q: "In supersonic linear (Ackeret) theory, the lift-curve slope of a thin airfoil is…", opts: ["2π", "4/√(M²−1)", "2π/√(1−M²)", "zero"], a: 1, why: "c_l = 4α/√(M²−1), independent of camber and thickness." },
      { q: "The Kármán–Tsien rule is more accurate than Prandtl–Glauert at high subsonic Mach because…", opts: ["it includes viscosity", "it accounts for the local Mach number varying with the local Cp", "it is exact", "it uses the strong-shock limit"], a: 1, why: "It uses a tangent-gas approximation that partly captures how the local speed of sound changes." },
      { q: "The area rule says transonic wave drag depends mainly on…", opts: ["wing span", "the axial distribution of cross-sectional area", "surface roughness", "the airfoil camber only"], a: 1, why: "Whitcomb: a smooth area distribution minimizes transonic wave drag, hence 'coke-bottle' fuselages." },
    ],
    numeric: [
      R => { const Cp0 = -R.u(0.2, 0.8, 0.01), M = R.u(0.3, 0.75, 0.01);
        return { q: `At low speed an airfoil point has Cp₀ = ${Cp0}. Estimate Cp at M∞ = ${M} with the Prandtl–Glauert rule.`, ans: GD.linear.prandtlGlauert(Cp0, M), unit: "",
          sol: [["√(1 − M²)", "", Math.sqrt(1 - M * M)], ["Cp", "Cp₀/√(1 − M²)", GD.linear.prandtlGlauert(Cp0, M)]] }; },
      R => { const Cp0 = -R.u(0.2, 0.8, 0.01), M = R.u(0.3, 0.75, 0.01);
        return { q: `Repeat with the Kármán–Tsien rule: Cp₀ = ${Cp0}, M∞ = ${M}.`, ans: GD.linear.karmanTsien(Cp0, M), unit: "",
          sol: [["Cp", "Cp₀/{√(1−M²) + [M²/(1+√(1−M²))] Cp₀/2}", GD.linear.karmanTsien(Cp0, M)]] }; },
      R => { const M = R.u(0.5, 0.9, 0.01);
        return { q: `Find the critical pressure coefficient Cp* (local flow just sonic) at M∞ = ${M}.`, ans: GD.linear.CpCritical(M, g14), unit: "",
          sol: [["Cp*", "(2/(γM²)){[(2 + (γ−1)M²)/(γ+1)]^(γ/(γ−1)) − 1}", GD.linear.CpCritical(M, g14)]] }; },
      R => { const Cp0 = -R.u(0.3, 1.2, 0.01), Mc = GD.linear.criticalMach(Cp0, g14, "karmanTsien");
        return { q: `An airfoil's minimum low-speed pressure coefficient is Cp₀,min = ${Cp0}. Find its critical Mach number using Kármán–Tsien.`, ans: Mc, unit: "",
          sol: [["condition", "Cp(KT, M) = Cp*(M)", ""], ["M_cr", "solve numerically", Mc]] }; },
      R => { const M = R.u(1.3, 4, 0.05), a = R.u(1, 8, 0.5);
        return { q: `Find c_l of a thin flat plate at α = ${a}° and M∞ = ${M} by linear supersonic (Ackeret) theory.`, ans: 4 * a * D / Math.sqrt(M * M - 1), unit: "",
          sol: [["α (rad)", "", a * D], ["c_l", "4α/√(M²−1)", 4 * a * D / Math.sqrt(M * M - 1)]] }; },
    ],
  };

  // ---------- Lesson 8: wind tunnels ----------
  BANK["wind-tunnels"] = {
    numeric: [
      R => { const M = R.u(1.5, 4.5, 0.05), H = R.u(0.05, 0.4, 0.01), A = GD.isen.A_Astar(M, g14);
        return { q: `A square test section of side ${H} m runs at Mach ${M}. Find the nozzle throat area.`, ans: H * H / A * 1e4, unit: "cm²",
          sol: [["A/A*", "area–Mach", A], ["A_t", "H²/(A/A*)", H * H / A * 1e4]] }; },
      R => { const M = R.u(1.5, 4.5, 0.05), ns = GD.normalShock(M, g14);
        return { q: `A Mach ${M} tunnel must swallow its starting shock. What is the minimum ratio of second-throat area to nozzle-throat area, A_t2/A_t1?`, ans: 1 / ns.p02_p01, unit: "",
          sol: [["p₀₂/p₀₁ at M", "normal shock", ns.p02_p01], ["A_t2/A_t1", "p₀₁/p₀₂", 1 / ns.p02_p01]] }; },
      R => { const M = R.u(1.5, 4, 0.05), r = GD.normalShock(M, g14).p02_p01;
        return { q: `A Pitot probe in a supersonic test section reads ${f(r * 100, 4)}% of the settling-chamber pressure (p₀₂/p₀₁ = ${f(r, 4)}). Find the test-section Mach number.`, ans: M, unit: "",
          sol: [["M", "invert normal-shock p₀₂/p₀₁", M]] }; },
      R => { const M = R.u(2, 4, 0.05), p0 = R.u(200, 1500, 10) * 1e3, T0 = R.u(280, 330, 1), t = GD.tunnel(M, p0, T0, g14, Rair);
        return { q: `A Mach ${M} tunnel runs at p₀ = ${p0 / 1000} kPa, T₀ = ${T0} K. Find the unit Reynolds number in the test section (Sutherland viscosity).`, ans: t.Re_per_m, unit: "1/m",
          sol: [["T (K)", "T₀/(1 + 0.2M²)", t.T], ["p (Pa)", "isentropic", t.p], ["V (m/s)", "M√(γRT)", t.V], ["μ", "Sutherland", t.mu], ["Re/m", "ρV/μ", t.Re_per_m]] }; },
      R => { const At = R.u(10, 80, 1) * 1e-4, p0 = R.u(300, 800, 10) * 1e3, T0 = 290, V = R.u(10, 60, 1), pi = R.u(1500, 3000, 50) * 1e3;
        const md = GD.isen.massFlowParam(1, g14, Rair) * At * p0 / Math.sqrt(T0), t = (pi - 1.1 * p0) * V / (Rair * T0) / md;
        return { q: `A blowdown tunnel with ${f(At * 1e4)} cm² throat runs at p₀ = ${p0 / 1000} kPa, T₀ = 290 K from ${V} m³ of isothermal tanks charged to ${pi / 1000} kPa. The regulator needs the tanks above 1.1p₀. Find the run time.`, ans: t, unit: "s",
          sol: [["ṁ (kg/s)", "0.0404 A_t p₀/√T₀", md], ["usable mass (kg)", "(p_i − 1.1p₀)V/(RT₀)", (pi - 1.1 * p0) * V / (Rair * T0)], ["t", "mass/ṁ", t]] }; },
    ],
  };

  // ---------- Lesson 9: hypersonic flow ----------
  BANK["hypersonic-flow"] = {
    numeric: [
      R => { const g = R.pick([1.4, 1.3, 1.2, 1.15, 1.1]);
        return { q: `In the strong-shock limit, what density ratio ρ₂/ρ₁ does a gas with γ = ${g} approach?`, ans: (g + 1) / (g - 1), unit: "",
          sol: [["ρ₂/ρ₁", "(γ+1)/(γ−1)", (g + 1) / (g - 1)]] }; },
      R => { const M = R.u(8, 25, 0.5), th = R.u(3, 12, 0.5), b = HY.hsd.beta_theta(M * th * D, g14) * th;
        return { q: `Use hypersonic small-disturbance theory to estimate the shock angle on a ${th}° wedge at M = ${M}.`, ans: b, unit: "deg", tol: 0.005,
          sol: [["K = Mθ", "θ in rad", M * th * D], ["β/θ", "(γ+1)/4 + √[((γ+1)/4)² + 1/K²]", HY.hsd.beta_theta(M * th * D, g14)], ["β", "", b], ["β exact", "θ–β–M", GD.obliqueShock(M, th * D, g14).beta / D]] }; },
      R => { const M = R.u(3, 20, 0.5), Rn = R.u(0.1, 3, 0.05), d = 0.143 * Math.exp(3.24 / (M * M)) * Rn;
        return { q: `Estimate the bow-shock stand-off distance ahead of a sphere of radius ${Rn} m at M = ${M} (Billig).`, ans: d, unit: "m",
          sol: [["Δ/R", "0.143 exp(3.24/M²)", d / Rn], ["Δ", "", d]] }; },
      R => { const M = R.u(8, 20, 0.5), Re = R.pick([1e4, 3e4, 1e5, 3e5, 1e6]), C = R.u(0.6, 1, 0.05), chi = M ** 3 * Math.sqrt(C / Re);
        return { q: `On a flat plate at M = ${M}, the local Reynolds number is Re_x = ${f(Re)} and C = ${C}. Find the viscous interaction parameter χ̄.`, ans: chi, unit: "",
          sol: [["χ̄", "M³√(C/Re_x)", chi], ["regime", "weak if χ̄ < 3", chi > 3 ? "strong" : "weak"]] }; },
      R => { const M = R.u(5, 25, 0.5), Re = R.pick([1e2, 1e3, 1e4, 1e5]), Kn = 1.26 * Math.sqrt(g14) * M / Re;
        return { q: `A vehicle flies at M = ${M} with Re_L = ${f(Re)}. Estimate its Knudsen number.`, ans: Kn, unit: "",
          sol: [["Kn", "1.26√γ M/Re", Kn], ["regime", "", Kn < 0.01 ? "continuum" : Kn < 0.1 ? "slip" : Kn < 10 ? "transitional" : "free molecular"]] }; },
    ],
    generated: [
      R => { const M = R.u(5, 20, 0.5), Re = R.pick([1e2, 1e3, 1e4, 1e6]), Kn = 1.26 * Math.sqrt(g14) * M / Re, k = Kn < 0.01 ? 0 : Kn < 0.1 ? 1 : Kn < 10 ? 2 : 3;
        return { q: `M = ${M}, Re_L = ${f(Re)}. Which flow regime applies?`, opts: ["continuum", "slip flow", "transitional (DSMC)", "free molecular"], a: k, why: `Kn ≈ 1.26√γ M/Re = ${f(Kn, 3)}.` }; },
    ],
  };

  // ---------- Lesson 10: Newtonian ----------
  BANK.newtonian = {
    numeric: [
      R => { const M = R.u(3, 25, 0.5), c = HY.CpMax(M, g14);
        return { q: `Find C_p,max for modified Newtonian theory at M∞ = ${M} (γ = 1.4).`, ans: c, unit: "",
          sol: [["p₀₂/p∞", "Rayleigh–Pitot", GD.normalShock(M, g14).p02_p1], ["C_p,max", "(p₀₂/p∞ − 1)/(γM²/2)", c]] }; },
      R => { const a = R.u(5, 50, 1), M = R.u(8, 25, 1), c = HY.CpMax(M, g14), r = HY.flatPlateNewtonian(a * D, c);
        return { q: `A flat plate at α = ${a}° flies at M = ${M}. Find C_L by modified Newtonian theory.`, ans: r.CL, unit: "",
          sol: [["C_p,max", "", c], ["C_N", "C_p,max sin²α", r.CN], ["C_L", "C_N cos α", r.CL]] }; },
      R => { const a = R.u(5, 50, 1), M = R.u(8, 25, 1), c = HY.CpMax(M, g14), r = HY.flatPlateNewtonian(a * D, c);
        return { q: `Same plate (α = ${a}°, M = ${M}): find the wave-drag coefficient C_D.`, ans: r.CD, unit: "",
          sol: [["C_N", "C_p,max sin²α", r.CN], ["C_D", "C_N sin α", r.CD]] }; },
      R => { const M = R.u(5, 25, 0.5), c = HY.CpMax(M, g14);
        return { q: `Estimate the drag coefficient of a sphere (on its frontal area) at M = ${M} with modified Newtonian theory.`, ans: c / 2, unit: "",
          sol: [["C_p,max", "", c], ["C_D", "C_p,max/2", c / 2]] }; },
      R => { const d = R.u(5, 30, 1), M = R.u(4, 20, 0.5), cn = HY.CpMax(M, g14) * Math.sin(d * D) ** 2, c = HY.cone(M, d * D, g14);
        return { q: `A sharp ${d}° cone flies at M = ${M}. Find its surface Cp exactly (Taylor–Maccoll). For comparison, modified Newtonian gives ${f(cn)}.`, ans: c.Cp, unit: "",
          sol: [["β (deg)", "Taylor–Maccoll", c.beta / D], ["M_c", "", c.Mc], ["Cp exact", "(p_c/p∞ − 1)/q", c.Cp], ["Cp Newtonian", "C_p,max sin²δ", cn]] }; },
      R => { const m = R.u(1000, 8000, 100), Dm = R.u(1.5, 5, 0.1), CD = R.u(1.2, 1.6, 0.05), A = Math.PI * Dm * Dm / 4;
        return { q: `A capsule of mass ${m} kg and diameter ${Dm} m has C_D = ${CD}. Find its ballistic coefficient.`, ans: m / (CD * A), unit: "kg/m²",
          sol: [["A", "πD²/4", A], ["β", "m/(C_D A)", m / (CD * A)]] }; },
    ],
  };

  // ---------- Lesson 11: high temperature ----------
  BANK["high-temperature"] = {
    numeric: [
      R => { const T = R.u(500, 5000, 50), th = 3393.5, e = HY.vib.e_RT(T, th);
        return { q: `For N₂ (θ_v = 3394 K) as a harmonic oscillator, find e_vib/(RT) at T = ${T} K.`, ans: e, unit: "",
          sol: [["θ_v/T", "", th / T], ["e_vib/(RT)", "(θ_v/T)/(e^(θ_v/T) − 1)", e]] }; },
      R => { const T = R.u(500, 5000, 50), sp = R.pick([["N₂", 3393.5], ["O₂", 2273.5]]), cv = HY.vib.cv_R(T, sp[1]);
        return { q: `Find γ for pure ${sp[0]} (harmonic oscillator, θ_v = ${sp[1]} K) at T = ${T} K, ignoring dissociation.`, ans: (cv + 1) / cv, unit: "",
          sol: [["c_v/R", "5/2 + (θ/T)² e^(θ/T)/(e^(θ/T) − 1)²", cv], ["γ", "(c_v/R + 1)/(c_v/R)", (cv + 1) / cv]] }; },
      R => { const T = R.u(3000, 7000, 100), p = R.pick([0.01, 0.1, 1, 10]), s = HY.equilibrium(T, p * 101325);
        return { q: `Air is in chemical equilibrium at T = ${T} K and p = ${p} atm. Find the mole fraction of atomic oxygen x(O).`, ans: s.x.O, unit: "",
          sol: [["x(O₂)", "equilibrium solver (NASA data)", s.x.O2], ["x(O)", "", s.x.O], ["x(N)", "", s.x.N], ["Z", "M_air/M̄", s.Z]] }; },
      R => { const T = R.u(3000, 12000, 250), p = R.pick([0.01, 0.1, 1]), s = HY.equilibrium(T, p * 101325);
        return { q: `Find the compressibility Z = M_air/M̄ of equilibrium air at T = ${T} K, p = ${p} atm.`, ans: s.Z, unit: "",
          sol: [["M̄ (g/mol)", "Σ xᵢMᵢ", s.M * 1000], ["Z", "28.96/M̄", s.Z]] }; },
      R => { const u = R.u(4000, 11000, 250), z = R.u(50, 75, 1), a = HY.atmosphere(z * 1000), s = HY.eqNormalShock(u, a.p, a.T), pf = HY.perfectNormalShock(u, a.p, a.T);
        return { q: `A blunt vehicle flies at ${u} m/s at ${z} km. Find the temperature behind the normal part of its bow shock, in equilibrium air. (The perfect-gas answer would be ${f(pf.T2)} K.)`, ans: s.T2, unit: "K", tol: 0.02,
          sol: [["p₁ (Pa), T₁ (K)", "1976 atmosphere", `${f(a.p)}, ${f(a.T)}`], ["iteration", "p₂ = p₁ + ρ₁u₁²(1−ε), h₂ = h₁ + u₁²(1−ε²)/2", ""], ["ρ₂/ρ₁", "", 1 / s.eps], ["T₂", "equilibrium", s.T2]] }; },
      R => { const T = R.u(2000, 7000, 100), p = R.u(0.1, 5, 0.1), tau = HY.millikanWhite(T, p);
        return { q: `Estimate the vibrational relaxation time of N₂ at T = ${T} K and p = ${p} atm (Millikan–White), in microseconds.`, ans: tau * 1e6, unit: "μs",
          sol: [["A", "1.16×10⁻³ μ^½ θ_v^(4/3), μ = 14", 1.16e-3 * Math.sqrt(14) * Math.pow(3393.5, 4 / 3)], ["pτ (atm s)", "exp[A(T^(−1/3) − 0.015μ^(1/4)) − 18.42]", tau * p], ["τ (μs)", "", tau * 1e6]] }; },
    ],
    generated: [
      R => { const T = R.pick([1500, 3500, 6000, 12000]), k = T < 2000 ? 0 : T < 4000 ? 1 : T < 9000 ? 2 : 3;
        return { q: `At about 1 atm and ${T} K, what is the dominant high-temperature process in air?`, opts: ["vibrational excitation only", "O₂ dissociation", "N₂ dissociation", "ionization"], a: k, why: "Roughly: vibration above 800 K, O₂ dissociation 2,000–4,000 K, N₂ dissociation 4,000–9,000 K, ionization above 9,000 K." }; },
    ],
  };

  // ---------- Lesson 12: aeroheating ----------
  BANK.aeroheating = {
    numeric: [
      R => { const V = R.u(3000, 11000, 100), z = R.u(40, 80, 1), Rn = R.u(0.05, 3, 0.05), a = HY.atmosphere(z * 1000), q = HY.suttonGraves(a.rho, V, Rn);
        return { q: `Find the cold-wall stagnation heat flux (Sutton–Graves) on a nose of radius ${Rn} m at ${V} m/s and ${z} km altitude.`, ans: q / 1e4, unit: "W/cm²",
          sol: [["ρ∞ (kg/m³)", "1976 atmosphere", a.rho], ["q", "1.7415×10⁻⁴ √(ρ/R_n) V³", q], ["q (W/cm²)", "÷ 10⁴", q / 1e4]] }; },
      R => { const r1 = R.u(0.1, 2, 0.05), k = R.pick([2, 3, 4, 0.5]);
        return { q: `A designer multiplies a nose radius of ${r1} m by ${k}. By what factor does the stagnation heat flux change?`, ans: 1 / Math.sqrt(k), unit: "",
          sol: [["scaling", "q ∝ R_n^(−1/2)", ""], ["factor", `1/√${k}`, 1 / Math.sqrt(k)]] }; },
      R => { const M = R.u(3, 12, 0.5), T = R.u(50, 250, 5), reg = R.pick(["laminar", "turbulent"]), r = reg === "laminar" ? Math.sqrt(0.71) : Math.cbrt(0.71), Taw = T * (1 + r * 0.2 * M * M);
        return { q: `Find the adiabatic-wall temperature for a ${reg} boundary layer with edge Mach ${M} and edge temperature ${T} K (Pr = 0.71).`, ans: Taw, unit: "K",
          sol: [["r", reg === "laminar" ? "√Pr" : "Pr^(1/3)", r], ["T_aw", "T_e(1 + r(γ−1)M²/2)", Taw]] }; },
      R => { const q = R.u(5, 100, 1) * 1e4, e = R.u(0.7, 0.9, 0.01);
        return { q: `A surface receives ${q / 1e4} W/cm² of convective heating (assume it does not change with wall temperature). With emissivity ${e}, what radiation-equilibrium temperature does it reach?`, ans: Math.pow(q / (e * GD.SIGMA), 0.25), unit: "K",
          sol: [["εσT⁴ = q", "", ""], ["T", "(q/(εσ))^(1/4)", Math.pow(q / (e * GD.SIGMA), 0.25)]] }; },
      R => { const M = R.u(5, 12, 0.5), z = R.u(25, 45, 1), Tw = R.u(400, 1200, 50), x = R.u(0.2, 3, 0.1), a = HY.atmosphere(z * 1000), r = HY.refTemp({ Me: M, Te: a.T, pe: a.p, Tw, x, regime: "laminar" });
        return { q: `A flat plate at zero incidence flies at M = ${M}, ${z} km, with wall temperature ${Tw} K. Find the laminar heat flux at x = ${x} m (Eckert reference temperature).`, ans: r.q / 1e4, unit: "W/cm²",
          sol: [["T_aw (K)", "", r.Taw], ["T* (K)", "1 + 0.032M² + 0.58(T_w/T_e − 1)", r.Ts], ["Re*_x", "", r.Rexs], ["C_f*", "0.664/√Re*", r.Cf_star], ["q", "ρ*u_e c_p(T_aw − T_w) C_f*/2 Pr^(−2/3)", r.q / 1e4]] }; },
      R => { const ue = R.u(700, 2000, 10), d = R.u(0.5, 5, 0.1);
        return { q: `A laminar boundary layer is ${d} mm thick with edge velocity ${ue} m/s. Estimate the second-mode frequency.`, ans: ue / (2 * d / 1000) / 1000, unit: "kHz",
          sol: [["λ", "≈ 2δ", 2 * d], ["f", "u_e/(2δ)", ue / (2 * d / 1000) / 1000]] }; },
    ],
  };

  // ---------- Lesson 13: entry ----------
  BANK.entry = {
    numeric: [
      R => { const V = R.u(6000, 12000, 100), g = R.u(2, 40, 0.5), H = 7200, a = V * V * Math.sin(g * D) / (2 * Math.E * H);
        return { q: `A ballistic body enters at ${V} m/s and ${g}° below horizontal. With H = 7.2 km, find the peak deceleration in g (Allen–Eggers).`, ans: a / 9.80665, unit: "g",
          sol: [["a_max", "V_E² sin γ_E/(2eH)", a], ["in g", "÷ 9.807", a / 9.80665]] }; },
      R => { const V = R.u(6000, 12000, 100), b = R.u(100, 10000, 50), g = R.u(5, 40, 1), ae = HY.allenEggers({ VE: V, gammaE: g * D, beta: b });
        return { q: `For an entry at ${g}° with β = ${b} kg/m² (H = 7.2 km, ρ₀ = 1.225 kg/m³), at what altitude is the deceleration greatest?`, ans: ae.hAmax / 1000, unit: "km",
          sol: [["ρ at a_max", "β sin γ_E/H", b * Math.sin(g * D) / 7200], ["h", "H ln(ρ₀/ρ)", ae.hAmax / 1000]] }; },
      R => { const V = R.u(6000, 12000, 100), b = R.u(100, 3000, 50), g = R.u(3, 30, 1), Rn = R.u(0.2, 3, 0.1), H = 7200;
        const rho = b * Math.sin(g * D) / (3 * H), Vq = V * Math.exp(-1 / 6), q = HY.SG_K * Math.sqrt(rho / Rn) * Vq ** 3;
        return { q: `Find the peak stagnation heat flux in closed form for V_E = ${V} m/s, γ_E = ${g}°, β = ${b} kg/m², R_n = ${Rn} m.`, ans: q / 1e4, unit: "W/cm²",
          sol: [["V at q_max", "V_E e^(−1/6)", Vq], ["ρ at q_max", "β sin γ_E/(3H)", rho], ["q_max", "k √(ρ/R_n) V³", q / 1e4]] }; },
      R => { const LD = R.u(0.5, 4, 0.1), V = R.u(4000, 7700, 100), s = HY.glideRange(V, 300, LD);
        return { q: `An equilibrium glider with L/D = ${LD} starts at ${V} m/s. Find its range to 300 m/s.`, ans: s / 1000, unit: "km",
          sol: [["s", "(r/2)(L/D) ln[(gr − V_f²)/(gr − V₀²)]", s / 1000]] }; },
      R => { const W = R.u(200, 2000, 10), V = R.u(3000, 7500, 100), r = HY.EARTH.R + 50000, g = HY.EARTH.mu / (r * r), rho = 2 * W * (g - V * V / r) / (V * V);
        return { q: `A glider with m/(C_L A) = ${W} kg/m² flies an equilibrium glide at ${V} m/s (take r = R_E + 50 km). Find the air density it flies at.`, ans: rho, unit: "kg/m³",
          sol: [["g − V²/r", "", g - V * V / r], ["ρ", "2(m/C_LA)(g − V²/r)/V²", rho]] }; },
      R => { const V = R.u(7000, 12000, 100);
        return { q: `How much kinetic energy per kilogram must a vehicle entering at ${V} m/s dissipate?`, ans: 0.5 * V * V / 1e6, unit: "MJ/kg",
          sol: [["e", "V²/2", 0.5 * V * V / 1e6]] }; },
    ],
  };

  // ---------- Lesson 14: air-breathing ----------
  BANK.airbreathing = {
    numeric: [
      R => { const Fm = R.u(300, 1500, 10), fl = R.pick([["hydrogen", 0.0292], ["hydrocarbon", 0.0676]]), phi = R.u(0.6, 1.2, 0.05), fr = phi * fl[1];
        return { q: `A ${fl[0]}-fueled engine (f_st = ${fl[1]}) runs at φ = ${phi} with specific thrust ${Fm} N·s/kg. Find its specific impulse.`, ans: Fm / (fr * 9.80665), unit: "s",
          sol: [["f", "φ f_st", fr], ["I_sp", "(F/ṁ₀)/(f g₀)", Fm / (fr * 9.80665)]] }; },
      R => { const e = R.u(0.2, 0.55, 0.01), LD = R.u(3, 7, 0.1), ff = R.u(0.2, 0.5, 0.01), h = R.pick([["hydrogen", 119.95e6], ["hydrocarbon", 43.9e6]]);
        const Rg = e * h[1] / 9.80665 * LD * Math.log(1 / (1 - ff));
        return { q: `A ${h[0]}-fueled cruiser has η_o = ${e}, L/D = ${LD} and burns ${ff * 100}% of its take-off mass as fuel. Find the Breguet range.`, ans: Rg / 1000, unit: "km",
          sol: [["ln(m_i/m_f)", "", Math.log(1 / (1 - ff))], ["R", "η_o (h_PR/g)(L/D) ln(m_i/m_f)", Rg / 1000]] }; },
      R => { const M = R.u(3, 10, 0.5), T0 = R.u(215, 230, 1), M3 = R.pick([0.2, 0.3, 0.4]), T3 = T0 * (1 + 0.2 * M * M) / (1 + 0.2 * M3 * M3);
        return { q: `A ramjet at M₀ = ${M} (T₀ = ${T0} K) slows the air isentropically to M₃ = ${M3}. Find the burner-entry static temperature.`, ans: T3, unit: "K",
          sol: [["T_t", "T₀(1 + 0.2M₀²)", T0 * (1 + 0.2 * M * M)], ["T₃", "T_t/(1 + 0.2M₃²)", T3]] }; },
      R => { const M = R.u(6, 14, 0.5), psi = R.u(5, 8, 0.5), z = HY.altitudeForQ(M, 47880), a = HY.atmosphere(z), c = HY.brayton({ M0: M, T0: a.T, psi, etac: 0.9, etab: 0.9, etae: 0.9, phi: 1, fuel: "H2" });
        if (c.error || !(c.Fm > 0)) return null;
        return { q: `A hydrogen scramjet flies at M₀ = ${M} on a 48 kPa trajectory (T₀ = ${f(a.T)} K) with ψ = ${psi} and η_c = η_b = η_e = 0.9, stoichiometric. Find I_sp (Heiser–Pratt cycle).`, ans: c.Isp, unit: "s",
          sol: [["T₃, M₃", "ψT₀, energy", `${f(c.T3)} K, ${f(c.M3)}`], ["p₃/p₀", "[ψ/(ψ(1−η_c)+η_c)]^(c_p/R)", c.p3_p0], ["T₄ (K)", "burner", c.T4], ["V₁₀ (m/s)", "nozzle", c.V10], ["F/ṁ₀", "(1+f)V₁₀ − V₀", c.Fm], ["I_sp", "(F/ṁ₀)/(f g₀)", c.Isp]] }; },
      R => { const M = R.u(3, 14, 0.5), q = R.pick([24, 48, 72, 96]), z = HY.altitudeForQ(M, q * 1000), p = 2 * q * 1000 / (g14 * M * M);
        return { q: `At what altitude does a vehicle flying at M = ${M} see a dynamic pressure of ${q} kPa?`, ans: z / 1000, unit: "km", tol: 0.01,
          sol: [["p", "2q/(γM²)", p], ["z", "1976 atmosphere, invert p(z)", z / 1000]] }; },
    ],
  };

  // ---------- Lesson 15: testing ----------
  BANK["hypersonic-testing"] = {
    numeric: [
      R => { const M = R.u(5, 12, 0.5), p0 = R.u(0.5, 10, 0.5), r = HY.minT0Liquefaction(M, p0 * 1e6);
        return { q: `A Mach ${M} tunnel runs at p₀ = ${p0} MPa. Find the minimum T₀ that keeps the test section above the N₂ saturation line.`, ans: r.T0min, unit: "K",
          sol: [["p (Pa)", "p₀/(p₀/p)", r.p], ["T_sat (K)", "N₂ saturation curve", r.Tsat], ["T₀,min", "T_sat(1 + 0.2M²)", r.T0min]] }; },
      R => { const L = R.u(10, 60, 0.5), T = R.u(290, 480, 1), a = Math.sqrt(g14 * Rair * T);
        return { q: `Estimate the duration of one flow cycle of a Ludwieg tube ${L} m long filled with air at ${T} K (low tube Mach number).`, ans: 2 * L / a, unit: "s",
          sol: [["a_i", "√(γRT)", a], ["Δt", "≈ 2L/a_i", 2 * L / a]] }; },
      R => { const p41 = R.pick([5, 10, 20, 50, 100, 300, 1000]), gas = R.pick([["air", 1.4, 287.05], ["helium", 5 / 3, 2077.1]]), a1a4 = Math.sqrt(1.4 * 287.05 / (gas[1] * gas[2])), s = HY.shockTube(p41, 1.4, gas[1], a1a4);
        return { q: `A shock tube with an ${gas[0]} driver and air test gas, both at the same temperature, is fired at p₄/p₁ = ${p41}. Find the shock Mach number.`, ans: s.Ms, unit: "",
          sol: [["a₁/a₄", "√(γ₁R₁/(γ₄R₄))", a1a4], ["p₂/p₁", "solve the shock-tube equation", s.p2p1], ["M_s", "√(1 + (γ+1)(p₂/p₁ − 1)/(2γ))", s.Ms]] }; },
      R => { const Ms = R.u(2, 6, 0.1), T1 = 300, ns = GD.normalShock(Ms, g14), k = (Ms / (Ms * Ms - 1)) * Math.sqrt(1 + (2 * 0.4 / 5.76) * (Ms * Ms - 1) * (1.4 + 1 / (Ms * Ms))), MR = (1 + Math.sqrt(1 + 4 * k * k)) / (2 * k);
        const T5 = T1 * ns.T2_T1 * GD.normalShock(MR, g14).T2_T1;
        return { q: `An incident shock of Mach ${Ms} in air at 300 K reflects from the end wall. Find T₅ behind the reflected shock (perfect gas).`, ans: T5, unit: "K",
          sol: [["T₂/T₁", "normal shock at M_s", ns.T2_T1], ["M_R", "reflected-shock relation", MR], ["T₅/T₂", "normal shock at M_R", GD.normalShock(MR, g14).T2_T1], ["T₅", "", T5]] }; },
      R => { const q = R.u(5, 500, 5) * 1e3, t = R.u(1, 300, 1) / 1000, s = R.pick([["Macor", 2520, 790, 1.46], ["fused quartz", 2200, 740, 1.38], ["PEEK", 1320, 1340, 0.25]]), e = Math.sqrt(s[1] * s[2] * s[3]), dT = 2 * q * Math.sqrt(t) / (Math.sqrt(Math.PI) * e);
        return { q: `A thin-film gauge on ${s[0]} (√(ρck) = ${f(e)} SI) sees a constant ${q / 1000} kW/m². Find its surface temperature rise after ${t * 1000} ms.`, ans: dT, unit: "K",
          sol: [["e", "√(ρck)", e], ["ΔT", "2q√t/(√π e)", dT]] }; },
      R => { const M = R.u(5, 10, 0.5), T0 = R.u(400, 1000, 10), T = T0 / (1 + 0.2 * M * M), V = M * Math.sqrt(g14 * Rair * T);
        return { q: `A Mach ${M} tunnel runs at T₀ = ${T0} K. What is the test-section velocity?`, ans: V, unit: "m/s",
          sol: [["T", "T₀/(1 + 0.2M²)", T], ["V", "M√(γRT)", V], ["or", "√(2c_p(T₀ − T))", Math.sqrt(2 * 1004.5 * (T0 - T))]] }; },
    ],
  };

  // =====================================================================================
  // Rendering
  // =====================================================================================
  function mount(el, slug) {
    const bank = BANK[slug];
    if (!bank) return;
    const quizItems = (UI.quizBank || {})["#quiz"] || [];
    const conceptStatic = quizItems.concat(bank.concept || []);
    const numeric = bank.numeric || [], generated = bank.generated || [];
    let mode = UI.store.get("practice.mode", "mix"), right = 0, tried = 0, current = null, seed = 0;
    el.className = "practice";
    el.innerHTML = `<div class="practice-head"><b>Problem generator</b>
      <div class="seg" id="pmode"><button data-value="mix">mixed</button><button data-value="num">numerical</button><button data-value="con">conceptual</button></div>
      <button id="pnew" class="btn-primary">New problem</button><span class="pscore" id="pscore"></span></div>
      <div id="pbody"></div>
      <p class="pfoot">${numeric.length} numerical problem types with random inputs and ${conceptStatic.length + generated.length} conceptual questions. Numerical answers are checked to within 2% (angles to 0.5%) against the site's validated relations.</p>`;
    const segEl = el.querySelector("#pmode");
    UI.setSeg(segEl, mode);
    segEl.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { mode = b.dataset.value; UI.setSeg(segEl, mode); UI.store.set("practice.mode", mode); next(); }));
    el.querySelector("#pnew").addEventListener("click", next);
    const score = () => { el.querySelector("#pscore").textContent = tried ? `${right} / ${tried} right` : ""; };
    function draw() {
      seed = (Math.random() * 4294967296) >>> 0;
      const R = makeR(seed);
      const pool = [];
      if (mode !== "con") numeric.forEach(g => pool.push(["num", g]));
      if (mode !== "num") { conceptStatic.forEach(q => pool.push(["con", () => q])); generated.forEach(g => pool.push(["con", g])); }
      for (let k = 0; k < 20; k++) {
        const [type, g] = R.pick(pool);
        let p = null;
        try { p = g(R); } catch (e) { p = null; }
        if (p && (type === "con" || (isFinite(p.ans) && p.ans !== 0))) return { type, p, R };
      }
      return null;
    }
    function next() {
      current = draw();
      const body = el.querySelector("#pbody");
      if (!current) { body.innerHTML = "<p>No problem available.</p>"; return; }
      const { type, p, R } = current;
      if (type === "num") {
        body.innerHTML = `<div class="pq"><span class="pill">numerical</span> ${p.q}</div>
          <div class="pans"><input type="text" inputmode="decimal" id="pin" placeholder="your answer" autocomplete="off"> <span class="punit">${p.unit || ""}</span>
          <button id="pchk">Check</button><button id="psol">Show solution</button></div><div id="pres"></div><div id="psolbox"></div>`;
        const inp = body.querySelector("#pin"), res = body.querySelector("#pres");
        let counted = false;
        const check = () => {
          const v = parseFloat(inp.value.replace(/[×x]\s*10\^?/, "e").replace(/,/g, ""));
          if (!isFinite(v)) { res.innerHTML = "<p class='status warn'>Enter a number.</p>"; return; }
          const tol = p.tol || (p.unit === "deg" ? 0.005 : 0.02);
          const ok = Math.abs(v - p.ans) <= tol * Math.abs(p.ans);
          if (!counted) { counted = true; tried++; if (ok) right++; score(); }
          res.innerHTML = ok ? `<p class="status good">Correct: ${f(p.ans, 4)} ${p.unit || ""}.</p>` : `<p class="status bad">Not within ${(tol * 100).toFixed(1)}%. Try again, or show the solution.</p>`;
          if (ok) showSol();
        };
        const showSol = () => { UI.table(body.querySelector("#psolbox"), ["Step", "Relation", "Value"], p.sol.concat([["Answer", "", `${f(p.ans, 4)} ${p.unit || ""}`]]), "ex");
          if (!counted) { counted = true; tried++; score(); } };
        body.querySelector("#pchk").addEventListener("click", check);
        inp.addEventListener("keydown", e => { if (e.key === "Enter") check(); });
        body.querySelector("#psol").addEventListener("click", showSol);
      } else {
        const order = shuffle(R, p.opts.length);
        body.innerHTML = `<div class="pq"><span class="pill">conceptual</span> ${p.q}</div><div class="opts">${order.map(k => `<button data-k="${k}">${p.opts[k]}</button>`).join("")}</div><div class="why" id="pwhy"></div>`;
        let counted = false;
        body.querySelectorAll(".opts button").forEach(b => b.addEventListener("click", () => {
          const k = +b.dataset.k, ok = k === p.a;
          body.querySelectorAll(".opts button").forEach(x => x.classList.remove("right", "wrong"));
          b.classList.add(ok ? "right" : "wrong");
          body.querySelector(`.opts button[data-k="${p.a}"]`).classList.add("right");
          if (!counted) { counted = true; tried++; if (ok) right++; score(); }
          const w = body.querySelector("#pwhy"); w.innerHTML = (ok ? "<b style='color:var(--good)'>Correct.</b> " : "<b style='color:var(--bad)'>Not quite.</b> ") + p.why; w.classList.add("show"); UI.typeset(w);
        }));
      }
      UI.typeset(body);
    }
    score(); next();
  }

  window.Practice = { BANK, mount, makeR };
  // auto-mount: after the self-check if there is one, otherwise before the key equations
  const slug = document.body.dataset.lesson;
  if (slug && BANK[slug]) {
    const box = document.createElement("div");
    box.id = "practice";
    const head = document.createElement("div");
    head.className = "prose";
    head.innerHTML = `<h2 id="practice-gen"><span class="sec">Practice</span>Problem generator</h2><p>Each click draws a fresh problem: numerical problems use new random inputs every time, and conceptual questions come from this lesson's bank with the options shuffled.</p>`;
    const quizEl = document.getElementById("quiz"), sum = document.getElementById("summary");
    const main = document.querySelector("main");
    const anchor = quizEl ? quizEl.nextSibling : sum ? sum.closest(".prose") : main.querySelector(":scope > .pager");
    const parent = quizEl ? quizEl.parentNode : sum ? sum.closest(".prose").parentNode : main;
    parent.insertBefore(head, anchor); parent.insertBefore(box, anchor);
    mount(box, slug);
  }
})();
