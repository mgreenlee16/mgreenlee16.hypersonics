/*
 * extras.js — additional interactives for every lesson, injected before the worked examples.
 * Loaded by ui.js on lesson pages. Each entry: { title, intro (HTML prose), controls (HTML), views (HTML), render(sectionEl) }.
 */
(function () {
  "use strict";
  const GD = window.GD, HY = window.HY, D = Math.PI / 180, R = 287.05;
  const { isen, normalShock, obliqueShock, bisect } = GD;
  const fmt = (x, s) => UI.fmt(x, s);
  const rng = (id, label, min, max, step, value, dec = 2, unit = "") =>
    `<div class="ctl"><label for="${id}">${label} <output for="${id}"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" data-dec="${dec}"${unit ? ` data-unit="${unit}"` : ""}></div>`;
  const seg = (id, label, opts, value) =>
    `<div class="ctl inline"><span>${label}</span><div class="seg" id="${id}" data-value="${value}">${opts.map(([v, t]) => `<button data-value="${v}" aria-pressed="${v === value}">${t}</button>`).join("")}</div></div>`;
  const presets = list => `<div class="presets"><span>Try</span>${list.map(([t, p]) => `<button data-preset='${JSON.stringify(p)}'>${t}</button>`).join("")}</div>`;
  const GASES = { air: [1.4, "air"], co2: [1.29, "CO₂"], he: [5 / 3, "helium"], hot: [1.2, "hot products"] };

  const X = {};

  // ======================= Lesson 1 =======================
  X.isentropic = [{
    title: "Airspeed from a Pitot-static probe",
    intro: String.raw`<p>A Pitot-static probe measures the difference between the Pitot pressure and the static pressure. Converting that to airspeed needs the right model: incompressible Bernoulli, \(V = \sqrt{2\Delta p/\rho}\); compressible subsonic flow, from \(p_0/p\) and the isentropic relation; or, above Mach 1, the Rayleigh–Pitot formula, because a normal shock stands ahead of the probe. The interactive compares the three at any altitude and shows how large the incompressible error becomes.</p>`,
    controls: rng("xz", "Altitude (km)", 0, 30, 0.5, 10, 1) + rng("xdp", "Measured p_Pitot − p, log₁₀(Δp / Pa)", 1, 6, 0.01, 4, 2) +
      presets([["Light aircraft, sea level", { xz: 0, xdp: 3.2 }], ["Airliner cruise", { xz: 11, xdp: 4.3 }], ["Supersonic jet", { xz: 15, xdp: 5 }]]),
    views: `<figure><div id="xplot"></div><figcaption>Velocity inferred from Δp by the three models (log Δp axis). The models agree at low speed and diverge as compressibility grows; the supersonic curve applies only once M &gt; 1.</figcaption></figure>`,
    render() {
      const g = UI.gamma(), a = GD.atmosphere(UI.val("xz") * 1000), dp = Math.pow(10, UI.val("xdp"));
      const crit = isen.p0_p(1, g) - 1;
      const model = d => {
        const inc = Math.sqrt(2 * d / a.rho), r = 1 + d / a.p;
        if (r <= isen.p0_p(1, g)) { const M = isen.M_from_p0_p(r, g); return { inc, comp: M * a.a, M }; }
        const M = GD.normalShockFrom("p02_p1", r, g).M1;
        return { inc, comp: M * a.a, M };
      };
      const ds = UI.logspace(10, 1e6, 160), ms = ds.map(model);
      UI.plot("#xplot", { xlabel: "Δp = p_Pitot − p (Pa)", ylabel: "Velocity (m/s)", logx: true, xlim: [10, 1e6],
        series: [{ x: ds, y: ms.map(m => m.inc), c: 4, dash: true, label: "incompressible Bernoulli" }, { x: ds, y: ms.map(m => m.comp), c: 1, label: "compressible (subsonic / Rayleigh–Pitot)" }],
        vlines: [{ x: crit * a.p, label: "M = 1", c: 6 }], points: [{ x: dp, y: model(dp).comp, c: 1 }], legend: "tl", legendWidth: 250 });
      const m = model(dp);
      UI.readout("#xro", [["Mach number", m.M], ["V compressible (m/s)", m.comp], ["V incompressible (m/s)", m.inc], ["Incompressible error (%)", 100 * (m.inc - m.comp) / m.comp], ["Static p (kPa)", a.p / 1000], ["ρ (kg/m³)", a.rho]]);
    },
  }, {
    title: "Isentropic ratios for different gases",
    intro: String.raw`<p>Every isentropic ratio depends on γ. Monatomic gases (helium, γ = 5/3) need much smaller area ratios to reach a given Mach number. Hot, polyatomic rocket exhaust (γ ≈ 1.2) needs much larger ones. Pick a ratio to compare four gases.</p>`,
    controls: seg("xr", "Ratio", [["A", "A/A*"], ["p", "p₀/p"], ["T", "T₀/T"], ["rho", "ρ₀/ρ"]], "A") + rng("xM", "Mach number for readout", 0.2, 6, 0.05, 3),
    views: `<figure><div id="xplot2"></div><figcaption>The selected ratio against Mach number for air (1.4), CO₂ (1.29), helium (5/3) and hot combustion products (1.2), log scale.</figcaption></figure>`,
    render() {
      const r = UI.seg("xr"), M0 = UI.val("xM"), Ms = UI.linspace(0.1, 6, 150);
      const fn = { A: isen.A_Astar, p: isen.p0_p, T: isen.T0_T, rho: isen.rho0_rho }[r];
      const names = { A: "A/A*", p: "p₀/p", T: "T₀/T", rho: "ρ₀/ρ" };
      const series = Object.values(GASES).map(([g, n], k) => ({ x: Ms, y: Ms.map(m => fn(m, g)), c: k + 1, label: `${n}, γ = ${fmt(g, 3)}` }));
      UI.plot("#xplot2", { xlabel: "M", ylabel: names[r], logy: true, xlim: [0, 6], series, vlines: [{ x: M0, c: 6 }], legend: "tl", legendWidth: 190 });
      UI.readout("#xro2", Object.values(GASES).map(([g, n]) => [`${names[r]}, ${n}`, fn(M0, g)]));
    },
  }];

  // ======================= Lesson 2 =======================
  X["normal-shock"] = [{
    title: "Moving shock waves: blast and shock-tube flows",
    intro: String.raw`<p>A shock moving at speed \(W\) into still gas is a stationary normal shock in a frame moving with it, with \(M_1 = W/a_1\). Back in the lab frame, the gas behind it is set in motion at the induced velocity \(u_p = W(1 - \rho_1/\rho_2)\). If the shock then hits a wall, it reflects, and the gas is brought to rest again at a much higher pressure and temperature. This is the principle of the reflected-shock tunnel (Lesson 15).</p>`,
    controls: rng("xMs", "Shock Mach number M_s = W/a₁", 1.05, 8, 0.01, 2.5) + rng("xT", "Gas temperature T₁ (K)", 200, 400, 1, 293, 0) + rng("xp", "Gas pressure p₁ (kPa)", 1, 101, 1, 101, 0) +
      presets([["Weak blast wave", { xMs: 1.2 }], ["Shock tube, M_s 3", { xMs: 3 }], ["Strong shock, M_s 6", { xMs: 6 }]]),
    views: `<div class="two-up"><figure><div id="xplot"></div><figcaption>Pressure ratio across the incident shock and across the reflected shock (p₅/p₁), against M_s.</figcaption></figure><figure><div id="xplot3"></div><figcaption>Induced gas velocity u_p and shock speed W, against M_s.</figcaption></figure></div>`,
    render() {
      const g = UI.gamma(), Ms = UI.val("xMs"), T1 = UI.val("xT"), p1 = UI.val("xp") * 1000, a1 = Math.sqrt(g * R * T1);
      const st = M => { const ns = normalShock(M, g), up = M * a1 * (1 - 1 / ns.rho2_rho1), T2 = T1 * ns.T2_T1, a2 = Math.sqrt(g * R * T2);
        const k = (M / (M * M - 1)) * Math.sqrt(1 + (2 * (g - 1) / (g + 1) ** 2) * (M * M - 1) * (g + 1 / (M * M))), MR = (1 + Math.sqrt(1 + 4 * k * k)) / (2 * k), nr = normalShock(MR, g);
        return { ns, up, T2, MR, p5: ns.p2_p1 * nr.p2_p1, T5: T2 * nr.T2_T1, WR: MR * a2 - up }; };
      const Ms_ = UI.linspace(1.02, 8, 120), all = Ms_.map(st);
      UI.plot("#xplot", { w: 420, h: 300, xlabel: "M_s", ylabel: "pressure ratio", logy: true, series: [{ x: Ms_, y: all.map(s => s.ns.p2_p1), c: 1, label: "p₂/p₁" }, { x: Ms_, y: all.map(s => s.p5), c: 4, label: "p₅/p₁" }], vlines: [{ x: Ms, c: 6 }], legend: "tl", legendWidth: 80 });
      UI.plot("#xplot3", { w: 420, h: 300, xlabel: "M_s", ylabel: "m/s", series: [{ x: Ms_, y: all.map(s => s.up), c: 2, label: "u_p" }, { x: Ms_, y: Ms_.map(m => m * a1), c: 6, dash: true, label: "W" }], vlines: [{ x: Ms, c: 6 }], legend: "tl", legendWidth: 60 });
      const s = st(Ms);
      UI.readout("#xro", [["Shock speed W (m/s)", Ms * a1], ["Induced velocity u_p (m/s)", s.up], ["Gas Mach number behind shock", s.up / Math.sqrt(g * R * s.T2)], ["p₂ (kPa)", p1 * s.ns.p2_p1 / 1000], ["T₂ (K)", s.T2],
        ["Reflected-shock Mach M_R", s.MR], ["p₅ (kPa)", p1 * s.p5 / 1000], ["T₅ (K)", s.T5], ["Reflected shock speed (m/s)", s.WR]]);
    },
  }, {
    title: "Shock strength in different gases",
    intro: String.raw`<p>For the same upstream Mach number, a lower γ gives a denser, cooler post-shock state, with a larger density ratio and a smaller temperature rise. That is the perfect-gas preview of the high-temperature effects in Lesson 11, where dissociation acts like an effective γ well below 1.4.</p>`,
    controls: seg("xq", "Quantity", [["rho", "ρ₂/ρ₁"], ["T", "T₂/T₁"], ["p0", "p₀₂/p₀₁"], ["M2", "M₂"]], "rho") + rng("xM1", "M₁ for readout", 1.1, 15, 0.1, 5, 1),
    views: `<figure><div id="xplot2"></div><figcaption>The chosen normal-shock ratio against M₁ for four values of γ.</figcaption></figure>`,
    render() {
      const q = UI.seg("xq"), M1 = UI.val("xM1"), Ms = UI.logspace(1.01, 20, 150), key = { rho: "rho2_rho1", T: "T2_T1", p0: "p02_p01", M2: "M2" }[q];
      const series = Object.values(GASES).map(([g, n], k) => ({ x: Ms, y: Ms.map(m => normalShock(m, g)[key]), c: k + 1, label: `${n}, γ = ${fmt(g, 3)}` }));
      UI.plot("#xplot2", { xlabel: "M₁", ylabel: q, logx: true, logy: q === "T", series, vlines: [{ x: M1, c: 6 }], legend: q === "p0" || q === "M2" ? "tr" : "tl", legendWidth: 190 });
      UI.readout("#xro2", Object.values(GASES).map(([g, n]) => [`${n}`, normalShock(M1, g)[key]]));
    },
  }];

  // ======================= Lesson 3 =======================
  X.nozzles = [{
    title: "Rocket-nozzle performance",
    intro: String.raw`<p>A rocket nozzle is a converging–diverging nozzle fed by a combustion chamber at \(p_0, T_0\). Its thrust is \(F = C_Fp_0A^*\), with the <b>thrust coefficient</b></p>
      $$C_F = \Gamma\sqrt{\frac{2\gamma}{\gamma-1}\left[1 - \left(\frac{p_e}{p_0}\right)^{\frac{\gamma-1}{\gamma}}\right]} + \left(\frac{p_e - p_a}{p_0}\right)\frac{A_e}{A^*},\qquad \Gamma = \sqrt\gamma\left(\frac{2}{\gamma+1}\right)^{\frac{\gamma+1}{2(\gamma-1)}},$$
      <p>and the characteristic velocity \(c^* = \sqrt{\mathcal RT_0/\bar M}/\Gamma\). Specific impulse is \(I_{sp} = c^*C_F/g_0\). The best expansion at any altitude is \(p_e = p_a\). An over-expanded nozzle near sea level (\(p_e\) well below \(p_a\)) risks flow separation; the Summerfield criterion puts separation at roughly \(p_e \lesssim 0.3\text{–}0.4\,p_a\).</p>`,
    controls: rng("xg", "Exhaust γ", 1.1, 1.4, 0.01, 1.2) + rng("xT0", "Chamber temperature T₀ (K)", 2000, 4000, 10, 3500, 0) + rng("xMw", "Exhaust molar mass (kg/kmol)", 2, 30, 0.1, 13.5, 1) +
      rng("xp0", "Chamber pressure p₀ (MPa)", 1, 30, 0.1, 20, 1) + rng("xeps", "Area ratio A_e/A*", 2, 200, 0.5, 69, 1) + rng("xalt", "Altitude (km)", 0, 86, 0.5, 0, 1) +
      presets([["H₂/O₂ staged combustion (RS-25-like)", { xg: 1.2, xT0: 3500, xMw: 13.5, xp0: 20.6, xeps: 69, xalt: 0 }], ["Kerosene/O₂ gas generator (Merlin-like)", { xg: 1.22, xT0: 3500, xMw: 23, xp0: 9.7, xeps: 16, xalt: 0 }], ["Vacuum upper stage", { xg: 1.2, xT0: 3400, xMw: 13, xp0: 10, xeps: 150, xalt: 86 }]]),
    views: `<figure><div id="xplot"></div><figcaption>Thrust coefficient against area ratio at sea level, 10 km, 30 km and in vacuum (thin); thick: the chosen altitude. The peak of each curve is the ideal-expansion area ratio. Dashed region: likely flow separation (p_e &lt; 0.35 p_a).</figcaption></figure>`,
    render() {
      const g = UI.val("xg"), T0 = UI.val("xT0"), Mw = UI.val("xMw"), p0 = UI.val("xp0") * 1e6, eps = UI.val("xeps"), alt = UI.val("xalt") * 1000;
      const G = Math.sqrt(g) * Math.pow(2 / (g + 1), (g + 1) / (2 * (g - 1))), cstar = Math.sqrt(8314.46 * T0 / Mw) / G;
      const CF = (e, pa) => { const Me = isen.M_from_A_Astar(e, g, "sup"), pe = p0 / isen.p0_p(Me, g); return { cf: G * Math.sqrt(2 * g / (g - 1) * (1 - Math.pow(pe / p0, (g - 1) / g))) + (pe - pa) / p0 * e, pe, Me }; };
      const pa = alt >= 86000 ? 0 : GD.atmosphere(alt).p, es = UI.logspace(1.5, 300, 140);
      const series = [[0, "sea level"], [10000, "10 km"], [30000, "30 km"], [null, "vacuum"]].map(([z, n], k) => { const p = z === null ? 0 : GD.atmosphere(z).p; return { x: es, y: es.map(e => CF(e, p).cf), c: k + 1, width: 1.2, label: n }; });
      series.push({ x: es, y: es.map(e => { const c = CF(e, pa); return c.pe < 0.35 * pa ? NaN : c.cf; }), c: 4, width: 3.2, label: "chosen altitude" });
      series.push({ x: es, y: es.map(e => { const c = CF(e, pa); return c.pe < 0.35 * pa ? c.cf : NaN; }), c: 4, width: 2, dash: true });
      UI.plot("#xplot", { xlabel: "Area ratio A_e/A*", ylabel: "C_F", logx: true, xlim: [1.5, 300], ylim: [0.8, 2.1], series, points: [{ x: eps, y: CF(eps, pa).cf, c: 4 }], legend: "br", legendWidth: 130 });
      const c = CF(eps, pa), cv = CF(eps, 0);
      UI.readout("#xro", [["c* (m/s)", cstar], ["Exit Mach", c.Me], ["p_e (kPa)", c.pe / 1000], ["p_a (kPa)", pa / 1000], ["C_F", c.cf], ["I_sp at altitude (s)", cstar * c.cf / 9.80665], ["I_sp vacuum (s)", cstar * cv.cf / 9.80665],
        ["Status", c.pe < 0.35 * pa ? "over-expanded past the Summerfield limit (needs a separation-tolerant contour)" : c.pe < pa ? "over-expanded" : c.pe > 1.05 * pa ? "under-expanded" : "near ideal"]]);
    },
  }];

  // ======================= Lesson 4 =======================
  X["duct-flow"] = [{
    title: "A supersonic combustor as Rayleigh flow",
    intro: String.raw`<p>A scramjet combustor of constant area is, to first approximation, Rayleigh flow. Burning fuel raises the total temperature, \(c_p(T_{02} - T_{01}) \approx \eta_bfh_{PR}/(1+f)\), and pushes the supersonic stream toward Mach 1. Add too much fuel and the combustor <b>thermally chokes</b>: a shock train forms and the engine can unstart. This sets the maximum fuel-air ratio at each combustor entry Mach number, and is why scramjet combustors diverge in area.</p>`,
    controls: rng("xM1", "Combustor entry Mach M₁", 1.2, 5, 0.05, 2.5) + rng("xT1", "Entry static temperature T₁ (K)", 600, 2000, 10, 1100, 0) + rng("xphi", "Equivalence ratio φ", 0.05, 1.5, 0.01, 0.4) + rng("xeta", "Combustion efficiency η_b", 0.5, 1, 0.01, 0.9) +
      seg("xF", "Fuel", [["H2", "hydrogen"], ["HC", "hydrocarbon"]], "H2") + presets([["Mach 8 flight, M₁ 2.5", { xM1: 2.5, xT1: 1100, xphi: 0.4 }], ["Low entry Mach", { xM1: 1.5, xT1: 1300, xphi: 0.3 }], ["High entry Mach", { xM1: 4, xT1: 900, xphi: 1 }]]),
    views: `<figure><div id="xplot"></div><figcaption>Combustor exit Mach number against equivalence ratio (supersonic branch). The curve ends where the combustor thermally chokes (M₂ = 1).</figcaption></figure>`,
    render() {
      const g = 1.3, cp = g * R / (g - 1), M1 = UI.val("xM1"), T1 = UI.val("xT1"), eta = UI.val("xeta"), phi = UI.val("xphi"), fuel = UI.seg("xF") === "H2" ? { h: 119.95e6, f: 0.0292 } : { h: 43.9e6, f: 0.0676 };
      const T01 = T1 * (1 + 0.5 * (g - 1) * M1 * M1);
      const run = ph => { const fr = ph * fuel.f, T02 = (T01 + eta * fr * fuel.h / cp) / (1 + fr); return { fr, T02, h: GD.rayleighHeat(M1, T02 / T01, g) }; };
      const maxRatio = 1 / GD.rayleigh.T0_T0s(M1, g), phMax = bisect(ph => run(ph).T02 / T01 - maxRatio, 0, 10);
      const ps = UI.linspace(0, Math.min(1.5, phMax || 1.5), 100);
      UI.plot("#xplot", { xlabel: "Equivalence ratio φ", ylabel: "Exit Mach M₂", xlim: [0, 1.5], ylim: [0.9, M1 * 1.05], series: [{ x: ps, y: ps.map(p => { const r = run(p); return r.h.choked ? NaN : r.h.M2; }), c: 1 }],
        vlines: isFinite(phMax) && phMax < 1.5 ? [{ x: phMax, label: "thermal choking", c: 4 }] : [], points: [{ x: phi, y: run(phi).h.choked ? 1 : run(phi).h.M2, c: run(phi).h.choked ? 4 : 1 }], legend: false });
      const r = run(phi);
      UI.readout("#xro", [["T₀₁ (K)", T01], ["T₀₂ (K)", r.T02], ["T₀₂/T₀₁", r.T02 / T01], ["Max T₀₂/T₀₁ before choking", maxRatio], ["Max φ before choking", phMax], ["Exit Mach", r.h.choked ? "choked" : r.h.M2],
        ["p₂/p₁", r.h.choked ? "—" : r.h.p2_p1], ["p₀₂/p₀₁", r.h.choked ? "—" : r.h.p02_p01]]);
    },
  }];

  // ======================= Lesson 5 =======================
  X["oblique-shock"] = [{
    title: "Pressure–deflection diagram and shock reflection",
    intro: String.raw`<p>Plotting the pressure behind an oblique shock against the flow deflection gives a <b>shock polar</b> (a pressure–deflection curve): every point on it is a possible shock for that upstream state. A second polar, drawn from the state behind a first shock, shows all states a second shock can reach. A regular reflection from a wall must turn the flow back to θ = 0, so it exists only if the second polar crosses the vertical axis. If it does not, the reflection becomes a Mach reflection with a near-normal stem.</p>`,
    controls: rng("xM", "Upstream Mach M₁", 1.4, 6, 0.01, 2.8) + rng("xth", "First deflection θ₁", 1, 35, 0.1, 10, 1, "°") +
      presets([["Regular reflection", { xM: 2.8, xth: 10 }], ["Near the limit", { xM: 2, xth: 13 }], ["Mach reflection", { xM: 1.8, xth: 14 }]]),
    views: `<figure><div id="xplot"></div><figcaption>Shock polars: the freestream polar (teal) and the polar from state 2 behind the incident shock (magenta). The reflected shock must return the flow to θ = 0 (dashed): their crossing is the regular-reflection state 3.</figcaption></figure>`,
    render() {
      const g = UI.gamma(), M1 = UI.val("xM"), th = UI.val("xth") * D;
      const polar = (M, th0, p0, dir) => { const mu = Math.asin(1 / M), bs = UI.linspace(mu + 1e-4, Math.PI / 2, 200), th = [], p = [];
        bs.forEach(b => { const t = GD.theta_from_beta(M, b, g), o = obliqueShock(M, 0, g, false, b); th.push((th0 + dir * t) / D); p.push(p0 * o.p2_p1); });
        return { th, p }; };
      const A = polar(M1, 0, 1, 1), Aneg = polar(M1, 0, 1, -1), inc = obliqueShock(M1, th, g);
      const series = [{ x: A.th, y: A.p, c: 1, label: "polar of state 1" }, { x: Aneg.th, y: Aneg.p, c: 1 }];
      let status = "", pts = [], ro = [];
      if (inc) {
        const B = polar(inc.M2, th, inc.p2_p1, -1), Bp = polar(inc.M2, th, inc.p2_p1, 1);
        series.push({ x: B.th, y: B.p, c: 4, label: "polar of state 2" }, { x: Bp.th, y: Bp.p, c: 4 });
        const ref = obliqueShock(inc.M2, th, g);
        pts.push({ x: th / D, y: inc.p2_p1, c: 1, label: "2" });
        if (ref) { pts.push({ x: 0, y: inc.p2_p1 * ref.p2_p1, c: 4, label: "3 (regular)" }); status = "Regular reflection possible."; ro = [["p₂/p₁", inc.p2_p1], ["M₂", inc.M2], ["Reflected β (deg)", ref.beta / D], ["p₃/p₁", inc.p2_p1 * ref.p2_p1], ["M₃", ref.M2], ["θ_max at M₂ (deg)", GD.betaMax(inc.M2, g).theta / D]]; }
        else { status = "No regular reflection: θ₁ exceeds θ_max at M₂, so a Mach stem forms."; ro = [["p₂/p₁", inc.p2_p1], ["M₂", inc.M2], ["θ_max at M₂ (deg)", GD.betaMax(inc.M2, g).theta / D], ["Normal-shock p/p₁ (stem foot)", normalShock(M1, g).p2_p1]]; }
      } else status = "The incident shock is detached.";
      UI.plot("#xplot", { xlabel: "Flow deflection θ (deg)", ylabel: "p / p₁", xlim: [-45, 45], series, points: pts, vlines: [{ x: 0, c: 6 }], legend: "tl", legendWidth: 140, h: 380 });
      const st = document.getElementById("xst"); st.textContent = status; st.className = "status " + (status.startsWith("Regular") ? "good" : "warn");
      UI.readout("#xro", ro);
    },
    status: true,
  }];

  // ======================= Lesson 6 =======================
  X.expansion = [{
    title: "Minimum-length nozzle by the method of characteristics",
    intro: String.raw`<p>The method of characteristics designs the divergent wall of a supersonic nozzle so that the expansion waves from the wall are cancelled and the exit flow is uniform. For a two-dimensional <b>minimum-length nozzle</b> the throat corner turns the wall abruptly through \(\theta_{w,\max} = \nu(M_e)/2\), sending out a centered fan. Along each right-running characteristic, \(K_- = \theta + \nu\) is constant; along each left-running one, \(K_+ = \theta - \nu\). Where characteristic i (from the corner) meets characteristic j (reflected from the centerline), \(\theta = (K_- + K_+)/2\) and \(\nu = (K_- - K_+)/2\). The wall is then shaped to turn the flow back to axial as each wave arrives. The check is whether the computed exit height matches the isentropic area ratio \(A_e/A^*\).</p>`,
    controls: rng("xMe", "Design exit Mach M_e", 1.5, 5, 0.05, 2.4) + rng("xn", "Number of characteristics", 3, 40, 1, 12, 0) +
      seg("xshow", "Show", [["all", "characteristics + wall"], ["wall", "wall only"]], "all") + presets([["Mach 2.4 (Anderson)", { xMe: 2.4, xn: 7 }], ["Mach 3, fine", { xMe: 3, xn: 30 }], ["Mach 5", { xMe: 5, xn: 25 }]]),
    views: `<figure><div id="xdiag"></div><figcaption>Upper half of a 2-D minimum-length nozzle (throat half-height = 1). Blue: right-running characteristics from the corner; orange: left-running ones after centerline reflection; thick: the designed wall contour.</figcaption></figure>`,
    render() {
      const g = UI.gamma(), Me = UI.val("xMe"), n = Math.round(UI.val("xn")), thMax = GD.nu(Me, g) / 2;
      const thI = i => thMax * i / n;
      const P = {}, key = (i, j) => i + "," + j, mu = M => Math.asin(1 / M);
      const mk = (i, j, x, y) => { const th = thI(i) - thI(j), nu = thI(i) + thI(j), M = GD.M_from_nu(nu, g); return { x, y, th, nu, M, mu: mu(M) }; };
      const corner = { x: 0, y: 1 };
      const inter = (p1, s1, p2, s2) => { const x = (p2.y - p1.y + s1 * p1.x - s2 * p2.x) / (s1 - s2); return { x, y: p1.y + s1 * (x - p1.x) }; };
      const segs = [];
      for (let j = 1; j <= n; j++) {
        // centerline point (j,j): C− from (j, j−1) or the corner
        const prev = j === 1 ? null : P[key(j, j - 1)], q = mk(j, j, 0, 0);
        const src = prev || corner, thS = prev ? prev.th : thI(j), muS = prev ? prev.mu : mu(GD.M_from_nu(thI(j), g));
        const slope = Math.tan(0.5 * ((thS - muS) + (q.th - q.mu)));
        q.x = src.x - src.y / slope; q.y = 0; P[key(j, j)] = q; segs.push([src, q, "m"]);
        for (let i = j + 1; i <= n; i++) {
          const a = j === 1 ? null : P[key(i, j - 1)], b = P[key(i - 1, j)], r = mk(i, j, 0, 0);
          const aS = a || corner, aTh = a ? a.th : thI(i), aMu = a ? a.mu : mu(GD.M_from_nu(thI(i), g));
          const pt = inter(aS, Math.tan(0.5 * ((aTh - aMu) + (r.th - r.mu))), b, Math.tan(0.5 * ((b.th + b.mu) + (r.th + r.mu))));
          r.x = pt.x; r.y = pt.y; P[key(i, j)] = r; segs.push([aS, r, "m"], [b, r, "p"]);
        }
      }
      // wall points
      const wall = [{ x: 0, y: 1, th: thMax }];
      for (let j = 1; j <= n; j++) {
        const p = P[key(n, j)], w0 = wall[wall.length - 1];
        const pt = inter(w0, Math.tan(0.5 * (w0.th + p.th)), p, Math.tan(p.th + p.mu));
        wall.push({ x: pt.x, y: pt.y, th: p.th }); segs.push([p, pt, "p"]);
      }
      const L = wall[wall.length - 1].x, H = wall[wall.length - 1].y, Wd = 620, Hd = 300, sc = Math.min((Wd - 40) / L, (Hd - 30) / H);
      const Xs = x => 20 + x * sc, Ys = y => Hd - 15 - y * sc;
      let svg = `<line x1="${Xs(0)}" x2="${Xs(L)}" y1="${Ys(0)}" y2="${Ys(0)}" class="stream" stroke-dasharray="6 4"/>`;
      if (UI.seg("xshow") === "all") segs.forEach(([a, b, t]) => svg += `<line x1="${Xs(a.x)}" y1="${Ys(a.y)}" x2="${Xs(b.x)}" y2="${Ys(b.y)}" stroke="${t === "m" ? "var(--cool)" : "var(--hot)"}" stroke-width="0.9"/>`);
      svg += `<path d="M${Xs(0)} ${Ys(1)} ${wall.map(w => `L${Xs(w.x)} ${Ys(w.y)}`).join(" ")}" stroke="var(--text)" stroke-width="3" fill="none"/>`;
      document.getElementById("xdiag").innerHTML = `<svg class="diagram" viewBox="0 0 ${Wd} ${Hd}">${svg}</svg>`;
      const AR = isen.A_Astar(Me, g);
      UI.readout("#xro", [["θ_w,max (deg)", thMax / D], ["Exit height / throat height (MOC)", H], ["A_e/A* (isentropic)", AR], ["Error (%)", 100 * (H - AR) / AR], ["Nozzle length / throat half-height", L], ["Grid points", Object.keys(P).length]]);
    },
  }];

  // ======================= Lesson 7 =======================
  X.linearized = [{
    title: "Supersonic thin airfoils: linear theory against shock-expansion",
    intro: String.raw`<p>Ackeret's linear theory gives simple results for thin supersonic airfoils, with \(\beta = \sqrt{M_\infty^2 - 1}\):</p>
      $$c_l = \frac{4\alpha}{\beta},\qquad c_{d,w} = \frac{4}{\beta}\left[\alpha^2 + \overline{\left(\frac{dy_c}{dx}\right)^2} + \overline{\left(\frac{dy_t}{dx}\right)^2}\right],$$
      <p>so the thickness wave drag is \(4(t/c)^2/\beta\) for a double wedge and \(\tfrac{16}{3}(t/c)^2/\beta\) for a biconvex section. The double wedge has the least thickness drag for a given t/c. The interactive compares linear theory with exact shock-expansion theory (Lesson 6) for the double wedge, and shows the drag polar and L/D.</p>`,
    controls: rng("xM", "Mach number M∞", 1.2, 5, 0.01, 2) + rng("xtc", "Thickness ratio t/c", 0, 0.12, 0.002, 0.05, 3) + seg("xsh", "Section", [["dw", "double wedge"], ["bc", "biconvex"]], "dw") +
      presets([["F-104-like thin wing", { xM: 2, xtc: 0.034 }], ["Thick, M 1.5", { xM: 1.5, xtc: 0.1 }], ["Missile fin, M 4", { xM: 4, xtc: 0.06 }]]),
    views: `<div class="two-up"><figure><div id="xplot"></div><figcaption>Lift-to-drag ratio against α: linear theory (dashed) and shock-expansion theory for the double wedge (solid).</figcaption></figure><figure><div id="xplot3"></div><figcaption>Drag polar c_l against c_d.</figcaption></figure></div>`,
    render() {
      const g = UI.gamma(), M = UI.val("xM"), tc = UI.val("xtc"), sh = UI.seg("xsh"), b = Math.sqrt(M * M - 1), K = sh === "dw" ? 4 : 16 / 3;
      const as = UI.linspace(0.2, 10, 80), lin = as.map(a => { const r = a * D; return { cl: 4 * r / b, cd: 4 * r * r / b + K * tc * tc / b }; });
      const ex = as.map(a => sh === "dw" ? GD.diamondAirfoil(M, a * D, tc, g) : null);
      const series = [{ x: as, y: lin.map(l => l.cl / l.cd), c: 4, dash: true, label: "linear" }];
      if (sh === "dw") series.push({ x: as, y: ex.map(e => e ? e.CL / e.CD : NaN), c: 1, label: "shock-expansion" });
      UI.plot("#xplot", { w: 420, h: 300, xlabel: "α (deg)", ylabel: "L/D", series, legend: "tr", legendWidth: 120 });
      const s2 = [{ x: lin.map(l => l.cd), y: lin.map(l => l.cl), c: 4, dash: true, label: "linear" }];
      if (sh === "dw") s2.push({ x: ex.map(e => e ? e.CD : NaN), y: ex.map(e => e ? e.CL : NaN), c: 1, label: "exact" });
      UI.plot("#xplot3", { w: 420, h: 300, xlabel: "c_d", ylabel: "c_l", series: s2, legend: "br", legendWidth: 90 });
      const aOpt = Math.sqrt(K) * tc, LDmax = 1 / (2 * Math.sqrt(K) * tc);
      UI.readout("#xro", [["c_lα (per rad), linear", 4 / b], ["Thickness drag c_d0", K * tc * tc / b], ["α for max L/D (deg), linear", aOpt / D], ["(L/D)max, linear", tc > 0 ? LDmax : "∞"],
        ["(L/D)max exact (double wedge)", sh === "dw" ? Math.max(...ex.map(e => e ? e.CL / e.CD : 0)) : "—"]]);
    },
  }];

  // ======================= Lesson 8 =======================
  X["wind-tunnels"] = [{
    title: "Tunnel operating envelope and flight equivalence",
    intro: String.raw`<p>A supersonic tunnel's Reynolds number is set by its supply pressure and temperature. Plotting the unit Reynolds number it can reach against Mach number, between its minimum and maximum supply pressures, gives its operating envelope. The interactive also finds the flight altitude at which the same Mach number gives the same unit Reynolds number, which tells you what a model test "flies" at, and the dynamic-pressure load on a model.</p>`,
    controls: rng("xpl", "Minimum supply p₀ (kPa)", 100, 1000, 10, 150, 0) + rng("xph", "Maximum supply p₀ (kPa)", 200, 5000, 10, 1500, 0) + rng("xT0", "Supply T₀ (K)", 270, 400, 1, 300, 0) +
      rng("xM", "Mach for readout", 1.5, 5, 0.05, 2.5) + presets([["University blowdown", { xpl: 150, xph: 1500, xT0: 300 }], ["Large heated facility", { xpl: 300, xph: 5000, xT0: 380 }], ["Indraft tunnel", { xpl: 100, xph: 101, xT0: 290 }]]),
    views: `<figure><div id="xplot"></div><figcaption>Unit Reynolds number against Mach number between the minimum and maximum supply pressures (band), with flight at 10, 20 and 30 km for comparison (dashed).</figcaption></figure>`,
    render() {
      const pl = UI.val("xpl") * 1e3, ph = Math.max(UI.val("xph") * 1e3, pl * 1.01), T0 = UI.val("xT0"), M0 = UI.val("xM"), Ms = UI.linspace(1.5, 5, 60);
      const Re = (M, p0) => GD.tunnel(M, p0, T0, 1.4, R).Re_per_m;
      const fl = (M, z) => { const a = GD.atmosphere(z); return a.rho * M * a.a / a.mu; };
      const series = [{ x: Ms, y: Ms.map(m => Re(m, pl)), c: 1, label: "p₀ minimum" }, { x: Ms, y: Ms.map(m => Re(m, ph)), c: 4, label: "p₀ maximum" }];
      [10, 20, 30].forEach((z, k) => series.push({ x: Ms, y: Ms.map(m => fl(m, z * 1000)), c: 6, dash: true, width: 1, label: k === 0 ? "flight, 10/20/30 km" : undefined }));
      UI.plot("#xplot", { xlabel: "Mach number", ylabel: "Unit Reynolds number (1/m)", logy: true, series, legend: "tr", legendWidth: 150 });
      const zEq = p0 => { const r = Re(M0, p0); const f = z => fl(M0, z) - r; return f(0) < 0 ? 0 : f(80000) > 0 ? NaN : bisect(f, 0, 80000, 1); };
      const t = GD.tunnel(M0, ph, T0, 1.4, R);
      UI.readout("#xro", [["Re/m, min p₀", Re(M0, pl)], ["Re/m, max p₀", Re(M0, ph)], ["Equivalent flight altitude, min p₀ (km)", zEq(pl) / 1000], ["Equivalent flight altitude, max p₀ (km)", zEq(ph) / 1000], ["Test static T (K)", t.T], ["Dynamic pressure at max p₀ (kPa)", t.q / 1000]]);
    },
  }];

  // ======================= Lesson 9 =======================
  X["hypersonic-flow"] = [{
    title: "Mach-number independence: wedge, cone and the approximations",
    intro: String.raw`<p>Fix a body and raise the Mach number. Its pressure coefficient settles to a constant: that is Mach-number independence. The interactive tracks the surface Cp of a wedge (exact oblique shock), a cone (exact Taylor–Maccoll), modified Newtonian theory and hypersonic small-disturbance theory for the wedge. It shows where each approximation becomes good and how γ shifts the limit.</p>`,
    controls: rng("xth", "Half-angle θ", 3, 30, 0.5, 12, 1, "°") + seg("xg", "Gas", [["1.4", "γ 1.4"], ["1.3", "γ 1.3"], ["1.2", "γ 1.2"], ["1.1", "γ 1.1"]], "1.4") +
      presets([["Slender, 5°", { xth: 5 }], ["Moderate, 15°", { xth: 15 }], ["Blunt-ish, 30°", { xth: 30 }]]),
    views: `<figure><div id="xplot"></div><figcaption>Surface Cp against freestream Mach number (log scale) for the chosen half-angle.</figcaption></figure>`,
    render() {
      const g = parseFloat(UI.seg("xg")), th = UI.val("xth") * D, Ms = UI.logspace(1.5, 40, 50);
      const wedge = Ms.map(m => { const o = obliqueShock(m, th, g); return o ? (o.p2_p1 - 1) / (0.5 * g * m * m) : NaN; });
      const cone = Ms.map(m => { const c = HY.cone(m, th, g); return c ? c.Cp : NaN; });
      const newt = Ms.map(m => HY.CpMax(m, g) * Math.sin(th) ** 2), hsd = Ms.map(m => HY.hsd.Cp_theta2(m * th, g) * th * th);
      UI.plot("#xplot", { xlabel: "M∞", ylabel: "Surface Cp", logx: true, xlim: [1.5, 40],
        series: [{ x: Ms, y: wedge, c: 1, label: "wedge, exact" }, { x: Ms, y: cone, c: 2, label: "cone, Taylor–Maccoll" }, { x: Ms, y: newt, c: 4, dash: true, label: "modified Newtonian" }, { x: Ms, y: hsd, c: 3, dash: true, label: "HSD (wedge)" }],
        legend: "tr", legendWidth: 170 });
      const i = Ms.length - 1;
      UI.readout("#xro", [["Cp wedge at M 40", wedge[i]], ["Cp cone at M 40", cone[i]], ["Newtonian", newt[i]], ["Wedge limit 4 sin²β/(γ+1)", (() => { const o = obliqueShock(40, th, g); return o ? 4 / (g + 1) * Math.sin(o.beta) ** 2 : NaN; })()]]);
    },
  }];

  // ======================= Lesson 10 =======================
  X.newtonian = [{
    title: "Control-flap effectiveness",
    intro: String.raw`<p>Hirschel and Weiland devote a chapter to stabilization, trim and control surfaces. The basic question is how much pressure a deflected flap produces. On a windward surface at incidence α, a flap deflected by δ meets the flow at α + δ. Newtonian theory gives \(C_p = C_{p,\max}\sin^2(\alpha + \delta)\). Tangent-wedge theory uses an oblique shock from the freestream at α + δ. Shock-expansion theory follows the real two-shock path: one shock at α on the body, then a second shock of δ at the hinge. The two-shock path reaches a higher pressure. In viscous flow the hinge-line pressure rise can separate the boundary layer, which reduces effectiveness and causes high local heating where the flow reattaches.</p>`,
    controls: rng("xM", "Mach number M∞", 4, 25, 0.5, 15, 1) + rng("xa", "Body incidence α", 0, 40, 0.5, 30, 1, "°") + rng("xd", "Flap deflection δ", -10, 30, 0.5, 15, 1, "°") +
      seg("xg", "γ (effective)", [["1.4", "1.4"], ["1.2", "1.2"], ["1.12", "1.12"]], "1.4") + presets([["Orbiter body flap", { xM: 20, xa: 40, xd: 15 }], ["X-38 flaps", { xM: 15, xa: 40, xd: 20 }], ["Low incidence", { xM: 8, xa: 5, xd: 15 }]]),
    views: `<figure><div id="xplot"></div><figcaption>Flap pressure coefficient against deflection by three methods; dashed horizontal: the body pressure ahead of the hinge (shock-expansion).</figcaption></figure>`,
    render() {
      const M = UI.val("xM"), a = UI.val("xa") * D, d0 = UI.val("xd") * D, g = parseFloat(UI.seg("xg")), q = 0.5 * g * M * M, cpm = HY.CpMax(M, g);
      const body = a > 0 ? obliqueShock(M, a, g) : { p2_p1: 1, M2: M };
      const cps = d => {
        const n = cpm * Math.sin(Math.max(0, a + d)) ** 2;
        const tw = a + d > 0 ? obliqueShock(M, a + d, g) : null;
        let se = NaN;
        if (body) { const t = GD.turn(body.M2, d, g); if (t) se = (body.p2_p1 * t.p_ratio - 1) / q; }
        return { n, tw: tw ? (tw.p2_p1 - 1) / q : (a + d <= 0 ? 0 : NaN), se };
      };
      const ds = UI.linspace(-10, 35, 91), all = ds.map(x => cps(x * D));
      const cpBody = body ? (body.p2_p1 - 1) / q : NaN;
      UI.plot("#xplot", { xlabel: "Flap deflection δ (deg)", ylabel: "Flap Cp", xlim: [-10, 35],
        series: [{ x: ds, y: all.map(c => c.n), c: 4, dash: true, label: "modified Newtonian" }, { x: ds, y: all.map(c => c.tw), c: 2, label: "tangent wedge" }, { x: ds, y: all.map(c => c.se), c: 1, label: "shock-expansion (two shocks)" }],
        hlines: [{ y: cpBody, label: "body Cp", c: 6 }], vlines: [{ x: d0 / D, c: 6 }], legend: "tl", legendWidth: 210 });
      const c = cps(d0);
      UI.readout("#xro", [["Body Cp", cpBody], ["Flap Cp, Newtonian", c.n], ["Flap Cp, tangent wedge", c.tw], ["Flap Cp, shock-expansion", c.se], ["Flap/body pressure ratio", isFinite(c.se) ? (1 + c.se * q) / (1 + cpBody * q) : NaN], ["dCp/dδ (per deg, s-e)", (cps(d0 + 0.5 * D).se - cps(d0 - 0.5 * D).se)]]);
    },
  }];

  // ======================= Lesson 11 =======================
  X["high-temperature"] = [{
    title: "Nozzle expansion: equilibrium, frozen and perfect gas",
    intro: String.raw`<p>The nozzle of a high-enthalpy tunnel, or of a rocket, expands gas from a hot reservoir. If the chemistry keeps up (equilibrium), atoms recombine as the gas cools and give their energy back to the flow. If it freezes at the reservoir composition, that energy stays locked in the dissociated atoms, so the exit velocity is lower and the test gas contains atomic oxygen not present in flight. The interactive integrates both along the isentrope of equilibrium air from a reservoir at \(T_0, p_0\), and compares them with a perfect gas (γ = 1.4).</p>`,
    controls: rng("xT0", "Reservoir temperature T₀ (K)", 2500, 9000, 50, 6000, 0) + rng("xp0", "Reservoir pressure, log₁₀(p₀ / atm)", 0, 3, 0.05, 2, 2) + rng("xpr", "Expansion ratio, log₁₀(p₀/p)", 1, 6, 0.05, 4, 2) +
      presets([["Reflected-shock tunnel (≈ 10 MJ/kg)", { xT0: 6500, xp0: 2.3, xpr: 4.5 }], ["Moderate enthalpy", { xT0: 4000, xp0: 2, xpr: 4 }], ["Low pressure, highly dissociated", { xT0: 7000, xp0: 1, xpr: 4 }]]),
    views: `<div class="two-up"><figure><div id="xplot"></div><figcaption>Velocity against expansion ratio: equilibrium (solid), frozen at the reservoir composition (dashed), perfect gas (dotted).</figcaption></figure><figure><div id="xplot3"></div><figcaption>Atomic-oxygen mole fraction along the expansion: equilibrium recombines, frozen keeps the reservoir value.</figcaption></figure></div>`,
    render() {
      const T0 = UI.val("xT0"), p0 = 101325 * Math.pow(10, UI.val("xp0")), pr = Math.pow(10, UI.val("xpr"));
      const res = HY.equilibrium(T0, p0), s0 = res.s, h0 = res.h, x0 = res.xa.slice();
      const eqAt = p => { const T = bisect(T => HY.equilibrium(T, p).s - s0, 150, T0 * 1.01, 1e-6); const st = HY.equilibrium(T, p); return { T, st, V: Math.sqrt(Math.max(0, 2 * (h0 - st.h))) }; };
      const frAt = p => { const T = bisect(T => HY.mixture(T, p, x0).s - s0, 20, T0 * 1.01, 1e-6); const st = HY.mixture(T, p, x0); return { T, st, V: Math.sqrt(Math.max(0, 2 * (h0 - st.h))) }; };
      const g = 1.4, cp = g * R / (g - 1), pfAt = p => { const T = T0 * Math.pow(p / p0, (g - 1) / g); return { T, V: Math.sqrt(2 * cp * (T0 - T)) }; };
      const rs = UI.logspace(2, Math.max(pr, 3), 24), E = rs.map(r => eqAt(p0 / r)), F = rs.map(r => frAt(p0 / r)), P = rs.map(r => pfAt(p0 / r));
      UI.plot("#xplot", { w: 420, h: 300, xlabel: "p₀/p", ylabel: "V (m/s)", logx: true, series: [{ x: rs, y: E.map(e => e.V), c: 1, label: "equilibrium" }, { x: rs, y: F.map(e => e.V), c: 4, dash: true, label: "frozen" }, { x: rs, y: P.map(e => e.V), c: 6, dash: true, width: 1.2, label: "perfect gas" }], vlines: [{ x: pr, c: 6 }], legend: "br", legendWidth: 110 });
      UI.plot("#xplot3", { w: 420, h: 300, xlabel: "p₀/p", ylabel: "x(O)", logx: true, logy: true, ylim: [1e-6, 1], series: [{ x: rs, y: E.map(e => e.st.x.O), c: 1, label: "equilibrium" }, { x: rs, y: rs.map(() => res.x.O), c: 4, dash: true, label: "frozen" }], legend: "bl", legendWidth: 110 });
      const e = eqAt(p0 / pr), fz = frAt(p0 / pr);
      UI.readout("#xro", [["Reservoir h₀ (MJ/kg)", res.h0K / 1e6], ["Reservoir x(O), x(NO)", `${fmt(res.x.O, 3)}, ${fmt(res.x.NO, 3)}`], ["Exit T, equilibrium (K)", e.T], ["Exit T, frozen (K)", fz.T], ["Exit V, equilibrium (m/s)", e.V], ["Exit V, frozen (m/s)", fz.V], ["Velocity lost by freezing (%)", 100 * (1 - fz.V / e.V)]]);
    },
  }];

  // ======================= Lesson 12 =======================
  X.aeroheating = [{
    title: "The nose-radius trade: heating against drag",
    intro: String.raw`<p>Blunting the nose of a cone lowers its stagnation heating (\(q \propto R_n^{-1/2}\)) but raises its drag. For a re-entry vehicle the trade sets both the TPS mass and the ballistic coefficient, which in turn fixes where in the atmosphere the vehicle decelerates and how accurately it can be targeted. The interactive computes both for a sphere-cone at a chosen flight condition.</p>`,
    controls: rng("xd", "Cone half-angle δ", 5, 45, 0.5, 10, 1, "°") + rng("xRb", "Base radius R_b (m)", 0.1, 2.5, 0.05, 0.5, 2) + rng("xV", "Velocity (km/s)", 2, 8, 0.1, 6, 1) + rng("xz", "Altitude (km)", 20, 70, 0.5, 40, 1) +
      rng("xRn", "Bluntness R_n/R_b for readout", 0.02, 1, 0.01, 0.2) + presets([["Slender RV", { xd: 8, xRb: 0.3, xV: 6.5, xz: 30, xRn: 0.05 }], ["Hypersonic glide body", { xd: 10, xRb: 0.5, xV: 5, xz: 40, xRn: 0.15 }], ["Wide probe", { xd: 45, xRb: 1, xV: 7, xz: 60, xRn: 0.5 }]]),
    views: `<figure><div id="xplot"></div><figcaption>Stagnation heat flux (left values, W/cm², solid) and modified-Newtonian C_D (dashed, scaled ×100) against bluntness.</figcaption></figure>`,
    render() {
      const d = UI.val("xd") * D, Rb = UI.val("xRb"), V = UI.val("xV") * 1000, a = HY.atmosphere(UI.val("xz") * 1000), rn = UI.val("xRn"), cpm = HY.CpMax(V / a.a, 1.4);
      const rs = UI.linspace(0.02, 1, 40), q = rs.map(r => HY.suttonGraves(a.rho, V, r * Rb) / 1e4), cd = rs.map(r => HY.newtonianBody(HY.shapes.sphereCone(r, d, 1, 60), 0, { Cp0: cpm, nphi: 8 }).CD);
      UI.plot("#xplot", { xlabel: "R_n / R_b", ylabel: "q (W/cm²)  and  100 C_D", xlim: [0, 1], series: [{ x: rs, y: q, c: 4, label: "q stagnation" }, { x: rs, y: cd.map(c => 100 * c), c: 1, dash: true, label: "100 × C_D" }], vlines: [{ x: rn, c: 6 }], legend: "tr", legendWidth: 120 });
      const qq = HY.suttonGraves(a.rho, V, rn * Rb), c = HY.newtonianBody(HY.shapes.sphereCone(rn, d, 1, 60), 0, { Cp0: cpm, nphi: 8 }).CD;
      UI.readout("#xro", [["Mach", V / a.a], ["q stagnation (W/cm²)", qq / 1e4], ["T_ra, ε = 0.85 (K)", HY.radiationAdiabatic(qq, 0.85, V, a.T)], ["C_D (base area)", c], ["Sharp-cone C_D", cpm * Math.sin(d) ** 2], ["Drag increase over sharp cone (%)", 100 * (c / (cpm * Math.sin(d) ** 2) - 1)]]);
    },
  }];

  // ======================= Lesson 13 =======================
  const PLANETS = {
    earth: { n: "Earth", rho0: 1.225, H: 7200, g: 9.80665, k: 1.7415e-4 },
    mars: { n: "Mars", rho0: 0.020, H: 11100, g: 3.71, k: 1.9027e-4 },
    venus: { n: "Venus", rho0: 65, H: 15900, g: 8.87, k: 1.896e-4 },
  };
  X.entry = [{
    title: "Ballistic entry on other worlds",
    intro: String.raw`<p>Allen–Eggers applies to any planet with an approximately exponential atmosphere, with its own surface density \(\rho_0\) and scale height H. Mars has a thin, tall atmosphere (\(\rho_0\) ≈ 0.020 kg/m³, H ≈ 11 km), so landers decelerate low down and need very low ballistic coefficients. Venus has a dense one (≈ 65 kg/m³, H ≈ 16 km), so probes decelerate high and hard. The Sutton–Graves constant changes with the gas: about 1.90 × 10⁻⁴ for the CO₂ atmospheres of Mars and Venus against 1.74 × 10⁻⁴ for Earth's air.</p>`,
    controls: seg("xp", "Planet", [["earth", "Earth"], ["mars", "Mars"], ["venus", "Venus"]], "mars") + rng("xV", "Entry velocity (km/s)", 3, 12, 0.05, 7.3, 2) + rng("xg", "Entry angle γ_E (below horizontal)", 5, 60, 0.5, 14, 1, "°") +
      rng("xb", "Ballistic coefficient β (kg/m²)", 20, 2000, 5, 65, 0) + rng("xRn", "Nose radius (m)", 0.1, 3, 0.05, 0.66, 2) +
      presets([["Mars Pathfinder-like", { xp: "mars", xV: 7.3, xg: 14, xb: 65, xRn: 0.66 }], ["Venus probe-like", { xp: "venus", xV: 11.5, xg: 32, xb: 190, xRn: 0.35 }], ["Earth ballistic capsule", { xp: "earth", xV: 7.6, xg: 10, xb: 350, xRn: 2 }]]),
    views: `<div class="two-up"><figure><div id="xplot"></div><figcaption>Velocity against altitude (Allen–Eggers).</figcaption></figure><figure><div id="xplot3"></div><figcaption>Deceleration (Earth g) and stagnation heat flux /100 (W/cm²) against altitude.</figcaption></figure></div>`,
    render() {
      const P = PLANETS[UI.seg("xp")], VE = UI.val("xV") * 1000, gE = UI.val("xg") * D, b = UI.val("xb"), Rn = UI.val("xRn");
      const ae = HY.allenEggers({ VE, gammaE: gE, beta: b, H: P.H, rho0: P.rho0 }), hs = UI.linspace(0, 12 * P.H, 200);
      const qf = h => P.k * Math.sqrt(P.rho0 * Math.exp(-h / P.H) / Rn) * ae.V(h) ** 3;
      UI.plot("#xplot", { w: 420, h: 300, xlabel: "V (km/s)", ylabel: "h (km)", series: [{ x: hs.map(h => ae.V(h) / 1000), y: hs.map(h => h / 1000), c: 1 }], legend: false });
      UI.plot("#xplot3", { w: 420, h: 300, xlabel: "g-load, q/100", ylabel: "h (km)", series: [{ x: hs.map(h => ae.decel(h) / 9.80665), y: hs.map(h => h / 1000), c: 4, label: "decel (g)" }, { x: hs.map(h => qf(h) / 1e6), y: hs.map(h => h / 1000), c: 3, label: "q/100 (W/cm²)" }], legend: "tr", legendWidth: 120 });
      const qmax = P.k * Math.sqrt(b * Math.sin(gE) / (3 * P.H * Rn)) * (VE * Math.exp(-1 / 6)) ** 3;
      UI.readout("#xro", [["Peak deceleration (Earth g)", ae.aMax / 9.80665], ["Altitude of peak g (km)", ae.hAmax / 1000], ["Peak heating (W/cm²)", qmax / 1e4], ["Altitude of peak heating (km)", ae.hQmax / 1000], ["Velocity left at the surface (m/s)", ae.V(0)], ["Surface reached at speed?", ae.V(0) > 500 ? "yes: needs more drag or lift" : "no: decelerated aloft"]]);
    },
  }];

  // ======================= Lesson 14 =======================
  X.airbreathing = [{
    title: "Sizing a cruise engine",
    intro: String.raw`<p>In steady cruise, lift equals weight and thrust equals drag, so the engine must deliver \(F = mg/(L/D)\). The cycle's specific thrust \(F/\dot m_0\) then fixes the air mass flow, and with it the inlet capture area \(A_0 = \dot m_0/(\rho_0V_0)\). The fuel flow follows from the fuel-air ratio, and dividing range rate by fuel flow gives the fuel needed per 1,000 km. The interactive chains the Heiser–Pratt cycle to these balances.</p>`,
    controls: rng("xM", "Cruise Mach", 4, 12, 0.1, 7, 1) + rng("xq", "Dynamic pressure q₀ (kPa)", 24, 96, 1, 48, 0) + rng("xm", "Vehicle mass (t)", 1, 300, 1, 50, 0) + rng("xLD", "L/D", 2, 7, 0.1, 4.5, 1) +
      rng("xT3", "Burner-entry T₃ (K)", 900, 1800, 10, 1400, 0) + seg("xF", "Fuel", [["H2", "hydrogen"], ["HC", "hydrocarbon"]], "H2") +
      presets([["Mach 5 hydrocarbon cruiser", { xM: 5, xq: 48, xm: 40, xLD: 5, xT3: 1200, xF: "HC" }], ["Mach 8 hydrogen transport", { xM: 8, xq: 48, xm: 200, xLD: 4.5, xT3: 1400, xF: "H2" }], ["X-43A-scale", { xM: 7, xq: 48, xm: 1.4, xLD: 3, xT3: 1400, xF: "H2" }]]),
    views: `<figure><div id="xplot"></div><figcaption>Required capture area (solid, m²) and fuel per 1,000 km (dashed, tonnes) against cruise Mach number for the chosen vehicle.</figcaption></figure>`,
    render() {
      const q = UI.val("xq") * 1000, m = UI.val("xm") * 1000, LD = UI.val("xLD"), T3 = UI.val("xT3"), fuel = UI.seg("xF"), M0 = UI.val("xM");
      const size = M => { const z = HY.altitudeForQ(M, q), a = HY.atmosphere(z), c = HY.brayton({ M0: M, T0: a.T, psi: T3 / a.T, etac: 0.9, etab: 0.9, etae: 0.9, phi: 1, fuel });
        if (c.error || !(c.Fm > 0)) return null; const F = m * 9.80665 / LD, md = F / c.Fm, A = md / (a.rho * c.V0), mf = md * c.f, per1000 = mf * (1e6 / c.V0) / 1000;
        return { z, a, c, F, md, A, mf, per1000 }; };
      const Ms = UI.linspace(4, 12, 41), all = Ms.map(size);
      UI.plot("#xplot", { xlabel: "Cruise Mach", ylabel: "m²  and  tonnes", series: [{ x: Ms, y: all.map(s => s ? s.A : NaN), c: 1, label: "capture area (m²)" }, { x: Ms, y: all.map(s => s ? s.per1000 : NaN), c: 4, dash: true, label: "fuel per 1000 km (t)" }], vlines: [{ x: M0, c: 6 }], legend: "tr", legendWidth: 170 });
      const s = size(M0);
      UI.readout("#xro", s ? [["Altitude (km)", s.z / 1000], ["Thrust = drag (kN)", s.F / 1000], ["Specific thrust (N·s/kg)", s.c.Fm], ["I_sp (s)", s.c.Isp], ["Air mass flow (kg/s)", s.md], ["Capture area (m²)", s.A], ["Fuel flow (kg/s)", s.mf], ["Fuel per 1000 km (t)", s.per1000], ["Burner-entry Mach", s.c.M3]] : [["Status", "cycle gives no thrust here"]]);
    },
  }];

  // ======================= Lesson 15 =======================
  X["hypersonic-testing"] = [{
    title: "BAM6QT run planner",
    intro: String.raw`<p>Planning a run starts from the unit Reynolds number, which fixes the stagnation pressure. That in turn decides whether the flow will be quiet. The planner takes a stagnation pressure, reports the freestream state and the equivalent flight altitude at Mach 6 (same Re/m), and predicts the boundary-layer thickness and second-mode frequency at a sensor station on a sharp cone (Taylor–Maccoll edge state; Lesson 12 estimate f ≈ u<sub>e</sub>/2δ). The quiet limit can be set to the value currently in force at the tunnel.</p>`,
    controls: rng("xp0", "Stagnation pressure p₀ (psia)", 20, 200, 1, 120, 0) + rng("xT0", "Stagnation temperature T₀ (K)", 400, 460, 1, 433, 0) + rng("xql", "Current quiet limit (psia)", 90, 180, 1, 135, 0) +
      rng("xd", "Cone half-angle δ", 2, 12, 0.5, 7, 1, "°") + rng("xx", "Sensor station x (m)", 0.05, 0.5, 0.005, 0.35, 3) + rng("xTw", "Model wall temperature (K)", 280, 330, 1, 300, 0) +
      presets([["7° cone, high quiet Re", { xp0: 130, xd: 7, xx: 0.35 }], ["7° cone, low Re", { xp0: 40, xd: 7, xx: 0.35 }], ["Noisy run (above limit)", { xp0: 160, xd: 7, xx: 0.35 }]]),
    views: `<div class="two-up"><figure><div id="xplot"></div><figcaption>Unit Reynolds number against p₀ at Mach 6, with the quiet limit; shading marks noisy operation.</figcaption></figure><figure><div id="xplot3"></div><figcaption>Predicted second-mode frequency along the cone at the chosen p₀.</figcaption></figure></div>`,
    render() {
      const psi = 6894.757, p0 = UI.val("xp0") * psi, T0 = UI.val("xT0"), ql = UI.val("xql"), d = UI.val("xd") * D, x = UI.val("xx"), Tw = UI.val("xTw"), M = 6, g = 1.4;
      const fs = p => { const T = T0 / isen.T0_T(M, g), pp = p / isen.p0_p(M, g), rho = pp / (R * T), V = M * Math.sqrt(g * R * T); return { T, p: pp, rho, V, Re: rho * V / GD.sutherland(T) }; };
      const ps = UI.linspace(20, 200, 60);
      UI.plot("#xplot", { w: 420, h: 300, xlabel: "p₀ (psia)", ylabel: "Re/m (10⁶)", xlim: [20, 200], series: [{ x: ps, y: ps.map(p => fs(p * psi).Re / 1e6), c: 1 }], bands: [{ x0: ql, x1: 200, label: "noisy" }], vlines: [{ x: p0 / psi, c: 4 }], legend: false });
      const f = fs(p0), c = HY.cone(M, d, g);
      if (!c) return;
      const Te = f.T * c.Tc_T1, pe = f.p * c.pc_p1, xs = UI.linspace(0.05, 0.5, 40), rr = xs.map(xx => HY.refTemp({ Me: c.Mc, Te, pe, Tw, x: xx, cone: true }));
      UI.plot("#xplot3", { w: 420, h: 300, xlabel: "x (m)", ylabel: "f (kHz)", series: [{ x: xs, y: rr.map(r => r.fMack / 1000), c: 4 }], vlines: [{ x, c: 6 }], legend: false });
      const r = HY.refTemp({ Me: c.Mc, Te, pe, Tw, x, cone: true });
      const zEq = (() => { const tgt = f.Re, fn = z => { const a = HY.atmosphere(z); return a.rho * M * a.a / a.mu - tgt; }; return fn(0) < 0 ? 0 : bisect(fn, 0, 80000, 1); })();
      const st = document.getElementById("xst"); const quiet = p0 / psi <= ql;
      st.className = "status " + (quiet ? "good" : "warn"); st.textContent = quiet ? "Below the quiet limit: quiet flow expected." : "Above the quiet limit: expect noisy flow (Mach ≈ 5.8, about 3% noise).";
      UI.readout("#xro", [["Freestream T (K), p (Pa)", `${fmt(f.T, 4)}, ${fmt(f.p, 4)}`], ["Velocity (m/s)", f.V], ["Re/m (10⁶)", f.Re / 1e6], ["Equivalent flight altitude at M 6 (km)", zEq / 1000], ["Cone edge Mach", c.Mc], ["Re_x at sensor (10⁶)", r.Rex / 1e6], ["δ at sensor (mm)", r.delta * 1000], ["Second-mode f (kHz)", r.fMack / 1000], ["Suggested sampling rate ≈ 10 f (MHz)", 10 * r.fMack / 1e6]]);
    },
    status: true,
  }];

  // =====================================================================================
  // Mounting
  // =====================================================================================
  const slug = document.body.dataset.lesson, list = X[slug];
  if (list) {
    const main = document.querySelector("main");
    const ex = document.getElementById("examples");
    const anchor = ex ? ex.closest(".prose") : document.getElementById("practice-gen") ? document.getElementById("practice-gen").closest(".prose") : main.querySelector(":scope > .pager");
    let n = document.querySelectorAll("section.lab").length;
    list.forEach((it, k) => {
      n++;
      const suf = k ? String(k + 1) : "";
      const prose = document.createElement("div");
      prose.className = "prose";
      prose.innerHTML = `<h2 id="extra-${slug}-${k}"><span class="sec">More to explore</span>${it.title}</h2>${it.intro}`;
      const sec = document.createElement("section");
      sec.className = "lab";
      sec.id = `xlab${suf}`;
      sec.innerHTML = `<div class="lab-head"><span class="num">Interactive ${n}</span><span class="title">${it.title}</span><span class="live"></span></div>
        <div class="controls">${it.controls}${it.status ? `<div id="xst" class="status"></div>` : ""}<div id="xro${suf}" class="readout"></div></div><div class="views">${it.views}</div>`;
      main.insertBefore(prose, anchor); main.insertBefore(sec, anchor);
      // the render functions use fixed ids; the second interactive of a lesson uses the "2" suffixed plot/readout ids
      UI.wire(sec, it.render);
      UI.typeset(prose);
    });
    // add the new sections to the table of contents
    const toc = document.querySelector("nav.toc ol");
    if (toc) list.forEach((it, k) => { const li = document.createElement("li"); li.innerHTML = `<a href="#extra-${slug}-${k}">${it.title}</a>`; const exLi = toc.querySelector('a[href="#examples"]'); toc.insertBefore(li, exLi ? exLi.parentNode : null); });
  }
})();
