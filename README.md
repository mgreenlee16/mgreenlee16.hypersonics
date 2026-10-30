# Learn Hypersonics

Interactive lessons and calculators for compressible aerodynamics and hypersonics, by Michael Greenlee. Every figure is computed live in the browser from the exact relations for a calorically perfect gas. Change the Mach number, geometry or back pressure and the wave pattern, pressure distribution and forces update at once.

**Live site:** https://mgreenlee16.github.io/mgreenlee16.hypersonics/ (after GitHub Pages is enabled; see below)

## Contents

**Lessons**

| # | Lesson | Interactive figures |
|---|--------|---------------------|
| 1 | Compressible Flow & Isentropic Relations | compressibility error vs. M; isentropic ratios vs. M |
| 2 | Normal Shock Waves | shock jump diagram; entropy rise; supersonic Pitot probe |
| 3 | Nozzles, Diffusers & Choked Flow | converging–diverging nozzle at any back pressure; choking curve |
| 4 | Heat Addition & Friction in Ducts | Rayleigh and Fanno T–s diagrams; thermal and frictional choking |
| 5 | Oblique Shock Waves | wedge flow + θ–β–M chart; shock reflection (regular/Mach); multi-shock compression |
| 6 | Expansion Waves & Shock-Expansion Theory | Prandtl–Meyer fan; diamond/flat-plate airfoil vs. linear theory |
| 7 | Compressibility Corrections & Critical Mach | Prandtl–Glauert / Kármán–Tsien / Laitone and M_cr; swept wings; lift-curve slope |
| 8 | Supersonic Wind Tunnels | running tunnel, starting, run time, condensation, instrumentation |
| 9 | What Makes a Flow Hypersonic | velocity–altitude map with entry trajectories; hypersonic limits; similarity; Billig bow shock and entropy layer; viscous interaction |
| 10 | Newtonian Theory & Hypersonic Aerodynamics | modified Newtonian Cp; flat plate L/D; Taylor–Maccoll cones; capsule forces, trim and stability; bluntness |
| 11 | High-Temperature Gas Dynamics | vibration; 11-species equilibrium air; real-gas normal shock; relaxation; Shuttle pitching-moment anomaly |
| 12 | Hypersonic Boundary Layers & Aeroheating | reference-temperature heating; Sutton–Graves; radiation-adiabatic wall; second-mode frequency on cones; skin temperature in entry |
| 13 | Atmospheric Entry | Allen–Eggers vs simulation; equilibrium glide; entry corridor; heating trade-off; trajectory simulator |
| 14 | Hypersonic Air-Breathing Propulsion | ramjet vs scramjet; Heiser–Pratt cycle with T–s diagram; Isp vs Mach; flight corridor; inlets |
| 15 | Hypersonic Ground Testing | flight vs tunnel similarity; liquefaction; Ludwieg tube (BAM6QT-like); shock-tube x–t diagram; thin-film gauges |

**Calculators:** isentropic flow, normal shock, oblique shock, Prandtl–Meyer, Rayleigh flow, Fanno flow, the 1976 U.S. Standard Atmosphere, supersonic wind tunnel, conical flow (Taylor–Maccoll), Newtonian aerodynamics, equilibrium air and real-gas shock, aeroheating, entry trajectory, ramjet/scramjet cycle, and shock tube / Ludwieg tube / liquefaction. Each takes any one known quantity, and most can generate a table and download it as CSV.

## How it works

Plain HTML/CSS/JavaScript with no build step.

```
index.html, about.html
lessons/        one page per lesson
calculators/    one page per calculator
assets/js/gasdyn.js   compressible-flow physics (also loadable in Node for testing)
assets/js/hyper.js    hypersonic physics: Newtonian, cones, equilibrium air, heating, entry, propulsion, facilities
tests/validate.js     checks against published values: node tests/validate.js
assets/js/ui.js       top bar, γ selector, theme, plotting, lesson list
assets/js/calc.js     shared "enter any one quantity" calculator builder
assets/css/style.css
assets/vendor/katex/  KaTeX 0.16.9 for equations (MIT)
```

The γ in the top bar applies to every value on the page and is remembered between pages.

## Enabling GitHub Pages

1. Settings → Pages → Build and deployment.
2. Source: **Deploy from a branch**; Branch: **main**, folder **/ (root)**.
3. Save. The site appears at the URL above within a minute or two.

GitHub Pages on a private repository requires a paid GitHub plan; on a free plan, make the repository public first.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Accuracy

The functions reproduce the standard tables, e.g. for M = 2, γ = 1.4: p₀/p = 7.824, A/A* = 1.688; normal shock p₀₂/p₀₁ = 0.7209; θ = 10° → β = 39.31° (weak); θ_max = 22.97°; ν = 26.38°; Fanno 4fL*/D = 0.3050.

## License

Code: MIT (see `LICENSE`). Text and figures: CC BY 4.0. Hypersonics references include Hirschel & Weiland, *Selected Aerothermodynamic Design Problems of Hypersonic Flight Vehicles*; Anderson, *Hypersonic and High-Temperature Gas Dynamics*; Heiser & Pratt, *Hypersonic Airbreathing Propulsion*. Format inspired by Kursat Kara's open *Fundamentals of Aerodynamics* course site.
