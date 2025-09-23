// ===== OpenWeather API Keys (live fetch only) =====
const API_KEY = '0723d71a05e58ae3f7fc91e39a901e6b'; // reuse for all calls

// ===== City coordinates (for timemachine "yesterday") =====
const CITY_COORDS = {
  'Manila': { lat: 14.5995, lon: 120.9842 },
  'Taipei': { lat: 25.0330, lon: 121.5654 },
  'Hanoi' : { lat: 21.0278, lon: 105.8342 },
};

// ===== Chart registry & helpers =====
const charts = {}; // { [canvasId]: Chart }

// Wait until a canvas has non-zero size (prevents blank charts)
async function waitForCanvas(canvas, timeoutMs = 1200) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w > 0 && h > 0) return;
    await new Promise(r => requestAnimationFrame(r));
  }
  canvas.style.height = canvas.style.height || '280px';
}

// Build bar colors: only 1 max (orange), 1 min (light-blue), others light gray
function barColorsForExtremes(data) {
  const LIGHT_GRAY = '#d3d3d3';
  const colors = new Array(data.length).fill(LIGHT_GRAY);
  if (!data.length) return colors;

  let max = -Infinity, min = Infinity, maxIdx = 0, minIdx = 0;
  data.forEach((v, i) => {
    if (v > max) { max = v; maxIdx = i; }
    if (v < min) { min = v; minIdx = i; }
  });
  colors[maxIdx] = 'orange';
  colors[minIdx] = 'lightblue';
  return colors;
}

// Robust chart creation
async function drawBarChart(canvasId, labels, values, title) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  await waitForCanvas(canvas);

  if (charts[canvasId]) {
    try { charts[canvasId].destroy(); } catch (_) {}
  }

  const ctx = canvas.getContext('2d');

  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: title,
        data: values,
        backgroundColor: barColorsForExtremes(values),
        borderColor: '#94a3b8',
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: title, color:'#0f172a', font:{weight:'600'} },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid:{ display:false } },
        y: { beginAtZero: true, grid:{ color:'rgba(148,163,184,0.25)' } }
      }
    }
  });
}

// Keep charts healthy on container resizes
const ro = new ResizeObserver(() => {
  Object.values(charts).forEach(ch => { try { ch.resize(); } catch (_) {} });
});
document.querySelectorAll('.chart-tile').forEach(el => ro.observe(el));

// ===== Tabs handling (3 capitals) =====
const tabsEl = document.getElementById('tabs');
let activeCity = document.querySelector('.tab.active')?.dataset.city || 'Manila';

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn || btn.classList.contains('active')) return;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  activeCity = btn.dataset.city;

  requestAnimationFrame(() => loadCity(activeCity));
});

// ===== Date utilities using city timezone offset =====
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function toCityDatePartsFromUnix(unixSec, tzOffsetSec) {
  // Create a shifted Date so UTC getters reflect city-local values
  const d = new Date((unixSec + tzOffsetSec) * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2,'0');
  const dd = String(d.getUTCDate()).padStart(2,'0');
  const hh = String(d.getUTCHours()).padStart(2,'0');
  const mm = String(d.getUTCMinutes()).padStart(2,'0');
  const dateISO = `${y}-${m}-${dd}`;
  const dayName = DAY_NAMES[d.getUTCDay()];
  const time = `${hh}:${mm}`;
  return { dateISO, dayName, time };
}

function cityTodayISO(tzOffsetSec) {
  const nowUtc = Math.floor(Date.now() / 1000);
  const d = new Date((nowUtc + tzOffsetSec) * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2,'0');
  const dd = String(d.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}

function shiftISO(iso, days) {
  const [y,m,d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth()+1).padStart(2,'0');
  const dd = String(dt.getUTCDate()).padStart(2,'0');
  return `${yy}-${mm}-${dd}`;
}

const round = (x, d=2) => (typeof x === 'number' ? +x.toFixed(d) : x);

// ===== Fetch helpers (live only) =====
async function fetchForecastByCity(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast fetch failed: ${res.status}`);
  return res.json();
}

async function fetchYesterdayHourly(lat, lon, targetUnixUtc) {
  // OpenWeather 2.5 timemachine (hourly) - availability depends on plan
  const url = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${targetUnixUtc}&units=metric&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Timemachine fetch failed: ${res.status}`);
  return res.json();
}

// ===== Selection: 3 yesterday, 4 today, 3 tomorrow (up to 10) =====
async function selectTenEntries(city, forecastJson) {
  const tzOffset = forecastJson?.city?.timezone ?? 0; // seconds
  const todayISO = cityTodayISO(tzOffset);
  const tomorrowISO = shiftISO(todayISO, 1);
  const yesterdayISO = shiftISO(todayISO, -1);

  // Build "today" & "tomorrow" from forecast (3-hour steps)
  const list = Array.isArray(forecastJson.list) ? forecastJson.list : [];

  function isoForItem(item) {
    const { dateISO } = toCityDatePartsFromUnix(item.dt, tzOffset);
    return dateISO;
  }

  const todayItems = list.filter(x => isoForItem(x) === todayISO).slice(0, 4);
  const tomorrowItems = list.filter(x => isoForItem(x) === tomorrowISO).slice(0, 3);

  // Build "yesterday" via timemachine (hourly), if available
  let yesterdayItems = [];
  let yesterdayWarn = '';

  try {
    const coords = CITY_COORDS[city];
    if (!coords) throw new Error('Missing city coords');

    // Aim at yesterday 12:00 city-local converted to UTC seconds
    // Compute yesterday noon city-local -> UTC
    const [y, m, d] = yesterdayISO.split('-').map(Number);
    const noonLocal = Date.UTC(y, m-1, d, 12, 0, 0); // define at UTC then subtract tzOffset to get UTC instant
    const noonUtc = Math.floor(noonLocal / 1000) - tzOffset;

    const hist = await fetchYesterdayHourly(coords.lat, coords.lon, noonUtc);
    const hourly = Array.isArray(hist.hourly) ? hist.hourly : [];

    // Pick 3 reasonably spread hours: ~06:00, 12:00, 18:00 city-local
    const targetsLocal = [6, 12, 18];
    const picks = [];
    for (const hTarget of targetsLocal) {
      // Find hour closest to target local hour
      let best = null, bestDiff = 1e9;
      hourly.forEach(h => {
        const parts = toCityDatePartsFromUnix(h.dt, hist.timezone_offset ?? tzOffset);
        const hour = parseInt(parts.time.slice(0,2), 10);
        const diff = Math.abs(hour - hTarget);
        if (parts.dateISO === yesterdayISO && diff < bestDiff) { best = h; bestDiff = diff; }
      });
      if (best) picks.push(best);
    }
    // Ensure uniqueness and limit to 3
    const unique = [];
    const seen = new Set();
    for (const p of picks) {
      if (!seen.has(p.dt)) { unique.push(p); seen.add(p.dt); }
    }
    // If fewer than 3 found, fill with earliest yesterday hours from hourly
    if (unique.length < 3) {
      const extras = hourly
        .filter(h => toCityDatePartsFromUnix(h.dt, hist.timezone_offset ?? tzOffset).dateISO === yesterdayISO)
        .sort((a,b) => a.dt - b.dt);
      for (const e of extras) {
        if (unique.length >= 3) break;
        if (!seen.has(e.dt)) { unique.push(e); seen.add(e.dt); }
      }
    }
    yesterdayItems = unique.slice(0,3).map(h => ({ _hist:true, ...h }));
    if (yesterdayItems.length < 3) {
      yesterdayWarn = 'Historical (yesterday) data partially unavailable from API.';
    }
  } catch (err) {
    console.warn('Yesterday fetch warning:', err);
    yesterdayWarn = 'Historical (yesterday) data unavailable from your API plan or due to network limits.';
  }

  // Combine: 3 yesterday + 4 today + 3 tomorrow (up to 10)
  const combined = [];
  // Yesterday
  for (const y of yesterdayItems.slice(0,3)) {
    combined.push(y);
  }
  // Today
  for (const t of todayItems) {
    combined.push(t);
    if (combined.length >= 3 + 4) break;
  }
  // Tomorrow
  for (const n of tomorrowItems) {
    combined.push(n);
    if (combined.length >= 10) break;
  }

  // If we still have fewer than 10 due to scarcity, pad more from tomorrow
  if (combined.length < 10) {
    const moreTomorrow = list.filter(x => isoForItem(x) === tomorrowISO).slice(tomorrowItems.length);
    for (const n of moreTomorrow) { combined.push(n); if (combined.length >= 10) break; }
  }

  return { combined, tzOffset, yesterdayISO, todayISO, tomorrowISO, yesterdayWarn };
}

// ===== Renderers =====
function clearTable(tbody) { tbody.innerHTML = ''; }

function pushWindRow(tbody, parts, metrics) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${parts.dateISO}</td>
    <td>${parts.dayName}</td>
    <td>${parts.time}</td>
    <td>${metrics.windSpeed}</td>
    <td>${metrics.pressure}</td>
    <td>${metrics.humidity}</td>
  `;
  tbody.appendChild(tr);
}

function pushSolarRow(tbody, parts, metrics) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${parts.dateISO}</td>
    <td>${parts.dayName}</td>
    <td>${parts.time}</td>
    <td>${metrics.temp}</td>
    <td>${metrics.humidity}</td>
    <td>${metrics.clouds}</td>
  `;
  tbody.appendChild(tr);
}

// Extract unified metrics for both forecast and historical shapes
function extractMetrics(item, isHist) {
  if (isHist) {
    // onecall hourly
    return {
      windSpeed: Number(item.wind_speed ?? 0).toFixed(2),
      pressure : Number(item.pressure ?? 0).toFixed(0),
      humidity : Number(item.humidity ?? 0).toFixed(0),
      temp     : Number(item.temp ?? 0).toFixed(2),
      clouds   : Number(item.clouds ?? 0).toFixed(0),
      dt       : item.dt
    };
  }
  // 5-day/3-hour forecast
  return {
    windSpeed: Number(item?.wind?.speed ?? 0).toFixed(2),
    pressure : Number(item?.main?.pressure ?? 0).toFixed(0),
    humidity : Number(item?.main?.humidity ?? 0).toFixed(0),
    temp     : Number(item?.main?.temp ?? 0).toFixed(2),
    clouds   : Number(item?.clouds?.all ?? 0).toFixed(0),
    dt       : item.dt
  };
}

// ===== Main loader for a city =====
async function loadCity(city) {
  const windMeta = document.getElementById('windMeta');
  const solarMeta = document.getElementById('solarMeta');
  const windWarn = document.getElementById('windWarn');
  const solarWarn = document.getElementById('solarWarn');
  const windBody = document.querySelector('#windTable tbody');
  const solarBody = document.querySelector('#solarTable tbody');

  // Reset UI
  clearTable(windBody);
  clearTable(solarBody);
  windWarn.style.display = 'none';
  windWarn.textContent = '';
  solarWarn.style.display = 'none';
  solarWarn.textContent = '';
  windMeta.textContent = 'Loading…';
  solarMeta.textContent = 'Loading…';

  try {
    // Fetch forecast once and derive all series from it
    const forecastJson = await fetchForecastByCity(city);
    const { combined, tzOffset, yesterdayWarn } = await selectTenEntries(city, forecastJson);

    if (!combined.length) {
      windMeta.textContent = 'No data available.';
      solarMeta.textContent = 'No data available.';
      return;
    }

    // Labels & series
    const labels = [];
    const windSpeed = [];
    const pressure = [];
    const windHumidity = [];
    const solarTemp = [];
    const solarHumidity = [];
    const cloudCover = [];

    // Fill tables and series
    for (const item of combined.slice(0,10)) {
      const isHist = !!item._hist;
      const metric = extractMetrics(item, isHist);
      const parts = toCityDatePartsFromUnix(metric.dt, tzOffset);

      // Tables
      pushWindRow(windBody, parts, metric);
      pushSolarRow(solarBody, parts, metric);

      // Chart labels: compact "YYYY-MM-DD HH:mm"
      labels.push(`${parts.dateISO} ${parts.time}`);

      // Series
      windSpeed.push(Number(metric.windSpeed));
      pressure.push(Number(metric.pressure));
      windHumidity.push(Number(metric.humidity));
      solarTemp.push(Number(metric.temp));
      solarHumidity.push(Number(metric.humidity));
      cloudCover.push(Number(metric.clouds));
    }

    // Draw charts
    await drawBarChart('windSpeedChart', labels, windSpeed, 'Wind Speed (m/s)');
    await drawBarChart('windPressureChart', labels, pressure, 'Pressure (hPa)');
    await drawBarChart('windHumidityChart', labels, windHumidity, 'Humidity (%)');

    await drawBarChart('solarTempChart', labels, solarTemp, 'Temperature (°C)');
    await drawBarChart('solarHumidityChart', labels, solarHumidity, 'Humidity (%)');
    await drawBarChart('solarCloudChart', labels, cloudCover, 'Cloud Cover (%)');

    // Meta + warnings
    windMeta.textContent = `${city} • ${labels.length} intervals`;
    solarMeta.textContent = `${city} • ${labels.length} intervals`;

    if (yesterdayWarn) {
      windWarn.style.display = 'block';
      windWarn.textContent = yesterdayWarn;
      solarWarn.style.display = 'block';
      solarWarn.textContent = yesterdayWarn;
    }
  } catch (err) {
    console.error('Load error:', err);
    windMeta.textContent = 'Failed to load data.';
    solarMeta.textContent = 'Failed to load data.';
  }
}

// ===== Initial load =====
loadCity(activeCity);
