/* ===========================================================
   Evening Brewing Handover — app logic
   No build step, no backend: everything runs client-side.
   A local draft is kept in this browser (localStorage) so an
   accidental refresh doesn't lose work in progress.
=========================================================== */
(() => {
  "use strict";

  const BRAND = {
    mint:   "#47D7AC",
    orange: "#FDAA63",
    purple: "#7566A0",
    sky:    "#99D6EA",
    ink:    "#000000",
    pale:   "#F1EB9C",
    gold:   "#FFD637",
  };

  const STORAGE_KEY = "smileybox_cellar_handover_draft_v1";

  // SKU list for the Brite Tank "Beer" dropdown — alphabetical, "Empty" included
  // as a normal state since tanks spend most of their life empty.
  const SKU_LIST = [
    "Black Lager", "CPT", "Eazy", "Empty", "GB Subtropic", "GB Wayfarer",
    "GB Windjammer", "Hazy", "IIPA", "IPA", "Lager", "Limited", "LPA", "XPA",
  ];

  // Same list for the grain mill dropdown, minus "Empty" — a mill line is
  // either milling a real SKU or it isn't running.
  const GRAIN_SKU_LIST = SKU_LIST.filter((sku) => sku !== "Empty");

  // Logo, embedded as base64 so it survives copy/paste into an email with
  // no external file dependency. Same artwork as assets/logo.png — not
  // recreated, just inlined.
  const LOGO_DATA_URI = "data:image/png;base64,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";

  /* -----------------------------------------------------------
     1. Reusable "stack list" (priorities / cleaning tasks)
  ----------------------------------------------------------- */
  function createStackList(containerId, addButtonId, placeholder) {
    const container = document.getElementById(containerId);

    function renumber() {
      [...container.querySelectorAll(".stack-row")].forEach((row, idx) => {
        row.querySelector(".stack-index").textContent = String(idx + 1).padStart(2, "0");
      });
    }

    function addRow(value = "") {
      const row = document.createElement("div");
      row.className = "stack-row";
      row.innerHTML = `
        <span class="stack-index">00</span>
        <input type="text" class="stack-input" placeholder="${escapeAttr(placeholder)}" value="${escapeAttr(value)}">
        <button type="button" class="row-remove" aria-label="Remove">&times;</button>
      `;
      row.querySelector(".row-remove").addEventListener("click", () => {
        row.remove();
        renumber();
      });
      container.appendChild(row);
      renumber();
    }

    function getValues() {
      return [...container.querySelectorAll(".stack-input")].map((i) => i.value.trim()).filter(Boolean);
    }

    function reset() {
      container.innerHTML = "";
    }

    document.getElementById(addButtonId).addEventListener("click", () => addRow());

    return { addRow, getValues, reset };
  }

  const priorityStack = createStackList("prioritiesList", "addPriority", "e.g. Sign off BBT5 and BBT8");
  const cleaningStack = createStackList("cleaningList", "addCleaning", "e.g. Fuge & CB/BT CIP'd with the 300 kit");

  /* -----------------------------------------------------------
     2. Brite tank table (BBT 1–8)
  ----------------------------------------------------------- */
  const bbtBody = document.querySelector("#bbtTable tbody");
  const skuOptions = SKU_LIST.map((sku) => `<option value="${escapeAttr(sku)}">${esc(sku)}</option>`).join("");
  for (let i = 1; i <= 8; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>BBT ${i}</td>
      <td><input type="text" data-bbt="cip" placeholder="AW 1/8"></td>
      <td><input type="date" data-bbt="date"></td>
      <td>
        <select data-bbt="beer">
          <option value="">Select SKU</option>
          ${skuOptions}
        </select>
      </td>
      <td><input type="text" data-bbt="volume" placeholder="e.g. 1200L"></td>
      <td><input type="text" data-bbt="kpa" data-type="num" placeholder="100"></td>
      <td><input type="text" data-bbt="vv" data-type="num" placeholder="2.4"></td>
      <td>
        <select data-bbt="ready">
          <option value="">–</option>
          <option value="Y">Y</option>
          <option value="N">N</option>
        </select>
      </td>
    `;
    bbtBody.appendChild(tr);
  }

  /* -----------------------------------------------------------
     3. Fermenter grid (FV 1–60)
  ----------------------------------------------------------- */
  const fvGrid = document.getElementById("fvGrid");
  for (let i = 1; i <= 60; i++) {
    const chip = document.createElement("div");
    chip.className = "fv-chip";
    chip.innerHTML = `
      <span class="fv-label">FV${i}</span>
      <input type="text" data-fv="${i}" placeholder="status">
    `;
    fvGrid.appendChild(chip);
  }

  /* -----------------------------------------------------------
     4. Small label/input grid helper (yeast / grain / utilities)
  ----------------------------------------------------------- */
  function buildMiniGrid(containerId, fields) {
    const container = document.getElementById(containerId);
    fields.forEach(([key, label, placeholder]) => {
      const wrap = document.createElement("label");
      wrap.className = "field";
      wrap.innerHTML = `
        <span class="field-label">${label}</span>
        <input type="text" data-key="${key}" placeholder="${placeholder || ""}">
      `;
      container.appendChild(wrap);
    });
  }

  buildMiniGrid("greenBeerGrid", [
    ["gbl70", "70 Cellar"],
    ["gbl300", "300 Cellar"],
    ["gbl500", "500 Cellar"],
  ]);

  buildMiniGrid("yeastGrid", [
    ["ypp1", "YPP1", "CIP/SIP 26/07"],
    ["ypp2", "YPP2", "SIP 25/7"],
    ["yline300", "Yeast line 300", "CIP/SIP 21/07"],
    ["yline500", "Yeast line 500", "CIP/SIP 31/07"],
  ]);

  /* -----------------------------------------------------------
     Grain table (DME, Krones = SKU dropdown + confirm;
     Grain Bills Made Up = open text, since it's often more than one SKU)
  ----------------------------------------------------------- */
  const grainBody = document.querySelector("#grainTable tbody");
  const grainSkuOptions = GRAIN_SKU_LIST.map((sku) => `<option value="${escapeAttr(sku)}">${esc(sku)}</option>`).join("");
  const GRAIN_TASKS = [
    { task: "DME", type: "dropdown" },
    { task: "Krones", type: "dropdown" },
    { task: "Grain Bills Made Up", type: "text" },
  ];
  GRAIN_TASKS.forEach(({ task, type }) => {
    const tr = document.createElement("tr");
    if (type === "text") {
      tr.innerHTML = `
        <td>${esc(task)}</td>
        <td colspan="2">
          <input type="text" data-grain-task="${escapeAttr(task)}" data-grain-field="text" placeholder="e.g. Hazy, XPA, LPA">
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td>${esc(task)}</td>
        <td>
          <select data-grain-task="${escapeAttr(task)}" data-grain-field="sku">
            <option value="">Select SKU</option>
            ${grainSkuOptions}
          </select>
        </td>
        <td>
          <label class="table-checkline">
            <input type="checkbox" data-grain-task="${escapeAttr(task)}" data-grain-field="complete">
            <span>Done</span>
          </label>
        </td>
      `;
    }
    grainBody.appendChild(tr);
  });

  buildMiniGrid("glycolGrid", [
    ["glycolSupply", "Main supply (kPa)"],
    ["glycolReturn", "Main return (kPa)"],
  ]);

  buildMiniGrid("readingsGrid", [
    ["pmMain", "% PM"],
    ["doReading", "D.O"],
    ["sensory", "Sensory (pass/fail)"],
    ["rlu", "RLU"],
    ["co2", "CO2"],
  ]);

  buildMiniGrid("co2Grid", [
    ["amReading", "% AM"],
    ["pmEvening", "% PM"],
  ]);

  buildMiniGrid("twGrid", [
    ["twLevel", "Level"],
    ["twPh", "pH"],
  ]);

  buildMiniGrid("wasteGrid", [
    ["wasteFv13", "FV13"],
    ["wyt1", "WYT1"],
    ["wyt2", "WYT2"],
    ["wyt3", "WYT3"],
  ]);

  /* -----------------------------------------------------------
     5. Default date (priority row seeding happens at Startup below,
     once we know whether a local draft or remote sync state exists)
  ----------------------------------------------------------- */
  const metaDate = document.getElementById("metaDate");
  metaDate.value = new Date().toISOString().slice(0, 10);

  /* -----------------------------------------------------------
     6. Collect all form state
  ----------------------------------------------------------- */
  function collectState() {
    const priorities = priorityStack.getValues();
    const cleaningTasks = cleaningStack.getValues();

    const bbt = [...bbtBody.querySelectorAll("tr")].map((tr, idx) => ({
      tank: `BBT ${idx + 1}`,
      cip: tr.querySelector('[data-bbt="cip"]').value.trim(),
      date: tr.querySelector('[data-bbt="date"]').value,
      beer: tr.querySelector('[data-bbt="beer"]').value,
      volume: tr.querySelector('[data-bbt="volume"]').value.trim(),
      kpa: tr.querySelector('[data-bbt="kpa"]').value.trim(),
      vv: tr.querySelector('[data-bbt="vv"]').value.trim(),
      ready: tr.querySelector('[data-bbt="ready"]').value,
    }));

    const fv = [...fvGrid.querySelectorAll("input[data-fv]")]
      .map((i) => ({ n: i.dataset.fv, val: i.value.trim() }))
      .filter((r) => r.val);

    const grain = GRAIN_TASKS.map(({ task, type }) => {
      if (type === "text") {
        const el = grainBody.querySelector(`[data-grain-task="${task}"][data-grain-field="text"]`);
        return { task, type, text: el ? el.value.trim() : "" };
      }
      return {
        task,
        type,
        sku: grainBody.querySelector(`[data-grain-task="${task}"][data-grain-field="sku"]`).value,
        complete: grainBody.querySelector(`[data-grain-task="${task}"][data-grain-field="complete"]`).checked,
      };
    });

    const getKey = (k) => {
      const el = document.querySelector(`[data-key="${k}"]`);
      return el ? el.value.trim() : "";
    };

    const keys = [
      "gbl70", "gbl300", "gbl500",
      "ypp1", "ypp2", "yline300", "yline500",
      "glycolSupply", "glycolReturn",
      "pmMain", "doReading", "sensory", "rlu", "co2", "amReading", "pmEvening",
      "twLevel", "twPh", "wasteFv13", "wyt1", "wyt2", "wyt3",
    ];
    const misc = {};
    keys.forEach((k) => (misc[k] = getKey(k)));

    return {
      date: metaDate.value,
      from: document.getElementById("metaFrom").value.trim(),
      comments: document.getElementById("comments").value.trim(),
      priorities,
      bbt,
      fv,
      grain,
      cleaningTasks,
      ...misc,
    };
  }

  /* -----------------------------------------------------------
     7. Persist state — local draft (this browser) + cloud sync
     (via the Worker's /api/sync endpoint, which proxies JSONBin
     server-side; the browser never sees the JSONBin API key)
  ----------------------------------------------------------- */
  const syncStatus = document.getElementById("syncStatus");
  let lastLocalEditAt = 0;      // last time the person typed/changed something
  let lastKnownUpdatedAt = 0;   // updatedAt of whatever state is currently on screen
  let pendingPush = null;       // state we owe the server if the last push failed

  function setSyncStatus(text) {
    if (syncStatus) syncStatus.textContent = text;
  }

  function collectStateWithTimestamp() {
    const state = collectState();
    state.updatedAt = Date.now();
    return state;
  }

  function saveLocal(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  function getLocalDraft() {
    let raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  async function pushToServer(state) {
    setSyncStatus("Syncing…");
    try {
      const res = await fetch("/api/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) throw new Error("sync failed");
      pendingPush = null;
      setSyncStatus("Synced");
    } catch (e) {
      pendingPush = state; // retry next chance we get (poll, focus, or back online)
      setSyncStatus("Offline — saved on this device");
    }
  }

  async function pullFromServer() {
    try {
      const res = await fetch("/api/sync");
      if (!res.ok) return null;
      const data = await res.json();
      return data && typeof data === "object" && Object.keys(data).length ? data : null;
    } catch (e) {
      return null;
    }
  }

  function applyState(s) {
    if (!s) return;
    lastKnownUpdatedAt = s.updatedAt || 0;

    if (s.date) metaDate.value = s.date;
    document.getElementById("metaFrom").value = s.from || "";
    document.getElementById("comments").value = s.comments || "";

    priorityStack.reset();
    if (Array.isArray(s.priorities) && s.priorities.length) {
      s.priorities.forEach((v) => priorityStack.addRow(v));
    } else {
      priorityStack.addRow();
    }

    cleaningStack.reset();
    if (Array.isArray(s.cleaningTasks) && s.cleaningTasks.length) {
      s.cleaningTasks.forEach((v) => cleaningStack.addRow(v));
    }

    const bbtRows = bbtBody.querySelectorAll("tr");
    bbtRows.forEach((tr) => {
      tr.querySelector('[data-bbt="cip"]').value = "";
      tr.querySelector('[data-bbt="date"]').value = "";
      tr.querySelector('[data-bbt="beer"]').value = "";
      tr.querySelector('[data-bbt="volume"]').value = "";
      tr.querySelector('[data-bbt="kpa"]').value = "";
      tr.querySelector('[data-bbt="vv"]').value = "";
      tr.querySelector('[data-bbt="ready"]').value = "";
    });
    if (Array.isArray(s.bbt)) {
      s.bbt.forEach((b, idx) => {
        const tr = bbtRows[idx];
        if (!tr) return;
        tr.querySelector('[data-bbt="cip"]').value = b.cip || "";
        tr.querySelector('[data-bbt="date"]').value = b.date || "";
        tr.querySelector('[data-bbt="beer"]').value = b.beer || "";
        tr.querySelector('[data-bbt="volume"]').value = b.volume || "";
        tr.querySelector('[data-bbt="kpa"]').value = b.kpa || "";
        tr.querySelector('[data-bbt="vv"]').value = b.vv || "";
        tr.querySelector('[data-bbt="ready"]').value = b.ready || "";
      });
    }

    grainBody.querySelectorAll('[data-grain-field="sku"]').forEach((el) => (el.value = ""));
    grainBody.querySelectorAll('[data-grain-field="text"]').forEach((el) => (el.value = ""));
    grainBody.querySelectorAll('[data-grain-field="complete"]').forEach((el) => (el.checked = false));
    if (Array.isArray(s.grain)) {
      s.grain.forEach((g) => {
        const task = g.task || g.mill; // g.mill kept for backward-compat with older drafts
        if (g.type === "text" || typeof g.text === "string") {
          const textEl = grainBody.querySelector(`[data-grain-task="${task}"][data-grain-field="text"]`);
          if (textEl) textEl.value = g.text || "";
          return;
        }
        const skuEl = grainBody.querySelector(`[data-grain-task="${task}"][data-grain-field="sku"]`);
        const completeEl = grainBody.querySelector(`[data-grain-task="${task}"][data-grain-field="complete"]`);
        if (skuEl) skuEl.value = g.sku || "";
        if (completeEl) completeEl.checked = !!(g.complete ?? g.milled);
      });
    }

    fvGrid.querySelectorAll("input[data-fv]").forEach((el) => (el.value = ""));
    if (Array.isArray(s.fv)) {
      s.fv.forEach((row) => {
        const input = fvGrid.querySelector(`input[data-fv="${row.n}"]`);
        if (input) input.value = row.val;
      });
    }

    document.querySelectorAll("[data-key]").forEach((el) => (el.value = ""));
    Object.keys(s).forEach((k) => {
      const el = document.querySelector(`[data-key="${k}"]`);
      if (el && typeof s[k] === "string") el.value = s[k];
    });
  }

  function saveDraft() {
    const state = collectStateWithTimestamp();
    lastKnownUpdatedAt = state.updatedAt;
    saveLocal(state);
    return state;
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  const pushDebounced = debounce((state) => pushToServer(state), 1000);

  function onFormChange() {
    lastLocalEditAt = Date.now();
    const state = saveDraft();
    pushDebounced(state);
  }

  document.body.addEventListener("input", debounce(onFormChange, 400));
  document.body.addEventListener("change", onFormChange);

  window.addEventListener("online", () => { if (pendingPush) pushToServer(pendingPush); });

  async function maybePullRemote() {
    if (Date.now() - lastLocalEditAt < 5000) return; // don't yank the field mid-typing
    if (overlay.classList.contains("open")) return;  // don't disrupt email review
    const remote = await pullFromServer();
    if (remote && (remote.updatedAt || 0) > lastKnownUpdatedAt) {
      applyState(remote);
      saveLocal(remote);
      setSyncStatus("Updated from another device");
    }
  }

  /* -----------------------------------------------------------
     8. Startup: show local draft immediately, then reconcile
     with the server (whichever copy is newer wins), then keep
     polling for changes made from other devices/browsers.
  ----------------------------------------------------------- */
  const localDraft = getLocalDraft();
  if (localDraft) applyState(localDraft);
  else priorityStack.addRow();

  (async () => {
    const remote = await pullFromServer();
    if (remote && (!localDraft || (remote.updatedAt || 0) > (localDraft.updatedAt || 0))) {
      applyState(remote);
      saveLocal(remote);
    }
    setSyncStatus("Synced");
    setInterval(maybePullRemote, 20000);
    window.addEventListener("focus", maybePullRemote);
  })();

  /* -----------------------------------------------------------
     9. Clear sheet
  ----------------------------------------------------------- */
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (!confirm("Clear every field on this sheet? This clears it for everyone syncing to this site, and can't be undone.")) return;
    document.querySelectorAll("input[type=text], textarea").forEach((el) => (el.value = ""));
    document.querySelectorAll('input[type=date]:not(#metaDate)').forEach((el) => (el.value = ""));
    document.querySelectorAll("select").forEach((el) => (el.selectedIndex = 0));
    document.querySelectorAll('input[type=checkbox]').forEach((el) => (el.checked = false));
    metaDate.value = new Date().toISOString().slice(0, 10);
    priorityStack.reset();
    priorityStack.addRow();
    cleaningStack.reset();

    const cleared = collectStateWithTimestamp();
    lastKnownUpdatedAt = cleared.updatedAt;
    saveLocal(cleared);
    pushToServer(cleared);
  });

  /* -----------------------------------------------------------
     9. Build the formatted email HTML
  ----------------------------------------------------------- */
  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function fmtShortDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }

  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr(s) {
    return esc(s).replace(/"/g, "&quot;");
  }

  function sectionTitle(text, color) {
    return `<tr><td style="padding:22px 0 10px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:${color};width:8px;border-radius:3px;"></td>
        <td style="width:8px;"></td>
        <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase;color:#14161A;">${esc(text)}</td>
      </tr></table>
    </td></tr>`;
  }

  function buildEmailHTML(s) {
    const rowsPriorities = s.priorities.length
      ? s.priorities.map((p, i) => `<tr>
          <td style="font-family:'Courier New',monospace;font-size:12px;font-weight:bold;color:#8a4c14;background:#FDEEDD;border-radius:5px;padding:4px 7px;text-align:center;width:22px;">${i + 1}</td>
          <td style="padding-left:10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14161A;line-height:1.5;">${esc(p)}</td>
        </tr>`).join("")
      : `<tr><td colspan="2" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8a8d94;">No priorities listed.</td></tr>`;

    const cleaningRows = (s.cleaningTasks && s.cleaningTasks.length)
      ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${s.cleaningTasks.map((t) => `<tr>
            <td style="width:20px;padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#0d7a58;vertical-align:top;">✓</td>
            <td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#14161A;line-height:1.5;">${esc(t)}</td>
          </tr>`).join("")}</table>`
      : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8a8d94;">No cleaning tasks logged — check before sign-off.</div>`;

    const bbtRows = s.bbt.map((b) => `<tr>
        <td style="padding:7px 10px;font-family:'Courier New',monospace;font-weight:bold;font-size:13px;border-bottom:1px solid #EDEDEA;">${esc(b.tank)}</td>
        <td style="padding:7px 10px;font-size:13px;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #EDEDEA;">${esc(b.cip) || "–"}</td>
        <td style="padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;border-bottom:1px solid #EDEDEA;white-space:nowrap;">${esc(fmtShortDate(b.date)) || "–"}</td>
        <td style="padding:7px 10px;font-size:13px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;border-bottom:1px solid #EDEDEA;">${esc(b.beer) || "–"}</td>
        <td style="padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;border-bottom:1px solid #EDEDEA;">${esc(b.volume) || "–"}</td>
        <td style="padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;border-bottom:1px solid #EDEDEA;">${esc(b.kpa) || "–"}</td>
        <td style="padding:7px 10px;font-size:13px;font-family:'Courier New',monospace;border-bottom:1px solid #EDEDEA;">${esc(b.vv) || "–"}</td>
        <td style="padding:7px 10px;font-size:13px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;border-bottom:1px solid #EDEDEA;color:${b.ready === "Y" ? "#0d7a58" : b.ready === "N" ? "#b3261e" : "#8a8d94"};">${esc(b.ready) || "–"}</td>
      </tr>`).join("");

    const fvRows = s.fv.length
      ? s.fv.map((r) => `<td style="padding:5px 9px;font-family:Arial,Helvetica,sans-serif;font-size:13px;border-bottom:1px solid #EDEDEA;white-space:nowrap;">
          <span style="font-family:'Courier New',monospace;font-weight:bold;color:#0d6e93;">FV${r.n}</span> — ${esc(r.val)}
        </td>`).join("")
      : "";

    // group fv into rows of 2
    let fvTable = "";
    if (s.fv.length) {
      const chunks = [];
      for (let i = 0; i < s.fv.length; i += 2) chunks.push(s.fv.slice(i, i + 2));
      fvTable = chunks.map((pair) => `<tr>
          ${pair.map((r) => `<td style="padding:5px 9px;font-family:Arial,Helvetica,sans-serif;font-size:13px;border-bottom:1px solid #EDEDEA;">
            <span style="font-family:'Courier New',monospace;font-weight:bold;color:#0d6e93;">FV${r.n}</span> — ${esc(r.val)}</td>`).join("")}
          ${pair.length === 1 ? '<td style="border-bottom:1px solid #EDEDEA;"></td>' : ""}
        </tr>`).join("");
    }

    const miniRow = (label, val) => `<tr>
        <td style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#55585F;width:44%;">${esc(label)}</td>
        <td style="padding:5px 0;font-family:'Courier New',monospace;font-size:13px;color:#14161A;font-weight:bold;">${esc(val) || "–"}</td>
      </tr>`;

    const greenBeerRows = [
      ["70 Cellar", s.gbl70], ["300 Cellar", s.gbl300], ["500 Cellar", s.gbl500],
    ].map(([l, v]) => miniRow(l, v)).join("");

    const yeastRows = [
      ["YPP1", s.ypp1], ["YPP2", s.ypp2],
      ["Yeast line 300", s.yline300], ["Yeast line 500", s.yline500],
    ].map(([l, v]) => miniRow(l, v)).join("");

    const grainRows = (s.grain || []).map((g) => {
      let status;
      if (g.type === "text") {
        status = esc(g.text) || "–";
      } else {
        status = g.sku
          ? `${esc(g.sku)} — <span style="color:${g.complete ? "#0d7a58" : "#b3261e"};">${g.complete ? "✓ complete" : "not yet complete"}</span>`
          : "–";
      }
      return `<tr>
          <td style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#55585F;width:44%;">${esc(g.task)}</td>
          <td style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#14161A;font-weight:bold;">${status}</td>
        </tr>`;
    }).join("");

    const utilityTile = (title, rows) => `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;border:1px solid #E4E4E0;border-radius:10px;background:#FBFBF9;">
        <tr><td style="padding:12px 14px 10px;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:bold;text-transform:uppercase;letter-spacing:.06em;color:#8a8d94;margin-bottom:4px;">${esc(title)}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
        </td></tr>
      </table>`;

    const utilities = [
      utilityTile("Glycol", [["Main supply (kPa)", s.glycolSupply], ["Main return (kPa)", s.glycolReturn]].map(([l, v]) => miniRow(l, v)).join("")),
      utilityTile("DAW", [["% PM", s.pmMain], ["D.O", s.doReading], ["Sensory", s.sensory], ["RLU", s.rlu], ["CO2", s.co2]].map(([l, v]) => miniRow(l, v)).join("")),
      utilityTile("CO2", [["% AM", s.amReading], ["% PM", s.pmEvening]].map(([l, v]) => miniRow(l, v)).join("")),
      utilityTile("6–10 TW", [["Level", s.twLevel], ["pH", s.twPh]].map(([l, v]) => miniRow(l, v)).join("")),
      utilityTile("Waste yeast", [["FV13", s.wasteFv13], ["WYT1", s.wyt1], ["WYT2", s.wyt2], ["WYT3", s.wyt3]].map(([l, v]) => miniRow(l, v)).join("")),
    ].join("");


    return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#FFFFFF;font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;">
  <tr><td style="background:#FFFFFF;padding:20px 26px 16px;border-radius:12px 12px 0 0;border-left:1px solid #EDEDEA;border-right:1px solid #EDEDEA;border-top:1px solid #EDEDEA;border-bottom:4px solid ${BRAND.mint};">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="width:46px;padding-right:12px;vertical-align:middle;">
        <img src="${LOGO_DATA_URI}" width="40" height="40" alt="Balter Brewing" style="display:block;border:0;">
      </td>
      <td style="vertical-align:middle;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:20px;color:#14161A;line-height:1.25;">Evening Brewing Handover</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#55585F;margin-top:2px;">Balter Brewing</div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:18px 26px 4px;border:1px solid #EDEDEA;border-top:none;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="font-size:13px;color:#55585F;padding:2px 0;">Date</td>
        <td style="font-size:13px;font-weight:bold;padding:2px 0;">${esc(fmtDate(s.date))}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#55585F;padding:2px 0;">Handed over by</td>
        <td style="font-size:13px;font-weight:bold;padding:2px 0;">${esc(s.from) || "–"}</td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 26px;border:1px solid #EDEDEA;border-top:none;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${sectionTitle("Priorities for next shift", BRAND.orange)}
      <tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rowsPriorities}</table></td></tr>

      ${sectionTitle("Comments & issues — last 24 hrs", BRAND.purple)}
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#14161A;padding-bottom:6px;white-space:pre-wrap;">${esc(s.comments) || "No comments logged."}</td></tr>

      ${sectionTitle("Brite tank status", BRAND.mint)}
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          <tr>
            <th align="left" style="padding:6px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#55585F;border-bottom:2px solid #14161A;">Tank</th>
            <th align="left" style="padding:6px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#55585F;border-bottom:2px solid #14161A;">CIP/SIP/AW</th>
            <th align="left" style="padding:6px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#55585F;border-bottom:2px solid #14161A;">Date</th>
            <th align="left" style="padding:6px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#55585F;border-bottom:2px solid #14161A;">Beer</th>
            <th align="left" style="padding:6px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#55585F;border-bottom:2px solid #14161A;">Volume</th>
            <th align="left" style="padding:6px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#55585F;border-bottom:2px solid #14161A;">kPa</th>
            <th align="left" style="padding:6px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#55585F;border-bottom:2px solid #14161A;">V/V</th>
            <th align="left" style="padding:6px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#55585F;border-bottom:2px solid #14161A;">Pack?</th>
          </tr>
          ${bbtRows}
        </table>
      </td></tr>

      ${sectionTitle("Fermenter status (non-empty only)", BRAND.sky)}
      <tr><td>
        ${s.fv.length
          ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${fvTable}</table>`
          : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#8a8d94;">All fermenters empty / no status recorded.</div>`}
      </td></tr>

      ${sectionTitle("Green Beer Lines", BRAND.purple)}
      <tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${greenBeerRows}</table></td></tr>

      ${sectionTitle("Yeast propagation & lines", BRAND.gold)}
      <tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${yeastRows}</table></td></tr>

      ${sectionTitle("Brewhouse grain", BRAND.pale)}
      <tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${grainRows}</table></td></tr>

      ${sectionTitle("Utilities", BRAND.ink)}
      <tr><td style="padding-bottom:6px;">${utilities}</td></tr>

      ${sectionTitle("Cleaning completed", BRAND.mint)}
      <tr><td style="padding-bottom:16px;">
        ${cleaningRows}
      </td></tr>
    </table>
  </td></tr>
</table>`;
  }

  function buildEmailPlain(s) {
    const lines = [];
    lines.push(`EVENING BREWING HANDOVER — Balter Brewing`);
    lines.push(`Date: ${fmtDate(s.date)}`);
    lines.push(`Handed over by: ${s.from || "–"}`);
    lines.push("");
    lines.push(`PRIORITIES FOR NEXT SHIFT`);
    if (s.priorities.length) s.priorities.forEach((p, i) => lines.push(`  ${i + 1}. ${p}`));
    else lines.push("  (none listed)");
    lines.push("");
    lines.push(`COMMENTS & ISSUES — LAST 24 HRS`);
    lines.push(`  ${s.comments || "(none)"}`);
    lines.push("");
    lines.push(`BRITE TANK STATUS`);
    s.bbt.forEach((b) => lines.push(`  ${b.tank}: ${b.cip || "–"} | ${fmtShortDate(b.date) || "–"} | ${b.beer || "–"} | ${b.volume || "–"} | ${b.kpa || "–"} kPa | ${b.vv || "–"} V/V | Pack: ${b.ready || "–"}`));
    lines.push("");
    lines.push(`FERMENTER STATUS (non-empty only)`);
    if (s.fv.length) s.fv.forEach((r) => lines.push(`  FV${r.n}: ${r.val}`));
    else lines.push("  (all empty / no status recorded)");
    lines.push("");
    lines.push(`GREEN BEER LINES`);
    lines.push(`  70 Cellar: ${s.gbl70 || "–"}   300 Cellar: ${s.gbl300 || "–"}   500 Cellar: ${s.gbl500 || "–"}`);
    lines.push("");
    lines.push(`YEAST PROPAGATION & LINES`);
    lines.push(`  YPP1: ${s.ypp1 || "–"}   YPP2: ${s.ypp2 || "–"}`);
    lines.push(`  Yeast line 300: ${s.yline300 || "–"}   Yeast line 500: ${s.yline500 || "–"}`);
    lines.push("");
    lines.push(`BREWHOUSE GRAIN`);
    (s.grain || []).forEach((g) => {
      const status = g.type === "text"
        ? (g.text || "–")
        : (g.sku ? `${g.sku} — ${g.complete ? "complete" : "NOT yet complete"}` : "–");
      lines.push(`  ${g.task}: ${status}`);
    });
    lines.push("");
    lines.push(`UTILITIES`);
    lines.push(`  Glycol — main supply: ${s.glycolSupply || "–"}   main return: ${s.glycolReturn || "–"}`);
    lines.push(`  DAW — %PM: ${s.pmMain || "–"}   D.O: ${s.doReading || "–"}   Sensory: ${s.sensory || "–"}   RLU: ${s.rlu || "–"}   CO2: ${s.co2 || "–"}`);
    lines.push(`  CO2 — %AM: ${s.amReading || "–"}   %PM: ${s.pmEvening || "–"}`);
    lines.push(`  6-10 TW — Level: ${s.twLevel || "–"}   pH: ${s.twPh || "–"}`);
    lines.push(`  Waste yeast — FV13: ${s.wasteFv13 || "–"}   WYT1: ${s.wyt1 || "–"}   WYT2: ${s.wyt2 || "–"}   WYT3: ${s.wyt3 || "–"}`);
    lines.push("");
    lines.push(`CLEANING COMPLETED`);
    if (s.cleaningTasks && s.cleaningTasks.length) s.cleaningTasks.forEach((t) => lines.push(`  ✓ ${t}`));
    else lines.push("  (none logged — check before sign-off)");
    return lines.join("\n");
  }

  /* -----------------------------------------------------------
     10. Modal wiring
  ----------------------------------------------------------- */
  const overlay = document.getElementById("modalOverlay");
  const preview = document.getElementById("emailPreview");
  const copyStatus = document.getElementById("copyStatus");
  let currentHTML = "";
  let currentPlain = "";

  document.getElementById("generateBtn").addEventListener("click", () => {
    const state = collectState();
    currentHTML = buildEmailHTML(state);
    currentPlain = buildEmailPlain(state);
    preview.innerHTML = currentHTML;
    copyStatus.textContent = "";
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  });

  function closeModal() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  document.getElementById("modalClose").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && overlay.classList.contains("open")) closeModal(); });

  document.getElementById("copyRichBtn").addEventListener("click", async () => {
    try {
      if (window.ClipboardItem) {
        const htmlBlob = new Blob([currentHTML], { type: "text/html" });
        const textBlob = new Blob([currentPlain], { type: "text/plain" });
        await navigator.clipboard.write([new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })]);
      } else {
        await navigator.clipboard.writeText(currentPlain);
      }
      copyStatus.textContent = "Copied — paste it into your email.";
    } catch (err) {
      copyStatus.textContent = "Couldn't copy automatically — select the preview and copy manually.";
    }
  });

  document.getElementById("copyPlainBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(currentPlain);
      copyStatus.textContent = "Plain text copied.";
    } catch (err) {
      copyStatus.textContent = "Couldn't copy automatically — select the preview and copy manually.";
    }
  });

  document.getElementById("downloadImgBtn").addEventListener("click", async () => {
    if (!window.html2canvas) {
      copyStatus.textContent = "Image tool unavailable offline.";
      return;
    }
    copyStatus.textContent = "Rendering image…";
    try {
      const canvas = await html2canvas(preview, { backgroundColor: "#ffffff", scale: 2 });
      const link = document.createElement("a");
      const state = collectState();
      link.download = `cellar-handover-${state.date || "draft"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      copyStatus.textContent = "Image downloaded.";
    } catch (err) {
      copyStatus.textContent = "Couldn't render image.";
    }
  });
})();
