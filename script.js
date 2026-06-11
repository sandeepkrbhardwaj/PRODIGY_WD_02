/**
 * Task-02 — Stopwatch  |  script.js
 */

'use strict';

/* ── State ── */
let startTime   = 0;
let elapsed     = 0;
let timerID     = null;
let running     = false;
let laps        = [];
let lastLapTime = 0;

/* ── DOM ── */
const elHrs    = document.getElementById('hrs');
const elMins   = document.getElementById('mins');
const elSecs   = document.getElementById('secs');
const elMs     = document.getElementById('ms');
const elStatus = document.getElementById('status');
const elRing   = document.getElementById('ringFill');
const btnStart = document.getElementById('btnStart');
const btnLap   = document.getElementById('btnLap');
const btnReset = document.getElementById('btnReset');
const lapList  = document.getElementById('lapList');
const lapCount = document.getElementById('lapCount');

/* ── Inject SVG gradient ── */
const svgEl = document.querySelector('.ring-svg');
const defs  = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
defs.innerHTML = `
  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#6c63ff"/>
    <stop offset="100%" stop-color="#00f5d4"/>
  </linearGradient>`;
svgEl.prepend(defs);

/* ── Helpers ── */
function pad2(n)  { return String(Math.floor(n)).padStart(2, '0'); }

function msToDisplay(ms) {
  const totalMs  = Math.floor(ms);
  const hours    = Math.floor(totalMs / 3_600_000);
  const minutes  = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds  = Math.floor((totalMs % 60_000) / 1000);
  const centis   = Math.floor((totalMs % 1000) / 10);
  return { hours, minutes, seconds, centis };
}

function updateDisplay(ms) {
  const { hours, minutes, seconds, centis } = msToDisplay(ms);
  elHrs.textContent  = pad2(hours);
  elMins.textContent = pad2(minutes);
  elSecs.textContent = pad2(seconds);
  elMs.textContent   = '.' + pad2(centis);

  // Ring progress — based on seconds (0–60)
  const CIRCUMFERENCE = 2 * Math.PI * 130; // ≈ 817
  const progress = (seconds % 60) / 60;
  elRing.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
}

function formatTime(ms) {
  const { hours, minutes, seconds, centis } = msToDisplay(ms);
  if (hours > 0) return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`;
  return `${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`;
}

/* ── Core functions ── */
function startStop() {
  if (!running) {
    // START
    startTime = performance.now() - elapsed;
    timerID   = setInterval(tick, 10);
    running   = true;

    btnStart.innerHTML = '<span class="btn-icon">⏸</span> Pause';
    btnStart.classList.add('running');
    btnLap.disabled   = false;
    btnReset.disabled = false;
    elStatus.textContent = 'Running';
    elStatus.className   = 'clock-status running';
  } else {
    // PAUSE
    clearInterval(timerID);
    elapsed = performance.now() - startTime;
    running = false;

    btnStart.innerHTML = '<span class="btn-icon">▶</span> Resume';
    btnStart.classList.remove('running');
    btnLap.disabled    = true;
    elStatus.textContent = 'Paused';
    elStatus.className   = 'clock-status paused';
  }
}

function tick() {
  elapsed = performance.now() - startTime;
  updateDisplay(elapsed);
}

function lap() {
  if (!running) return;
  const lapTime  = elapsed - lastLapTime;
  lastLapTime    = elapsed;
  laps.push({ total: elapsed, lap: lapTime });
  renderLaps();
}

function reset() {
  clearInterval(timerID);
  running      = false;
  elapsed      = 0;
  lastLapTime  = 0;
  laps         = [];

  updateDisplay(0);
  elRing.style.strokeDashoffset = 817;

  btnStart.innerHTML = '<span class="btn-icon">▶</span> Start';
  btnStart.classList.remove('running');
  btnLap.disabled   = true;
  btnReset.disabled = true;
  elStatus.textContent = 'Ready';
  elStatus.className   = 'clock-status';

  lapList.innerHTML  = '<div class="lap-empty">No laps recorded yet</div>';
  lapCount.textContent = '0 laps';
}

function renderLaps() {
  if (!laps.length) {
    lapList.innerHTML = '<div class="lap-empty">No laps recorded yet</div>';
    lapCount.textContent = '0 laps';
    return;
  }

  lapCount.textContent = laps.length + (laps.length === 1 ? ' lap' : ' laps');

  // Find best and worst lap
  const lapTimes  = laps.map((l) => l.lap);
  const bestTime  = Math.min(...lapTimes);
  const worstTime = Math.max(...lapTimes);

  lapList.innerHTML = laps
    .map((l, i) => {
      const isBest  = laps.length > 1 && l.lap === bestTime;
      const isWorst = laps.length > 1 && l.lap === worstTime;
      const cls     = isBest ? 'best' : isWorst ? 'worst' : '';
      const diff    = i === 0 ? '' : formatDiff(l.lap - laps[i - 1].lap);
      return `
        <div class="lap-item ${cls}">
          <span class="lap-num">LAP ${String(i + 1).padStart(2,'0')}</span>
          <span class="lap-time">${formatTime(l.lap)}</span>
          <span class="lap-delta">${diff}</span>
        </div>`;
    })
    .reverse()   // newest on top
    .join('');
}

function formatDiff(diff) {
  const sign = diff >= 0 ? '+' : '-';
  return sign + formatTime(Math.abs(diff));
}

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); startStop(); }
  if (e.code === 'KeyL')  { if (running) lap(); }
  if (e.code === 'KeyR')  { if (!running && elapsed > 0) reset(); }
});