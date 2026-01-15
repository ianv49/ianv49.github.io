// ===============================
// API KEYS
// ===============================
const openWeatherKey = '0723d71a05e58ae3f7fc91e39a901e6b';

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===============================
// STATUS RIBBON FUNCTIONS
// ===============================
function updateStatus(line1, line2) {
  const log = document.getElementById('statusMessages');
  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', { hour12: false });

  const entry = document.createElement('p');
  entry.textContent = `[${timestamp}] ${line1} - ${line2}`;
  log.appendChild(entry);

  // Keep only last 50 rows
  while (log.children.length > 50) {
    log.removeChild(log.firstChild);
  }

  // Auto-scroll
  log.scrollTop = log.scrollHeight;
}

// ===============================
// CHART FUNCTIONS
// ===============================
function drawLineChartFromTable(tableId, canvasId, color, columnIndex, yLabel) {
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  const values = [];
  const labels = [];

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const dt = new Date(cells[0].textContent);
    const dateLabel = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const hourLabel = dt.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    labels.push({ date: dateLabel, hour: hourLabel });
    values.push(parseFloat(cells[columnIndex].textContent));
  });

  const canvas = document.getElementById(canvasId);
  canvas.width = window.innerWidth * 0.7; // widen to 70% of window
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Chart margins
  const marginLeft = 60;
  const marginBottom = 100; // extra space for two tiers of labels
  const marginTop = 40;
  const marginRight = 20;

  // Axes
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(marginLeft, marginTop);
  ctx.lineTo(marginLeft, height - marginBottom);
  ctx.lineTo(width - marginRight, height - marginBottom);
  ctx.stroke();

  // Scale values with padding
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const padding = (maxVal - minVal) * 0.1 || 1; // 10% padding
  const range = (maxVal + padding) - (minVal - padding);

  // Gridlines + Y labels
  ctx.fillStyle = "#333";
  ctx.font = "12px Segoe UI";
  const numGrid = 5;
  for (let i = 0; i <= numGrid; i++) {
    const y = (height - marginBottom) - (i / numGrid) * (height - marginTop - marginBottom);
    const val = (minVal - padding + (i / numGrid) * range).toFixed(1);

    ctx.strokeStyle = "#ddd";
    ctx.beginPath();
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(width - marginRight, y);
    ctx.stroke();

    ctx.fillText(val, 10, y + 4);
  }

  // X labels for every row + vertical lines
  let lastDate = "";
  let dateStartX = null;
  labels.forEach((lbl, i) => {
    const x = marginLeft + (i / (labels.length - 1)) * (width - marginLeft - marginRight);
    const yHour = height - marginBottom + 25;
    const yDate = height - marginBottom + 55;

    // Vertical line
    ctx.strokeStyle = "#eee";
    ctx.beginPath();
    ctx.moveTo(x, marginTop);
    ctx.lineTo(x, height - marginBottom);
    ctx.stroke();

    // Rotated hour label
    ctx.save();
    ctx.translate(x, yHour);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#333";
    ctx.fillText(lbl.hour, 0, 0);
    ctx.restore();

    // Date grouping: when date changes, draw centered label under its group
    if (lbl.date !== lastDate) {
      if (dateStartX !== null) {
        const centerX = (dateStartX + x) / 2;
        ctx.fillStyle = "#000";
        ctx.font = "12px Segoe UI bold";
        ctx.fillText(lastDate, centerX - 20, yDate);
      }
      dateStartX = x;
      lastDate = lbl.date;
    }
    if (i === labels.length - 1 && dateStartX !== null) {
      const centerX = (dateStartX + x) / 2;
      ctx.fillStyle = "#000";
      ctx.font = "12px Segoe UI bold";
      ctx.fillText(lbl.date, centerX - 20, yDate);
    }
  });

  // Line plot
  ctx.strokeStyle = color;
  ctx.beginPath();
  values.forEach((val, i) => {
    const x = marginLeft + (i / (values.length - 1)) * (width - marginLeft - marginRight);
    const y = (height - marginBottom) - ((val - (minVal - padding)) / range) * (height - marginTop - marginBottom);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Title
  ctx.fillStyle = color;
  ctx.font = "14px Segoe UI bold";
  ctx.fillText(yLabel, width / 2 - 40, 25);
}

// ===============================
// OPENWEATHER REFRESH
// ===============================
async function refreshData() {
  updateStatus("🔄 Refreshing OpenWeather data...", "Preparing to load");
  await sleep(500);

  const city = document.getElementById('citySelect').value;
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${openWeatherKey}`
    );
    const data = await res.json();

    if (!data?.list || !Array.isArray(data.list)) {
      throw new Error("Invalid API response");
    }

    const windBody = document.querySelector('#windTable tbody');
    const solarBody = document.querySelector('#solarTable tbody');
    windBody.innerHTML = '';
    solarBody.innerHTML = '';

    for (let i = 0; i < Math.min(15, data.list.length); i++) {
      const entry = data.list[i];
      const dt = new Date(entry.dt * 1000).toLocaleString();

      const windSpeed = entry.wind?.speed ?? "N/A";
      const temp = entry.main?.temp ?? "N/A";
      const humidity = entry.main?.humidity ?? "N/A";
      const cloud = entry.clouds?.all ?? "N/A";

      const windRow = document.createElement('tr');
      windRow.innerHTML = `<td>${dt}</td><td>${windSpeed}</td>`;
      windBody.appendChild(windRow);

      const solarRow = document.createElement('tr');
      solarRow.innerHTML = `<td>${dt}</td><td>${temp}</td><td>${humidity}</td><td>${cloud}</td>`;
      solarBody.appendChild(solarRow);
    }

    drawLineChartFromTable("windTable", "windChart", "#0077be", 1, "Wind Speed (m/s)");
    drawLineChartFromTable("solarTable", "tempChart", "#ff6666", 1, "Temperature (°C)");
    drawLineChartFromTable("solarTable", "humidityChart", "#3399ff", 2, "Humidity (%)");
    drawLineChartFromTable("solarTable", "cloudChart", "#cccc00", 3, "Cloud Cover (%)");

    updateStatus("✅ OpenWeather data ready", "Tables and charts updated successfully");
  } catch (err) {
    console.error('Error loading OpenWeather data:', err);
    updateStatus("⚠️ Error occurred", err.message || err);
  }
}
// ===============================
// NASA POWER REFRESH
// ===============================
async function refreshNASAData() {
  updateStatus("🚀 Fetching NASA POWER data...", "Preparing to load");
  await sleep(500);

  const lat = document.getElementById('nasaLat').value;
  const lon = document.getElementById('nasaLon').value;
  const start = document.getElementById('nasaStart').value;
  const end = document.getElementById('nasaEnd').value;

  try {
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,WS2M&community=RE&longitude=${lon}&latitude=${lat}&start=${start}&end=${end}&format=JSON`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data?.properties?.parameter) {
      throw new Error("Invalid NASA POWER response");
    }

    const dates = Object.keys(data.properties.parameter.T2M);
    const temps = Object.values(data.properties.parameter.T2M);
    const winds = Object.values(data.properties.parameter.WS2M);

    const windBody = document.querySelector('#nasaWindTable tbody');
    const solarBody = document.querySelector('#nasaSolarTable tbody');
    windBody.innerHTML = '';
    solarBody.innerHTML = '';

    dates.forEach((d, i) => {
      const windRow = document.createElement('tr');
      windRow.innerHTML = `<td>${d}</td><td>${winds[i]}</td>`;
      windBody.appendChild(windRow);

      const solarRow = document.createElement('tr');
      solarRow.innerHTML = `<td>${d}</td><td>${temps[i]}</td><td>-</td><td>-</td>`;
      solarBody.appendChild(solarRow);
    });

    // Draw charts from NASA tables
    drawLineChartFromTable("nasaWindTable", "windChart", "#0077be", 1, "NASA Wind Speed (m/s)");
    drawLineChartFromTable("nasaSolarTable", "tempChart", "#ff6666", 1, "NASA Temperature (°C)");

    updateStatus("✅ NASA POWER data ready", "Tables and charts updated successfully");
  } catch (err) {
    console.error('Error loading NASA POWER data:', err);
    updateStatus("⚠️ NASA POWER error", err.message || err);
  }
}
// ===============================
// SAVE LOG TO FILE
// ===============================
function saveLogToFile() {
  let content = "=== Status Log ===\n";
  document.querySelectorAll('#statusMessages p').forEach(p => {
    content += p.textContent + "\n";
  });

  content += "\n=== OpenWeather Wind Data ===\n";
  document.querySelectorAll('#windTable tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    const rowText = Array.from(cells).map(td => td.textContent).join(" | ");
    content += rowText + "\n";
  });

  content += "\n=== OpenWeather Solar Data ===\n";
  document.querySelectorAll('#solarTable tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    const rowText = Array.from(cells).map(td => td.textContent).join(" | ");
    content += rowText + "\n";
  });

  content += "\n=== NASA Wind Data ===\n";
  document.querySelectorAll('#nasaWindTable tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    const rowText = Array.from(cells).map(td => td.textContent).join(" | ");
    content += rowText + "\n";
  });

  content += "\n=== NASA Solar Data ===\n";
  document.querySelectorAll('#nasaSolarTable tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    const rowText = Array.from(cells).map(td => td.textContent).join(" | ");
    content += rowText + "\n";
  });

  // Create a blob and trigger download
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "wind_solar_log.txt";
  a.click();

  URL.revokeObjectURL(url);
}

// ===============================
// INITIAL LOAD
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  updateStatus("🚀 Initializing...", "Loading default OpenWeather city data...");
  refreshData();
});
