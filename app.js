/* Ziyuan garden — English UI. Character is the atom. */
(() => {
  const Z = () => window.ZIYUAN;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const INTERVALS_H = [4, 12, 24, 144, 288, 1152, 2304, 4320];
  const STAGE_ICON = {
    packet: "◌", seed: "🌱", sprout: "🌿", leaf: "🍃", bud: "🌷",
    bloom: "🌸", thirsty: "💧", wilt: "🥀", dead: "🪦",
  };
  const store = {
    load() { try { return JSON.parse(localStorage.getItem("ziyuan.v1") || "{}"); } catch { return {}; } },
    save(data) { localStorage.setItem("ziyuan.v1", JSON.stringify(data)); },
  };
  const state = {
    view: "nursery", level: 1, query: "", page: 0, pageSize: 200,
    profileId: 1, tray: [], quizQueue: [], quizIdx: 0, demo: true,
    demoHoursPerSec: 2, adult: false, showPinyin: false, rich: true, flipped: false,
    data: { plants: {}, mems: {}, votes: {}, chosenMem: {}, notes: {}, originReal: Date.now(), originPlant: Date.now() },
  };
  function nowPlant() {
    if (!state.demo) return Date.now();
    return state.data.originPlant + (Date.now() - state.data.originReal) * state.demoHoursPerSec * 3600 * 1000;
  }
  function plantOf(id) { return state.data.plants[id]; }
  function charByI(i) {
    const list = (Z() && Z().chars) || [];
    return list.find((c) => c.i === i) || list[0];
  }
  function charByZ(z) { return ((Z() && Z().chars) || []).find((c) => c.z === z); }
  function liveStage(p) {
    if (!p) return "packet";
    if (p.dead) return "dead";
    const t = nowPlant();
    if (p.due && t > p.due) {
      const lateH = (t - p.due) / 3600000;
      if (lateH > 72) return "dead";
      if (lateH > 24) return "wilt";
      return "thirsty";
    }
    if (p.successes >= 6) return ["leaf", "leaf", "bud", "bud", "bloom", "bloom", "bloom", "bloom"][p.intervalIdx || 0] || "bloom";
    if (p.successes >= 4) return "bud";
    if (p.successes >= 2) return "leaf";
    if (p.successes >= 1) return "sprout";
    return "seed";
  }
  function persist() { store.save(state.data); }
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("on"), 1800);
  }
  function seedPlant(id) {
    const t = nowPlant();
    state.data.plants[id] = { id, seeded: t, successes: 0, intervalIdx: 0, due: t + INTERVALS_H[0] * 3600000, dead: false };
    persist();
  }
  function waterResult(id, ok) {
    const p = plantOf(id);
    if (!p) return;
    const t = nowPlant();
    if (ok) {
      p.successes += 1;
      if (p.successes >= 6) p.intervalIdx = Math.min((p.intervalIdx || 0) + 1, INTERVALS_H.length - 1);
      p.due = t + (p.successes < 6 ? INTERVALS_H[0] : INTERVALS_H[p.intervalIdx]) * 3600000;
      p.dead = false;
    } else {
      p.intervalIdx = 0;
      p.due = t + INTERVALS_H[0] * 3600000;
    }
    persist();
  }
  function speakVoice(text, gender) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-TW";
      u.rate = 0.88;
      u.pitch = gender === "m" ? 0.8 : 1.15;
      const vs = speechSynthesis.getVoices() || [];
      const tw = vs.filter((v) => /zh-TW|Taiwan|國語|台/i.test(v.lang + v.name));
      if (tw[0]) u.voice = tw[0];
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {}
  }
  function conciseEn(en) {
    if (!en || en === "—") return "—";
    return String(en).split(";")[0].trim().slice(0, 72);
  }
  function duePlants() {
    const t = nowPlant();
    return Object.values(state.data.plants).filter((p) => {
      const st = liveStage(p);
      return st === "thirsty" || st === "wilt" || (p.due && t >= p.due && !p.dead && st !== "dead");
    });
  }
  function setView(name) {
    state.view = name;
    $$(".view").forEach((v) => v.classList.toggle("on", v.dataset.view === name));
    $$(".nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    render();
  }
  function filteredCatalog() {
    const q = state.query.trim().toLowerCase();
    return ((Z() && Z().chars) || []).filter((c) => {
      if (!state.query.trim() && state.level && c.lv !== state.level) return false;
      if (!q) return true;
      if (c.z.includes(q) || (c.zy || "").includes(q)) return true;
      if ((c.py || "").toLowerCase().includes(q) || (c.en || "").toLowerCase().includes(q)) return true;
      return (c.w || []).some((w) => (w.w || "").includes(q) || (w.en || "").toLowerCase().includes(q));
    });
  }
  function labelStage(st) {
    return { packet: "packet", seed: "seed", sprout: "sprout", leaf: "leaf", bud: "bud", bloom: "bloom", thirsty: "thirsty", wilt: "wilted", dead: "dead" }[st] || st;
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  }
  function renderGarden() {
    const plants = Object.values(state.data.plants);
    const counts = { bloom: 0, wilt: 0, dead: 0 };
    plants.forEach((p) => { const s = liveStage(p); counts[s] = (counts[s] || 0) + 1; });
    if ($("#g-planted")) $("#g-planted").textContent = plants.length;
    if ($("#g-due")) $("#g-due").textContent = duePlants().length;
    if ($("#g-bloom")) $("#g-bloom").textContent = counts.bloom || 0;
    if ($("#g-wilt")) $("#g-wilt").textContent = (counts.wilt || 0) + (counts.dead || 0);
    const box = $("#garden-pots");
    if (!box) return;
    if (!plants.length) {
      box.innerHTML = `<div class="empty" style="grid-column:1/-1">No pots yet. Go to the list, tap a character, plant it.</div>`;
      return;
    }
    box.innerHTML = plants.map((p) => {
      const c = charByI(p.id);
      if (!c) return "";
      const st = liveStage(p);
      return `<article class="pot ${st}" data-id="${c.i}"><div class="plant-emoji">${STAGE_ICON[st] || ""}</div><div class="glyph">${c.z}</div><div class="zy">${c.zy || ""}</div><div class="stage">${labelStage(st)}</div></article>`;
    }).join("");
    box.querySelectorAll(".pot").forEach((el) => { el.onclick = () => openProfile(+el.dataset.id); });
  }
  function renderNursery() {
    const list = filteredCatalog();
    const pages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page >= pages) state.page = 0;
    const slice = list.slice(state.page * state.pageSize, (state.page + 1) * state.pageSize);
    if ($("#n-count")) $("#n-count").textContent = list.length;
    if ($("#n-page")) $("#n-page").textContent = `${state.page + 1} / ${pages}`;
    const names = { 1: "Plot 1 · Street", 2: "Plot 2 · Newsroom", 3: "Plot 3 · Hinterland", 4: "Plot 4 · Literary", 5: "Plot 5 · Ancient well" };
    if ($("#plot-title")) $("#plot-title").textContent = names[state.level] || "Plot";
    $$("#plot-switch button").forEach((b) => b.classList.toggle("on", +b.dataset.lv === state.level));
    const grid = $("#catalog-grid");
    if (!grid) return;
    grid.innerHTML = slice.map((c) => `<article class="tile ${plantOf(c.i) ? "planted" : ""}" data-id="${c.i}"><div class="r">#${c.i}</div><div class="g">${c.z}</div><div class="m">${c.zy || "·"}</div><div class="gloss">${escapeHtml(conciseEn(c.en))}</div></article>`).join("");
    grid.querySelectorAll(".tile").forEach((el) => { el.onclick = () => openProfile(+el.dataset.id); });
  }
  function openProfile(id) { state.profileId = id; state.flipped = false; setView("profile"); }
  function allMems(ch) {
    const seeded = ((Z().seedMems || {})[ch.z] || []).filter((m) => state.adult || !m.adult);
    return seeded.concat((state.data.mems[ch.z] || []).filter((m) => state.adult || !m.adult));
  }
  function renderProfile() {
    const c = charByI(state.profileId);
    if (!c) return;
    const p = plantOf(c.i);
    const st = liveStage(p);
    if ($("#p-glyph")) $("#p-glyph").textContent = c.z;
    const tian = $("#tian");
    if (tian) { tian.classList.remove("replay"); void tian.offsetWidth; tian.classList.add("replay"); tian.dataset.color = (c.stone && c.stone.color) || ""; }
    if ($("#flip-card")) $("#flip-card").classList.toggle("flipped", state.flipped);
    if ($("#btn-flip")) $("#btn-flip").textContent = state.flipped ? "Flip · character" : "Flip · English";
    const richPanel = $("#rich-panel");
    if (richPanel) richPanel.hidden = false;
    if ($("#p-rank")) $("#p-rank").textContent = `freq #${c.i} · plot ${c.lv}`;
    if ($("#p-zy")) $("#p-zy").textContent = c.zy || "—";
    if ($("#p-py")) $("#p-py").textContent = state.showPinyin ? c.py || "" : "";
    if ($("#p-en")) $("#p-en").textContent = c.en || "—";
    if ($("#p-en-short")) $("#p-en-short").textContent = conciseEn(c.en);
    const stn = c.stone;
    if ($("#p-hook")) $("#p-hook").textContent = stn ? stn.hook : "";
    if ($("#p-weather")) $("#p-weather").textContent = stn ? stn.weather : "";
    if ($("#p-stone-chips")) {
      $("#p-stone-chips").innerHTML = stn
        ? [stn.job, stn.color, ...(stn.habitat || []), stn.pair || ""].filter(Boolean).map((b) => `<span class="chip">${escapeHtml(String(b))}</span>`).join("")
        : "";
    }
    if ($("#p-tw")) { $("#p-tw").style.display = c.tw ? "block" : "none"; $("#p-tw").textContent = c.tw || ""; }
    if ($("#p-stage")) $("#p-stage").textContent = p ? labelStage(st) : "packet · not planted";
    if ($("#p-stk")) $("#p-stk").textContent = c.stk ? `${c.stk} strokes` : "";
    if ($("#p-readings")) {
      const rds = (c.rd && c.rd.length ? c.rd : [{ zy: c.zy, py: c.py }]);
      $("#p-readings").innerHTML = rds.map((r) => `<div class="rd"><b>${r.zy || ""}</b><span>${state.showPinyin ? r.py || "" : ""}</span></div>`).join("");
    }
    if ($("#p-words")) {
      $("#p-words").innerHTML = (c.w || []).map((w) => `<div class="word"><div class="ww">${w.w}</div><div class="we">${escapeHtml(w.en || "")}</div></div>`).join("") || `<p class="lead">No compounds hung on this pot yet.</p>`;
    }
    if ($("#p-look")) {
      $("#p-look").innerHTML = (c.lk || []).map((z) => {
        const hit = charByZ(z);
        return `<button class="chip" data-jump="${hit ? hit.i : ""}">${z}</button>`;
      }).join("") || "—";
      $("#p-look").querySelectorAll("[data-jump]").forEach((b) => {
        if (b.dataset.jump) b.onclick = () => openProfile(+b.dataset.jump);
      });
    }
    const mems = allMems(c);
    const chosen = state.data.chosenMem[c.z];
    if ($("#p-mems")) {
      $("#p-mems").innerHTML = mems.map((m, idx) => `<div class="mem ${m.adult ? "adult" : ""}"><div>${escapeHtml(m.text)}</div><div class="row">${chosen === m.text ? "<span class='chip'>chosen</span>" : `<button class="btn ghost" data-pick="${idx}">Use this</button>`}</div></div>`).join("") || `<p class="lead">Empty slot. Invent one.</p>`;
      $("#p-mems").querySelectorAll("[data-pick]").forEach((b) => {
        b.onclick = () => { state.data.chosenMem[c.z] = mems[+b.dataset.pick].text; persist(); renderProfile(); };
      });
    }
    if ($("#p-notes")) $("#p-notes").value = state.data.notes[c.z] || "";
    if ($("#btn-seed")) {
      $("#btn-seed").disabled = !!p && !p.dead;
      $("#btn-seed").textContent = p && !p.dead ? "Already planted" : p && p.dead ? "Reseed" : "Plant in garden";
    }
  }
  function renderWater() {
    const due = duePlants();
    if ($("#w-due")) $("#w-due").textContent = due.length;
    const wrap = $("#quiz-wrap");
    if (!wrap) return;
    if (!state.quizQueue.length) {
      wrap.innerHTML = due.length
        ? `<p class="lead">${due.length} pots are thirsty.</p><button class="btn" id="start-quiz">Start watering</button>`
        : `<div class="empty">Nothing is due. Plant more, or speed the demo clock.</div>`;
      const b = $("#start-quiz");
      if (b) b.onclick = startQuiz;
      return;
    }
    const item = state.quizQueue[state.quizIdx];
    if (!item) { state.quizQueue = []; toast("Round done."); renderWater(); return; }
    const c = charByI(item.id);
    const mode = item.mode;
    const prompt = mode === "z2m" ? c.z : c.zy || conciseEn(c.en);
    const pool = ((Z() && Z().chars) || []).filter((x) => x.i !== c.i);
    const picks = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [c, ...picks].map((x) => ({ id: x.i, label: mode === "z2m" ? conciseEn(x.en) : `${x.z}  ${x.zy || ""}` })).sort(() => Math.random() - 0.5);
    wrap.innerHTML = `<div class="quiz"><div class="sub">${mode === "z2m" ? "Meaning?" : "Which character?"} · ${state.quizIdx + 1}/${state.quizQueue.length}</div><div class="prompt">${prompt}</div><div class="choices" id="choices"></div><div class="feedback" id="q-feed"></div></div>`;
    opts.forEach((opt) => {
      const btn = document.createElement("button");
      btn.textContent = opt.label;
      btn.onclick = () => {
        const ok = opt.id === c.i;
        $$("#choices button").forEach((x) => (x.disabled = true));
        btn.classList.add(ok ? "good" : "bad");
        waterResult(c.i, ok);
        $("#q-feed").textContent = ok ? "Alive." : `It was ${c.z} ${c.zy || ""}`;
        setTimeout(() => { state.quizIdx += 1; renderWater(); }, 700);
      };
      $("#choices").appendChild(btn);
    });
  }
  function startQuiz() {
    const q = [];
    duePlants().forEach((p) => { q.push({ id: p.id, mode: "z2m" }); q.push({ id: p.id, mode: "m2z" }); });
    state.quizQueue = q.sort(() => Math.random() - 0.5).slice(0, 24);
    state.quizIdx = 0;
    renderWater();
  }
  function renderLesson() {
    const tray = state.tray.map((id) => charByI(id)).filter(Boolean);
    if ($("#tray")) {
      $("#tray").innerHTML = tray.length ? tray.map((c) => `<span class="chip-z" data-id="${c.i}">${c.z}</span>`).join("") : `<span class="lead">Empty tray.</span>`;
      $("#tray").querySelectorAll(".chip-z").forEach((el) => { el.onclick = () => openProfile(+el.dataset.id); });
    }
    if ($("#tray-count")) $("#tray-count").textContent = tray.length;
    if ($("#lesson-note")) $("#lesson-note").textContent = "Compounds should wait until their bricks have leaves. Not enforced yet.";
  }
  function render() {
    if ($("#demo-flag")) $("#demo-flag").textContent = state.demo ? `Demo ×${state.demoHoursPerSec} h/s` : "Real time";
    if (state.view === "garden") renderGarden();
    if (state.view === "nursery") renderNursery();
    if (state.view === "profile") renderProfile();
    if (state.view === "water") renderWater();
    if (state.view === "lesson") renderLesson();
  }
  function bind() {
    $$(".nav button").forEach((b) => (b.onclick = () => setView(b.dataset.view)));
    if ($("#q")) $("#q").addEventListener("input", (e) => { state.query = e.target.value; state.page = 0; setView("nursery"); });
    $$(".beds button:not(.locked)").forEach((b) => { b.onclick = () => { state.level = +b.dataset.lv; state.page = 0; setView("nursery"); }; });
    if ($("#prev-page")) $("#prev-page").onclick = () => { state.page = Math.max(0, state.page - 1); renderNursery(); };
    if ($("#next-page")) $("#next-page").onclick = () => { state.page += 1; renderNursery(); };
    if ($("#btn-seed")) $("#btn-seed").onclick = () => {
      const c = charByI(state.profileId);
      if (!c) return;
      if (!state.data.chosenMem[c.z]) {
        const invent = prompt("Pick or invent a mem first:", "");
        if (!invent) { toast("A mem is required to plant."); return; }
        state.data.mems[c.z] = state.data.mems[c.z] || [];
        state.data.mems[c.z].unshift({ text: invent, adult: false, votes: 1 });
        state.data.chosenMem[c.z] = invent;
      }
      seedPlant(c.i);
      toast(`${c.z} is in the garden.`);
      renderProfile();
    };
    if ($("#btn-tray")) $("#btn-tray").onclick = () => {
      if (!state.tray.includes(state.profileId)) state.tray.push(state.profileId);
      toast("On the tray.");
      renderProfile();
    };
    if ($("#btn-speak-f")) $("#btn-speak-f").onclick = () => { const c = charByI(state.profileId); if (c) speakVoice(c.z, "f"); };
    if ($("#btn-speak-m")) $("#btn-speak-m").onclick = () => { const c = charByI(state.profileId); if (c) speakVoice(c.z, "m"); };
    if ($("#btn-flip")) $("#btn-flip").onclick = () => { state.flipped = !state.flipped; renderProfile(); };
    if ($("#rich-toggle")) $("#rich-toggle").onchange = (e) => { state.rich = e.target.checked; try { localStorage.setItem("ziyuan.rich", state.rich ? "1" : "0"); } catch {} renderProfile(); };
    if ($("#btn-replay")) $("#btn-replay").onclick = () => { const tian = $("#tian"); if (!tian) return; tian.classList.remove("replay"); void tian.offsetWidth; tian.classList.add("replay"); };
    if ($("#p-notes")) $("#p-notes").addEventListener("change", (e) => { const c = charByI(state.profileId); state.data.notes[c.z] = e.target.value; persist(); });
    if ($("#btn-add-mem")) $("#btn-add-mem").onclick = () => {
      const c = charByI(state.profileId);
      const text = ($("#new-mem") && $("#new-mem").value.trim()) || "";
      if (!text) return;
      state.data.mems[c.z] = state.data.mems[c.z] || [];
      state.data.mems[c.z].unshift({ text, adult: !!( $("#mem-adult") && $("#mem-adult").checked), votes: 1 });
      state.data.chosenMem[c.z] = text;
      persist();
      renderProfile();
    };
    if ($("#adult-toggle")) $("#adult-toggle").onchange = (e) => { state.adult = e.target.checked; render(); };
    if ($("#pinyin-toggle")) $("#pinyin-toggle").onchange = (e) => { state.showPinyin = e.target.checked; render(); };
    if ($("#demo-toggle")) $("#demo-toggle").onchange = (e) => { state.demo = e.target.checked; persist(); render(); };
    if ($("#demo-rate")) $("#demo-rate").onchange = (e) => { state.demoHoursPerSec = +e.target.value; render(); };
    if ($("#water-all")) $("#water-all").onclick = () => { setView("water"); startQuiz(); };
    if ($("#clear-garden")) $("#clear-garden").onclick = () => { if (confirm("Clear the garden on this browser?")) { state.data.plants = {}; persist(); render(); } };
    if ($("#back-list")) $("#back-list").onclick = () => setView("nursery");
  }
  function boot() {
    const saved = store.load();
    if (saved && saved.plants) Object.assign(state.data, saved);
    try { state.rich = true; } catch {}
    const params = new URLSearchParams(location.search);
    const z = params.get("z");
    const plot = +(params.get("plot") || 1);
    if (plot === 1) state.level = 1;
    const first = ((Z() && Z().chars) || [])[0];
    if (z && charByZ(z)) state.profileId = charByZ(z).i;
    else if (first) state.profileId = first.i;
    bind();
    if (z && charByZ(z)) setView("profile");
    else setView("nursery");
    setInterval(() => { if (state.view === "garden" || state.view === "water") render(); }, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
