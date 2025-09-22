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

// ✅ Chart instances to manage updates
let windSpeedChart, windPressureChart, windHumidityChart;
let solarTempChart, solarHumidityChart, solarCloudChart;

// Utility: Get day name from date object
function getDayName(dateObj) {
  return dateObj.toLocaleDateString(undefined, { weekday: 'short' });
}

// Utility: Get time from date object
function getTime(dateObj) {
  return dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// Utility: Assign background color based on min/max
function colorScale(value, array) {
  const max = Math.max(...array);
  const min = Math.min(...array);
  if (value === max) return 'orange';
  if (value === min) return 'lightblue';
  return '#ffffff'; // base color for all others
}

// Utility: Format date as YYYY-MM-DD
function formatDate(dt) {
  const d = new Date(dt);
  return d.toISOString().split('T')[0];
}

// Utility: Group and average data by date
function groupByDay(list, valueFn) {
  const grouped = {};
  list.forEach(item => {
    const date = formatDate(item.dt * 1000);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(valueFn(item));
  });
  // Average per day
  return Object.entries(grouped).map(([date, values]) => ({
    date,
    avg: values.reduce((a, b) => a + b, 0) / values.length
  }));
}

// Utility: Get up to 7 unique forecast dates
function getDateRange(list) {
  const uniqueDates = [...new Set(list.map(item => formatDate(item.dt * 1000)))];
  return uniqueDates.slice(0, 7);
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
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: label }
      },
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 0,
            callback: function(value, index) {
              if (labels.length > 10 && index % 2 !== 0) return '';
              return labels[index];
            }
          }
        },
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
  const windSpeedAvg = (windData.list.reduce((a, b) => a + b.wind.speed, 0) / windData.list.length).toFixed(2);
  const windHumidityAvg = (windData.list.reduce((a, b) => a + b.main.humidity, 0) / windData.list.length).toFixed(1);
  const solarTempAvg = (solarData.list.reduce((a, b) => a + b.main.temp, 0) / solarData.list.length).toFixed(1);
  const solarCloudAvg = (solarData.list.reduce((a, b) => a + b.clouds.all, 0) / solarData.list.length).toFixed(1);

  box.innerHTML = `
    <b>Summary for ${city.name}:</b><br>
    Over the next 7 days, the average wind speed is <b>${windSpeedAvg} m/s</b> with humidity around <b>${windHumidityAvg}%</b>.
    Solar temperatures are expected to average <b>${solarTempAvg}°C</b> with cloud cover near <b>${solarCloudAvg}%</b>.
    These conditions provide a balanced outlook for both wind and solar energy generation in ${city.name}.
  `;
}

// --- WIND DATA TABLE ---
function loadWindData(city, windData, dateRange) {
  const tableBody = document.querySelector('#windTable tbody');
  tableBody.innerHTML = '';

  // Group by day and average
  const windSpeed = groupByDay(windData.list, item => item.wind.speed);
  const windPressure = groupByDay(windData.list, item => item.main.pressure);
  const windHumidity = groupByDay(windData.list, item => item.main.humidity);

  // Only show 7 days
  const days = dateRange;
  // For each day, find all entries for that day
  const dayEntries = days.map(date =>
    windData.list.filter(item => formatDate(item.dt * 1000) === date)
  );

  // Flatten all values for min/max coloring
  const windSpeeds = dayEntries.flat().map(item => item.wind.speed);
  const pressures = dayEntries.flat().map(item => item.main.pressure);
  const humidities = dayEntries.flat().map(item => item.main.humidity);

  // Table
  for (let d = 0; d < days.length; d++) {
    for (const entry of dayEntries[d]) {
      const dtObj = new Date(entry.dt * 1000);
      const date = dtObj.toLocaleDateString();
      const day = getDayName(dtObj);
      const time = getTime(dtObj);
      const wind = entry.wind.speed;
      const pressure = entry.main.pressure;
      const humidity = entry.main.humidity;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${date}</td>
        <td>${day}</td>
        <td>${time}</td>
        <td style="background:${colorScale(wind, windSpeeds)}">${wind}</td>
        <td style="background:${colorScale(pressure, pressures)}">${pressure}</td>
        <td style="background:${colorScale(humidity, humidities)}">${humidity}</td>
      `;
      tableBody.appendChild(row);
    }
  }

  // Update table headers
  document.querySelector('#windTable thead').innerHTML = `
    <tr>
      <th>Date</th>
      <th>Day</th>
      <th>Time</th>
      <th>Wind Speed (m/s)</th>
      <th>Pressure (hPa)</th>
      <th>Humidity (%)</th>
    </tr>
  `;

  // For charts, use daily averages
  const windSpeedAvgs = days.map(date => {
    const v = windSpeed.find(val => val.date === date);
    return v ? v.avg : null;
  });
  const pressureAvgs = days.map(date => {
    const v = windPressure.find(val => val.date === date);
    return v ? v.avg : null;
  });
  const humidityAvgs = days.map(date => {
    const v = windHumidity.find(val => val.date === date);
    return v ? v.avg : null;
  });

  drawBarChart('windSpeedChart', days, windSpeedAvgs, 'Wind Speed (m/s)', '#0077be');
  drawBarChart('windPressureChart', days, pressureAvgs, 'Pressure (hPa)', '#00cc66');
  drawBarChart('windHumidityChart', days, humidityAvgs, 'Humidity (%)', '#ff9933');
}

// --- SOLAR DATA TABLE ---
function loadSolarData(city, solarData, dateRange) {
  const tableBody = document.querySelector('#solarTable tbody');
  tableBody.innerHTML = '';

  // Group by day and average
  const solarTemp = groupByDay(solarData.list, item => item.main.temp);
  const solarHumidity = groupByDay(solarData.list, item => item.main.humidity);
  const solarCloud = groupByDay(solarData.list, item => item.clouds.all);

  // Only show 7 days
  const days = dateRange;
  const dayEntries = days.map(date =>
    solarData.list.filter(item => formatDate(item.dt * 1000) === date)
  );

  // Flatten all values for min/max coloring
  const temps = dayEntries.flat().map(item => item.main.temp);
  const humidities = dayEntries.flat().map(item => item.main.humidity);
  const clouds = dayEntries.flat().map(item => item.clouds.all);

  // Table
  for (let d = 0; d < days.length; d++) {
    for (const entry of dayEntries[d]) {
      const dtObj = new Date(entry.dt * 1000);
      const date = dtObj.toLocaleDateString();
      const day = getDayName(dtObj);
      const time = getTime(dtObj);
      const temp = entry.main.temp;
      const humidity = entry.main.humidity;
      const cloud = entry.clouds.all;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${date}</td>
        <td>${day}</td>
        <td>${time}</td>
        <td style="background:${colorScale(temp, temps)}">${temp}</td>
        <td style="background:${colorScale(humidity, humidities)}">${humidity}</td>
        <td style="background:${colorScale(cloud, clouds)}">${cloud}</td>
      `;
      tableBody.appendChild(row);
    }
  }

  // Update table headers
  document.querySelector('#solarTable thead').innerHTML = `
    <tr>
      <th>Date</th>
      <th>Day</th>
      <th>Time</th>
      <th>Temperature (°C)</th>
      <th>Humidity (%)</th>
      <th>Cloud Cover (%)</th>
    </tr>
  `;

  // For charts, use daily averages
  const tempAvgs = days.map(date => {
    const v = solarTemp.find(val => val.date === date);
    return v ? v.avg : null;
  });
  const humidityAvgs = days.map(date => {
    const v = solarHumidity.find(val => val.date === date);
    return v ? v.avg : null;
  });
  const cloudAvgs = days.map(date => {
    const v = solarCloud.find(val => val.date === date);
    return v ? v.avg : null;
  });

  drawBarChart('solarTempChart', days, tempAvgs, 'Temperature (°C)', '#ff6666');
  drawBarChart('solarHumidityChart', days, humidityAvgs, 'Humidity (%)', '#3399ff');
  drawBarChart('solarCloudChart', days, cloudAvgs, 'Cloud Cover (%)', '#cccc00');
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

    const dateRange = getDateRange(windData.list);

    renderSummary(city, windData, solarData);
    loadWindData(city, windData, dateRange);
    loadSolarData(city, solarData, dateRange);
  } catch (err) {
    document.getElementById('summaryBox').textContent = "Error loading data: " + err.message;
    document.querySelector('#windTable tbody').innerHTML = `<tr><td colspan="6" style="color:red;">${err.message}</td></tr>`;
    document.querySelector('#solarTable tbody').innerHTML = `<tr><td colspan="6" style="color:red;">${err.message}</td></tr>`;
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

// Initial load
window.onload = setupTabs;
