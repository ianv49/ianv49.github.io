// ===============================
// API KEY
// ===============================
const apiKey = '0723d71a05e58ae3f7fc91e39a901e6b';

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
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Chart margins
  const marginLeft = 60;
  const marginBottom = 60;
  const marginTop = 40;
  const marginRight = 20;

  // Axes
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(marginLeft, marginTop);
  ctx.lineTo(marginLeft, height - marginBottom);
  ctx.lineTo(width - marginRight, height - marginBottom);
  ctx.stroke();

  // Scale values
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;

  // Gridlines + Y labels
  ctx.fillStyle = "#333";
  ctx.font = "12px Segoe UI";
  const numGrid = 5;
  for (let i = 0; i <= numGrid; i++) {
    const y = (height - marginBottom) - (i / numGrid) * (height - marginTop - marginBottom);
    const val = (minVal + (i / numGrid) * range).toFixed(1);

    ctx.strokeStyle = "#ddd";
    ctx.beginPath();
    ctx.moveTo(marginLeft, y);
    ctx.lineTo(width - marginRight, y);
    ctx.stroke();

    ctx.fillText(val, 10, y + 4);
  }

  // X labels grouped by date
  const step = Math.ceil(labels.length / 12); // show ~12 hour labels
  let lastDate = "";
  labels.forEach((lbl, i) => {
    const x = marginLeft + (i / (labels.length - 1)) * (width - marginLeft - marginRight);
    const y = height - marginBottom + 20;

    // Hour labels rotated
    if (i % step === 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(lbl.hour, 0, 0);
      ctx.restore();
    }

    // Date labels (only when date changes)
    if (lbl.date !== lastDate) {
      ctx.fillStyle = "#000";
      ctx.font = "12px Segoe UI bold";
      ctx.fillText(lbl.date, x - 20, height - marginBottom + 40);
      lastDate = lbl.date;
    }
  });

  // Line plot
  ctx.strokeStyle = color;
  ctx.beginPath();
  values.forEach((val, i) => {
    const x = marginLeft + (i / (values.length - 1)) * (width - marginLeft - marginRight);
    const y = (height - marginBottom) - ((val - minVal) / range) * (height - marginTop - marginBottom);
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
// REFRESH FUNCTION
// ===============================
async function refreshData() {
  updateStatus("🔄 Refreshing data...", "Preparing to load");
  await sleep(500);

  const city = document.getElementById('citySelect').value;
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`
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

      // Wind table row
      const windRow = document.createElement('tr');
      windRow.innerHTML = `<td>${dt}</td><td>${windSpeed}</td>`;
      windBody.appendChild(windRow);

      // Solar table row
      const solarRow = document.createElement('tr');
      solarRow.innerHTML = `<td>${dt}</td><td>${temp}</td><td>${humidity}</td><td>${cloud}</td>`;
      solarBody.appendChild(solarRow);
    }

    // Draw charts directly from tables
    drawLineChartFromTable("windTable", "windChart", "#0077be", 1, "Wind Speed (m/s)");
    drawLineChartFromTable("solarTable", "tempChart", "#ff6666", 1, "Temperature (°C)");
    drawLineChartFromTable("solarTable", "humidityChart", "#3399ff", 2, "Humidity (%)");
    drawLineChartFromTable("solarTable", "cloudChart", "#cccc00", 3, "Cloud Cover (%)");

    updateStatus("✅ Data ready", "Tables and charts updated successfully");
  } catch (err) {
    console.error('Error loading data:', err);
    updateStatus("⚠️ Error occurred", err.message || err);
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

  content += "\n=== Wind Data Table ===\n";
  document.querySelectorAll('#windTable tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    const rowText = Array.from(cells).map(td => td.textContent).join(" | ");
    content += rowText + "\n";
  });

  content += "\n=== Solar Data Table ===\n";
  document.querySelectorAll('#solarTable tbody tr').forEach(row => {
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
  updateStatus("🚀 Initializing...", "Loading default city data...");
  refreshData();
});
