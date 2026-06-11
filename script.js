
    /* ── STOPWATCH STATE ── */
    let startTime = 0, elapsed = 0, timerID = null, running = false;
    let laps = [], lastLapAt = 0;
    const RING_C = 2 * Math.PI * 120, RING_PERIOD = 60000;

    /* ── DOM REFS ── */
    const elHrs = document.getElementById('hrs'),
          elMins = document.getElementById('mins'),
          elSecs = document.getElementById('secs'),
          elMs   = document.getElementById('ms'),
          elStatus   = document.getElementById('status'),
          elDisplay  = document.getElementById('display'),
          elRing     = document.getElementById('ringFill'),
          elBtnStart = document.getElementById('btnStart'),
          elBtnLap   = document.getElementById('btnLap'),
          elBtnReset = document.getElementById('btnReset'),
          elBtnClear = document.getElementById('btnClear'),
          elLapList  = document.getElementById('lapList'),
          elLapEmpty = document.getElementById('lapEmpty'),
          elLapCount = document.getElementById('lapCount'),
          elLapCols  = document.getElementById('lapColHeads'),
          elStatBest = document.getElementById('statBest'),
          elStatWorst= document.getElementById('statWorst'),
          elStatTotal= document.getElementById('statTotal'),
          elSideBest = document.getElementById('sideBest'),
          elSideWorst= document.getElementById('sideWorst'),
          elSideAvg  = document.getElementById('sideAvg'),
          elSideLaps = document.getElementById('sideLaps'),
          elSideStatus=document.getElementById('sideStatus'),
          elToast    = document.getElementById('toast');

    /* ── BUILD TICK MARKS ── */
    (function() {
      const g = document.getElementById('ticks');
      for (let i = 0; i < 60; i++) {
        const a = (i * 6 - 90) * Math.PI / 180;
        const major = i % 5 === 0;
        const r1 = major ? 118 : 122;
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1', (140 + 128 * Math.cos(a)).toFixed(2));
        line.setAttribute('y1', (140 + 128 * Math.sin(a)).toFixed(2));
        line.setAttribute('x2', (140 + r1  * Math.cos(a)).toFixed(2));
        line.setAttribute('y2', (140 + r1  * Math.sin(a)).toFixed(2));
        line.setAttribute('stroke', major ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.09)');
        line.setAttribute('stroke-width', major ? '2' : '1.2');
        line.setAttribute('stroke-linecap','round');
        g.appendChild(line);
      }
    })();

    /* ── HELPERS ── */
    const pad2 = n => String(n).padStart(2,'0');
    function fmtMs(ms) {
      const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000),
            s = Math.floor((ms%60000)/1000), cs = Math.floor((ms%1000)/10);
      return { h, m, s, cs };
    }
    function fmtLap(ms) {
      const { h, m, s, cs } = fmtMs(ms);
      return h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad2(cs)}` : `${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
    }

    /* ── RENDER ── */
    function render(ms) {
      const { h, m, s, cs } = fmtMs(ms);
      elHrs.textContent = pad2(h); elMins.textContent = pad2(m);
      elSecs.textContent = pad2(s); elMs.textContent = '.' + pad2(cs);
      elRing.style.strokeDashoffset = (RING_C * (1 - (ms % RING_PERIOD) / RING_PERIOD)).toFixed(2);
    }

    function tick() { elapsed = Date.now() - startTime; render(elapsed); }

    /* ── CONTROLS ── */
    function startStop() {
      if (!running) {
        startTime = Date.now() - elapsed;
        timerID = setInterval(tick, 10);
        running = true;
        elBtnStart.classList.add('running');
        document.getElementById('startIcon').textContent = '⏸';
        document.getElementById('startLabel').textContent = 'Pause';
        elBtnLap.disabled = elBtnReset.disabled = false;
        elStatus.textContent = 'Running'; elStatus.className = 'clock-status running';
        elDisplay.classList.add('running');
        elSideStatus.textContent = 'Running'; elSideStatus.style.color = 'var(--teal)';
        showToast('Stopwatch started');
      } else {
        clearInterval(timerID); running = false;
        elBtnStart.classList.remove('running');
        document.getElementById('startIcon').textContent = '▶';
        document.getElementById('startLabel').textContent = 'Resume';
        elStatus.textContent = 'Paused'; elStatus.className = 'clock-status paused';
        elDisplay.classList.remove('running');
        elSideStatus.textContent = 'Paused'; elSideStatus.style.color = '#ffb347';
        showToast('Paused at ' + fmtLap(elapsed));
      }
    }

    function lap() {
      if (!running) return;
      const split = elapsed - lastLapAt;
      lastLapAt = elapsed;
      laps.push({ total: elapsed, split });
      renderLaps();
      showToast('Lap ' + laps.length + ' — ' + fmtLap(split));
    }

    function reset() {
      clearInterval(timerID); timerID = null; running = false;
      elapsed = 0; lastLapAt = 0; laps = [];
      render(0);
      elBtnStart.classList.remove('running');
      document.getElementById('startIcon').textContent = '▶';
      document.getElementById('startLabel').textContent = 'Start';
      elStatus.textContent = 'Ready'; elStatus.className = 'clock-status';
      elDisplay.classList.remove('running');
      elBtnLap.disabled = elBtnReset.disabled = elBtnClear.disabled = true;
      elSideStatus.textContent = 'Ready'; elSideStatus.style.color = '';
      renderLaps(); showToast('Reset');
    }

    function clearLaps() { laps = []; lastLapAt = elapsed; renderLaps(); showToast('Laps cleared'); }

    /* ── LAP RENDER ── */
    function renderLaps() {
      elLapCount.textContent = elStatTotal.textContent = elSideLaps.textContent = laps.length;
      if (!laps.length) {
        elLapList.innerHTML = ''; elLapList.appendChild(elLapEmpty);
        elLapCols.style.display = 'none'; elBtnClear.disabled = true;
        [elStatBest,elStatWorst,elSideBest,elSideWorst].forEach(e => { e.textContent='—'; e.className='stat-pill-value'; });
        elSideAvg.textContent = '—'; return;
      }
      elLapCols.style.display = 'grid'; elBtnClear.disabled = false;
      const splits = laps.map(l => l.split);
      const minS = Math.min(...splits), maxS = Math.max(...splits);
      const bestIdx = splits.indexOf(minS), worstIdx = splits.indexOf(maxS);
      const avgMs = splits.reduce((a,b) => a+b, 0) / splits.length;

      elStatBest.textContent = fmtLap(minS); elStatBest.className = 'stat-pill-value best';
      elStatWorst.textContent = fmtLap(maxS); elStatWorst.className = 'stat-pill-value worst';
      elSideBest.textContent = fmtLap(minS); elSideWorst.textContent = fmtLap(maxS);
      elSideAvg.textContent = fmtLap(Math.round(avgMs));

      const frag = document.createDocumentFragment();
      for (let i = laps.length - 1; i >= 0; i--) {
        const { split } = laps[i];
        const prev = i > 0 ? split - laps[i-1].split : null;
        const isBest = i === bestIdx && laps.length > 1;
        const isWorst = i === worstIdx && laps.length > 1;
        const row = document.createElement('div');
        row.className = 'lap-item' + (isBest ? ' best' : isWorst ? ' worst' : '');
        const delta = prev !== null ? (prev >= 0 ? '+' : '') + fmtLap(Math.abs(prev)) : '—';
        row.innerHTML = `<span class="lap-num">L${pad2(i+1)}</span><span class="lap-time">${fmtLap(split)}</span><span class="lap-delta">${delta}</span><span class="lap-badge">${isBest?'BEST':isWorst?'SLOW':''}</span>`;
        frag.appendChild(row);
      }
      elLapList.innerHTML = ''; elLapList.appendChild(frag);
    }

    /* ── KEYBOARD ── */
    document.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); startStop(); }
      if (e.key.toLowerCase() === 'l' && !elBtnLap.disabled) lap();
      if (e.key.toLowerCase() === 'r' && !elBtnReset.disabled) reset();
    });

    /* ── LIVE CLOCK ── */
    function updateClock() {
      const now = new Date();
      document.getElementById('currentDate').textContent = now.toLocaleDateString('en-IN',{ weekday:'short', day:'numeric', month:'short', year:'numeric' });
      document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-IN',{ hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });
    }
    updateClock(); setInterval(updateClock, 1000);

    /* ── TOAST ── */
    let toastTimer;
    function showToast(msg) {
      elToast.textContent = msg; elToast.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(() => elToast.classList.remove('show'), 1800);
    }

    render(0);
