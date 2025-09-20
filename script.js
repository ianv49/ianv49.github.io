// API keys
const windKey = '0723d71a05e58ae3f7fc91e39a901e6b';
const solarKey = 'e645925cfe8367841ad656678b7c3acc';

// Chart instances
let windSpeedChart, windPressureChart, windHumidityChart;
let solarTempChart, solarHumidityChart, solarCloudChart;

// Refresh all data
function refreshData() {
  const city = document.getElementById('citySelect').value;
  loadWindData(city);
  loadSolarData(city);
}

// Load wind data and render table + charts
function loadWindData(city) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${windKey}`)
    .then(res => res.json())
    .then(data => {
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

        // Color cells based on value
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${dt}</td>
          <td style="background:${colorScale(wind, windSpeeds)}">${wind}</td>
          <td style="background:${colorScale(pressure, pressures)}">${pressure}</td>
          <td style="background:${colorScale(humidity, humidities)}">${humidity}</td>
        `;
        tableBody.appendChild(row);
      }

      drawChart('windSpeedChart', labels, windSpeeds, 'Wind Speed (m/s)', '#0077be');
      drawChart('windPressureChart', labels, pressures, 'Pressure (hPa)', '#00cc66');
      drawChart('windHumidityChart', labels, humidities, 'Humidity (%)', '#ff9933');
    });
}

// Load solar data and render table + charts
function loadSolarData(city) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${solarKey}`)
    .then(res => res.json())
    .then(data => {
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

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${dt}</td>
          <td style="background:${colorScale(temp, temps)}">${temp}</td>
          <td style="background:${colorScale(humidity, humidities)}">${humidity}</td>
          <td style="background:${colorScale(cloud, clouds)}">${cloud}</td>
        `;
        tableBody.appendChild(row);
      }

      drawChart('solarTempChart', labels, temps, 'Temperature (°C)', '#ff6666');
      drawChart('solarHumidityChart', labels, humidities, 'Humidity (%)', '#3399ff');
      drawChart('solarCloudChart', labels, clouds, 'Cloud Cover (%)', '#cccc00');
    });
}

// Draw bar chart with dynamic
