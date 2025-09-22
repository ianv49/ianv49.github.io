// ✅ API keys for OpenWeather
const windKey = '0723d71a05e58ae3f7fc91e39a901e6b';   // wind1
const solarKey = 'e645925cfe8367841ad656678b7c3acc';  // solar1

// ✅ Chart instances to manage updates
let windSpeedChart, windPressureChart, windHumidityChart;
let solarTempChart, solarHumidityChart, solarCloudChart;

// ✅ Main refresh function triggered by button
function refreshData() {
  const city = document.getElementById('citySelect').value;
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) refreshBtn.disabled = true; // Disable button during load

  Promise.all([
    loadWindData(city),
    loadSolarData(city)
  ]).finally(() => {
    if (refreshBtn) refreshBtn.disabled = false; // Re-enable button after load
  });
}

// ✅ Load wind-related data and populate table + charts
function loadWindData(city) {
  return fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${windKey}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch wind data');
      return res.json();
    })
    .then(data => {
      if (!data.list) throw new Error(data.message || 'Invalid wind data');
      const tableBody = document.querySelector('#windTable tbody');
      tableBody.innerHTML = '';

      const windSpeeds = [], pressures = [], humidities = [], labels = [];

      for (let i = 0; i < 15; i++) {
        const entry = data.list[i];
        const dt = new Date(entry.dt * 1000).toLocaleString();
        const wind = entry.wind.speed;
        const pressure = entry.main.pressure;
        const humidity = entry.main.humidity;

        labels.push(dt);
        windSpeeds.push(wind);
        pressures.push(pressure);
        humidities.push(humidity);

        // ✅ Create table row with color-coded cells
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${dt}</td>
          <td style="background:${colorScale(wind, windSpeeds)}">${wind}</td>
          <td style="background:${colorScale(pressure, pressures)}">${pressure}</td>
          <td style="background:${colorScale(humidity, humidities)}">${humidity}</td>
        `;
        tableBody.appendChild(row);
      }

      // ✅ Render charts
      drawBarChart('windSpeedChart', labels, windSpeeds, 'Wind Speed (m/s)', '#0077be');
      drawBarChart('windPressureChart', labels, pressures, 'Pressure (hPa)', '#00cc66');
      drawBarChart('windHumidityChart', labels, humidities, 'Humidity (%)', '#ff9933');
    })
    .catch(err => {
      const tableBody = document.querySelector('#windTable tbody');
      tableBody.innerHTML = `<tr><td colspan="4" style="color:red;">${err.message}</td></tr>`;
      // Optionally clear charts or show error state
      drawBarChart('windSpeedChart', [], [], 'Wind Speed (m/s)', '#0077be');
      drawBarChart('windPressureChart', [], [], 'Pressure (hPa)', '#00cc66');
      drawBarChart('windHumidityChart', [], [], 'Humidity (%)', '#ff9933');
      console.error('Error loading wind data:', err);
    });
}

// ✅ Load solar-related data and populate table + charts
function loadSolarData(city) {
  return fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${solarKey}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch solar data');
      return res.json();
    })
    .then(data => {
      if (!data.list) throw new Error(data.message || 'Invalid solar data');
      const tableBody = document.querySelector('#solarTable tbody');
      tableBody.innerHTML = '';

      const temps = [], humidities = [], clouds = [], labels = [];

      for (let i = 0; i < 15; i++) {
        const entry = data.list[i];
        const dt = new Date(entry.dt * 1000).toLocaleString();
        const temp = entry.main.temp;
        const humidity = entry.main.humidity;
        const cloud = entry.clouds.all;

        labels.push(dt);
        temps.push(temp);
        humidities.push(humidity);
        clouds.push(cloud);

        // ✅ Create table row with color-coded cells
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${dt}</td>
          <td style="background:${colorScale(temp, temps)}">${temp}</td>
          <td style="background:${colorScale(humidity, humidities)}">${humidity}</td>
          <td style="background:${colorScale(cloud, clouds)}">${cloud}</td>
        `;
        tableBody.appendChild(row);
      }

      // ✅ Render charts
      drawBarChart('solarTempChart', labels, temps, 'Temperature (°C)', '#ff6666');
      drawBarChart('solarHumidityChart', labels, humidities, 'Humidity (%)', '#3399ff');
      drawBarChart('solarCloudChart', labels, clouds, 'Cloud Cover (%)', '#cccc00');
    })
    .catch(err => {
      const tableBody = document.querySelector('#solarTable tbody');
      tableBody.innerHTML = `<tr><td colspan="4" style="color:red;">${err.message}</td></tr>`;
      // Optionally clear charts or show error state
      drawBarChart('solarTempChart', [], [], 'Temperature (°C)', '#ff6666');
      drawBarChart('solarHumidityChart', [], [], 'Humidity (%)', '#3399ff');
      drawBarChart('solarCloudChart', [], [], 'Cloud Cover (%)', '#cccc00');
      console.error('Error loading solar data:', err);
    });
}

// ✅ Draw bar chart with dynamic max/min highlighting
function drawBarChart(canvasId, labels, data, label, baseColor) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (window[canvasId]) window[canvasId].destroy();

  const max = Math.max(...data);
  const min = Math.min(...data);

  // ✅ Assign colors based on value
  const colors = data.map(val => {
    if (val === max) return 'orange';
    if (val === min) return 'lightblue';
    return baseColor;
  });

  // ✅ Create chart
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
        y: { beginAtZero: true }
      }
    }
  });
}

// ✅ Utility to assign background color based on value range
function colorScale(value, array) {
  const max = Math.max(...array);
  const min = Math.min(...array);
  if (value === max) return 'orange';
  if (value === min) return 'lightblue';
  return '#ffffff';
}

// ✅ Initial load
refreshData();
