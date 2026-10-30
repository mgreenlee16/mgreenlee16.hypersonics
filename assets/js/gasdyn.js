/*
 * gasdyn.js — compressible-flow relations and the standard atmosphere.
 * Calorically perfect gas unless noted. Angles in radians unless a name ends in "Deg".
 * Works in the browser (window.GD) and in Node (module.exports) for testing.
 */
(function (root) {
  "use strict";

  const DEG = Math.PI / 180;
  const R_AIR = 287.05;      // J/(kg K)
  const G0 = 9.80665;        // m/s^2
  const SIGMA = 5.670374e-8; // W/(m^2 K^4)

  // ---------- numerics ----------
  function bisect(f, a, b, tol = 1e-12, maxIt = 200) {
    let fa = f(a), fb = f(b);
    if (isNaN(fa) || isNaN(fb) || fa * fb > 0) return NaN;
    for (let i = 0; i < maxIt; i++) {
      const m = 0.5 * (a + b), fm = f(m);
      if (fm === 0 || (b - a) / 2 < tol) return m;
      if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    return 0.5 * (a + b);
  }

  function goldenMax(f, a, b, tol = 1e-10) {
    const r = (Math.sqrt(5) - 1) / 2;
    let c = b - r * (b - a), d = a + r * (b - a);
    while (Math.abs(b - a) > tol) {
      if (f(c) > f(d)) b = d; else a = c;
      c = b - r * (b - a); d = a + r * (b - a);
    }
    return 0.5 * (a + b);
  }

  // Invert a function that is monotone on [a, b] (f(x) = target).
  const invert = (f, target, a, b) => bisect(x => f(x) - target, a, b);

  // ---------- isentropic flow ----------
  const isen = {
    T0_T: (M, g) => 1 + 0.5 * (g - 1) * M * M,
    p0_p: (M, g) => Math.pow(1 + 0.5 * (g - 1) * M * M, g / (g - 1)),
    rho0_rho: (M, g) => Math.pow(1 + 0.5 * (g - 1) * M * M, 1 / (g - 1)),
    A_Astar: (M, g) =>
      (1 / M) * Math.pow((2 / (g + 1)) * (1 + 0.5 * (g - 1) * M * M), (g + 1) / (2 * (g - 1))),
    machAngle: M => (M >= 1 ? Math.asin(1 / M) : NaN),
    // Mach number from a ratio. branch: "sub" | "sup" for area ratio.
    M_from_T0_T: (r, g) => Math.sqrt((2 / (g - 1)) * (r - 1)),
    M_from_p0_p: (r, g) => Math.sqrt((2 / (g - 1)) * (Math.pow(r, (g - 1) / g) - 1)),
    M_from_rho0_rho: (r, g) => Math.sqrt((2 / (g - 1)) * (Math.pow(r, g - 1) - 1)),
    M_from_A_Astar: (r, g, branch = "sup") => {
      if (r < 1) return NaN;
      if (r === 1) return 1;
      return branch === "sub"
        ? invert(M => isen.A_Astar(M, g), r, 1e-9, 1)
        : invert(M => -isen.A_Astar(M, g), -r, 1, 200);
    },
    // Mass-flow parameter  mdot sqrt(T0) / (A p0)  [SI with given R]
    massFlowParam: (M, g, R = R_AIR) =>
      Math.sqrt(g / R) * M * Math.pow(1 + 0.5 * (g - 1) * M * M, -(g + 1) / (2 * (g - 1))),
  };

  // ---------- normal shock ----------
  function normalShock(M1, g) {
    if (!(M1 >= 1)) return null;
    const m2 = M1 * M1;
    const M2 = Math.sqrt((1 + 0.5 * (g - 1) * m2) / (g * m2 - 0.5 * (g - 1)));
    const p2_p1 = 1 + (2 * g / (g + 1)) * (m2 - 1);
    const rho2_rho1 = ((g + 1) * m2) / (2 + (g - 1) * m2);
    const T2_T1 = p2_p1 / rho2_rho1;
    const p02_p01 = Math.pow(rho2_rho1, g / (g - 1)) * Math.pow(p2_p1, -1 / (g - 1));
    const p02_p1 = p02_p01 * isen.p0_p(M1, g); // Rayleigh–Pitot ratio
    return {
      M1, M2, p2_p1, rho2_rho1, T2_T1, u2_u1: 1 / rho2_rho1,
      p02_p01, p02_p1, ds_R: -Math.log(p02_p01),
    };
  }
  // Upstream Mach number from any one downstream ratio (all monotone in M1).
  function normalShockFrom(key, value, g) {
    if (key === "M1") return normalShock(value, g);
    if (key === "M2") {
      // M2 decreases from 1 to sqrt((g-1)/(2g))
      const M1 = invert(M => -normalShock(M, g).M2, -value, 1, 1e4);
      return isNaN(M1) ? null : normalShock(M1, g);
    }
    const decreasing = key === "p02_p01";
    const M1 = invert(M => (decreasing ? -1 : 1) * normalShock(M, g)[key],
      (decreasing ? -1 : 1) * value, 1, 1e4);
    return isNaN(M1) ? null : normalShock(M1, g);
  }

  // ---------- oblique shock ----------
  const theta_from_beta = (M, beta, g) => {
    const s = Math.sin(beta);
    const num = 2 / Math.tan(beta) * (M * M * s * s - 1);
    const den = M * M * (g + Math.cos(2 * beta)) + 2;
    return Math.atan(num / den);
  };
  function betaMax(M, g) {
    const mu = Math.asin(1 / M);
    const b = goldenMax(x => theta_from_beta(M, x, g), mu, Math.PI / 2);
    return { beta: b, theta: theta_from_beta(M, b, g) };
  }
  // Wave angle for deflection theta. Returns NaN when the shock is detached.
  function beta_from_theta(M, theta, g, strong = false) {
    if (M <= 1) return NaN;
    const mu = Math.asin(1 / M);
    if (theta === 0) return strong ? Math.PI / 2 : mu;
    const bm = betaMax(M, g);
    if (theta > bm.theta) return NaN;
    const f = b => theta_from_beta(M, b, g) - theta;
    return strong ? bisect(f, bm.beta, Math.PI / 2) : bisect(f, mu, bm.beta);
  }
  function M_from_theta_beta(theta, beta, g) {
    const den = Math.sin(2 * beta) - Math.tan(theta) * (g + Math.cos(2 * beta));
    const m2 = 2 * (1 / Math.tan(beta) + Math.tan(theta)) / den;
    return m2 > 1 ? Math.sqrt(m2) : NaN;
  }
  function obliqueShock(M1, theta, g, strong = false, betaIn) {
    const beta = betaIn !== undefined ? betaIn : beta_from_theta(M1, theta, g, strong);
    if (isNaN(beta)) return null;
    const th = betaIn !== undefined ? theta_from_beta(M1, beta, g) : theta;
    const Mn1 = M1 * Math.sin(beta);
    const ns = normalShock(Math.max(Mn1, 1), g);
    const M2 = ns.M2 / Math.sin(beta - th);
    return {
      M1, theta: th, beta, Mn1, Mn2: ns.M2, M2,
      p2_p1: ns.p2_p1, rho2_rho1: ns.rho2_rho1, T2_T1: ns.T2_T1, p02_p01: ns.p02_p01,
    };
  }

  // ---------- Prandtl–Meyer ----------
  const nu = (M, g) => {
    if (M < 1) return NaN;
    const k = Math.sqrt((g + 1) / (g - 1));
    return k * Math.atan(Math.sqrt((M * M - 1) / (k * k))) - Math.atan(Math.sqrt(M * M - 1));
  };
  const nuMax = g => (Math.PI / 2) * (Math.sqrt((g + 1) / (g - 1)) - 1);
  const M_from_nu = (v, g) => (v <= 0 ? 1 : v >= nuMax(g) ? Infinity : invert(M => nu(M, g), v, 1, 1e5));

  // Turn a supersonic stream by delta (rad): >0 compression (weak oblique shock),
  // <0 isentropic expansion. Returns new Mach and multiplicative static-pressure change.
  function turn(M, delta, g) {
    if (Math.abs(delta) < 1e-12) return { M, p_ratio: 1, p0_ratio: 1, type: "none" };
    if (delta > 0) {
      const os = obliqueShock(M, delta, g);
      if (!os) return null;
      return { M: os.M2, p_ratio: os.p2_p1, p0_ratio: os.p02_p01, type: "shock", beta: os.beta };
    }
    const M2 = M_from_nu(nu(M, g) - delta, g);
    if (!isFinite(M2)) return null;
    return { M: M2, p_ratio: isen.p0_p(M, g) / isen.p0_p(M2, g), p0_ratio: 1, type: "expansion" };
  }

  // Shock-expansion theory for a diamond airfoil (t/c may be 0 → flat plate).
  function diamondAirfoil(M, alpha, tc, g) {
    const eps = Math.atan(tc);
    const l = 1 / (2 * Math.cos(eps)); // face length for unit chord
    const uf = turn(M, eps - alpha, g), lf = turn(M, eps + alpha, g);
    if (!uf || !lf) return null;
    const ur = turn(uf.M, -2 * eps, g), lr = turn(lf.M, -2 * eps, g);
    if (!ur || !lr) return null;
    const faces = [
      { name: "upper front", p: uf.p_ratio, n: [-Math.sin(eps), Math.cos(eps)], M: uf.M, type: uf.type },
      { name: "upper rear", p: uf.p_ratio * ur.p_ratio, n: [Math.sin(eps), Math.cos(eps)], M: ur.M, type: ur.type },
      { name: "lower front", p: lf.p_ratio, n: [-Math.sin(eps), -Math.cos(eps)], M: lf.M, type: lf.type },
      { name: "lower rear", p: lf.p_ratio * lr.p_ratio, n: [Math.sin(eps), -Math.cos(eps)], M: lr.M, type: lr.type },
    ];
    const q_p = 0.5 * g * M * M;
    let Fx = 0, Fy = 0;
    for (const f of faces) {
      f.Cp = (f.p - 1) / q_p;
      Fx += -f.Cp * l * f.n[0];
      Fy += -f.Cp * l * f.n[1];
    }
    const CL = -Fx * Math.sin(alpha) + Fy * Math.cos(alpha);
    const CD = Fx * Math.cos(alpha) + Fy * Math.sin(alpha);
    const b = Math.sqrt(M * M - 1);
    return {
      faces, CL, CD, LD: CL / CD,
      linear: { CL: 4 * alpha / b, CD: (4 / b) * (alpha * alpha + tc * tc) },
    };
  }

  // ---------- Rayleigh (heat addition) and Fanno (friction) ----------
  const rayleigh = {
    p_ps: (M, g) => (1 + g) / (1 + g * M * M),
    T_Ts: (M, g) => (M * M * (1 + g) ** 2) / (1 + g * M * M) ** 2,
    rho_rhos: (M, g) => (1 + g * M * M) / ((1 + g) * M * M),
    T0_T0s: (M, g) => ((g + 1) * M * M * (2 + (g - 1) * M * M)) / (1 + g * M * M) ** 2,
    p0_p0s: (M, g) =>
      ((1 + g) / (1 + g * M * M)) * Math.pow((2 + (g - 1) * M * M) / (g + 1), g / (g - 1)),
    M_from_T0_T0s: (r, g, branch = "sub") => {
      if (r > 1) return NaN;
      if (r === 1) return 1;
      return branch === "sub"
        ? invert(M => rayleigh.T0_T0s(M, g), r, 1e-9, 1)
        : invert(M => -rayleigh.T0_T0s(M, g), -r, 1, 1e4);
    },
  };
  // Constant-area heat addition: given inlet Mach M1 and T02/T01 → exit state.
  function rayleighHeat(M1, Tt_ratio, g) {
    const r1 = rayleigh.T0_T0s(M1, g);
    const r2 = r1 * Tt_ratio;
    if (r2 > 1 + 1e-12) return { choked: true, maxTtRatio: 1 / r1 };
    const M2 = rayleigh.M_from_T0_T0s(Math.min(r2, 1), g, M1 < 1 ? "sub" : "sup");
    return {
      choked: false, M2, maxTtRatio: 1 / r1,
      p2_p1: rayleigh.p_ps(M2, g) / rayleigh.p_ps(M1, g),
      T2_T1: rayleigh.T_Ts(M2, g) / rayleigh.T_Ts(M1, g),
      p02_p01: rayleigh.p0_p0s(M2, g) / rayleigh.p0_p0s(M1, g),
      u2_u1: rayleigh.rho_rhos(M1, g) / rayleigh.rho_rhos(M2, g),
    };
  }

  const fanno = {
    T_Ts: (M, g) => (g + 1) / (2 + (g - 1) * M * M),
    p_ps: (M, g) => (1 / M) * Math.sqrt((g + 1) / (2 + (g - 1) * M * M)),
    rho_rhos: (M, g) => (1 / M) * Math.sqrt((2 + (g - 1) * M * M) / (g + 1)),
    p0_p0s: (M, g) => (1 / M) * Math.pow((2 + (g - 1) * M * M) / (g + 1), (g + 1) / (2 * (g - 1))),
    fLD: (M, g) =>
      (1 - M * M) / (g * M * M) +
      ((g + 1) / (2 * g)) * Math.log(((g + 1) * M * M) / (2 + (g - 1) * M * M)),
  };

  // ---------- U.S. Standard Atmosphere 1976 (0–86 km geometric) ----------
  const ATM_LAYERS = [ // geopotential base km, lapse K/km
    [0, -6.5], [11, 0], [20, 1.0], [32, 2.8], [47, 0], [51, -2.8], [71, -2.0], [84.852, 0],
  ];
  const atmBase = (() => {
    const out = []; let T = 288.15, p = 101325;
    const gR = G0 / R_AIR * 1000; // per km
    for (let i = 0; i < ATM_LAYERS.length; i++) {
      out.push({ h: ATM_LAYERS[i][0], L: ATM_LAYERS[i][1], T, p });
      if (i + 1 < ATM_LAYERS.length) {
        const dh = ATM_LAYERS[i + 1][0] - ATM_LAYERS[i][0], L = ATM_LAYERS[i][1];
        if (L === 0) p = p * Math.exp(-gR * dh / T);
        else { const T2 = T + L * dh; p = p * Math.pow(T2 / T, -gR / L); T = T2; }
      }
    }
    return out;
  })();
  function atmosphere(zMeters) {
    const z = Math.min(Math.max(zMeters / 1000, 0), 86);
    const r0 = 6356.766;
    const h = (r0 * z) / (r0 + z);
    let b = atmBase[0];
    for (const layer of atmBase) if (h >= layer.h) b = layer;
    const gR = G0 / R_AIR * 1000, dh = h - b.h;
    let T, p;
    if (b.L === 0) { T = b.T; p = b.p * Math.exp(-gR * dh / b.T); }
    else { T = b.T + b.L * dh; p = b.p * Math.pow(T / b.T, -gR / b.L); }
    const rho = p / (R_AIR * T);
    const a = Math.sqrt(1.4 * R_AIR * T);
    const mu = 1.458e-6 * Math.pow(T, 1.5) / (T + 110.4); // Sutherland
    return { z: z * 1000, h: h * 1000, T, p, rho, a, mu, nu: mu / rho };
  }

  // ---------- linearized subsonic / transonic ----------
  const linear = {
    prandtlGlauert: (Cp0, M) => Cp0 / Math.sqrt(1 - M * M),
    karmanTsien: (Cp0, M) => {
      const b = Math.sqrt(1 - M * M);
      return Cp0 / (b + (M * M / (1 + b)) * Cp0 / 2);
    },
    laitone: (Cp0, M, g) => {
      const b = Math.sqrt(1 - M * M);
      return Cp0 / (b + (M * M * (1 + 0.5 * (g - 1) * M * M) / (2 * b)) * Cp0);
    },
    // Pressure coefficient at which the local flow just reaches M = 1
    CpCritical: (M, g) =>
      (2 / (g * M * M)) * (Math.pow((2 + (g - 1) * M * M) / (g + 1), g / (g - 1)) - 1),
    // Critical Mach number for a given incompressible minimum Cp (negative)
    criticalMach: (Cp0min, g, rule = "karmanTsien") => {
      const f = M => (rule === "prandtlGlauert" ? linear.prandtlGlauert(Cp0min, M)
        : rule === "laitone" ? linear.laitone(Cp0min, M, g) : linear.karmanTsien(Cp0min, M)) - linear.CpCritical(M, g);
      // Scan for the first sign change: the Kármán–Tsien and Laitone rules blow up near M = 1.
      for (let M = 0.02; M < 0.99; M += 0.01) if (f(M) * f(M + 0.01) <= 0) return bisect(f, M, M + 0.01);
      return NaN;
    },
    // Supersonic thin-airfoil (Ackeret) pressure coefficient for a surface slope theta
    ackeretCp: (theta, M) => 2 * theta / Math.sqrt(M * M - 1),
  };

  const GD = {
    DEG, R_AIR, G0, SIGMA, bisect, goldenMax, invert,
    isen, normalShock, normalShockFrom,
    theta_from_beta, beta_from_theta, betaMax, M_from_theta_beta, obliqueShock,
    nu, nuMax, M_from_nu, turn, diamondAirfoil,
    rayleigh, rayleighHeat, fanno, atmosphere, linear,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = GD;
  else root.GD = GD;
})(typeof window !== "undefined" ? window : globalThis);
