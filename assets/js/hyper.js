/*
 * hyper.js — hypersonic flow, high-temperature air, aeroheating, atmospheric entry, air-breathing propulsion
 * and hypersonic ground-test facilities. Builds on gasdyn.js (GD), which must load first.
 * SI units throughout; angles in radians unless a name ends in "Deg".
 * Works in the browser (window.HY) and in Node (module.exports) for testing.
 */
(function (root) {
  "use strict";
  const GD = root.GD || (typeof require !== "undefined" ? require("./gasdyn.js") : null);
  const { isen, normalShock, obliqueShock, theta_from_beta, bisect, goldenMax, DEG, R_AIR, G0, SIGMA } = GD;
  const RU = 8.314462618;    // J/(mol K)
  const KB = 1.380649e-23;   // J/K
  const NA = 6.02214076e23;  // 1/mol
  const PSTD = 1e5;          // standard-state pressure of the NASA polynomials, Pa

  // Illinois (modified regula falsi): bracketed and fast. f(a), f(b) must differ in sign.
  function illinois(f, a, b, tol = 1e-12, maxIt = 200) {
    let fa = f(a), fb = f(b), side = 0;
    if (!(fa * fb <= 0)) return NaN;
    for (let i = 0; i < maxIt; i++) {
      const c = (a * fb - b * fa) / (fb - fa), fc = f(c);
      if (fc === 0 || Math.abs(b - a) < tol * (1 + Math.abs(c))) return c;
      if (fc * fb > 0) { b = c; fb = fc; if (side === -1) fa /= 2; side = -1; }
      else { a = c; fa = fc; if (side === 1) fb /= 2; side = 1; }
    }
    return (a * fb - b * fa) / (fb - fa);
  }
  function rk4(f, y, t, h) {
    const k1 = f(t, y), y2 = y.map((v, i) => v + 0.5 * h * k1[i]);
    const k2 = f(t + 0.5 * h, y2), y3 = y.map((v, i) => v + 0.5 * h * k2[i]);
    const k3 = f(t + 0.5 * h, y3), y4 = y.map((v, i) => v + h * k3[i]);
    const k4 = f(t + h, y4);
    return y.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }

  // =====================================================================================
  // 1. Hypersonic limits, similarity and Newtonian theory
  // =====================================================================================
  const limits = {
    rho: g => (g + 1) / (g - 1),                                    // ρ2/ρ1 as M1 sin β → ∞
    beta_theta: g => (g + 1) / 2,                                   // β/θ, thin wedge, M → ∞
    Cp_beta: (beta, g) => (4 / (g + 1)) * Math.sin(beta) ** 2,      // Cp behind the shock, M → ∞
  };
  // Hypersonic small-disturbance theory for a wedge: K = M∞θ (Anderson, Hypersonic & High-Temperature Gas Dynamics, §4.x)
  const hsd = {
    beta_theta: (K, g) => (g + 1) / 4 + Math.sqrt(((g + 1) / 4) ** 2 + 1 / (K * K)),
    Cp_theta2: (K, g) => (g + 1) / 2 + Math.sqrt(((g + 1) / 2) ** 2 + 4 / (K * K)),
  };
  // Stagnation-point pressure coefficient behind a normal shock (modified Newtonian Cp,max)
  function CpMax(M, g) {
    if (!(M > 1)) return NaN;
    return (normalShock(M, g).p02_p1 - 1) / (0.5 * g * M * M);
  }
  const CpMaxLimit = g => (4 / (g + 1)) * Math.pow(((g + 1) ** 2) / (4 * g), g / (g - 1));
  // Newtonian flat plate at incidence α (rad). Cp0 = 2 for pure Newtonian, CpMax for modified.
  function flatPlateNewtonian(alpha, Cp0 = 2) {
    const CN = Cp0 * Math.sin(alpha) ** 2;
    return { CN, CL: CN * Math.cos(alpha), CD: CN * Math.sin(alpha), LD: 1 / Math.tan(alpha) };
  }
  // Exact (shock-expansion) flat plate, for comparison with Newtonian.
  function flatPlateExact(M, alpha, g) {
    const r = GD.diamondAirfoil(M, alpha, 0, g);
    return r ? { CL: r.CL, CD: r.CD, LD: r.LD } : null;
  }

  // ---------- Taylor–Maccoll: supersonic flow over a sharp cone at zero incidence ----------
  // Integrates from the shock (wave angle beta) toward the body until V_theta = 0; returns the cone half-angle.
  function tmIntegrate(M1, beta, g, keep = false) {
    const delta = theta_from_beta(M1, beta, g);
    if (!(delta > 0)) return null;
    const os = obliqueShock(M1, delta, g, false, beta);
    const M2 = os.M2, V2 = 1 / Math.sqrt(2 / ((g - 1) * M2 * M2) + 1); // V/V_max
    let y = [V2 * Math.cos(beta - delta), -V2 * Math.sin(beta - delta)], th = beta;
    const f = (t, v) => {
      const [vr, vt] = v, A = 0.5 * (g - 1) * (1 - vr * vr - vt * vt);
      return [vt, (vt * vt * vr - A * (2 * vr + vt / Math.tan(t))) / (A - vt * vt)];
    };
    const h = -Math.min(0.2 * DEG, beta / 400), path = keep ? [[th, y[0], y[1]]] : null;
    for (let i = 0; i < 20000; i++) {
      const yn = rk4(f, y, th, h);
      if (yn[1] >= 0) { // V_theta crossed zero: interpolate
        const s = -y[1] / (yn[1] - y[1]);
        const thc = th + s * h, vr = y[0] + s * (yn[0] - y[0]);
        if (keep) path.push([thc, vr, 0]);
        return { thetaC: thc, Vc: vr, os, M2, path };
      }
      y = yn; th += h;
      if (keep) path.push([th, y[0], y[1]]);
      if (th <= 0) return null;
    }
    return null;
  }
  const machFromVmax = (V, g) => Math.sqrt((2 / (g - 1)) * (V * V) / (1 - V * V));
  // Maximum cone half-angle for an attached shock
  function coneMax(M1, g) {
    const mu = Math.asin(1 / M1);
    const c = b => { const r = tmIntegrate(M1, b, g); return r ? r.thetaC : -1; };
    const b = goldenMax(c, mu + 1e-4, Math.PI / 2 - 1e-4, 1e-7);
    return { beta: b, thetaC: c(b) };
  }
  // Cone solution for half-angle thetaC (rad). Returns null if detached.
  function cone(M1, thetaC, g, keep = false) {
    if (!(M1 > 1) || !(thetaC > 0)) return null;
    const cm = coneMax(M1, g);
    if (thetaC > cm.thetaC) return null;
    const mu = Math.asin(1 / M1);
    const beta = bisect(b => { const r = tmIntegrate(M1, b, g); return (r ? r.thetaC : 0) - thetaC; }, mu + 1e-7, cm.beta, 1e-11);
    const r = tmIntegrate(M1, beta, g, keep);
    const Mc = machFromVmax(r.Vc, g);
    const pc_p1 = r.os.p2_p1 * isen.p0_p(r.M2, g) / isen.p0_p(Mc, g);
    const Tc_T1 = r.os.T2_T1 * isen.T0_T(r.M2, g) / isen.T0_T(Mc, g);
    return {
      beta, thetaC, Mc, pc_p1, Tc_T1, rhoc_rho1: pc_p1 / Tc_T1, Cp: (pc_p1 - 1) / (0.5 * g * M1 * M1),
      p02_p01: r.os.p02_p01, M2shock: r.M2, thetaMax: cm.thetaC, path: r.path,
    };
  }

  // ---------- Newtonian forces on axisymmetric bodies at incidence ----------
  // profile: [[x, r], ...] from the nose (x increasing downstream, r ≥ 0). Body axis +x downstream, +z up;
  // freestream direction in body axes V = (cos α, 0, sin α), so α > 0 puts the lower surface windward.
  // Returns CA, CN, CL, CD, Cm (nose-up positive) about xRef on the axis, all on Aref, Lref.
  function newtonianBody(profile, alpha, opts = {}) {
    const Cp0 = opts.Cp0 || 2, nphi = opts.nphi || 96;
    const Rb = Math.max(...profile.map(p => p[1]));
    const Aref = opts.Aref || Math.PI * Rb * Rb, Lref = opts.Lref || 2 * Rb, xRef = opts.xRef || 0, zRef = opts.zRef || 0;
    const V = [Math.cos(alpha), 0, Math.sin(alpha)];
    let FA = 0, FN = 0, MY = 0, Swet = 0;
    for (let k = 0; k + 1 < profile.length; k++) {
      const [x1, r1] = profile[k], [x2, r2] = profile[k + 1];
      const ds = Math.hypot(x2 - x1, r2 - r1);
      if (ds < 1e-12) continue;
      const sd = (r2 - r1) / ds, cd = (x2 - x1) / ds;   // sin, cos of local slope
      const xm = 0.5 * (x1 + x2), rm = 0.5 * (r1 + r2);
      for (let j = 0; j < nphi; j++) {
        const phi = (2 * Math.PI * (j + 0.5)) / nphi, cph = Math.cos(phi), sph = Math.sin(phi);
        // outward normal: radial part along (0, sin φ, cos φ)... use y = r sin φ, z = −r cos φ (φ = 0 on the lower side)
        const n = [-sd, cd * sph, -cd * cph];
        const dA = rm * ds * (2 * Math.PI / nphi);
        Swet += dA;
        const vn = V[0] * n[0] + V[2] * n[2];
        if (vn >= 0) continue;                           // shadowed
        const Cp = Cp0 * vn * vn;
        const fx = -Cp * n[0] * dA, fz = -Cp * n[2] * dA;
        const z = -rm * cph;
        FA += fx; FN += fz;
        MY += (z - zRef) * fx - (xm - xRef) * fz;
      }
    }
    const CA = FA / Aref, CN = FN / Aref;
    const CL = CN * Math.cos(alpha) - CA * Math.sin(alpha), CD = CN * Math.sin(alpha) + CA * Math.cos(alpha);
    return { CA, CN, CL, CD, LD: CL / CD, Cm: MY / (Aref * Lref), Aref, Lref, Swet };
  }
  // Profile generators (lengths in meters; all start at the nose on the axis)
  const shapes = {
    sphere: (R, n = 120) => Array.from({ length: n + 1 }, (_, i) => { const t = (Math.PI * i) / n; return [R - R * Math.cos(t), R * Math.sin(t)]; }),
    hemisphere: (R, n = 90) => Array.from({ length: n + 1 }, (_, i) => { const t = (Math.PI / 2 * i) / n; return [R - R * Math.cos(t), R * Math.sin(t)]; }),
    cone: (delta, L, n = 60) => Array.from({ length: n + 1 }, (_, i) => [(L * i) / n, (L * i / n) * Math.tan(delta)]),
    // spherically blunted cone: nose radius Rn, half-angle δ, base radius Rb
    sphereCone(Rn, delta, Rb, n = 120) {
      const pts = [], tT = Math.PI / 2 - delta;             // tangency angle on the nose
      for (let i = 0; i <= 40; i++) { const t = (tT * i) / 40; pts.push([Rn - Rn * Math.cos(t), Rn * Math.sin(t)]); }
      const [xt, rt] = pts[pts.length - 1];
      if (Rb > rt) { const L = (Rb - rt) / Math.tan(delta); for (let i = 1; i <= n - 40; i++) pts.push([xt + (L * i) / (n - 40), rt + ((Rb - rt) * i) / (n - 40)]); }
      return pts;
    },
    // Apollo-type capsule: spherical-cap heat shield (radius Rs) of base radius Rb, toroidal shoulder rs,
    // then a conical afterbody of half-angle δa (measured from the axis, closing toward the apex) and length La.
    capsule(Rb, Rs, rs, deltaA, La) {
      const pts = [], tC = Math.asin((Rb - rs) / (Rs - rs)); // where the cap meets the shoulder torus
      for (let i = 0; i <= 50; i++) { const t = (tC * i) / 50; pts.push([Rs - Rs * Math.cos(t), Rs * Math.sin(t)]); }
      // shoulder: torus centred at (xc, Rb − rs), sweeping from angle tC to π/2 + δa
      const xc = Rs - Rs * Math.cos(tC) + rs * Math.cos(tC), zc = Rb - rs, tE = Math.PI / 2 + deltaA;
      for (let i = 1; i <= 20; i++) { const t = tC + ((tE - tC) * i) / 20; pts.push([xc - rs * Math.cos(t), zc + rs * Math.sin(t)]); }
      const [xa, ra] = pts[pts.length - 1];
      for (let i = 1; i <= 30; i++) { const s = (La * i) / 30; pts.push([xa + s, Math.max(0.15 * Rb, ra - s * Math.tan(deltaA))]); }
      return pts;
    },
  };

  // =====================================================================================
  // 2. Atmosphere to 150 km (U.S. Standard Atmosphere 1976; above 86 km from its tables)
  // =====================================================================================
  const US76_HIGH = [ // z km, T K, p Pa, ρ kg/m³
    [86, 186.87, 0.37338, 6.958e-6], [90, 186.87, 0.18359, 3.416e-6], [95, 188.42, 0.075966, 1.393e-6],
    [100, 195.08, 0.032011, 5.604e-7], [105, 208.84, 0.014507, 2.325e-7], [110, 240.0, 0.0071042, 9.708e-8],
    [115, 300.0, 0.0040079, 4.289e-8], [120, 360.0, 0.0025382, 2.222e-8], [130, 469.27, 0.0012505, 8.152e-9],
    [140, 559.63, 7.2028e-4, 3.831e-9], [150, 634.39, 4.5422e-4, 2.076e-9],
  ];
  function atmosphere(z) {
    if (z <= 86000) return GD.atmosphere(Math.max(z, 0));
    const zk = Math.min(z / 1000, 150);
    let i = 0;
    while (i < US76_HIGH.length - 2 && zk > US76_HIGH[i + 1][0]) i++;
    const [z1, T1, p1, r1] = US76_HIGH[i], [z2, T2, p2, r2] = US76_HIGH[i + 1], s = (zk - z1) / (z2 - z1);
    const T = T1 + s * (T2 - T1), p = p1 * Math.pow(p2 / p1, s), rho = r1 * Math.pow(r2 / r1, s);
    const mu = GD.sutherland(T), a = Math.sqrt(1.4 * p / rho);
    return { z: zk * 1000, T, p, rho, a, mu, nu: mu / rho };
  }
  // Mean free path from kinetic theory (hard spheres, effective diameter of air 3.65e-10 m)
  const meanFreePath = (p, T) => (KB * T) / (Math.SQRT2 * Math.PI * (3.65e-10) ** 2 * p);

  // =====================================================================================
  // 3. High-temperature air in chemical equilibrium (11 species, NASA Glenn 9-coefficient thermodynamics)
  //    McBride, Zehe & Gordon, NASA TP-2002-211556. Air taken as 79% N2, 21% O2 by volume.
  // =====================================================================================
  const SPECIES = {
    "N2": { N: 2, O: 0, E: 0, a: [
      [22103.71497, -381.846182, 6.08273836, -0.00853091441, 1.384646189e-05, -9.62579362e-09, 2.519705809e-12, 710.846086, -10.76003744],
      [587712.406, -2239.249073, 6.06694922, -0.00061396855, 1.491806679e-07, -1.923105485e-11, 1.061954386e-15, 12832.10415, -15.86640027],
      [831013916.0, -642073.354, 202.0264635, -0.03065092046, 2.486903333e-06, -9.70595411e-11, 1.437538881e-15, 4938707.04, -1672.09974]] },
    "O2": { N: 0, O: 2, E: 0, a: [
      [-34255.6342, 484.700097, 1.119010961, 0.00429388924, -6.83630052e-07, -2.0233727e-09, 1.039040018e-12, -3391.45487, 18.4969947],
      [-1037939.022, 2344.830282, 1.819732036, 0.001267847582, -2.188067988e-07, 2.053719572e-11, -8.19346705e-16, -16890.10929, 17.38716506],
      [497529430.0, -286610.6874, 66.9035225, -0.00616995902, 3.016396027e-07, -7.4214166e-12, 7.27817577e-17, 2293554.027, -553.062161]] },
    "NO": { N: 1, O: 1, E: 0, a: [
      [-11439.16503, 153.6467592, 3.43146873, -0.002668592368, 8.48139912e-06, -7.68511105e-09, 2.386797655e-12, 9098.21441, 6.72872549],
      [223901.8716, -1289.651623, 5.43393603, -0.00036560349, 9.88096645e-08, -1.416076856e-11, 9.38018462e-16, 17503.17656, -8.50166909],
      [-957530354.0, 591243.448, -138.4566826, 0.01694339403, -1.007351096e-06, 2.912584076e-11, -3.29510935e-16, -4677501.24, 1242.081216]] },
    "N": { N: 1, O: 0, E: 0, a: [
      [0.0, 0.0, 2.5, 0.0, 0.0, 0.0, 0.0, 56104.6378, 4.193905036],
      [88765.0138, -107.12315, 2.362188287, 0.0002916720081, -1.7295151e-07, 4.01265788e-11, -2.677227571e-15, 56973.5133, 4.865231506],
      [547518105.0, -310757.498, 69.1678274, -0.00684798813, 3.8275724e-07, -1.098367709e-11, 1.277986024e-16, 2550585.618, -584.8769753]] },
    "O": { N: 0, O: 1, E: 0, a: [
      [-7953.6113, 160.7177787, 1.966226438, 0.00101367031, -1.110415423e-06, 6.5175075e-10, -1.584779251e-13, 28403.62437, 8.40424182],
      [261902.0262, -729.872203, 3.31717727, -0.000428133436, 1.036104594e-07, -9.43830433e-12, 2.725038297e-16, 33924.2806, -0.667958535],
      [177900426.4, -108232.8257, 28.10778365, -0.002975232262, 1.854997534e-07, -5.79623154e-12, 7.191720164e-17, 889094.263, -218.1728151]] },
    "N2+": { N: 2, O: 0, E: -1, a: [
      [-34740.4747, 269.6222703, 3.16491637, -0.002132239781, 6.7304764e-06, -5.63730497e-09, 1.621756e-12, 179000.4424, 6.832974166],
      [-2845599.002, 7058.89303, -2.884886385, 0.003068677059, -4.36165231e-07, 2.102514545e-11, 5.41199647e-16, 134038.8483, 50.90897022],
      [-371282977.0, 313928.7234, -96.0351805, 0.01571193286, -1.175065525e-06, 4.14444123e-11, -5.62189309e-16, -2217361.867, 843.6270947]] },
    "O2+": { N: 0, O: 2, E: -1, a: [
      [-86072.0545, 1051.875934, -0.543238047, 0.00657116654, -3.27426375e-06, 5.94064534e-11, 3.23878479e-13, 134554.4668, 29.0270975],
      [73846.5488, -845.955954, 4.98516416, -0.000161101089, 6.42708399e-08, -1.504939874e-11, 1.578465409e-15, 144632.1044, -5.81123065],
      [-1562125524.0, 1161406.778, -330.250472, 0.0471093752, -3.35446138e-06, 1.167968599e-10, -1.589754791e-15, -8857866.27, 2852.035602]] },
    "NO+": { N: 1, O: 1, E: -1, a: [
      [1398.106635, -159.0446941, 5.1228954, -0.00639438862, 1.123918342e-05, -7.98858126e-09, 2.107383677e-12, 118749.5132, -4.39843381],
      [606987.69, -2278.395427, 6.08032467, -0.000606684758, 1.432002611e-07, -1.747990522e-11, 8.93501406e-16, 132270.9615, -15.19880037],
      [2676400347.0, -1832948.69, 509.924939, -0.0711381928, 5.31765988e-06, -1.963208212e-10, 2.80526823e-15, 14433089.39, -4324.044462]] },
    "N+": { N: 1, O: 0, E: -1, a: [
      [5237.07921, 2.299958315, 2.487488821, 2.737490756e-05, -3.134447576e-08, 1.850111332e-11, -4.447350984e-15, 225628.4738, 5.076830786],
      [290497.0374, -855.790861, 3.47738929, -0.000528826719, 1.352350307e-07, -1.389834122e-11, 5.046166279e-16, 231080.9984, -1.994146545],
      [16460921.48, -11131.65218, 4.97698664, -0.0002005393583, 1.022481356e-08, -2.691430863e-13, 3.539931593e-18, 313628.4696, -17.0664638]] },
    "O+": { N: 0, O: 1, E: -1, a: [
      [0.0, 0.0, 2.5, 0.0, 0.0, 0.0, 0.0, 187935.2842, 4.39337676],
      [-216651.3208, 666.545615, 1.702064364, 0.000471499281, -1.427131823e-07, 2.016595903e-11, -9.107157762e-16, 183719.1966, 10.05690382],
      [-214383538.3, 146951.8523, -36.8086454, 0.00503616454, -3.087873854e-07, 9.18683487e-12, -1.074163268e-16, -961420.896, 342.619308]] },
    "e-": { N: 0, O: 0, E: 1, a: [
      [0.0, 0.0, 2.5, 0.0, 0.0, 0.0, 0.0, -745.375, -11.72081224],
      [0.0, 0.0, 2.5, 0.0, 0.0, 0.0, 0.0, -745.375, -11.72081224],
      [0.0, 0.0, 2.5, 0.0, 0.0, 0.0, 0.0, -745.375, -11.72081224]] },  };
  const MW = { N: 14.0067e-3, O: 15.9994e-3, E: 5.48579909e-7 }; // kg/mol
  const SP = Object.keys(SPECIES).map(name => {
    const s = SPECIES[name];
    return { name, ...s, M: s.N * MW.N + s.O * MW.O + s.E * MW.E, ion: s.E !== 0 };
  });
  const iN = SP.findIndex(s => s.name === "N"), iO = SP.findIndex(s => s.name === "O"), iE = SP.findIndex(s => s.name === "e-");
  const coef = (s, T) => s.a[T < 1000 ? 0 : T < 6000 ? 1 : 2];
  const nasa = {
    cp_R(s, T) { const a = coef(s, T); return a[0] / (T * T) + a[1] / T + a[2] + a[3] * T + a[4] * T * T + a[5] * T ** 3 + a[6] * T ** 4; },
    h_RT(s, T) { const a = coef(s, T); return -a[0] / (T * T) + a[1] * Math.log(T) / T + a[2] + a[3] * T / 2 + a[4] * T * T / 3 + a[5] * T ** 3 / 4 + a[6] * T ** 4 / 5 + a[7] / T; },
    s_R(s, T) { const a = coef(s, T); return -a[0] / (2 * T * T) - a[1] / T + a[2] * Math.log(T) + a[3] * T + a[4] * T * T / 2 + a[5] * T ** 3 / 3 + a[6] * T ** 4 / 4 + a[8]; },
  };
  const AIR_NO = 0.79 / 0.21; // N atoms per O atom

  // Equilibrium composition at T [K], p [Pa]. Unknowns: ln(p_N/p°), ln(p_O/p°); electrons from charge neutrality.
  let warm = null;
  function equilibrium(T, p, ratio = AIR_NO) {
    const g = SP.map(s => nasa.h_RT(s, T) - nasa.s_R(s, T));      // g°/RT
    // ln K for forming each species from N, O atoms and electrons:  ln p_i = lnK_i + N u + O v + E w
    const lnK = SP.map((s, i) => -(g[i] - s.N * g[iN] - s.O * g[iO] - s.E * g[iE]));
    const lp = Math.log(p / PSTD);
    const pp = (u, v) => {
      // charge balance: p_e = Σ cations, each p_c = exp(lnK + N u + O v − w) → p_e² = Σ exp(lnK + N u + O v)
      let m = -Infinity;
      const t = SP.map((s, i) => (s.E < 0 ? lnK[i] + s.N * u + s.O * v : -Infinity));
      t.forEach(x => { if (x > m) m = x; });
      const w = m === -Infinity ? -Infinity : 0.5 * (m + Math.log(t.reduce((acc, x) => acc + Math.exp(x - m), 0)));
      return SP.map((s, i) => (i === iE ? w : lnK[i] + s.N * u + s.O * v + (s.E ? s.E * w : 0)));
    };
    const resid = (u, v) => {
      const L = pp(u, v), P = L.map(Math.exp);
      let tot = 0, nN = 0, nO = 0;
      P.forEach((x, i) => { tot += x; nN += SP[i].N * x; nO += SP[i].O * x; });
      return [Math.log(tot) - lp, Math.log(nN / nO) - Math.log(ratio), L];
    };
    // initial guess: the smaller of the "all molecules" and "all atoms" estimates, or the last solution
    const xN = ratio / (1 + ratio), xO = 1 / (1 + ratio);
    const iN2 = 0, iO2 = 1;
    let u = Math.min(0.5 * (Math.log(xN * p / PSTD) - lnK[iN2]), Math.log(xN * p / PSTD));
    let v = Math.min(0.5 * (Math.log(xO * p / PSTD) - lnK[iO2]), Math.log(xO * p / PSTD));
    if (warm && Math.abs(warm.T - T) < 0.05 * T && Math.abs(Math.log(warm.p / p)) < 0.3) { u = warm.u + 0.5 * Math.log(p / warm.p); v = warm.v + 0.5 * Math.log(p / warm.p); }
    let r = resid(u, v);
    for (let it = 0; it < 200; it++) {
      const e = 1e-7, ru = resid(u + e, v), rv = resid(u, v + e);
      const J = [[(ru[0] - r[0]) / e, (rv[0] - r[0]) / e], [(ru[1] - r[1]) / e, (rv[1] - r[1]) / e]];
      const det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
      let du = -(r[0] * J[1][1] - r[1] * J[0][1]) / det, dv = -(J[0][0] * r[1] - J[1][0] * r[0]) / det;
      const big = Math.max(Math.abs(du), Math.abs(dv));
      if (big > 2) { du *= 2 / big; dv *= 2 / big; }
      // backtracking on the residual norm
      const n0 = Math.hypot(r[0], r[1]);
      let lam = 1, rn;
      for (let k = 0; k < 30; k++) { rn = resid(u + lam * du, v + lam * dv); if (Math.hypot(rn[0], rn[1]) < n0 || lam < 1e-4) break; lam /= 2; }
      u += lam * du; v += lam * dv; r = rn;
      if (Math.hypot(r[0], r[1]) < 1e-13 || Math.abs(lam * big) < 1e-14) break;
    }
    warm = { T, p, u, v };
    const P = r[2].map(Math.exp), tot = P.reduce((a, b) => a + b, 0);
    const x = P.map(q => q / tot);
    return mixture(T, p, x);
  }
  // Mixture properties for mole fractions x (array in SP order)
  function mixture(T, p, x) {
    let M = 0, h = 0, s = 0, cpf = 0;
    SP.forEach((sp, i) => {
      if (!(x[i] > 0)) return;
      M += x[i] * sp.M;
      h += x[i] * nasa.h_RT(sp, T);
      cpf += x[i] * nasa.cp_R(sp, T);
      s += x[i] * (nasa.s_R(sp, T) - Math.log(Math.max(x[i] * p / PSTD, 1e-300)));
    });
    const R = RU / M, hm = h * RU * T / M, h0K = hm + H0_OFFSET; // enthalpy measured from cold air at 0 K
    const X = {}; SP.forEach((sp, i) => { X[sp.name] = x[i]; });
    return {
      T, p, x: X, xa: x, M, R, rho: p / (R * T), h: hm, e: hm - R * T, s: s * RU / M,
      Z: AIR_M / M, cpFrozen: cpf * RU / M, gammaFrozen: cpf / (cpf - 1), gammaEff: h0K / (h0K - R * T), h0K,
    };
  }
  const AIR_M = 0.79 * SP[0].M + 0.21 * SP[1].M;
  // H°(298.15) − H°(0) of N2 and O2 (8.670 and 8.683 kJ/mol, JANAF), per kg of air: shifts h to a 0 K origin for γ̃ = h/e
  const H0_OFFSET = (0.79 * 8670 + 0.21 * 8683) / AIR_M;
  // Cold (frozen) air at temperature T: only N2 and O2
  function coldAir(T, p) { const x = SP.map(() => 0); x[0] = 0.79; x[1] = 0.21; return mixture(T, p, x); }
  // T from (h, p) in equilibrium
  function eqT_hp(h, p, Tguess) {
    const f = T => equilibrium(T, p).h - h;
    let a = Math.max(150, (Tguess || 1000) * 0.7), b = Math.min(30000, (Tguess || 1000) * 1.4);
    if (f(a) > 0) a = 150;
    if (f(b) < 0) b = 30000;
    const T = illinois(f, a, b, 1e-11);
    return equilibrium(T, p);
  }
  // State from (h, s): used for isentropic stagnation of an equilibrium flow
  function eqState_hs(h, s, pGuess) {
    let T = 3000;
    const f = lnp => { const st = eqT_hp(h, Math.exp(lnp), T); T = st.T; return st.s - s; };
    const l0 = Math.log(pGuess || 1e5);
    let a = l0 - 1, b = l0 + 1;
    for (let k = 0; k < 30 && f(a) < 0; k++) a -= 1;
    for (let k = 0; k < 30 && f(b) > 0; k++) b += 1;
    const lp = illinois(f, a, b, 1e-12);
    return eqT_hp(h, Math.exp(lp), T);
  }
  // Equilibrium speed of sound: a_e² = (∂p/∂ρ)_s
  function eqSoundSpeed(st) {
    const dp = st.p * 1e-4;
    const s2 = eqState_hs(st.h + dp / st.rho, st.s, st.p + dp); // dh = dp/ρ at constant s
    return Math.sqrt(dp / (s2.rho - st.rho));
  }

  // Normal shock in equilibrium air. Upstream: velocity u1, p1, T1 (cold air). (Anderson, HTGD §14.)
  function eqNormalShock(u1, p1, T1) {
    const s1 = coldAir(T1, p1), rho1 = s1.rho, h1 = s1.h;
    let eps = 0.1, st = null, T = 2000;
    for (let it = 0; it < 200; it++) {
      const p2 = p1 + rho1 * u1 * u1 * (1 - eps), h2 = h1 + 0.5 * u1 * u1 * (1 - eps * eps);
      st = eqT_hp(h2, p2, T); T = st.T;
      const en = rho1 / st.rho;
      if (Math.abs(en - eps) < 1e-11) { eps = en; break; }
      eps = 0.5 * eps + 0.5 * en;
    }
    const u2 = u1 * eps, h0 = st.h + 0.5 * u2 * u2;
    const stag = eqState_hs(h0, st.s, st.p * (1 + 0.5 * st.rho * u2 * u2 / st.p));
    const a1 = Math.sqrt(1.4 * s1.R * T1);
    return { u1, p1, T1, rho1, M1: u1 / a1, h1, eps, u2, T2: st.T, p2: st.p, rho2: st.rho, state2: st, h0, stag, p02: stag.p, T02: stag.T };
  }
  // Same upstream state, calorically perfect air (γ = 1.4) for comparison
  function perfectNormalShock(u1, p1, T1, g = 1.4) {
    const a1 = Math.sqrt(g * R_AIR * T1), M1 = u1 / a1, ns = normalShock(M1, g);
    return { M1, T2: T1 * ns.T2_T1, p2: p1 * ns.p2_p1, eps: 1 / ns.rho2_rho1, u2: u1 / ns.rho2_rho1, p02: p1 * ns.p02_p1, T02: T1 * isen.T0_T(M1, g) };
  }
  // Molecular vibration (harmonic oscillator) for teaching: characteristic temperatures, K
  const THETA_V = { N2: 3393.5, O2: 2273.5, NO: 2739.7 };
  const vib = {
    e_RT: (T, th) => (th / T) / (Math.exp(th / T) - 1),
    cv_R: (T, th) => 2.5 + ((th / T) ** 2 * Math.exp(th / T)) / (Math.exp(th / T) - 1) ** 2,
  };
  // Millikan & White (1963) vibrational relaxation time, p in atm: p τ = exp[A(T^-1/3 − 0.015 μ^1/4) − 18.42] atm·s
  function millikanWhite(T, pAtm, mu = 14.0, thetaV = 3393.5) {
    const A = 1.16e-3 * Math.sqrt(mu) * Math.pow(thetaV, 4 / 3);
    return Math.exp(A * (Math.pow(T, -1 / 3) - 0.015 * Math.pow(mu, 0.25)) - 18.42) / pAtm;
  }

  // =====================================================================================
  // 4. Viscous hypersonic flow and aeroheating
  // =====================================================================================
  // Sutton & Graves (1971) stagnation-point convective heating, cold wall: q = k √(ρ∞/Rn) V∞³, W/m²
  const SG_K = 1.7415e-4; // kg^0.5 / m, Earth air
  const suttonGraves = (rho, V, Rn, k = SG_K) => k * Math.sqrt(rho / Rn) * V * V * V;
  // Hot-wall correction (1 − h_w/h_0), with h ≈ c_p T for the wall and h_0 = c_p T∞ + V²/2
  const hotWall = (V, Tinf, Tw, cp = 1004.5) => Math.max(0, 1 - (cp * Tw) / (cp * Tinf + 0.5 * V * V));
  // Radiation-adiabatic wall temperature: the wall radiates away exactly what convection brings in.
  //   ε σ Tw⁴ = q_cw(1 − h_w/h_0) / (1 − h_cold/h_0)   (Hirschel & Weiland's "radiation-adiabatic temperature")
  function radiationAdiabatic(qcw, eps, V, Tinf, Tcold = 300, cp = 1004.5) {
    const ref = hotWall(V, Tinf, Tcold, cp);
    return bisect(Tw => eps * SIGMA * Tw ** 4 - qcw * hotWall(V, Tinf, Tw, cp) / ref, 1, 2e4);
  }
  // Blasius solution f''' + ½ f f'' = 0 (η = y √(U/νx)); tabulated once.
  const BLASIUS = (() => {
    const h = 0.002, out = [];
    let y = [0, 0, 0.332057336], eta = 0;
    const f = (t, v) => [v[1], v[2], -0.5 * v[0] * v[2]];
    while (eta <= 10 + 1e-9) { out.push([eta, y[0], y[1], y[2]]); y = rk4(f, y, eta, h); eta += h; }
    return out;
  })();
  // Laminar compressible flat-plate boundary layer by Eckert's reference-temperature method.
  //   o: { Me, Te, pe, Tw, x, gamma, Pr, R, regime: "laminar"|"turbulent", cone: bool (Mangler) }
  function refTemp(o) {
    const g = o.gamma || 1.4, Pr = o.Pr || 0.71, R = o.R || R_AIR, cp = g * R / (g - 1);
    const ue = o.Me * Math.sqrt(g * R * o.Te), rhoe = o.pe / (R * o.Te), mue = GD.sutherland(o.Te);
    const turb = o.regime === "turbulent";
    const r = turb ? Math.cbrt(Pr) : Math.sqrt(Pr);
    const Taw = o.Te * (1 + r * 0.5 * (g - 1) * o.Me * o.Me);
    const Ts = o.Te * (1 + 0.032 * o.Me * o.Me + 0.58 * (o.Tw / o.Te - 1));
    const rhos = o.pe / (R * Ts), mus = GD.sutherland(Ts), Rex = rhoe * ue * o.x / mue, Rexs = rhos * ue * o.x / mus;
    let Cfs = turb ? 0.0592 * Math.pow(Rexs, -0.2) : 0.664 / Math.sqrt(Rexs);
    if (o.cone) Cfs *= turb ? 1.15 : Math.sqrt(3);
    const tau = 0.5 * rhos * ue * ue * Cfs, Sts = 0.5 * Cfs * Math.pow(Pr, -2 / 3);
    const q = rhos * ue * cp * (Taw - o.Tw) * Sts;
    // Laminar thickness: Blasius in Dorodnitsyn variables with Crocco–Busemann temperature and C* = ρ*μ*/(ρe μe)
    const C = (rhos * mus) / (rhoe * mue);
    let I = 0, eta99 = 0;
    for (let i = 1; i < BLASIUS.length; i++) {
      const [e1, , u1] = BLASIUS[i - 1], [e2, , u2] = BLASIUS[i];
      const Tr = u => o.Tw / o.Te + (Taw - o.Tw) / o.Te * u - r * 0.5 * (g - 1) * o.Me * o.Me * u * u;
      I += 0.5 * (Tr(u1) + Tr(u2)) * (e2 - e1);
      if (u2 >= 0.99) { eta99 = e2; break; }
    }
    let delta = Math.sqrt(C * (mue / rhoe) * o.x / ue) * I;
    if (o.cone) delta /= Math.sqrt(3);
    return {
      ue, rhoe, mue, Rex, Rexs, Ts, Taw, Cf_star: Cfs, Cf_edge: tau / (0.5 * rhoe * ue * ue), tau, St_edge: q / (rhoe * ue * cp * (Taw - o.Tw)), q,
      delta: turb ? NaN : delta, eta99, chiBar: o.Me ** 3 * Math.sqrt(C / Rex),
      fMack: turb ? NaN : ue / (2 * delta),  // second-mode estimate: wavelength ≈ 2δ
    };
  }
  // Viscous interaction on an insulated flat plate (γ = 1.4): induced pressure (Anderson, HTGD §7)
  const viscousInteraction = {
    weak: chi => 1 + 0.31 * chi + 0.05 * chi * chi,
    strong: chi => 0.514 * chi + 0.759,
  };

  // =====================================================================================
  // 5. Atmospheric entry
  // =====================================================================================
  const EARTH = { mu: 3.986004418e14, R: 6371000 };
  // Allen–Eggers ballistic entry in an exponential atmosphere (straight-line, gravity neglected)
  function allenEggers(o) { // o: { VE, gammaE (rad, > 0 downward), beta (kg/m²), H (m), rho0 }
    const H = o.H || 7200, rho0 = o.rho0 || 1.225, sg = Math.sin(o.gammaE);
    const V = h => o.VE * Math.exp(-(rho0 * H / (2 * o.beta * sg)) * Math.exp(-h / H));
    const decel = h => { const r = rho0 * Math.exp(-h / H), v = V(h); return r * v * v / (2 * o.beta); };
    const hAt = rho => -H * Math.log(rho / rho0);
    return {
      V, decel, aMax: o.VE * o.VE * sg / (2 * Math.E * H), hAmax: hAt(o.beta * sg / H), VAmax: o.VE * Math.exp(-0.5),
      hQmax: hAt(o.beta * sg / (3 * H)), VQmax: o.VE * Math.exp(-1 / 6),
    };
  }
  // Planar 3-DOF entry over a spherical, non-rotating Earth with lift (constant L/D and bank angle).
  //   o: { h0, V0, gamma0Deg (negative = descending), beta (m/(CD A)), LD, bankDeg, Rn, dt, hEnd, Vend }
  function entry(o) {
    const mu = EARTH.mu, Re = EARTH.R, cb = Math.cos((o.bankDeg || 0) * DEG), LD = o.LD || 0;
    const f = (t, y) => {
      const [V, gam, h] = y, r = Re + h, g = mu / (r * r), atm = atmosphere(h);
      const D = 0.5 * atm.rho * V * V / o.beta; // per unit mass
      return [-D - g * Math.sin(gam), (LD * D * cb) / V - (g / V - V / r) * Math.cos(gam), V * Math.sin(gam), (V * Math.cos(gam) * Re) / r];
    };
    let y = [o.V0, (o.gamma0Deg || 0) * DEG, o.h0, 0], t = 0;
    const dt = o.dt || 0.1, hist = [];
    let Q = 0, qmax = 0, nmax = 0, qdynMax = 0, skipped = false, minH = o.h0;
    const rec = () => {
      const [V, gam, h, s] = y, atm = atmosphere(h), qdyn = 0.5 * atm.rho * V * V;
      const n = (qdyn / o.beta) * Math.sqrt(1 + LD * LD) / G0;
      const q = suttonGraves(atm.rho, V, o.Rn || 1);
      return { t, V, gamma: gam, h, s, M: V / atm.a, qdyn, n, q, Q, rho: atm.rho };
    };
    hist.push(rec());
    for (let i = 0; i < 200000; i++) {
      const q1 = hist[hist.length - 1].q;
      y = rk4(f, y, t, dt); t += dt;
      const r = rec();
      Q += 0.5 * (q1 + r.q) * dt; r.Q = Q;
      qmax = Math.max(qmax, r.q); nmax = Math.max(nmax, r.n); qdynMax = Math.max(qdynMax, r.qdyn);
      minH = Math.min(minH, r.h);
      if (i % 5 === 0) hist.push(r);
      if (r.h > o.h0 + 1000 && r.gamma > 0) { skipped = true; hist.push(r); break; }
      if (r.h <= (o.hEnd || 0) || r.V <= (o.Vend || 200)) { hist.push(r); break; }
    }
    return { hist, Q, qmax, nmax, qdynMax, tf: t, skipped, range: y[3] };
  }
  // Equilibrium glide: range from V0 to Vf for constant L/D (Anderson, HTGD; Vinh). V_c² = g r
  function glideRange(V0, Vf, LD, r = EARTH.R, g = G0) {
    return 0.5 * r * LD * Math.log((g * r - Vf * Vf) / (g * r - V0 * V0));
  }

  // =====================================================================================
  // 6. Air-breathing propulsion (ideal and component-efficiency Brayton cycles)
  // =====================================================================================
  const FUELS = {
    H2: { name: "hydrogen", hPR: 119.95e6, fst: 0.02916 },
    HC: { name: "hydrocarbon (JP-7 class)", hPR: 43.9e6, fst: 0.0676 },
  };
  // Altitude at which flight Mach M gives dynamic pressure q (constant-q trajectory)
  function altitudeForQ(M, q, g = 1.4) {
    const p = (2 * q) / (g * M * M);
    if (p > 101325) return 0;
    return bisect(z => atmosphere(z).p - p, 0, 150000, 0.01);
  }
  // Thermodynamic closed-cycle analysis of a ramjet/scramjet (after Heiser & Pratt, Hypersonic Airbreathing Propulsion, ch. 5).
  //   o: { M0, T0, p0, psi (T3/T0) or M3 (burner-entry Mach), etac, etab, etae, phi, fuel: "H2"|"HC", gc, gb, R }
  function brayton(o) {
    const gc = o.gc || 1.4, gb = o.gb || 1.3, R = o.R || R_AIR, cpc = gc * R / (gc - 1), cpb = gb * R / (gb - 1);
    const fuel = FUELS[o.fuel || "H2"], f = (o.phi === undefined ? 1 : o.phi) * fuel.fst;
    const a0 = Math.sqrt(gc * R * o.T0), V0 = o.M0 * a0, Tt0 = o.T0 * (1 + 0.5 * (gc - 1) * o.M0 * o.M0);
    let psi = o.psi;
    if (o.M3 !== undefined) psi = Tt0 / (1 + 0.5 * (gc - 1) * o.M3 * o.M3) / o.T0;
    const T3 = psi * o.T0, V3sq = V0 * V0 + 2 * cpc * (o.T0 - T3);
    if (!(V3sq > 0)) return { error: "ψ is larger than the total-temperature ratio: the flow would stop before the burner." };
    const V3 = Math.sqrt(V3sq), M3 = V3 / Math.sqrt(gc * R * T3);
    const etac = o.etac === undefined ? 1 : o.etac, etab = o.etab === undefined ? 1 : o.etab, etae = o.etae === undefined ? 1 : o.etae;
    const p3_p0 = Math.pow(psi / (psi * (1 - etac) + etac), cpc / R);
    const V4 = V3 / (1 + f);
    const T4 = ((cpc * T3 + 0.5 * V3 * V3 + etab * f * fuel.hPR) / (1 + f) - 0.5 * V4 * V4) / cpb;
    const M4 = V4 / Math.sqrt(gb * R * T4);
    const T10 = T4 * (1 - etae * (1 - Math.pow(1 / p3_p0, R / cpb)));
    const V10 = Math.sqrt(V4 * V4 + 2 * cpb * (T4 - T10));
    const Fm = (1 + f) * V10 - V0;
    const Isp = Fm / (f * G0);
    const etaO = (Fm * V0) / (f * fuel.hPR);  // overall efficiency
    return { V0, a0, Tt0, psi, T3, V3, M3, p3_p0, f, T4, V4, M4, T10, V10, Fm, Isp, etaO, TSFC: f / Fm, mode: M3 < 1 ? "ramjet (subsonic combustion)" : "scramjet (supersonic combustion)" };
  }
  // Ideal turbojet (Mattingly, Elements of Propulsion): πc compressor pressure ratio, Tt4 turbine-inlet limit
  function turbojetIdeal(M0, T0, pic, Tt4, hPR = 43.9e6, g = 1.4, R = R_AIR) {
    const cp = g * R / (g - 1), a0 = Math.sqrt(g * R * T0), tr = 1 + 0.5 * (g - 1) * M0 * M0;
    const tc = Math.pow(pic, (g - 1) / g), tl = Tt4 / T0;
    if (tr * tc >= tl) return null;
    const tt = 1 - (tr / tl) * (tc - 1);
    const V9a0 = Math.sqrt((2 / (g - 1)) * (tl / (tr * tc)) * (tr * tc * tt - 1));
    const Fm = a0 * (V9a0 - M0), f = (cp * T0 * (tl - tr * tc)) / hPR;
    return Fm > 0 ? { Fm, f, Isp: Fm / (f * G0) } : null;
  }

  // =====================================================================================
  // 7. Hypersonic ground-test facilities
  // =====================================================================================
  // Shock tube: driver (4) and driven (1) gases. Anderson, Modern Compressible Flow, ch. 7.
  function shockTubePressure(p2p1, g1, g4, a1a4) {
    const x = p2p1 - 1, inner = 1 - ((g4 - 1) * a1a4 * x) / Math.sqrt(2 * g1 * (2 * g1 + (g1 + 1) * x));
    return inner > 0 ? p2p1 * Math.pow(inner, (-2 * g4) / (g4 - 1)) : Infinity;
  }
  function shockTube(p4p1, g1 = 1.4, g4 = 1.4, a1a4 = 1) {
    const hi = bisect(y => (shockTubePressure(y, g1, g4, a1a4) === Infinity ? 1 : -1), 1 + 1e-9, 1e7); // asymptote
    const p2p1 = bisect(y => shockTubePressure(y, g1, g4, a1a4) - p4p1, 1 + 1e-12, isNaN(hi) ? 1e7 : hi * (1 - 1e-12));
    const Ms = Math.sqrt(1 + ((g1 + 1) / (2 * g1)) * (p2p1 - 1));
    const ns = normalShock(Ms, g1);
    const up_a1 = (1 / g1) * (p2p1 - 1) * Math.sqrt(((2 * g1) / (g1 + 1)) / (p2p1 + (g1 - 1) / (g1 + 1)));
    const T2T1 = ns.T2_T1, M2 = up_a1 / Math.sqrt(T2T1);
    // expanded driver gas, region 3 (p3 = p2)
    const p3p4 = p2p1 / p4p1, T3T4 = Math.pow(p3p4, (g4 - 1) / g4);
    // reflected shock at the end wall
    const k = (Ms / (Ms * Ms - 1)) * Math.sqrt(1 + ((2 * (g1 - 1)) / ((g1 + 1) ** 2)) * (Ms * Ms - 1) * (g1 + 1 / (Ms * Ms)));
    const MR = (1 + Math.sqrt(1 + 4 * k * k)) / (2 * k);  // MR/(MR²−1) = k
    const nr = normalShock(MR, g1);
    return {
      p4p1, p2p1, Ms, T2T1, rho2rho1: ns.rho2_rho1, up_a1, M2, p3p4, T3T4, MR,
      p5p2: nr.p2_p1, T5T2: nr.T2_T1, p5p1: p2p1 * nr.p2_p1, T5T1: T2T1 * nr.T2_T1,
      MsMax: isNaN(hi) ? Infinity : Math.sqrt(1 + ((g1 + 1) / (2 * g1)) * (hi - 1)),
    };
  }
  // Ludwieg tube: the tube Mach number Mt is set by the tube-to-throat area ratio (subsonic branch of A/A*);
  // a centred expansion runs up the tube and reflects from its closed end.
  function ludwieg(o) { // { L m, Ti K, pi Pa, AR (tube area / throat area) or Mt, g }
    const g = o.g || 1.4, a_i = Math.sqrt(g * R_AIR * o.Ti);
    const Mt = o.Mt !== undefined ? o.Mt : isen.M_from_A_Astar(o.AR, g, "sub");
    const aR = 1 / (1 + 0.5 * (g - 1) * Mt);              // a/a_i behind the expansion (u + 2a/(γ−1) constant)
    const p_pi = Math.pow(aR, (2 * g) / (g - 1)), T_Ti = aR * aR;
    const p0 = o.pi * p_pi * isen.p0_p(Mt, g), T0 = o.Ti * T_Ti * isen.T0_T(Mt, g);
    const a = a_i * aR, u = Mt * a;
    const t = o.L / a_i + o.L / (u + a);                 // head out at a_i, reflected head back at u + a
    return { Mt, p0, T0, p0_pi: p0 / o.pi, T0_Ti: T0 / o.Ti, t, u, a_i };
  }
  // Saturation pressure of nitrogen, used for the air-liquefaction limit: ln p linear in 1/T between the
  // triple point (63.151 K, 12.52 kPa), the normal boiling point (77.355 K, 101.325 kPa) and the critical point
  // (126.19 K, 3.3958 MPa); below the triple point, sublimation with ΔH_sub ≈ 6.8 kJ/mol (Clausius–Clapeyron).
  const N2SAT = [[63.151, 12520], [77.355, 101325], [126.19, 3.3958e6]];
  function pSatN2(T) {
    if (T < N2SAT[0][0]) return N2SAT[0][1] * Math.exp(-(6800 / RU) * (1 / T - 1 / N2SAT[0][0]));
    const [a, b] = T < N2SAT[1][0] ? [N2SAT[0], N2SAT[1]] : [N2SAT[1], N2SAT[2]];
    const s = (1 / T - 1 / a[0]) / (1 / b[0] - 1 / a[0]);
    return a[1] * Math.pow(b[1] / a[1], s);
  }
  // Minimum reservoir temperature that keeps the test-section static state above the N2 saturation line
  function minT0Liquefaction(M, p0, g = 1.4) {
    const p = p0 / isen.p0_p(M, g), Ts = bisect(T => pSatN2(T) - p, 20, 126);
    return { Tsat: Ts, T0min: Ts * isen.T0_T(M, g), p };
  }

  const HY = {
    RU, KB, NA, illinois, rk4,
    limits, hsd, CpMax, CpMaxLimit, flatPlateNewtonian, flatPlateExact,
    tmIntegrate, coneMax, cone, machFromVmax, newtonianBody, shapes,
    atmosphere, meanFreePath, US76_HIGH,
    SP, nasa, equilibrium, mixture, coldAir, eqT_hp, eqState_hs, eqSoundSpeed, eqNormalShock, perfectNormalShock, THETA_V, vib, millikanWhite, AIR_M,
    SG_K, suttonGraves, hotWall, radiationAdiabatic, BLASIUS, refTemp, viscousInteraction,
    EARTH, allenEggers, entry, glideRange,
    FUELS, altitudeForQ, brayton, turbojetIdeal,
    shockTubePressure, shockTube, ludwieg, pSatN2, minT0Liquefaction,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = HY;
  else root.HY = HY;
})(typeof window !== "undefined" ? window : globalThis);
