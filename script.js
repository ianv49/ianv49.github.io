// ===== OpenWeather API Keys =====
// Uses only live fetched data; no archive or cached/recorded data.
const windKey  = '0723d71a05e58ae3f7fc91e39a901e6b';   // wind1
const solarKey = 'e645925cfe8367841ad656678b7c3acc';   // solar1

// ===== Chart instance registry =====
const charts = {}; // { [canvasId]: Chart }

// ===== Tabs handling =====
const tabsEl = document.getElementById('tabs');
let activeCity = document.querySelector('.tab.active')?.dataset.city || 'Manila';

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  activeCity = btn.dataset.city;
  // Defer rendering until after layout updates to prevent blank canvases
  requestAnimationFrame(() => loadCity(activeCity));
});

// ===== Utilities =====
function splitDateParts(dateObj) {
  // Keep 'date' stable for summaries: ISO-like YYYY-MM-DD for reliable sorting
  const date = dateObj.toLocaleDateString('en-CA'); // e.g., 2025-09-23
  const day  = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
  const time = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return { date, day, time };
}
const round = (x, d=2) => (typeof x === 'number' ? +x.toFixed(d) : x);

function barColorsForExtremes(data) {
  // Only max = orange, min = light-blue, all others = light gray
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

function drawBarChart(canvasId, labels, values, title) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) {
    try { charts[canvasId].destroy(); } catch (e) { /* ignore */ }
  }

  const ctx = canvas.getContext('2d');
  const colors = barColorsForExtremes(values);

  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: title,
        data: values,
        backgroundColor: colors,
        borderColor: '#94a3b8',
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false, // reduces chance of 0-size blank rendering on rapid updates
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
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { display:false } },
        y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.25)' } }
      }
    }
  });
}

function appendRow(tbody, cells) {
  const tr = document.createElement('tr');
  tr.innerHTML = cells.map(c => `<td>${c}</td>`).join('');
  tbody.appendChild(tr);
}

function summarizeByDate(rows, fields) {
  // rows: [{date, metrics: {field:value}}]
  const map = new Map(); // date -> metrics[]
  rows.forEach(r => {
    if (!map.has(r.date)) map.set(r.date, []);
    map.get(r.date).push(r.metrics);
  });

  const out = [];
  for (const [date, list] of map.entries()) {
    const summary = { date };
    for (const f of fields) {
      const vals = list.map(x => x[f]).filter(v => typeof v === 'number' && !Number.isNaN(v));
      if (!vals.length) {
        summary[`avg_${f}`] = summary[`min_${f}`] = summary[`max_${f}`] = null;
        continue;
      }
      const sum = vals.reduce((a,b)=>a+b,0);
      summary[`avg_${f}`] = round(sum/vals.length,2);
      summary[`min_${f}`] = round(Math.min(...vals),2);
      summary[`max_${f}`] = round(Math.max(...vals),2);
    }
    out.push(summary);
  }
  // Sort by ISO-like date lexicographically is safe (YYYY-MM-DD)
  out.sort((a,b)=> (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return out;
}

// ===== Loaders (live fetch only) =====
async function loadCity(city) {
  await Promise.all([loadWindData(city), loadSolarData(city)]);
}

async function loadWindData(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${windKey}`;
  const windMeta = document.getElementById('windMeta');
  const tbody = document.querySelector('#windTable tbody');
  const sumBody = document.querySelector('#windSummaryTable tbody');
  tbody.innerHTML = '';
  sumBody.innerHTML = '';
  windMeta.textContent = 'Loading…';

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.list?.length) {
      windMeta.textContent = 'No wind data available.';
      return;
    }

    const labels = [];
    const windSpeeds = [];
    const pressures = [];
    const humidities = [];
    const rowsForSummary = [];

    const limit = Math.min(15, data.list.length);
    for (let i = 0; i < limit; i++) {
      const entry = data.list[i];
      const dt = new Date(entry.dt * 1000);
      const { date, day, time } = splitDateParts(dt);

      const wind = Number(entry?.wind?.speed ?? 0);
      const pressure = Number(entry?.main?.pressure ?? 0);
      const humidity = Number(entry?.main?.humidity ?? 0);

      labels.push(time);
      windSpeeds.push(wind);
      pressures.push(pressure);
      humidities.push(humidity);

      appendRow(tbody, [
        date, day, time,
        round(wind), round(pressure), round(humidity)
      ]);

      rowsForSummary.push({ date, metrics: { wind, pressure, humidity } });
    }

    drawBarChart('windSpeedChart', labels, windSpeeds, 'Wind Speed (m/s)');
    drawBarChart('windPressureChart', labels, pressures, 'Pressure (hPa)');
    drawBarChart('windHumidityChart', labels, humidities, 'Humidity (%)');

    const summaries = summarizeByDate(rowsForSummary, ['wind','pressure','humidity']);
    for (const s of summaries) {
      appendRow(sumBody, [
        s.date,
        s.avg_wind, s.min_wind, s.max_wind,
        s.avg_pressure, s.min_pressure, s.max_pressure,
        s.avg_humidity, s.min_humidity, s.max_humidity
      ]);
    }

    windMeta.textContent = `${city} • ${limit} intervals`;
  } catch (err) {
    console.error('Error loading wind data:', err);
    windMeta.textContent = 'Failed to load wind data.';
  }
}

async function loadSolarData(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${solarKey}`;
  const solarMeta = document.getElementById('solarMeta');
  const tbody = document.querySelector('#solarTable tbody');
  const sumBody = document.querySelector('#solarSummaryTable tbody');
  tbody.innerHTML = '';
  sumBody.innerHTML = '';
  solarMeta.textContent = 'Loading…';

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.list?.length) {
      solarMeta.textContent = 'No solar data available.';
      return;
    }

    const labels = [];
    const temps = [];
    const humidities = [];
    const clouds = [];
    const rowsForSummary = [];

    const limit = Math.min(15, data.list.length);
    for (let i = 0; i < limit; i++) {
      const entry = data.list[i];
      const dt = new Date(entry.dt * 1000);
      const { date, day, time } = splitDateParts(dt);

      const temp = Number(entry?.main?.temp ?? 0);
      const humidity = Number(entry?.main?.humidity ?? 0);
      const cloud = Number(entry?.clouds?.all ?? 0);

      labels.push(time);
      temps.push(temp);
      humidities.push(humidity);
      clouds.push(cloud);

      appendRow(tbody, [
        date, day, time,
        round(temp), round(humidity), round(cloud)
      ]);

      rowsForSummary.push({ date, metrics: { temp, humidity, cloud } });
    }

    drawBarChart('solarTempChart', labels, temps, 'Temperature (°C)');
    drawBarChart('solarHumidityChart', labels, humidities, 'Humidity (%)');
    drawBarChart('solarCloudChart', labels, clouds, 'Cloud Cover (%)');

    const summaries = summarizeByDate(rowsForSummary, ['temp','humidity','cloud']);
    for (const s of summaries) {
      appendRow(sumBody, [
        s.date,
        s.avg_temp, s.min_temp, s.max_temp,
        s.avg_humidity, s.min_humidity, s.max_humidity,
        s.avg_cloud, s.min_cloud, s.max_cloud
      ]);
    }

    solarMeta.textContent = `${city} • ${limit} intervals`;
  } catch (err) {
    console.error('Error loading solar data:', err);
    solarMeta.textContent = 'Failed to load solar data.';
  }
}

// ===== Initial load =====
loadCity(activeCity);
