// API keys
const weatherKey = '0723d71a05e58ae3f7fc91e39a901e6b'; // wind1
const solarKey = 'e645925cfe8367841ad656678b7c3acc';  // solar1

let tempChart, humidityChart, pressureChart, solarChart;

function loadWeatherData() {
  const city = document.getElementById('citySelect').value;
  const tableBody = document.querySelector('#weatherTable tbody');
  tableBody.innerHTML = '';

  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${weatherKey}`)
    .then(res => res.json())
    .then(data => {
      const temps = [], humidities = [], pressures = [], labels = [];

      for (let i = 0; i < 10; i++) {
        const entry = data.list[i];
        const dt = new Date(entry.dt * 1000).toLocaleString();
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${dt}</td>
          <td>${entry.main.temp}</td>
          <td>${entry.main.humidity}</td>
          <td>${entry.main.pressure}</td>
          <td>${entry.wind.speed}</td>
          <td>${entry.weather[0].description}</td>
        `;
        tableBody.appendChild(row);

        labels.push(dt);
        temps.push(entry.main.temp);
        humidities.push(entry.main.humidity);
        pressures.push(entry.main.pressure);
      }

      drawLineChart('tempChart', 'Temperature (°C)', labels, temps, 'orange');
      drawLineChart('humidityChart', 'Humidity (%)', labels, humidities, 'blue');
      drawLineChart('pressureChart', 'Pressure (hPa)', labels, pressures, 'green');
    })
    .catch(err => console.error('Weather error:', err));
}

function loadSolarData() {
  const city = document.getElementById('citySelect').value;
  const tableBody = document.querySelector('#solarTable tbody');
  tableBody.innerHTML = '';

  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${solarKey}`)
    .then(res => res.json())
    .then(data => {
      const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString();
      const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString();
      const dayLength = ((data.sys.sunset - data.sys.sunrise) / 3600).toFixed(2) + ' hrs';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${city}</td>
        <td>${sunrise}</td>
        <td>${sunset}</td>
        <td>${dayLength}</td>
      `;
      tableBody.appendChild(row);

      drawBarChart('solarChart', ['Sunrise', 'Sunset'], [data.sys.sunrise * 1000, data.sys.sunset * 1000]);
    })
    .catch(err => console.error('Solar error:', err));
}

function drawLineChart(canvasId, label, labels, data, color) {
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
        backgroundColor: color + '33',
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}

function drawBarChart(canvasId, labels, timestamps) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (solarChart) solarChart.destroy();

  const times = timestamps.map(ts => new Date(ts).toLocaleTimeString());

  solarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Time of Day',
        data: times.map(t => parseInt(t.split(':')[0])), // crude hour extraction
        backgroundColor: ['gold', 'purple']
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, max: 24 }
      }
    }
  });
}

// Auto-load
loadWeatherData();
loadSolarData();
