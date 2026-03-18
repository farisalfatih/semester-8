/* ═══════════════════════════════════════════════════
   pemograman-kripto — script.js  v4.0
   - Fetch data + indikator dari /api/data (sudah dihitung di Python)
   - JS hanya render: chart, tabel, cards
   - Auto-refresh tiap 60 detik mengikuti ETL
═══════════════════════════════════════════════════ */

"use strict";

// ── Config ────────────────────────────────────────────────────────────────────
const API          = window.location.origin;
const AUTO_INTERVAL = 60_000;   // 60 detik = ikut ETL
const MAX_CHART_PTS = 300;      // titik maksimal di chart (desimasi)
const TABLE_ROWS    = 100;      // baris tabel

const PAIRS = [
  { key: "btc_idr",  label: "BTC",  full: "Bitcoin"   },
  { key: "eth_idr",  label: "ETH",  full: "Ethereum"  },
  { key: "ada_idr",  label: "ADA",  full: "Cardano"   },
  { key: "bnb_idr",  label: "BNB",  full: "BNB Chain" },
  { key: "usdt_idr", label: "USDT", full: "Tether"    },
];

const DAY_OPTS = [
  { v: 1,  l: "1D"  },
  { v: 3,  l: "3D"  },
  { v: 7,  l: "7D"  },
  { v: 14, l: "14D" },
  { v: 30, l: "30D" },
];

// ── State ─────────────────────────────────────────────────────────────────────
let currentPair  = "btc_idr";
let currentDays  = 14;
let allData      = {};
let autoTimer    = null;
let autoOn       = false;
let chartPrice   = null;
let chartRsi     = null;
let chartBb      = null;
let chartCombined = null;

// ── DOM helpers ───────────────────────────────────────────────────────────────
const el = id => document.getElementById(id);

function fmtNum(n, dec = 0) {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString("id-ID", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtTs(ts) {
  // ts = string ISO "2026-03-18T10:30:00" dari kolom TIMESTAMP PostgreSQL.
  // Parse MANUAL — tidak pakai new Date() agar tidak ada konversi timezone.
  // Hasilnya selalu persis sama dengan waktu yang tersimpan di DB.
  if (ts == null || ts === "") return "—";
  try {
    const s      = String(ts).replace(" ", "T").split(".")[0]; // normalise
    const [date, time = "00:00:00"] = s.split("T");
    const parts  = date.split("-");   // ["2026","03","18"]
    const tparts = time.split(":");   // ["10","30","00"]
    const dd  = parts[2];
    const mm  = parseInt(parts[1], 10) - 1;  // 0-based
    const hh  = tparts[0];
    const mn  = tparts[1];
    const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun",
                   "Jul","Agu","Sep","Okt","Nov","Des"];
    if (currentDays > 1) {
      return `${dd} ${bulan[mm]} ${hh}:${mn}`;
    }
    return `${hh}:${mn}`;
  } catch {
    return String(ts);
  }
}

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

function makeSigEl(sig) {
  const span = document.createElement("span");
  span.className = "sig " + sigClass(sig);
  span.textContent = sig || "—";
  return span;
}

function toast(msg, type = "info", ms = 3500) {
  const c = el("toasts");
  const d = document.createElement("div");
  d.className   = `toast toast-${type}`;
  d.textContent = msg;
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
  el("status-dot").className     = `dot dot-${state}`;
  el("status-label").textContent =
    state === "online"  ? "Live"     :
    state === "loading" ? "Updating" : "Offline";
}

// ── Build UI ──────────────────────────────────────────────────────────────────
function buildTabs() {
  const nav = el("pair-tabs");
  nav.innerHTML = "";
  PAIRS.forEach((p, i) => {
    const btn = document.createElement("button");
    btn.className    = "pair-tab" + (i === 0 ? " active" : "");
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
    btn.className    = "day-btn" + (d.v === currentDays ? " active" : "");
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
  const info = PAIRS.find(p => p.key === pair);
  el("pair-title").textContent       = (info?.label || pair.toUpperCase()) + "/IDR";
  el("pair-subtitle").textContent    = info?.full || "";
  el("pair-active-label").textContent = (info?.label || pair.toUpperCase()) + "/IDR";
  if (allData[pair]) renderPair(pair);
}

function switchDays(btn, days) {
  document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentDays = days;
  allData = {};
  loadData();
}

// ── Fetch API ─────────────────────────────────────────────────────────────────
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

    el("last-update").textContent =
      new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    renderPair(currentPair);
    setStatus("online");
  } catch (err) {
    setStatus("offline");
    toast("Gagal memuat data: " + err.message, "error");
  } finally {
    hideLoader();
  }
}

// ── Render pair ───────────────────────────────────────────────────────────────
function renderPair(pair) {
  const pairData = allData[pair];
  if (!pairData || pairData.error) {
    toast(`Data ${pair} tidak tersedia`, "error");
    return;
  }

  const rows = pairData.rows || [];
  if (rows.length === 0) {
    toast(`Belum ada data untuk ${pair}`, "info");
    return;
  }

  el("badge-rows").textContent = `${rows.length} tick`;

  // Data sudah ada indikator dari server (Python/ta)
  const times  = rows.map(r => r.ts);
  const closes = rows.map(r => r.last);
  const rsiArr = rows.map(r => r.rsi);
  const bbU    = rows.map(r => r.bb_upper);
  const bbM    = rows.map(r => r.bb_middle);
  const bbL    = rows.map(r => r.bb_lower);
  const sigs   = rows.map(r => r.signal || "NEUTRAL");

  // Latest values
  const last = rows[rows.length - 1];
  const lRsi = last.rsi;
  const lBbu = last.bb_upper;
  const lBbm = last.bb_middle;
  const lBbl = last.bb_lower;
  const lSig = last.signal || "NEUTRAL";

  // ── Summary cards ──────────────────────────────────────────────────────────
  el("c-last").textContent = fmtNum(last.last,    0);
  el("c-high").textContent = fmtNum(last.high,    0);
  el("c-low").textContent  = fmtNum(last.low,     0);
  el("c-buy").textContent  = fmtNum(last.buy,     0);
  el("c-sell").textContent = fmtNum(last.sell,    0);
  el("c-vol").textContent  = fmtNum(last.vol_idr, 0);
  el("c-rsi").textContent  = lRsi != null ? fmtNum(lRsi, 2) : "—";
  el("c-bbu").textContent  = fmtNum(lBbu, 0);
  el("c-bbm").textContent  = fmtNum(lBbm, 0);
  el("c-bbl").textContent  = fmtNum(lBbl, 0);

  // Signal card
  const sigEl = el("c-signal");
  sigEl.textContent = "";
  sigEl.appendChild(makeSigEl(lSig));

  // RSI card warna dinamis
  el("c-rsi").className = "card-val mono " +
    (lRsi == null ? "orange" : lRsi > 70 ? "red" : lRsi < 30 ? "green" : "orange");

  // ── Desimasi untuk chart ────────────────────────────────────────────────────
  const n    = closes.length;
  const step = Math.max(1, Math.ceil(n / MAX_CHART_PTS));
  const idx  = [];
  for (let i = 0; i < n; i++) {
    if (i % step === 0 || i === n - 1) idx.push(i);
  }

  const cLbls = idx.map(i => fmtTs(times[i]));
  const cCl   = idx.map(i => closes[i]);
  const cRsi  = idx.map(i => rsiArr[i]);
  const cBbu  = idx.map(i => bbU[i]);
  const cBbm  = idx.map(i => bbM[i]);
  const cBbl  = idx.map(i => bbL[i]);

  renderPriceChart(cLbls, cCl);
  renderRsiChart(cLbls, cRsi);
  renderBbChart(cLbls, cCl, cBbu, cBbm, cBbl);
  renderCombinedChart(cLbls, cCl, cRsi, cBbu, cBbm, cBbl);

  // ── Tabel ───────────────────────────────────────────────────────────────────
  renderTable(rows, sigs);
}

// ── Table render ──────────────────────────────────────────────────────────────
function renderTable(rows, sigs) {
  const tbody = el("tbody");
  tbody.textContent = "";

  const disp    = [...rows].reverse().slice(0, TABLE_ROWS);
  const sigRev  = [...sigs].reverse();

  const frag = document.createDocumentFragment();
  disp.forEach((r, i) => {
    const tr = document.createElement("tr");
    const cells = [
      { text: String(i + 1),                  cls: "muted"  },
      { text: fmtTs(r.ts),                     cls: "muted"  },
      { text: fmtNum(r.last,    0),            cls: "yellow" },
      { text: fmtNum(r.buy,     0),            cls: ""       },
      { text: fmtNum(r.sell,    0),            cls: ""       },
      { text: fmtNum(r.high,    0),            cls: "green"  },
      { text: fmtNum(r.low,     0),            cls: "red"    },
      { text: fmtNum(r.vol_idr, 0),            cls: "muted"  },
      { text: r.rsi != null ? fmtNum(r.rsi, 2) : "—", cls: "orange" },
      { text: fmtNum(r.bb_upper,  0),          cls: "red"    },
      { text: fmtNum(r.bb_middle, 0),          cls: "cyan"   },
      { text: fmtNum(r.bb_lower,  0),          cls: "green"  },
    ];
    cells.forEach(({ text, cls }) => {
      const td = document.createElement("td");
      if (cls) td.className = cls;
      td.textContent = text;
      tr.appendChild(td);
    });
    const tdSig = document.createElement("td");
    tdSig.appendChild(makeSigEl(sigRev[i]));
    tr.appendChild(tdSig);
    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
  el("tbl-count").textContent = `${disp.length} baris`;
}

// ── Chart base options ─────────────────────────────────────────────────────────
function baseOpts(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
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
          maxTicksLimit: 8, maxRotation: 0,
        },
        grid: { color: "rgba(65,67,104,.25)" },
      },
      y: {
        ticks: {
          color: "#414368",
          font: { family: "'JetBrains Mono'", size: 9 },
        },
        grid: { color: "rgba(65,67,104,.25)" },
      },
      ...extra,
    },
  };
}

function destroyCharts() {
  [chartPrice, chartRsi, chartBb, chartCombined].forEach(c => { if (c) c.destroy(); });
  chartPrice = chartRsi = chartBb = chartCombined = null;
}

// ── Chart: Price ──────────────────────────────────────────────────────────────
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
    options: baseOpts(),
  });
}

// ── Chart: RSI ────────────────────────────────────────────────────────────────
function renderRsiChart(labels, rsi) {
  if (chartRsi) chartRsi.destroy();
  const opts = baseOpts();
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

// ── Chart: Bollinger Bands ────────────────────────────────────────────────────
function renderBbChart(labels, close, upper, middle, lower) {
  if (chartBb) chartBb.destroy();
  chartBb = new Chart(el("chartBb").getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Price",  data: close,
          borderColor: "#f1fa8c",              backgroundColor: "transparent",
          borderWidth: 2, pointRadius: 0, tension: 0.3 },
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
    options: baseOpts(),
  });
}

// ── Chart: Combined RSI + BB (dual-axis) ──────────────────────────────────────
function renderCombinedChart(labels, close, rsi, upper, middle, lower) {
  if (chartCombined) chartCombined.destroy();

  const opts = baseOpts({
    // Sumbu kiri: harga + BB
    yPrice: {
      type: "linear",
      position: "left",
      ticks: {
        color: "#414368",
        font: { family: "'JetBrains Mono'", size: 9 },
      },
      grid: { color: "rgba(65,67,104,.18)" },
    },
    // Sumbu kanan: RSI 0–100
    yRsi: {
      type: "linear",
      position: "right",
      min: 0,
      max: 100,
      ticks: {
        color: "#ffb86c",
        font: { family: "'JetBrains Mono'", size: 9 },
        callback: v => v,
      },
      grid: { drawOnChartArea: false },
    },
  });

  // Hapus skala default "y" agar tidak tumpang-tindih
  delete opts.scales.y;

  chartCombined = new Chart(el("chartCombined").getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        // ── Harga & BB (sumbu kiri) ──────────────────────────────────────────
        { label: "Price",
          data: close,
          yAxisID: "yPrice",
          borderColor: "#f1fa8c",
          backgroundColor: "transparent",
          borderWidth: 2, pointRadius: 0, tension: 0.3, order: 1 },
        { label: "BB Upper",
          data: upper,
          yAxisID: "yPrice",
          borderColor: "rgba(255,85,85,.55)",
          backgroundColor: "rgba(255,85,85,.04)",
          borderWidth: 1.2, pointRadius: 0, tension: 0.3, borderDash: [5, 3], order: 2 },
        { label: "BB Mid (SMA20)",
          data: middle,
          yAxisID: "yPrice",
          borderColor: "rgba(139,233,253,.55)",
          backgroundColor: "transparent",
          borderWidth: 1.2, pointRadius: 0, tension: 0.3, borderDash: [7, 4], order: 3 },
        { label: "BB Lower",
          data: lower,
          yAxisID: "yPrice",
          borderColor: "rgba(80,250,123,.55)",
          backgroundColor: "rgba(80,250,123,.04)",
          borderWidth: 1.2, pointRadius: 0, tension: 0.3, borderDash: [5, 3], fill: false, order: 4 },

        // ── RSI (sumbu kanan) ────────────────────────────────────────────────
        { label: "RSI(14)",
          data: rsi,
          yAxisID: "yRsi",
          borderColor: "#ffb86c",
          backgroundColor: "rgba(255,184,108,.06)",
          borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true, order: 5 },
        { label: "OB 70",
          data: new Array(labels.length).fill(70),
          yAxisID: "yRsi",
          borderColor: "rgba(255,85,85,.3)",
          borderDash: [6, 3], borderWidth: 1, pointRadius: 0, order: 6 },
        { label: "OS 30",
          data: new Array(labels.length).fill(30),
          yAxisID: "yRsi",
          borderColor: "rgba(80,250,123,.3)",
          borderDash: [6, 3], borderWidth: 1, pointRadius: 0, order: 7 },
      ],
    },
    options: opts,
  });
}

// ── Auto refresh ──────────────────────────────────────────────────────────────
function toggleAuto() {
  autoOn = !autoOn;
  const btn = el("btn-auto");
  if (autoOn) {
    btn.textContent = "⏹ Auto";
    btn.style.borderColor = "var(--green)";
    btn.style.color       = "var(--green)";
    autoTimer = setInterval(loadData, AUTO_INTERVAL);
    toast("Auto-refresh aktif (60 detik)", "success");
  } else {
    btn.textContent = "▶ Auto";
    btn.style.borderColor = "";
    btn.style.color       = "";
    clearInterval(autoTimer);
    autoTimer = null;
    toast("Auto-refresh dimatikan", "info");
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
buildTabs();
buildDaySelector();
loadData();
