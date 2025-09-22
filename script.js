// ✅ API keys for OpenWeather
const windKey = '0723d71a05e58ae3f7fc91e39a901e6b';
const solarKey = 'e645925cfe8367841ad656678b7c3acc';

// ✅ List of cities for tabs
const cities = [
  { name: "Manila", code: "Manila" },
  { name: "Tokyo", code: "Tokyo" },
  { name: "Jakarta", code: "Jakarta" },
  { name: "Bangkok", code: "Bangkok" },
  { name: "Hanoi", code: "Hanoi" },
  { name: "Kuala Lumpur", code: "Kuala Lumpur" },
  { name: "Singapore", code: "Singapore" },
  { name: "Seoul", code: "Seoul" },
  { name: "Beijing", code: "Beijing" },
  { name: "New Delhi", code: "New Delhi" }
];

// Utility: Get day name from date object
function getDayName(dateObj) {
  return dateObj.toLocaleDateString(undefined, { weekday: 'short' });
}

// Utility: Format date as YYYY-MM-DD
function formatDate(dt) {
  const d = new Date(dt);
  return d.toISOString().split('T')[0];
}

// Utility: Assign background color based on min/max
function colorScale(value, array) {
  const max = Math.max(...array);
  const min = Math.min(...array);
  if (value === max) return 'orange';
  if (value === min) return 'lightblue';
  return '#ffffff'; // base color for all others
}

// Utility: Get nominal value (median) for each day
function nominalByDay(list, valueFn) {
  const grouped = {};
  list.forEach(item => {
    const date = formatDate(item.dt * 1000);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(valueFn(item));
  });
  // Median per day
  return Object.entries(grouped).map(([date, values]) => {
    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const nominal = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    return { date, nominal };
  });
}

// Utility: Get date range: past 2 days, today, next 5 days
function getNominalDateRange() {
  const today = new Date();
  const range = [];
  for (let i = -2; i <= 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    range.push(formatDate(d));
  }
  return range;
}

// Draw bar chart with dynamic min/max y-axis
function drawBarChart(canvasId, labels, data, label, baseColor) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (window[canvasId] && typeof window[canvasId].destroy === 'function') {
    window[canvasId].destroy();
  }
  if (!data.length) {
    window[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [{ label, data: [] }] },
      options: { responsive: true }
    });
    return;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const colors = data.map(val => {
    if (val === max) return 'orange';
    if (val === min) return 'lightblue';
    return baseColor;
  });
  window[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        backgroundColor: colors
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: label }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: Math.floor(min - (max - min) * 0.1),
          max: Math.ceil(max + (max - min) * 0.1)
        }
      }
    }
  });
}

// Render summary box
function renderSummary(city, windData, solarData) {
  const box = document.getElementById('summaryBox');
  if (!windData.list || !solarData.list) {
    box.textContent = "No data available for summary.";
    return;
  }
  const windSpeedNom = nominalByDay(windData.list, item => item.wind.speed).map(d => d.nominal);
  const windHumidityNom = nominalByDay(windData.list, item => item.main.humidity).map(d => d.nominal);
  const solarTempNom = nominalByDay(solarData.list, item => item.main.temp).map(d => d.nominal);
  const solarCloudNom = nominalByDay(solarData.list, item => item.clouds.all).map(d => d.nominal);

  const windSpeedAvg = (windSpeedNom.reduce((a, b) => a + b, 0) / windSpeedNom.length).toFixed(2);
  const windHumidityAvg = (windHumidityNom.reduce((a, b) => a + b, 0) / windHumidityNom.length).toFixed(1);
  const solarTempAvg = (solarTempNom.reduce((a, b) => a + b, 0) / solarTempNom.length).toFixed(1);
  const solarCloudAvg = (solarCloudNom.reduce((a, b) => a + b, 0) / solarCloudNom.length).toFixed(1);

  box.innerHTML = `
    <b>Summary for ${city.name}:</b><br>
    For the period, the nominal wind speed is <b>${windSpeedAvg} m/s</b> and humidity is <b>${windHumidityAvg}%</b>.
    Solar temperature is typically <b>${solarTempAvg}°C</b> with cloud cover near <b>${solarCloudAvg}%</b>.
    These nominal values reflect the central tendency for wind and solar energy in ${city.name}.
  `;
}

// --- WIND DATA TABLE ---
function loadWindData(city, windData, dateRange) {
  const tableBody = document.querySelector('#windTable tbody');
  tableBody.innerHTML = '';

  // Nominal (median) per day
  const windSpeedNom = nominalByDay(windData.list, item => item.wind.speed);
  const windPressureNom = nominalByDay(windData.list, item => item.main.pressure);
  const windHumidityNom = nominalByDay(windData.list, item => item.main.humidity);

  // Filter for date range and sort ascending by value
  const days = dateRange;
  const rows = days.map(date => {
    return {
      date,
      day: getDayName(new Date(date)),
      wind: windSpeedNom.find(d => d.date === date)?.nominal ?? null,
      pressure: windPressureNom.find(d => d.date === date)?.nominal ?? null,
      humidity: windHumidityNom.find(d => d.date === date)?.nominal ?? null
    };
  }).filter(r => r.wind !== null && r.pressure !== null && r.humidity !== null);

  // Rank ascending by wind speed
  rows.sort((a, b) => a.wind - b.wind);

  // For coloring
  const windArr = rows.map(r => r.wind);
  const pressureArr = rows.map(r => r.pressure);
  const humidityArr = rows.map(r => r.humidity);

  // Table
  for (const rowData of rows) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rowData.date}</td>
      <td>${rowData.day}</td>
      <td style="background:${colorScale(rowData.wind, windArr)}">${rowData.wind}</td>
      <td style="background:${colorScale(rowData.pressure, pressureArr)}">${rowData.pressure}</td>
      <td style="background:${colorScale(rowData.humidity, humidityArr)}">${rowData.humidity}</td>
    `;
    tableBody.appendChild(row);
  }

  // Update table headers
  document.querySelector('#windTable thead').innerHTML = `
    <tr>
      <th>Date</th>
      <th>Day</th>
      <th>Wind Speed (m/s)</th>
      <th>Pressure (hPa)</th>
      <th>Humidity (%)</th>
    </tr>
  `;

  // For charts, use the same sorted data
  drawBarChart('windSpeedChart', rows.map(r => r.day), windArr, 'Wind Speed (m/s)', '#0077be');
  drawBarChart('windPressureChart', rows.map(r => r.day), pressureArr, 'Pressure (hPa)', '#00cc66');
  drawBarChart('windHumidityChart', rows.map(r => r.day), humidityArr, 'Humidity (%)', '#ff9933');
}

// --- SOLAR DATA TABLE ---
function loadSolarData(city, solarData, dateRange) {
  const tableBody = document.querySelector('#solarTable tbody');
  tableBody.innerHTML = '';

  // Nominal (median) per day
  const solarTempNom = nominalByDay(solarData.list, item => item.main.temp);
  const solarHumidityNom = nominalByDay(solarData.list, item => item.main.humidity);
  const solarCloudNom = nominalByDay(solarData.list, item => item.clouds.all);

  // Filter for date range and sort ascending by value
  const days = dateRange;
  const rows = days.map(date => {
    return {
      date,
      day: getDayName(new Date(date)),
      temp: solarTempNom.find(d => d.date === date)?.nominal ?? null,
      humidity: solarHumidityNom.find(d => d.date === date)?.nominal ?? null,
      cloud: solarCloudNom.find(d => d.date === date)?.nominal ?? null
    };
  }).filter(r => r.temp !== null && r.humidity !== null && r.cloud !== null);

  // Rank ascending by temperature
  rows.sort((a, b) => a.temp - b.temp);

  // For coloring
  const tempArr = rows.map(r => r.temp);
  const humidityArr = rows.map(r => r.humidity);
  const cloudArr = rows.map(r => r.cloud);

  // Table
  for (const rowData of rows) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rowData.date}</td>
      <td>${rowData.day}</td>
      <td style="background:${colorScale(rowData.temp, tempArr)}">${rowData.temp}</td>
      <td style="background:${colorScale(rowData.humidity, humidityArr)}">${rowData.humidity}</td>
      <td style="background:${colorScale(rowData.cloud, cloudArr)}">${rowData.cloud}</td>
    `;
    tableBody.appendChild(row);
  }

  // Update table headers
  document.querySelector('#solarTable thead').innerHTML = `
    <tr>
      <th>Date</th>
      <th>Day</th>
      <th>Temperature (°C)</th>
      <th>Humidity (%)</th>
      <th>Cloud Cover (%)</th>
    </tr>
  `;

  // For charts, use the same sorted data
  drawBarChart('solarTempChart', rows.map(r => r.day), tempArr, 'Temperature (°C)', '#ff6666');
  drawBarChart('solarHumidityChart', rows.map(r => r.day), humidityArr, 'Humidity (%)', '#3399ff');
  drawBarChart('solarCloudChart', rows.map(r => r.day), cloudArr, 'Cloud Cover (%)', '#cccc00');
}

// Main function to load all data for a city
async function loadCityData(city) {
  document.getElementById('summaryBox').textContent = "Loading data for " + city.name + "...";
  try {
    const [windRes, solarRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city.code}&units=metric&appid=${windKey}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city.code}&units=metric&appid=${solarKey}`)
    ]);
    const windData = await windRes.json();
    const solarData = await solarRes.json();

    if (!windData.list || !solarData.list) throw new Error("No data available for this city.");

    const dateRange = getNominalDateRange();

    renderSummary(city, windData, solarData);
    loadWindData(city, windData, dateRange);
    loadSolarData(city, solarData, dateRange);
  } catch (err) {
    document.getElementById('summaryBox').textContent = "Error loading data: " + err.message;
    document.querySelector('#windTable tbody').innerHTML = `<tr><td colspan="5" style="color:red;">${err.message}</td></tr>`;
    document.querySelector('#solarTable tbody').innerHTML = `<tr><td colspan="5" style="color:red;">${err.message}</td></tr>`;
    drawBarChart('windSpeedChart', [], [], 'Wind Speed (m/s)', '#0077be');
    drawBarChart('windPressureChart', [], [], 'Pressure (hPa)', '#00cc66');
    drawBarChart('windHumidityChart', [], [], 'Humidity (%)', '#ff9933');
    drawBarChart('solarTempChart', [], [], 'Temperature (°C)', '#ff6666');
    drawBarChart('solarHumidityChart', [], [], 'Humidity (%)', '#3399ff');
    drawBarChart('solarCloudChart', [], [], 'Cloud Cover (%)', '#cccc00');
  }
}

// Setup city tabs
function setupTabs() {
  const tabs = document.getElementById('cityTabs');
  tabs.innerHTML = '';
  cities.forEach((city, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (idx === 0 ? ' active' : '');
    btn.textContent = city.name;
    btn.style.background = idx === 0 ? '#0077be' : '#e6f7ff';
    btn.style.color = idx === 0 ? '#fff' : '#0077be';
    btn.style.border = 'none';
    btn.style.padding = '10px 18px';
    btn.style.borderRadius = '6px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.onclick = () => {
      document.querySelectorAll('#cityTabs .tab').forEach(t => {
        t.classList.remove('active');
        t.style.background = '#e6f7ff';
        t.style.color = '#0077be';
      });
      btn.classList.add('active');
      btn.style.background = '#0077be';
      btn.style.color = '#fff';
      loadCityData(city);
    };
    btn.classList.add('tab');
    tabs.appendChild(btn);
  });
  // Load first city by default
  loadCityData(cities[0]);
}

// Layout adjustment: charts left (vertical), table right
function adjustLayout() {
  const windCharts = document.querySelectorAll('#windSpeedChart, #windPressureChart, #windHumidityChart');
  const solarCharts = document.querySelectorAll('#solarTempChart, #solarHumidityChart, #solarCloudChart');
  // Wrap charts in a vertical flex container
  const windChartCol = document.createElement('div');
  windChartCol.style.display = 'flex';
  windChartCol.style.flexDirection = 'column';
  windChartCol.style.gap = '16px';
  windChartCol.style.alignItems = 'center';
  windCharts.forEach(c => windChartCol.appendChild(c));
  const windTable = document.getElementById('windTable');
  const windRow = document.createElement('div');
  windRow.style.display = 'flex';
  windRow.style.justifyContent = 'center';
  windRow.style.alignItems = 'flex-start';
  windRow.style.gap = '24px';
  windRow.appendChild(windChartCol);
  windRow.appendChild(windTable);
  windTable.parentNode.insertBefore(windRow, windTable);
  windTable.style.width = '320px';
  windTable.style.fontSize = '0.95em';

  const solarChartCol = document.createElement('div');
  solarChartCol.style.display = 'flex';
  solarChartCol.style.flexDirection = 'column';
  solarChartCol.style.gap = '16px';
  solarChartCol.style.alignItems = 'center';
  solarCharts.forEach(c => solarChartCol.appendChild(c));
  const solarTable = document.getElementById('solarTable');
  const solarRow = document.createElement('div');
  solarRow.style.display = 'flex';
  solarRow.style.justifyContent = 'center';
  solarRow.style.alignItems = 'flex-start';
  solarRow.style.gap = '24px';
  solarRow.appendChild(solarChartCol);
  solarRow.appendChild(solarTable);
  solarTable.parentNode.insertBefore(solarRow, solarTable);
  solarTable.style.width = '320px';
  solarTable.style.fontSize = '0.95em';
}

// Initial load
window.onload = function() {
  setupTabs();
  setTimeout(adjustLayout, 500); // Wait for DOM to render
};
