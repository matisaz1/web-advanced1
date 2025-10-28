/* IdeaForge - Combined project script.js
 - Works offline with fallback generation/logic
 - Optional OpenAI use: paste API key in field (client-side insecure — proxy recommended)
*/

// ---------- Helpers ----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const create = (t, attrs = {}, children = []) => {
  const el = document.createElement(t);
  for (const k in attrs) {
    if (k === "text") el.textContent = attrs[k];
    else if (k === "html") el.innerHTML = attrs[k];
    else el.setAttribute(k, attrs[k]);
  }
  children.forEach(c => el.appendChild(c));
  return el;
};

function uid(prefix = "") { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function truncate(s,n=120){return s.length>n? s.slice(0,n-1)+"…":s}

// ---------- Local storage keys ----------
const STORAGE_SETS = "if_sets_v1";
const STORAGE_FAVS = "if_favs_v1";

// ---------- DOM references ----------
const topicInput = $("#topicInput");
const generateBtn = $("#generateBtn");
const genResults = $("#genResults");
const numIdeas = $("#numIdeas");
const toneSelect = $("#toneSelect");
const apiKeyInput = $("#apiKey");
const studio = $("#studio");
const studioTitle = $("#studioTitle");
const studioText = $("#studioText");
const studioOutput = $("#studioOutput");
const studioEmpty = $("#studioEmpty");
const library = $("#library");
const galaxyCanvas = $("#galaxy");
const mergeBtn = $("#mergeBtn");
const exportJSONBtn = $("#exportJSON");
const exportTXTBtn = $("#exportTXT");
const clearStorageBtn = $("#clearStorage");
const showFavsBtn = $("#showFavs");
const clearFavsBtn = $("#clearFavs");

// ---------- State ----------
let lastGenerated = []; // {id, text}
let selectedIdea = null; // {id, text, metadata}
let savedSets = []; // saved idea objects
let favorites = []; // fav objects {id, topic, idea, createdAt}

// ---------- Fallback content templates (offline) ----------
const fallbackTemplates = {
  casual: [
    t => `A microservice for ${t} that solves one tiny pain with delightful UX and an email acquisition loop.`,
    t => `A community-driven newsletter and course around ${t} with paid advanced lessons.`,
    t => `An app that automates one repeatable task in ${t}, offering freemium features for power users.`
  ],
  professional: [
    t => `A B2B SaaS addressing a specific workflow in ${t}, with integrations and enterprise reporting.`,
    t => `A white-label toolkit for agencies working in ${t}, offering templates and analytics.`,
    t => `A marketplace connecting vetted professionals in ${t} with guaranteed matches and SLAs.`
  ],
  wacky: [
    t => `A novelty product that turns ${t} into a collectible AR pet that evolves with user interactions.`,
    t => `A satire press generator that writes hilarious startup PR for ${t} offerings.`,
    t => `A hybrid product mixing ${t} with a retro experience — intentionally absurd but shareable.`
  ],
  lean: [
    t => `A concierge MVP: personally deliver the ${t} service to first 10 users to validate demand rapidly.`,
    t => `A landing page + preorders for ${t} to test willingness to pay before building.`,
    t => `A single-feature app that tests the riskiest assumption in ${t} with measurable KPIs.`
  ]
};

// ---------- Utility: Save / Load ----------
function loadSaved() {
  try { savedSets = JSON.parse(localStorage.getItem(STORAGE_SETS) || "[]"); }
  catch(e){ savedSets = []; }
}
function saveSaved() {
  localStorage.setItem(STORAGE_SETS, JSON.stringify(savedSets.slice(0,500)));
}
function loadFavs() {
  try{ favorites = JSON.parse(localStorage.getItem(STORAGE_FAVS) || "[]"); } catch(e){ favorites = []; }
}
function saveFavs(){ localStorage.setItem(STORAGE_FAVS, JSON.stringify(favorites.slice(0,500))); }

// ---------- Render generated ideas (temporary) ----------
function renderGenerated(list) {
  genResults.innerHTML = "";
  if (!list.length) {
    genResults.classList.add("empty");
    genResults.innerHTML = `<p class="hint">No ideas yet — generate to begin.</p>`;
    return;
  }
  genResults.classList.remove("empty");
  list.forEach((it, idx) => {
    const card = create("div", { class: "idea-card" });
    const cb = create("input", { type: "checkbox" });
    cb.dataset.id = it.id;
    const col = create("div", {});
    const h = create("h4", { text: `Idea ${idx+1}` });
    const p = create("div", { html: `<strong>${truncate(it.text,200)}</strong><div style="opacity:.9;margin-top:6px">${truncate(it.text,280)}</div>` });
    const actions = create("div", { style: "margin-left:auto;display:flex;gap:6px" });
    const openBtn = create("button", { class: "btn", text: "Open" });
    const copyBtn = create("button", { class: "btn", text: "Copy" });
    const favBtn = create("button", { class: "btn", text: "★" });

    openBtn.onclick = () => openInStudio(it);
    copyBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(it.text); copyBtn.textContent="Copied"; setTimeout(()=>copyBtn.textContent="Copy",1100); }
      catch(e){ alert("Clipboard failed"); }
    };
    favBtn.onclick = () => {
      favorites.unshift({ id: uid("fav_"), topic: topicInput.value||"misc", idea: it.text, createdAt: new Date().toISOString() });
      saveFavs(); renderLibrary(); drawGalaxy();
    };

    actions.appendChild(openBtn); actions.appendChild(copyBtn); actions.appendChild(favBtn);
    card.appendChild(cb); card.appendChild(col); col.appendChild(h); col.appendChild(p); card.appendChild(actions);
    genResults.appendChild(card);
  });
}

// ---------- Open idea in studio ----------
function openInStudio(item) {
  selectedIdea = { id: item.id, text: item.text, topic: topicInput.value || "untitled" };
  studioTitle.textContent = selectedIdea.topic;
  studioText.textContent = selectedIdea.text;
  studioOutput.innerHTML = "";
  studioEmpty.hidden = true;
  studio.hidden = false;
  renderLibrary(); // update library buttons etc.
}

// ---------- Fallback generator (offline) ----------
function fallbackGenerate(topic, count=3, tone="casual") {
  const pool = fallbackTemplates[tone] || fallbackTemplates["casual"];
  const out = [];
  for (let i=0;i<count;i++){
    const fn = pool[i % pool.length];
    out.push({ id: uid("g_"), text: fn(topic) + ` (twist: ${["subscription","community","plugin","AI assistant","marketplace"][i%5]})` });
  }
  return out;
}

// ---------- OpenAI call helper ----------
async function callOpenAI(apiKey, prompt, opts = {}) {
  // simple ChatCompletion call
  const body = {
    model: opts.model || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: opts.max_tokens || 600,
    temperature: typeof opts.temperature === "number" ? opts.temperature : 0.8
  };
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "";
}

// ---------- Parse numbered list into strings ----------
function parseNumbered(text, n) {
  if (!text) return [];
  const cleaned = text.replace(/\r/g,"\n").trim();
  const parts = cleaned.split(/\n\s*\d+[\).\s-]+\s*/).filter(Boolean);
  if (parts.length >= n) return parts.slice(0,n).map(s => s.trim());
  const blocks = cleaned.split(/\n{2,}/).map(s=>s.trim()).filter(Boolean);
  if (blocks.length >= n) return blocks.slice(0,n);
  // fallback: split sentences
  const sentences = cleaned.match(/[^\.!\?]+[\.!\?]+/g) || [cleaned];
  const per = Math.ceil(sentences.length / n);
  const out = [];
  for (let i=0;i<n;i++){
    const seg = sentences.slice(i*per,(i+1)*per).join(" ").trim();
    if (seg) out.push(seg);
  }
  return out.slice(0,n);
}

// ---------- Core generate flow ----------
generateBtn.onclick = async () => {
  const topic = (topicInput.value || "").trim();
  if (!topic) { alert("Please enter a topic."); topicInput.focus(); return; }
  const count = parseInt(numIdeas.value || "3",10);
  const tone = toneSelect.value;
  const key = (apiKeyInput.value || "").trim();

  genResults.innerHTML = `<p class="hint">Generating…</p>`; genResults.classList.add("empty");
  lastGenerated = [];

  if (!key || key.length < 10) {
    // fallback
    await new Promise(r=>setTimeout(r,300));
    lastGenerated = fallbackGenerate(topic,count,tone);
    renderGenerated(lastGenerated);
    return;
  }

  // Build prompt
  const prompt = `You are a product strategist. Generate ${count} distinct, creative, and actionable ideas for the topic: "${topic}". Tone: ${tone}. Return a numbered list 1., 2., 3. with 1-2 short paragraphs per item.`;
  try {
    const responseText = await callOpenAI(key, prompt, { max_tokens: 700, temperature: 0.9 });
    const items = parseNumbered(responseText, count);
    if (items.length < count) {
      // fallback pad
      const pad = fallbackGenerate(topic, count - items.length, tone).map(i=>i.text);
      const combined = items.concat(pad);
      lastGenerated = combined.map(t=>({ id:uid("g_"), text:t }));
    } else {
      lastGenerated = items.map(t=>({ id:uid("g_"), text:t }));
    }
    renderGenerated(lastGenerated);
  } catch (err) {
    console.error(err);
    if (confirm("OpenAI failed: " + (err.message||err) + "\nUse offline fallback?")) {
      lastGenerated = fallbackGenerate(topic,count,tone);
      renderGenerated(lastGenerated);
    } else {
      genResults.innerHTML = `<p class="hint">Error generating: ${err.message}</p>`;
    }
  }
};

// ---------- Studio actions (Refine / Build plan / Name / Pitch / Validate / Save) ----------
async function doAction(action) {
  if (!selectedIdea) return alert("Open an idea first.");
  const key = (apiKeyInput.value || "").trim();
  studioOutput.innerHTML = `<p class="hint">Working…</p>`;
  try {
    if (!key || key.length < 10) {
      // offline versions
      if (action === "refine") {
        studioOutput.innerHTML = `<pre>${selectedIdea.text}\n\nRefined: ${selectedIdea.text} — now with clearer value prop and CTA.</pre>`;
      } else if (action === "plan") {
        studioOutput.innerHTML = `<pre>Problem: ...\nSolution: ...\nTarget: early adopters\nMVP: build minimal feature\nRevenue: freemium/subscription</pre>`;
      } else if (action === "name") {
        const nm = selectedIdea.text.split(" ").slice(0,3).join("") + "-" + Math.floor(Math.random()*999);
        studioOutput.innerHTML = `<p><strong>Name:</strong> ${nm}</p><p><strong>Tagline:</strong> ${truncate("A smart solution for " + selectedIdea.topic,80)}</p><p><strong>Logo prompt:</strong> "Minimal wordmark, sleek tech, gradient"</p>`;
      } else if (action === "pitch") {
        studioOutput.innerHTML = `<pre>One-line: ${truncate(selectedIdea.text,120)}\nProblem: ...\nSolution: ...\nTAM: estimated\nAsk: prototype & early users</pre>`;
      } else if (action === "validate") {
        const score = offlineValidateScore(selectedIdea.text);
        const risks = offlineRiskMap(selectedIdea.text);
        studioOutput.innerHTML = `<p><strong>Validation score:</strong> ${score}/100</p><p><strong>Risks</strong> — Technical ${risks.tech}, Market ${risks.market}, Execution ${risks.exec}</p>`;
      }
      return;
    }

    // When API key present, call OpenAI for richer outputs
    if (action === "refine") {
      const prompt = `Refine this idea into a clearer, more actionable product concept. Idea:\n\n${selectedIdea.text}\n\nProvide a concise refined idea (2-4 sentences) and 3 concrete next steps.`;
      const res = await callOpenAI(key, prompt, { max_tokens: 300 });
      studioOutput.innerHTML = `<pre>${res}</pre>`;
    } else if (action === "plan") {
      const prompt = `Create a mini business plan (Problem, Solution, Target Users, 3 Key Features, Pricing, MVP) for: "${selectedIdea.text}"`;
      const res = await callOpenAI(key, prompt, { max_tokens: 400 });
      studioOutput.innerHTML = `<pre>${res}</pre>`;
    } else if (action === "name") {
      const prompt = `Propose 6 catchy brand names and 3 short taglines for: "${selectedIdea.text}". Also give a short logo design prompt suitable for a designer.`;
      const res = await callOpenAI(key, prompt, { max_tokens: 300 });
      studioOutput.innerHTML = `<pre>${res}</pre>`;
    } else if (action === "pitch") {
      const prompt = `Create a 1-slide investor pitch for: "${selectedIdea.text}" — include: One-line, Problem, Solution, Business model, GTM, Key metric to hit in 6 months.`;
      const res = await callOpenAI(key, prompt, { max_tokens: 350 });
      studioOutput.innerHTML = `<pre>${res}</pre>`;
    } else if (action === "validate") {
      // produce a score + risk breakdown
      const prompt = `Score the idea below 0-100 for market potential, explain reasoning, and give three short risk ratings (technical, market, execution) on scale 0-10.\n\nIdea:\n${selectedIdea.text}\n\nReturn JSON like: {"score":75,"tech":4,"market":6,"exec":5,"notes":"..."}\n`;
      const res = await callOpenAI(key, prompt, { max_tokens: 220, temperature: 0.6 });
      // attempt to parse JSON out
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const obj = JSON.parse(jsonMatch[0]);
          studioOutput.innerHTML = `<p><strong>Score:</strong> ${obj.score}/100</p><p>Risks — Tech: ${obj.tech}, Market: ${obj.market}, Exec: ${obj.exec}</p><pre>${obj.notes || ""}</pre>`;
        } catch(e) {
          studioOutput.innerHTML = `<pre>${res}</pre>`;
        }
      } else {
        studioOutput.innerHTML = `<pre>${res}</pre>`;
      }
    }
  } catch (err) {
    console.error(err);
    if (confirm("AI call failed: " + (err.message||err) + "\nUse offline fallback output?")) {
      doActionOffline(action);
    } else {
      studioOutput.innerHTML = `<p class="hint">Error: ${err.message}</p>`;
    }
  }
}

function doActionOffline(action){
  if (action === "refine") {
    studioOutput.innerHTML = `<pre>Refined: ${selectedIdea.text} — improved clarity, defined target user, 3 next steps: 1) Validate, 2) Build MVP, 3) Get 10 users</pre>`;
  } else if (action === "plan") {
    studioOutput.innerHTML = `<pre>Problem: ...\nSolution: ...\nTarget: early adopters\nFeatures: A, B, C\nPricing: free trial → subscription\nMVP: minimal feature</pre>`;
  } else if (action === "name") {
    const nm = selectedIdea.text.split(" ").slice(0,3).join("") + "-" + Math.floor(Math.random()*999);
    studioOutput.innerHTML = `<p><strong>Name:</strong> ${nm}</p><p><strong>Tagline:</strong> ${truncate("A smarter way to " + selectedIdea.topic,80)}</p>`;
  } else if (action === "pitch") {
    studioOutput.innerHTML = `<pre>One-line: ${truncate(selectedIdea.text,120)}\nProblem/Solution: ...\nAsk: prototype & 100 early users</pre>`;
  } else if (action === "validate") {
    const score = offlineValidateScore(selectedIdea.text);
    const r = offlineRiskMap(selectedIdea.text);
    studioOutput.innerHTML = `<p><strong>Score:</strong> ${score}/100</p><p>Risks — Tech ${r.tech}, Market ${r.market}, Exec ${r.exec}</p>`;
  }
}

// ---------- Offline "AI" scoring (simple heuristics) ----------
function offlineValidateScore(text) {
  // heuristics: length, business-y words, novelty-ish tokens
  const lenScore = clamp(Math.min(40, text.length / 4), 5, 40);
  const bizWords = (text.match(/\b(market|users|platform|SaaS|subscription|plugin|marketplace|agency|product)\b/gi) || []).length;
  const bizScore = clamp(bizWords * 8, 0, 40);
  const novelty = Math.random() * 20;
  return Math.round(clamp(lenScore + bizScore + novelty, 10, 95));
}

function offlineRiskMap(text) {
  const tech = Math.round( clamp( Math.random()*6 + (text.toLowerCase().includes("ai")?1:0), 1, 9 ) );
  const market = Math.round( clamp( Math.random()*6 + (text.toLowerCase().includes("market")?1:0), 1, 9 ) );
  const exec = Math.round( clamp( Math.random()*6 + (text.length>140?0:1), 1, 9 ) );
  return { tech, market, exec };
}

// ---------- Save idea to library ----------
function saveCurrentIdea() {
  if (!selectedIdea) return alert("Open an idea first.");
  const set = {
    id: uid("set_"),
    topic: selectedIdea.topic || (topicInput.value||"misc"),
    idea: selectedIdea.text,
    createdAt: new Date().toISOString(),
    tags: [],
    meta: { score: null }
  };
  savedSets.unshift(set);
  saveSaved(); renderLibrary(); drawGalaxy();
  alert("Idea saved to library.");
}

// ---------- Library rendering ----------
function renderLibrary() {
  library.innerHTML = "";
  loadSaved(); loadFavs();
  if (!savedSets.length) {
    library.innerHTML = `<p class="hint">No saved ideas yet. Save ideas from the studio.</p>`; return;
  }
  savedSets.slice(0,200).forEach(s => {
    const it = create("div", { class: "library-item" });
    const left = create("div", {});
    const h = create("h4",{ text: truncate(s.idea,72) });
    const meta = create("div", { html: `<small style="opacity:.8">${s.topic} • ${new Date(s.createdAt).toLocaleString()}</small>` });
    left.appendChild(h); left.appendChild(meta);
    const actions = create("div", { style:"margin-left:auto;display:flex;gap:6px;align-items:center" });
    const open = create("button",{ class:"btn", text:"Open" });
    const fav = create("button",{ class:"btn", text:"★" });
    const del = create("button",{ class:"btn", text:"Delete" });
    open.onclick = ()=> {
      selectedIdea = { id: s.id, text: s.idea, topic: s.topic };
      studioTitle.textContent = s.topic; studioText.textContent = s.idea; studioOutput.innerHTML=""; studio.hidden=false; studioEmpty.hidden=true;
      window.scrollTo({top:0,behavior:"smooth"});
    };
    fav.onclick = ()=> {
      favorites.unshift({ id: uid("fav_"), topic: s.topic, idea: s.idea, createdAt: new Date().toISOString() });
      saveFavs(); alert("Added to favorites"); renderLibrary();
    };
    del.onclick = ()=> {
      if (!confirm("Delete this saved idea?")) return;
      savedSets = savedSets.filter(x=>x.id!==s.id); saveSaved(); renderLibrary(); drawGalaxy();
    };
    actions.appendChild(open); actions.appendChild(fav); actions.appendChild(del);
    it.appendChild(left); it.appendChild(actions);
    library.appendChild(it);
  });
}

// ---------- Merge selected checkboxes ----------
mergeBtn.onclick = () => {
  const checked = Array.from(document.querySelectorAll(".idea-card input[type='checkbox']:checked"));
  if (checked.length < 2) return alert("Select at least two generated ideas to merge.");
  const ids = checked.map(c => c.dataset.id);
  const texts = lastGenerated.filter(x => ids.includes(x.id)).map(x => x.text);
  const merged = texts.join(" — MERGED WITH — ");
  const result = { id: uid("g_"), text: `Hybrid idea: ${merged}` };
  lastGenerated.unshift(result);
  renderGenerated(lastGenerated);
  openInStudio(result);
};

// ---------- Export saved sets ----------
exportJSONBtn.onclick = () => {
  loadSaved();
  const blob = new Blob([JSON.stringify(savedSets, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ideaforge_saved.json"; document.body.appendChild(a); a.click(); a.remove();
};
exportTXTBtn.onclick = () => {
  loadSaved();
  const txt = savedSets.map(s=>`Topic: ${s.topic}\nIdea: ${s.idea}\nSaved: ${s.createdAt}\n---\n`).join("\n");
  const blob = new Blob([txt], { type: "text/plain" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ideaforge_saved.txt"; document.body.appendChild(a); a.click(); a.remove();
};

// ---------- Clear storage ----------
clearStorageBtn.onclick = () => {
  if (!confirm("Clear all saved ideas and favorites? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_SETS); localStorage.removeItem(STORAGE_FAVS);
  savedSets = []; favorites = []; renderLibrary(); drawGalaxy(); alert("Cleared.");
};

// ---------- Favorites actions ----------
showFavsBtn.onclick = () => {
  loadFavs();
  if (!favorites.length) return alert("No favorites.");
  alert("Favorites (newest first):\n\n" + favorites.slice(0,50).map((f,i)=>`${i+1}. ${truncate(f.idea,80)} — ${f.topic}`).join("\n\n"));
};
clearFavsBtn.onclick = () => {
  if (!confirm("Clear favorites?")) return;
  localStorage.removeItem(STORAGE_FAVS); favorites=[]; renderLibrary(); drawGalaxy();
};

// ---------- Studio buttons hookup ----------
$("#refineBtn").onclick = ()=> doAction("refine");
$("#buildPlanBtn").onclick = ()=> doAction("plan");
$("#nameBtn").onclick = ()=> doAction("name");
$("#pitchBtn").onclick = ()=> doAction("pitch");
$("#validateBtn").onclick = ()=> doAction("validate");
$("#saveSetBtn").onclick = ()=> saveCurrentIdea();

// ---------- Galaxy visualization (Creativerse) ----------
const canvas = galaxyCanvas;
const ctx = canvas.getContext("2d");
let cam = { x:0, y:0, scale:1 };
let dragging = false, dragStart = null;
let planets = []; // {id, x,y,r,color,ref: savedSet}

function randomColor() {
  const hues = ["#f97316","#fb7185","#60a5fa","#7c3aed","#34d399","#facc15"];
  return hues[Math.floor(Math.random()*hues.length)];
}

function generatePlanets() {
  loadSaved();
  planets = savedSets.slice(0,200).map((s,i)=>{
    const angle = (i / Math.max(1,savedSets.length)) * Math.PI*2 + Math.random()*0.3;
    const dist = 40 + i*6 + Math.random()*120;
    const x = Math.cos(angle)*dist + (Math.random()*200-100);
    const y = Math.sin(angle)*dist + (Math.random()*200-100);
    return { id: s.id, x, y, r: 8 + Math.min(24, Math.random()*30), color: randomColor(), ref: s };
  });
}

function drawGalaxy() {
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // background stars
  for (let i=0;i<80;i++){
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 1,1);
  }
  // draw planets
  planets.forEach(p => {
    const sx = canvas.width/2 + (p.x - cam.x) * cam.scale;
    const sy = canvas.height/2 + (p.y - cam.y) * cam.scale;
    const sr = p.r * cam.scale;
    // glow
    const g = ctx.createRadialGradient(sx,sy,sr*0.2,sx,sy,sr*2);
    g.addColorStop(0, p.color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx,sy,sr*2,0,Math.PI*2); ctx.fill();
    // planet
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
    // ring sometimes
    if (Math.random() > 0.8) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath(); ctx.ellipse(sx,sy,sr*1.6,sr*0.6, Math.PI/6,0,Math.PI*2); ctx.stroke();
    }
  });
}

canvas.addEventListener("mousedown", (e) => {
  dragging = true; dragStart = { x: e.clientX, y: e.clientY, camx: cam.x, camy: cam.y };
});
canvas.addEventListener("mousemove", (e) => {
  if (dragging && dragStart) {
    const dx = (e.clientX - dragStart.x) / cam.scale;
    const dy = (e.clientY - dragStart.y) / cam.scale;
    cam.x = dragStart.camx - dx; cam.y = dragStart.camy - dy;
    drawGalaxy();
  }
});
canvas.addEventListener("mouseup", (e) => { dragging=false; dragStart=null; });
canvas.addEventListener("mouseleave", ()=>{ dragging=false; dragStart=null; });
canvas.addEventListener("click", (e)=>{
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left), my = (e.clientY - rect.top);
  const clicked = planets.find(p=>{
    const sx = canvas.width/2 + (p.x - cam.x) * cam.scale;
    const sy = canvas.height/2 + (p.y - cam.y) * cam.scale;
    const sr = p.r * cam.scale;
    const d = Math.hypot(sx - mx, sy - my);
    return d <= sr + 4;
  });
  if (clicked) {
    // open in studio
    selectedIdea = { id: clicked.ref.id, text: clicked.ref.idea, topic: clicked.ref.topic };
    studioTitle.textContent = selectedIdea.topic; studioText.textContent = selectedIdea.text; studioOutput.innerHTML=""; studio.hidden=false; studioEmpty.hidden=true;
  }
});

// ---------- Initial load ----------
function init() {
  loadSaved(); loadFavs();
  renderLibrary();
  generatePlanets();
  drawGalaxy();
  renderGenerated([]);
}
init();

// redraw on resize
window.addEventListener("resize", () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; drawGalaxy(); });
canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;

// ---------- Helper: re-generate planets when storage changes ----------
function drawGalaxyDebounced(){
  generatePlanets();
  drawGalaxy();
}
window.addEventListener("storage", drawGalaxyDebounced);
