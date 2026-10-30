/*
 * calc.js — builds "enter any one quantity" calculators.
 *   Calc.build("#el", {
 *     modes: [{ key, label, solve(value, g) -> state | null, value }],
 *     results(state, g) -> [[label, number], ...],
 *     table: { head: [...], row(M, g) -> [...], from, to, step }   (optional)
 *   })
 */
(function () {
  "use strict";
  function build(target, cfg) {
    const el = document.querySelector(target);
    const id = el.id;
    el.classList.add("calc");
    el.innerHTML = `${cfg.title ? `<h3>${cfg.title}</h3>` : ""}
      <div class="inputs">
        <label>Known quantity<select id="${id}-mode">${cfg.modes.map(m => `<option value="${m.key}">${m.label}</option>`).join("")}</select></label>
        <label>Value<input type="number" id="${id}-val" step="any"></label>
        ${cfg.extra || ""}
      </div>
      <div class="err" id="${id}-err"></div>
      <div class="results" id="${id}-out"></div>
      ${cfg.table ? `<details><summary>Generate a table</summary>
        <div class="inputs" style="margin-top:.5rem">
          <label>From M<input type="number" id="${id}-t0" value="${cfg.table.from}" step="any"></label>
          <label>To M<input type="number" id="${id}-t1" value="${cfg.table.to}" step="any"></label>
          <label>Step<input type="number" id="${id}-ts" value="${cfg.table.step}" step="any"></label>
          <button id="${id}-csv">Download CSV</button>
        </div><div class="tablewrap" id="${id}-tab"></div></details>` : ""}`;
    const modeSel = el.querySelector(`#${id}-mode`), inp = el.querySelector(`#${id}-val`);
    const setDefault = () => { inp.value = cfg.modes.find(m => m.key === modeSel.value).value; };
    setDefault();
    const run = () => {
      const g = UI.gamma(), m = cfg.modes.find(x => x.key === modeSel.value), v = parseFloat(inp.value);
      const err = el.querySelector(`#${id}-err`), out = el.querySelector(`#${id}-out`);
      let st = null;
      try { st = isFinite(v) ? m.solve(v, g, el) : null; } catch (e) { st = null; }
      if (!st || (typeof st === "object" && st.error)) {
        err.textContent = (st && st.error) || m.hint || "No solution for this value. Check that it lies in the valid range.";
        out.innerHTML = ""; return;
      }
      err.textContent = "";
      UI.table(out, ["Quantity", "Value"], cfg.results(st, g, el));
    };
    const rows = () => {
      const g = UI.gamma(), a = parseFloat(el.querySelector(`#${id}-t0`).value), b = parseFloat(el.querySelector(`#${id}-t1`).value), s = parseFloat(el.querySelector(`#${id}-ts`).value);
      const out = [];
      if (!(s > 0) || !(b >= a)) return out;
      for (let M = a, n = 0; M <= b + s * 1e-6 && n < 2000; M += s, n++) out.push(cfg.table.row(+M.toFixed(10), g));
      return out;
    };
    const runTable = () => { if (cfg.table) UI.table(el.querySelector(`#${id}-tab`), cfg.table.head, rows()); };
    modeSel.addEventListener("change", () => { setDefault(); run(); });
    [inp].concat(cfg.extraIds ? cfg.extraIds.map(x => el.querySelector("#" + x)) : []).forEach(x => x.addEventListener("input", run));
    if (cfg.extraIds) cfg.extraIds.forEach(x => el.querySelector("#" + x).addEventListener("change", run));
    if (cfg.table) {
      ["t0", "t1", "ts"].forEach(k => el.querySelector(`#${id}-${k}`).addEventListener("input", runTable));
      el.querySelector(`#${id}-csv`).addEventListener("click", () => {
        const fmt = v => (typeof v === "number" ? v.toPrecision(6) : String(v));
        const csv = [cfg.table.head.join(",")].concat(rows().map(r => r.map(fmt).join(","))).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = (cfg.table.name || id) + `_gamma${UI.gamma()}.csv`;
        a.click();
      });
    }
    UI.onGamma(() => { run(); runTable(); });
    run(); runTable();
  }
  window.Calc = { build };
})();
