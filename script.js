const windKey = '0723d71a05e58ae3f7fc91e39a901e6b';
const solarKey = 'e645925cfe8367841ad656678b7c3acc';

let windSpeedChart, windPressureChart, windHumidityChart;
let solarTempChart, solarHumidityChart, solarCloudChart;
let lastRefresh = 0;
let currentPage = 0;
const pageSize = 5;

function refreshData() {
  const now = Date.now();
  if (now - lastRefresh < 3000) return;
  lastRefresh = now;
  const city = document.getElementById('citySelect').value;
  loadWindData(city);
  loadSolarData(city);
}

function paginate(array) {
  const start = currentPage * pageSize;
  return array.slice(start, start + pageSize);
}

function cacheData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getCachedData(key) {
  const cached = localStorage.getItem(key);
  return cached ? JSON.parse(cached) : null;
}

function loadWindData(city) {
  const cached = getCachedData(`wind_${city}`);
  if (cached) return renderWindData(cached);

  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${windKey}`)
    .then(res => res.json())
    .then(data => {
      cacheData(`wind_${city}`, data);
      renderWindData(data);
    })
    .catch(err => console.error('Wind API error:', err));
}

function renderWindData(data) {
  const tableBody = document.querySelector('#windTable tbody');
  tableBody.innerHTML = '';
  const windSpeeds = [], pressures = [], humidities = [], labels = [];

  const entries = paginate(data.list);
  for (const entry of entries) {
    const dt = new Date(entry.dt * 1000).toLocaleString();
    const wind = entry.wind.speed;
    const pressure = entry.main.pressure;
    const humidity = entry.main.humidity;

    labels.push(dt);
    windSpeeds.push(wind);
    pressures.push(pressure);
    humidities.push(humidity);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${dt}</td>
      <td style="background:${colorScale(wind, windSpeeds)}">${wind}</td>
      <td style="background:${colorScale(pressure, pressures)}">${pressure}</td>
      <td style="background:${colorScale(humidity, humidities)}">${humidity}</td>
    `;
    tableBody.appendChild(row);
  }

  windSpeedChart = drawChart(windSpeedChart, 'windSpeedChart', labels, windSpeeds, 'Wind Speed (m/s)', '#0077be');
  windPressureChart = drawChart(windPressureChart, 'windPressureChart', labels, pressures, 'Pressure (hPa)', '#00cc66');
  windHumidityChart = drawChart(windHumidityChart, 'windHumidityChart', labels, humidities, 'Humidity (%)', '#ff9933');
}

function loadSolarData(city) {
  const cached = getCachedData(`solar_${city}`);
  if (cached) return renderSolarData(cached);

  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${solarKey}`)
    .then(res => res.json())
    .then(data => {
      cacheData(`solar_${city}`, data);
      renderSolarData(data);
    })
    .catch(err => console.error('Solar API error:', err));
}

function renderSolarData(data) {
  const tableBody = document.querySelector('#solarTable tbody');
  tableBody.innerHTML = '';
  const temps = [], humidities = [], clouds = [], labels = [];

  const entries = paginate(data.list);
  for (const entry of entries) {
    const dt = new Date(entry.dt * 1000).toLocaleString();
    const temp = entry.main.temp;
    const humidity = entry.main.humidity;
    const cloud = entry.clouds.all;

    labels.push(dt);
    temps.push(temp);
    humidities.push(humidity);
    clouds.push(cloud);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${dt}</td>
      <td style="background:${colorScale(temp, temps)}">${temp}</td>
      <td style="background:${colorScale(humidity, humidities)}">${humidity}</td>
      <td style="background:${colorScale(cloud, clouds)}">${cloud}</td>
    `;
    tableBody.appendChild(row);
  }

  solarTempChart = drawChart(solarTempChart, 'solarTempChart', labels, temps, 'Temperature (°C)', '#ff6666');
  solarHumidityChart = drawChart(solarHumidityChart, 'solarHumidityChart', labels, humidities, 'Humidity (%)', '#3399ff');
  solarCloudChart = drawChart(solarCloudChart, 'solarCloudChart', labels, clouds, 'Cloud Cover (%)', '#cccc00');
}

function drawChart(chartInstance, canvasId, labels, data, label, color) {
  if (chartInstance) chartInstance.destroy();
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{ label, data, borderColor: color, fill: false }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

function colorScale(value, array) {
  const max = Math.max(...array);
  const min = Math.min(...array);
  if (value === max) return 'orange';
  if (value === min) return 'lightblue';
  return 'white';
}
