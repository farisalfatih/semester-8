/* ═══════════════════════════════════════════════════
   pemograman-kripto — script.js
   - Ambil raw OHLCV dari /api/data
   - Hitung RSI + BB di browser (technicalindicators)
   - Tanpa login — langsung load saat halaman dibuka
═══════════════════════════════════════════════════ */

"use strict";

// ══════════════════════════════════════════════════
//  INDIKATOR — Pure JavaScript, tanpa library
// ══════════════════════════════════════════════════

/**
 * RSI (Relative Strength Index) — periode default 14
 * Return array panjang sama dengan input, null pada warmup awal.
 */
function calcRSI(prices, period = 14) {
  const result = new Array(prices.length).fill(null);
  if (prices.length < period + 1) return result;

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) avgGain += diff;
    else           avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < prices.length; i++) {
    if (i > period) {
      const diff = prices[i] - prices[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/**
 * Bollinger Bands — periode default 20, stdDev default 2
 * Return { upper, middle, lower } masing-masing array,
 * null pada warmup awal.
 */
function calcBB(prices, period = 20, stdDev = 2) {
  const upper  = new Array(prices.length).fill(null);
  const middle = new Array(prices.length).fill(null);
  const lower  = new Array(prices.length).fill(null);

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const sma   = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - sma) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper[i]  = sma + stdDev * sd;
    middle[i] = sma;
    lower[i]  = sma - stdDev * sd;
  }
  return { upper, middle, lower };
}


// ── Config ───────────────────────────────────────
const API = window.location.origin;

const PAIRS = [
  { key: "btc_idr",  label: "BTC",  full: "Bitcoin"   },
  { key: "eth_idr",  label: "ETH",  full: "Ethereum"  },
  { key: "ada_idr",  label: "ADA",  full: "Cardano"   },
  { key: "bnb_idr",  label: "BNB",  full: "BNB Chain" },
  { key: "usdt_idr", label: "USDT", full: "Tether"    },
];

const DAY_OPTS = [
  { v: 1,  l: "1H"  },
  { v: 3,  l: "3H"  },
  { v: 7,  l: "7H"  },
  { v: 14, l: "14H" },
  { v: 30, l: "30H" },
  { v: 90, l: "90H" },
];

const MAX_CHART_PTS = 200;   // titik maksimal di grafik (dekimasi)
const TABLE_ROWS    = 100;   // baris tabel

// ── State ─────────────────────────────────────────
let currentPair = "btc_idr";
let currentDays = 7;
let allData     = {};
let autoTimer   = null;
let autoOn      = false;
let chartPrice  = null;
let chartRsi    = null;
let chartBb     = null;

// ── Helpers ───────────────────────────────────────
const el = id => document.getElementById(id);

/**
 * Format angka ke format IDR tanpa simbol mata uang.
 * Aman — tidak pernah inject HTML.
 */
function fmtNum(n, dec = 0) {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString("id-ID", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

/**
 * Format timestamp ke jam atau tanggal+jam sesuai range.
 */
function fmtTs(ts) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (currentDays > 3) {
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
           + " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return d.toLocaleTimeString("id-ID", { hour12: false });
  } catch {
    return String(ts);
  }
}

/**
 * Mapping signal ke CSS class — tidak ada inject HTML berbahaya.
 */
function sigClass(sig) {
  const map = {
    "STRONG BUY":  "sig-strong-buy",
    "BUY":         "sig-buy",
    "WEAK BUY":    "sig-weak-buy",
    "STRONG SELL": "sig-strong-sell",
    "SELL":        "sig-sell",
    "WEAK SELL":   "sig-weak-sell",
    "NEUTRAL":     "sig-neutral",
  };
  return map[(sig || "").toUpperCase()] || "sig-neutral";
}

/** Buat elemen <span class="sig ..."> — aman, tidak pakai innerHTML */
function makeSigEl(sig) {
  const span = document.createElement("span");
  span.className = "sig " + sigClass(sig);
  span.textContent = sig || "—";
  return span;
}

/** Toast — aman, tidak accept HTML */
function toast(msg, type = "info", ms = 3500) {
  const c  = el("toasts");
  const d  = document.createElement("div");
  d.className   = `toast toast-${type}`;
  d.textContent = msg;                   // textContent, bukan innerHTML
  c.appendChild(d);
  setTimeout(() => {
    d.style.transition = "opacity .3s";
    d.style.opacity    = "0";
    setTimeout(() => d.remove(), 300);
  }, ms);
}

function showLoader(txt = "Memuat data…") {
  el("loader-txt").textContent = txt;
  el("loader").classList.remove("hidden");
}
function hideLoader() { el("loader").classList.add("hidden"); }

function setStatus(state) {
  el("status-dot").className    = `dot dot-${state}`;
  el("status-label").textContent =
    state === "online"  ? "Live"     :
    state === "loading" ? "Updating" : "Offline";
}

// ── Build UI ──────────────────────────────────────
function buildTabs() {
  const nav = el("pair-tabs");
  nav.innerHTML = "";
  PAIRS.forEach((p, i) => {
    const btn = document.createElement("button");
    btn.className   = "pair-tab" + (i === 0 ? " active" : "");
    btn.dataset.pair = p.key;
    btn.textContent  = p.label + "/IDR";
    btn.addEventListener("click", () => switchPair(btn, p.key));
    nav.appendChild(btn);
  });
}

function buildDaySelector() {
  const c = el("day-selector");
  c.innerHTML = "";
  DAY_OPTS.forEach(d => {
    const btn = document.createElement("button");
    btn.className   = "day-btn" + (d.v === currentDays ? " active" : "");
    btn.dataset.days = d.v;
    btn.textContent  = d.l;
    btn.title        = `${d.v} hari`;
    btn.addEventListener("click", () => switchDays(btn, d.v));
    c.appendChild(btn);
  });
}

function switchPair(btn, pair) {
  document.querySelectorAll(".pair-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  currentPair = pair;
  if (allData[pair]) renderPair(pair);
}

function switchDays(btn, days) {
  document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentDays = days;
  allData = {};        // reset agar tidak tampil data lama sementara fetch
  loadData();
}

// ── Fetch API ──────────────────────────────────────
async function loadData() {
  setStatus("loading");
  showLoader(`Mengambil data ${currentDays} hari…`);
  try {
    const res = await fetch(`${API}/api/data?days=${currentDays}`);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.detail || `HTTP ${res.status}`);
    }

    const json = await res.json();
    allData = json.data || {};
    renderPair(currentPair);
    el("last-update").textContent = new Date().toLocaleTimeString("id-ID");
    setStatus("online");

    const count = allData[currentPair]?.count ?? 0;
    toast(`Data ${currentDays} hari dimuat · ${count} baris.`, "success", 2000);

  } catch (e) {
    setStatus("offline");
    toast(`Gagal memuat data: ${e.message}`, "error");
  } finally {
    hideLoader();
  }
}

function toggleAuto() {
  const btn = el("btn-auto");
  autoOn = !autoOn;
  if (autoOn) {
    autoTimer = setInterval(loadData, 60_000);
    btn.textContent        = "⏸ Auto";
    btn.style.borderColor  = "var(--green)";
    btn.style.color        = "var(--green)";
    toast("Auto-refresh aktif (60 detik)", "info", 2000);
  } else {
    clearInterval(autoTimer);
    btn.textContent       = "▶ Auto";
    btn.style.borderColor = "";
    btn.style.color       = "";
  }
}

// ── Render Pair ────────────────────────────────────
function renderPair(pair) {
  const pInfo = PAIRS.find(p => p.key === pair) || { label: pair, full: "" };
  const d     = allData[pair];

  if (!d || d.error) {
    toast(`Error ${pair}: ${d?.error ?? "tidak ada data"}`, "error");
    return;
  }

  const rows = d.rows || [];
  if (!rows.length) { toast(`Tidak ada data untuk ${pair}`, "info"); return; }

  // Update label
  el("pair-active-label").textContent = `${pInfo.label}/IDR`;
  el("pair-title").textContent        = `${pInfo.label}/IDR`;
  el("pair-subtitle").textContent     = `${pInfo.full} · ${currentDays} hari · ${rows.length} data`;
  el("tbl-count").textContent         = `${Math.min(rows.length, TABLE_ROWS)} / ${rows.length} baris`;
  el("badge-rows").textContent        = `${rows.length} tick`;

  // Ekstrak close prices
  const closes = rows.map(r => r.last);
  const times  = rows.map(r => r.server_time || r.ts);

  // ── Hitung indikator di browser (pure JS, tanpa library) ──
  const rsiPad = calcRSI(closes, 14);
  const { upper: bbU, middle: bbM, lower: bbL } = calcBB(closes, 20, 2);

  // Signal gabungan
  const signals = closes.map((price, i) => {
    const rsi = rsiPad[i], bu = bbU[i], bl = bbL[i];
    if (rsi == null || bu == null || bl == null) return "NEUTRAL";
    if (rsi < 30 && price <= bl) return "STRONG BUY";
    if (rsi > 70 && price >= bu) return "STRONG SELL";
    if (rsi < 40 && price < bl)  return "BUY";
    if (rsi > 60 && price > bu)  return "SELL";
    if (rsi < 50)                return "WEAK BUY";
    if (rsi > 50)                return "WEAK SELL";
    return "NEUTRAL";
  });

  // Latest values (data paling baru = index terakhir)
  const last  = rows[rows.length - 1];
  const lRsi  = rsiPad[rsiPad.length - 1];
  const lBbu  = bbU[bbU.length - 1];
  const lBbm  = bbM[bbM.length - 1];
  const lBbl  = bbL[bbL.length - 1];
  const lSig  = signals[signals.length - 1];

  // ── Update summary cards ─────────────────────────
  el("c-last").textContent = fmtNum(last.last,   0);
  el("c-high").textContent = fmtNum(last.high,   0);
  el("c-low").textContent  = fmtNum(last.low,    0);
  el("c-buy").textContent  = fmtNum(last.buy,    0);
  el("c-sell").textContent = fmtNum(last.sell,   0);
  el("c-vol").textContent  = fmtNum(last.vol_idr, 0);
  el("c-rsi").textContent  = lRsi != null ? fmtNum(lRsi, 2) : "—";
  el("c-bbu").textContent  = fmtNum(lBbu, 0);
  el("c-bbm").textContent  = fmtNum(lBbm, 0);
  el("c-bbl").textContent  = fmtNum(lBbl, 0);

  // Signal card — pakai DOM, bukan innerHTML
  const sigEl = el("c-signal");
  sigEl.textContent = "";
  sigEl.appendChild(makeSigEl(lSig));

  // RSI card — warna dinamis
  const rsiCard = el("c-rsi");
  rsiCard.className = "card-val mono " +
    (lRsi == null ? "orange" : lRsi > 70 ? "red" : lRsi < 30 ? "green" : "orange");

  // ── Decimasi data untuk grafik ───────────────────
  // Ambil titik setiap `step` agar chart tetap ringan
  const n    = closes.length;
  const step = Math.max(1, Math.ceil(n / MAX_CHART_PTS));
  const idx  = [];
  for (let i = 0; i < n; i++) {
    if (i % step === 0 || i === n - 1) idx.push(i);
  }

  const cLbls = idx.map(i => fmtTs(times[i]));
  const cCl   = idx.map(i => closes[i]);
  const cRsi  = idx.map(i => rsiPad[i]);
  const cBbu  = idx.map(i => bbU[i]);
  const cBbm  = idx.map(i => bbM[i]);
  const cBbl  = idx.map(i => bbL[i]);

  renderPriceChart(cLbls, cCl);
  renderRsiChart(cLbls, cRsi);
  renderBbChart(cLbls, cCl, cBbu, cBbm, cBbl);

  // ── Tabel — build dengan DOM (bukan innerHTML besar) ──
  renderTable(rows, rsiPad, bbU, bbM, bbL, signals);
}

// ── Table render (aman: textContent + DOM) ─────────
function renderTable(rows, rsiPad, bbU, bbM, bbL, signals) {
  const tbody   = el("tbody");
  tbody.textContent = "";   // bersihkan dengan aman

  const disp    = [...rows].reverse().slice(0, TABLE_ROWS);
  const rsiRev  = [...rsiPad].reverse();
  const buRev   = [...bbU].reverse();
  const bmRev   = [...bbM].reverse();
  const blRev   = [...bbL].reverse();
  const sigRev  = [...signals].reverse();

  const frag = document.createDocumentFragment();

  disp.forEach((r, i) => {
    const tr = document.createElement("tr");
    const cells = [
      { text: String(i + 1),               cls: "muted" },
      { text: fmtTs(r.server_time || r.ts), cls: "muted" },
      { text: fmtNum(r.last,   0),          cls: "yellow" },
      { text: fmtNum(r.buy,    0),          cls: "" },
      { text: fmtNum(r.sell,   0),          cls: "" },
      { text: fmtNum(r.high,   0),          cls: "green" },
      { text: fmtNum(r.low,    0),          cls: "red" },
      { text: fmtNum(r.vol_idr,0),          cls: "muted" },
      { text: rsiRev[i] != null ? fmtNum(rsiRev[i], 2) : "—", cls: "orange" },
      { text: fmtNum(buRev[i], 0),          cls: "red" },
      { text: fmtNum(bmRev[i], 0),          cls: "cyan" },
      { text: fmtNum(blRev[i], 0),          cls: "green" },
    ];

    cells.forEach(({ text, cls }) => {
      const td = document.createElement("td");
      if (cls) td.className = cls;
      td.textContent = text;
      tr.appendChild(td);
    });

    // Signal cell — elemen DOM
    const tdSig = document.createElement("td");
    tdSig.appendChild(makeSigEl(sigRev[i]));
    tr.appendChild(tdSig);

    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}

// ── Chart options (shared) ─────────────────────────
const COPT = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  plugins: {
    legend: {
      labels: {
        color: "#6272a4",
        font: { family: "'JetBrains Mono'", size: 10 },
        boxWidth: 10, boxHeight: 2, padding: 12,
      },
    },
    tooltip: {
      backgroundColor: "#24253a",
      titleColor: "#f8f8f2",
      bodyColor: "#8be9fd",
      borderColor: "#414368",
      borderWidth: 1,
      cornerRadius: 8,
      padding: 9,
    },
  },
  scales: {
    x: {
      ticks: {
        color: "#414368",
        font: { family: "'JetBrains Mono'", size: 9 },
        maxTicksLimit: 8,
        maxRotation: 0,
      },
      grid: { color: "rgba(65,67,104,.28)" },
    },
    y: {
      ticks: {
        color: "#414368",
        font: { family: "'JetBrains Mono'", size: 9 },
      },
      grid: { color: "rgba(65,67,104,.28)" },
    },
  },
};

function destroyCharts() {
  [chartPrice, chartRsi, chartBb].forEach(c => { if (c) c.destroy(); });
  chartPrice = chartRsi = chartBb = null;
}

function renderPriceChart(labels, close) {
  if (chartPrice) chartPrice.destroy();
  chartPrice = new Chart(el("chartPrice").getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Price", data: close,
        borderColor: "#f1fa8c",
        backgroundColor: "rgba(241,250,140,.06)",
        borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true,
      }],
    },
    options: structuredClone(COPT),
  });
}

function renderRsiChart(labels, rsi) {
  if (chartRsi) chartRsi.destroy();
  const opts = structuredClone(COPT);
  opts.scales.y.min = 0;
  opts.scales.y.max = 100;
  chartRsi = new Chart(el("chartRsi").getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "RSI(14)", data: rsi,
          borderColor: "#ffb86c", backgroundColor: "rgba(255,184,108,.07)",
          borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true },
        { label: "OB 70", data: new Array(labels.length).fill(70),
          borderColor: "rgba(255,85,85,.4)", borderDash: [6, 3],
          borderWidth: 1, pointRadius: 0 },
        { label: "OS 30", data: new Array(labels.length).fill(30),
          borderColor: "rgba(80,250,123,.4)", borderDash: [6, 3],
          borderWidth: 1, pointRadius: 0 },
      ],
    },
    options: opts,
  });
}

function renderBbChart(labels, close, upper, middle, lower) {
  if (chartBb) chartBb.destroy();
  chartBb = new Chart(el("chartBb").getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Price",  data: close,
          borderColor: "#f1fa8c",              backgroundColor: "transparent",
          borderWidth: 2,   pointRadius: 0, tension: 0.3 },
        { label: "Upper",  data: upper,
          borderColor: "rgba(255,85,85,.6)",   backgroundColor: "rgba(255,85,85,.04)",
          borderWidth: 1.5, pointRadius: 0, tension: 0.3, borderDash: [5, 3] },
        { label: "SMA20",  data: middle,
          borderColor: "rgba(139,233,253,.6)", backgroundColor: "transparent",
          borderWidth: 1.5, pointRadius: 0, tension: 0.3, borderDash: [7, 4] },
        { label: "Lower",  data: lower,
          borderColor: "rgba(80,250,123,.6)",  backgroundColor: "rgba(80,250,123,.04)",
          borderWidth: 1.5, pointRadius: 0, tension: 0.3, borderDash: [5, 3], fill: "-1" },
      ],
    },
    options: structuredClone(COPT),
  });
}

// ── Init ──────────────────────────────────────────
// Script diletakkan di bawah </body> setelah CDN,
// jadi Chart dan ti sudah pasti tersedia di sini.
buildTabs();
buildDaySelector();
loadData();
