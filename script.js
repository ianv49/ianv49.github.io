// API keys for OpenWeather
const windKey = '0723d71a05e58ae3f7fc91e39a901e6b';   // wind1
const solarKey = 'e645925cfe8367841ad656678b7c3acc'; // solar1

let windChart, solarChart;

// Unified refresh function triggered by button
function refreshData() {
  const city = document.getElementById('citySelect').value;
  loadWindData(city);
  loadSolarData(city);
}

// Load wind-related data and populate table + chart
function loadWindData(city) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${windKey}`)
    .then(res => res.json())
    .then(data => {
      const tableBody = document.querySelector('#windTable tbody');
      tableBody.innerHTML = '';

      const windSpeeds = [], pressures = [], humidities = [], labels = [];

      for (let i = 0; i < 10; i++) {
        const entry = data.list[i];
        const dt = new Date(entry.dt * 1000).toLocaleString();
        const wind = entry.wind.speed;
        const pressure = entry.main.pressure;
        const humidity = entry.main.humidity;

        // Populate table
        const row = document.createElement('tr');
        row.innerHTML = `<td>${dt}</td><td>${wind}</td><td>${pressure}</td><td>${humidity}</td>`;
        tableBody.appendChild(row);

        // Collect data for chart
        labels.push(dt);
        windSpeeds.push(wind);
        pressures.push(pressure);
        humidities.push(humidity);
      }

      drawBarChart('windChart', labels, [windSpeeds, pressures, humidities], ['Wind Speed', 'Pressure', 'Humidity'], ['#0077be', '#00cc66', '#ff9933']);
    });
}

// Load solar-related data and populate table + chart
function loadSolarData(city) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${solarKey}`)
    .then(res => res.json())
    .then(data => {
      const tableBody = document.querySelector('#solarTable tbody');
      tableBody.innerHTML = '';

      const temps = [], humidities = [], clouds = [], labels = [];

      for (let i = 0; i < 10; i++) {
        const entry = data.list[i];
        const dt = new Date(entry.dt * 1000).toLocaleString();
        const temp = entry.main.temp;
        const humidity = entry.main.humidity;
        const cloud = entry.clouds.all;

        // Populate table
        const row = document.createElement('tr');
        row.innerHTML = `<td>${dt}</td><td>${temp}</td><td>${humidity}</td><td>${cloud}</td>`;
        tableBody.appendChild(row);

        // Collect data for chart
        labels.push(dt);
        temps.push(temp);
        humidities.push(humidity);
        clouds.push(cloud);
      }

      drawBarChart('solarChart', labels, [temps, humidities, clouds], ['Temperature', 'Humidity', 'Cloud Cover'], ['#ff6666', '#3399ff', '#cccc00']);
    });
}

// Draw bar chart with multiple datasets and highlight max/min
function drawBarChart(canvasId, labels, datasets, labelsSet, colors) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (window[canvasId]) window[canvasId].destroy();

  const chartData = {
    labels: labels,
    datasets: datasets.map((data, i) => {
      const max = Math.max(...data);
      const min = Math.min(...data);
      return {
        label: labelsSet[i],
        data: data,
        backgroundColor: data.map(val => {
          if (val === max) return 'red';
          if (val === min) return 'green';
          return colors[i];
        })
      };
    })
  };

  window[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: canvasId === 'windChart' ? 'Wind Energy Metrics' : 'Solar Energy Metrics' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Initial load
refreshData();
