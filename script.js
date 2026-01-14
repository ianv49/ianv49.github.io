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
function drawChart(canvasId, labels, data, label, color) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (window[canvasId]) window[canvasId].destroy();

  window[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: color,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: { display: true, text: label }
      },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function updateCharts(labels, windSpeeds, temps, humidities, clouds) {
  drawChart('windChart', labels, windSpeeds, 'Wind Speed (m/s)', '#0077be');
  drawChart('tempChart', labels, temps, 'Temperature (°C)', '#ff6666');
  drawChart('humidityChart', labels, humidities, 'Humidity (%)', '#3399ff');
  drawChart('cloudChart', labels, clouds, 'Cloud Cover (%)', '#cccc00');
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

    const labels = [], windSpeeds = [], temps = [], humidities = [], clouds = [];
    const windBody = document.querySelector('#windTable tbody');
    const solarBody = document.querySelector('#solarTable tbody');
    windBody.innerHTML = '';
    solarBody.innerHTML = '';

    for (let i = 0; i < Math.min(15, data.list.length); i++) {
      const entry = data.list[i];
      const dt = new Date(entry.dt * 1000).toLocaleString();
      labels.push(dt);

      const windSpeed = entry.wind?.speed ?? "N/A";
      const temp = entry.main?.temp ?? "N/A";
      const humidity = entry.main?.humidity ?? "N/A";
      const cloud = entry.clouds?.all ?? "N/A";

      windSpeeds.push(windSpeed);
      temps.push(temp);
      humidities.push(humidity);
      clouds.push(cloud);

      // Wind table row
      const windRow = document.createElement('tr');
      windRow.innerHTML = `<td>${dt}</td><td>${windSpeed}</td>`;
      windBody.appendChild(windRow);

      // Solar table row
      const solarRow = document.createElement('tr');
      solarRow.innerHTML = `<td>${dt}</td><td>${temp}</td><td>${humidity}</td><td>${cloud}</td>`;
      solarBody.appendChild(solarRow);
    }

    updateCharts(labels, windSpeeds, temps, humidities, clouds);
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
