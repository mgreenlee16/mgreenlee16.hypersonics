/*
 * validate.js — checks the physics in gasdyn.js and hyper.js against published values.
 * Run:  node tests/validate.js
 */
"use strict";
const GD = require("../assets/js/gasdyn.js"), HY = require("../assets/js/hyper.js");
const D = Math.PI / 180;
let fails = 0, n = 0;
function check(name, got, want, tol) {
  n++;
  const ok = Math.abs(got - want) <= tol * Math.abs(want || 1);
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}: ${+got.toPrecision(6)} (expected ${want}, ±${(tol * 100).toPrecision(2)}%)`);
}

// --- compressible-flow tables (NACA 1135), unchanged library
check("p0/p at M=2", GD.isen.p0_p(2, 1.4), 7.824, 1e-3);
check("normal shock p02/p01 at M=2", GD.normalShock(2, 1.4).p02_p01, 0.7209, 1e-3);

// --- Newtonian theory
check("Cp,max limit, γ=1.4", HY.CpMaxLimit(1.4), 1.839, 1e-3);
check("Newtonian sphere CD (Cp0=2)", HY.newtonianBody(HY.shapes.sphere(1), 0).CD, 1.0, 1e-6);
check("Newtonian 10° cone CA", HY.newtonianBody(HY.shapes.cone(10 * D, 1), 0).CA, 2 * Math.sin(10 * D) ** 2, 1e-9);
{ const a = 5 * D, d = 10 * D, r = HY.newtonianBody(HY.shapes.cone(d, 1), a);
  check("Newtonian cone CN at α=5° (closed form)", r.CN, 2 * Math.cos(d) ** 2 * Math.sin(a) * Math.cos(a), 1e-6); }

// --- Taylor–Maccoll (NACA 1135 cone charts)
check("cone M=2, 10°: shock angle", HY.cone(2, 10 * D, 1.4).beta / D, 31.2, 3e-3);
check("cone M=2, 20°: shock angle", HY.cone(2, 20 * D, 1.4).beta / D, 37.8, 3e-3);
check("max cone angle, M=2", HY.coneMax(2, 1.4).thetaC / D, 40.7, 5e-3);
check("max cone angle, M→∞", HY.coneMax(50, 1.4).thetaC / D, 57.6, 5e-3);

// --- hypersonic small-disturbance theory approaches the exact wedge result
check("HSD β, M=10, θ=10°", HY.hsd.beta_theta(10 * 10 * D, 1.4) * 10, GD.obliqueShock(10, 10 * D, 1.4).beta / D, 0.015);

// --- equilibrium air (compared against Cantera 3.2 airNASA9 to <1e-5 with the same reference pressure)
{ const s = HY.equilibrium(5000, 101325);
  check("eq. air 5000 K, 1 atm: x_O", s.x.O, 0.3238, 2e-3);
  check("eq. air 5000 K, 1 atm: x_N", s.x.N, 0.0261, 1e-2); }
{ const a = HY.atmosphere(52000), s = HY.eqNormalShock(11000, a.p, a.T), pf = HY.perfectNormalShock(11000, a.p, a.T);
  check("eq. normal shock, 11 km/s at 52 km: T2 (Anderson ≈ 11,600 K)", s.T2, 11600, 0.02);
  check("perfect-gas T2 at the same conditions (≈ 58,000 K)", pf.T2, 58000, 0.02); }

// --- atmosphere above 86 km (US 1976 tables)
check("density at 100 km", HY.atmosphere(100000).rho, 5.604e-7, 1e-3);
check("density at 120 km", HY.atmosphere(120000).rho, 2.222e-8, 1e-3);

// --- boundary layers: incompressible limit of the reference-temperature method
{ const r = HY.refTemp({ Me: 0.01, Te: 300, pe: 1e5, Tw: 300, x: 1 });
  check("Blasius δ99 √Re/x", r.delta * Math.sqrt(r.Rex), 4.91, 3e-3);
  check("Blasius Cf √Re", r.Cf_edge * Math.sqrt(r.Rex), 0.664, 1e-3); }

// --- entry: Allen–Eggers closed form
{ const ae = HY.allenEggers({ VE: 7000, gammaE: 20 * D, beta: 5000, H: 7200 });
  check("Allen–Eggers V at max deceleration = VE e^-1/2", ae.VAmax, 7000 * Math.exp(-0.5), 1e-12); }
check("equilibrium-glide range, 7.6 km/s → 0.3 km/s, L/D = 1 (km)", HY.glideRange(7600, 300, 1) / 1000, 8225, 2e-3);

// --- facilities
{ const st = HY.shockTube(10), g = 1.4, u3 = (2 / (g - 1)) * (1 - Math.pow(st.p3p4, (g - 1) / (2 * g)));
  check("shock tube contact surface: u3 = u2", u3, st.up_a1, 1e-6); }
check("N2 normal boiling point", HY.pSatN2(77.355), 101325, 1e-6);
check("Mach 6, p0 = 1 MPa: minimum T0 against liquefaction (K)", HY.minT0Liquefaction(6, 1e6).T0min, 421, 0.01);

console.log(`\n${n - fails} of ${n} checks passed`);
process.exit(fails ? 1 : 0);
