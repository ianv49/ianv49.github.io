// ===== OpenWeather API Keys =====
const windKey  = '0723d71a05e58ae3f7fc91e39a901e6b';   // wind1
const solarKey = 'e645925cfe8367841ad656678b7c3acc';   // solar1

// ===== Optional GitHub Save Configuration =====
// SAFETY: Never hardcode real tokens in client code for public repos.
// Use a secure serverless proxy (see steps below) and set enabled=true only if proxy is configured.
const GH_CONFIG = {
  enabled: false, // set to true once your secure write proxy is configured
  owner: 'your-username',
  repo:  'your-repo',
  branch:'main',
  assetsDir: 'docs/assets', // aligns with your logo path
  // If you build a proxy endpoint, set it here (e.g., '/api/github-write')
  proxyEndpoint: '' // leave blank if you will call GitHub API directly via your proxy
};

// ===== Chart instances =====
const charts = {}; // { [canvasId]: Chart }

// ===== Tab handling =====
const tabsEl = document.getElementById('tabs');
let activeCity = document.querySelector('.tab.active')?.dataset.city || 'Manila';

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  activeCity = btn.dataset.city;
  // Re-load city after layout is stable to avoid 0-size canvas rendering
  requestAnimationFrame(() => loadCity(activeCity));
});

// ===== Utility: format datetime into Date/Day/Time =====
function splitDateParts(dateObj) {
  // Localize but keep stable ordering
  const date = dateObj.toLocaleDateString(undefined, { year:'numeric', month:'2-digit', day:'2-digit' });
  const day  = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
  const time = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return { date, day, time };
}

// ===== Utility: number rounding =====
const round = (x, d=2) => (typeof x === 'number' ? +x.toFixed(d) : x);

// ===== Build consistent bar colors: only 1 max (orange), 1 min (lightblue), others light gray =====
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

// ===== Robust chart drawing (prevents "blank" charts on rerender) =====
function drawBarChart(canvasId, labels, values, title) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Destroy old instance if exists
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
      animation: false, // reduces blank flicker risk
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
        x: {
          ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
          grid: { display:false }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148,163,184,0.25)' }
        }
      }
    }
  });
}

// ===== Table Row Builders =====
function appendRow(tbody, cells) {
  const tr = document.createElement('tr');
  tr.innerHTML = cells.map(c => `<td>${c}</td>`).join('');
  tbody.appendChild(tr);
}

// ===== Summaries Per Date =====
function summarizeByDate(rows, fields) {
  // rows: [{date, metrics: {field:value}}]
  const map = new Map(); // date -> array of metrics objects
  rows.forEach(r => {
    if (!map.has(r.date)) map.set(r.date, []);
    map.get(r.date).push(r.metrics);
  });

  const out = [];
  for (const [date, list] of map.entries()) {
    const summary = { date };
    for (const f of fields) {
      const vals = list.map(x => x[f]).filter(v => typeof v === 'number');
      if (!vals.length) {
        summary[`avg_${f}`] = summary[`min_${f}`] = summary[`max_${f}`] = null;
        continue;
      }
      const sum = vals.reduce((a,b)=>a+b,0);
      const avg = sum / vals.length;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      summary[`avg_${f}`] = round(avg,2);
      summary[`min_${f}`] = round(min,2);
      summary[`max_${f}`] = round(max,2);
    }
    out.push(summary);
  }
  // sort by date ascending assuming locale dd/mm/yyyy -> convert to Date
  out.sort((a,b)=> new Date(a.date) - new Date(b.date));
  return out;
}

// ===== (Optional) Save text to GitHub assets/ via secure proxy or GitHub API =====
async function saveTxtToGitHub(filename, text) {
  if (!GH_CONFIG.enabled) return;

  const path = `${GH_CONFIG.assetsDir}/${filename}`;
  const payload = {
    owner: GH_CONFIG.owner,
    repo: GH_CONFIG.repo,
    branch: GH_CONFIG.branch,
    path,
    message: `chore: update ${path}`,
    // encode as base64 UTF-8
    content: btoa(unescape(encodeURIComponent(text)))
  };

  if (!GH_CONFIG.proxyEndpoint) {
    console.warn('GH save enabled but proxyEndpoint is not set. Skipping write for safety.');
    return;
  }

  try {
    const res = await fetch(GH_CONFIG.proxyEndpoint, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const t = await res.text();
      console.warn('GitHub save failed:', res.status, t);
    }
  } catch (err) {
    console.warn('GitHub save error:', err);
  }
}

// ===== Loaders =====
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

      labels.push(`${time}`);
      windSpeeds.push(wind);
      pressures.push(pressure);
      humidities.push(humidity);

      appendRow(tbody, [
        date, day, time,
        round(wind), round(pressure), round(humidity)
      ]);

      rowsForSummary.push({
        date,
        metrics: {
          wind, pressure, humidity
        }
      });
    }

    // Charts with strict color rules
    drawBarChart('windSpeedChart', labels, windSpeeds, 'Wind Speed (m/s)');
    drawBarChart('windPressureChart', labels, pressures, 'Pressure (hPa)');
    drawBarChart('windHumidityChart', labels, humidities, 'Humidity (%)');

    // Summary per date
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

    // (Optional) Save summary txt to GitHub assets
    const lines = [];
    lines.push(`WIND SUMMARY for ${city}`);
    summaries.forEach(s => {
      lines.push([
        s.date,
        `avg_wind=${s.avg_wind}`, `min_wind=${s.min_wind}`, `max_wind=${s.max_wind}`,
        `avg_pressure=${s.avg_pressure}`, `min_pressure=${s.min_pressure}`, `max_pressure=${s.max_pressure}`,
        `avg_humidity=${s.avg_humidity}`, `min_humidity=${s.min_humidity}`, `max_humidity=${s.max_humidity}`
      ].join(' | '));
    });
    await saveTxtToGitHub(`wind-summary-${city.replace(/\s+/g,'_')}.txt`, lines.join('\n'));
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

      labels.push(`${time}`);
      temps.push(temp);
      humidities.push(humidity);
      clouds.push(cloud);

      appendRow(tbody, [
        date, day, time,
        round(temp), round(humidity), round(cloud)
      ]);

      rowsForSummary.push({
        date,
        metrics: {
          temp, humidity, cloud
        }
      });
    }

    // Charts with strict color rules
    drawBarChart('solarTempChart', labels, temps, 'Temperature (°C)');
    drawBarChart('solarHumidityChart', labels, humidities, 'Humidity (%)');
    drawBarChart('solarCloudChart', labels, clouds, 'Cloud Cover (%)');

    // Summary per date
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

    // (Optional) Save summary txt to GitHub assets
    const lines = [];
    lines.push(`SOLAR SUMMARY for ${city}`);
    summaries.forEach(s => {
      lines.push([
        s.date,
        `avg_temp=${s.avg_temp}`, `min_temp=${s.min_temp}`, `max_temp=${s.max_temp}`,
        `avg_humidity=${s.avg_humidity}`, `min_humidity=${s.min_humidity}`, `max_humidity=${s.max_humidity}`,
        `avg_cloud=${s.avg_cloud}`, `min_cloud=${s.min_cloud}`, `max_cloud=${s.max_cloud}`
      ].join(' | '));
    });
    await saveTxtToGitHub(`solar-summary-${city.replace(/\s+/g,'_')}.txt`, lines.join('\n'));
  } catch (err) {
    console.error('Error loading solar data:', err);
    solarMeta.textContent = 'Failed to load solar data.';
  }
}

// ===== Initial load =====
loadCity(activeCity);
