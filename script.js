// ===============================
// API KEYS
// ===============================
// These keys are used to authenticate with OpenWeather API.
// windKey is used for wind-related data, solarKey for solar-related data.
const windKey = '0723d71a05e58ae3f7fc91e39a901e6b';   // wind1
const solarKey = 'e645925cfe8367841ad656678b7c3acc';  // solar1

// ===============================
// CHART INSTANCES
// ===============================
// We store chart instances globally so they can be destroyed and redrawn when refreshed.
let windSpeedChart, windPressureChart, windHumidityChart;
let solarTempChart, solarHumidityChart, solarCloudChart;

// ===============================
// REFRESH FUNCTION
// ===============================
// Called when the user clicks the "Refresh Data" button.
// Loads both wind and solar data for the selected city.
function refreshData() {
  const city = document.getElementById('citySelect').value;
  loadWindData(city);
  loadSolarData(city);
}

// ===============================
// LOAD WIND DATA
// ===============================
// Fetches forecast data from OpenWeather API for wind parameters.
// Populates the wind table and draws charts for wind speed, pressure, and humidity.
function loadWindData(city) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${windKey}`)
    .then(res => res.json())
    .then(data => {
      const tableBody = document.querySelector('#windTable tbody');
      tableBody.innerHTML = '';

      const windSpeeds = [], pressures = [], humidities = [], labels = [];

      // Loop through 15 entries (10 past + 5 forecast)
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

        // Create table row with color-coded cells
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${dt}</td>
          <td style="background:${colorScale(wind, windSpeeds)}">${wind}</td>
          <td style="background:${colorScale(pressure, pressures)}">${pressure}</td>
          <td style="background:${colorScale(humidity, humidities)}">${humidity}</td>
        `;
        tableBody.appendChild(row);
      }

      // Draw charts for each parameter
      drawBarChart('windSpeedChart', labels, windSpeeds, 'Wind Speed (m/s)', '#0077be');
      drawBarChart('windPressureChart', labels, pressures, 'Pressure (hPa)', '#00cc66');
      drawBarChart('windHumidityChart', labels, humidities, 'Humidity (%)', '#ff9933');
    })
    .catch(err => console.error('Error loading wind data:', err));
}

// ===============================
// LOAD SOLAR DATA
// ===============================
// Fetches forecast data from OpenWeather API for solar parameters.
// Populates the solar table and draws charts for temperature, humidity, and cloud cover.
function loadSolarData(city) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${solarKey}`)
    .then(res => res.json())
    .then(data => {
      const tableBody = document.querySelector('#solarTable tbody');
      tableBody.innerHTML = '';

      const temps = [], humidities = [], clouds = [], labels = [];

      // Loop through 15 entries (10 past + 5 forecast)
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

        // Create table row with color-coded cells
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${dt}</td>
          <td style="background:${colorScale(temp, temps)}">${temp}</td>
          <td style="background:${colorScale(humidity, humidities)}">${humidity}</td>
          <td style="background:${colorScale(cloud, clouds)}">${cloud}</td>
        `;
        tableBody.appendChild(row);
      }

      // Draw charts for each parameter
      drawBarChart('solarTempChart', labels, temps, 'Temperature (°C)', '#ff6666');
      drawBarChart('solarHumidityChart', labels, humidities, 'Humidity (%)', '#3399ff');
      drawBarChart('solarCloudChart', labels, clouds, 'Cloud Cover (%)', '#cccc00');
    })
    .catch(err => console.error('Error loading solar data:', err));
}

// ===============================
// DRAW BAR CHART
// ===============================
// Creates a bar chart for a given dataset.
// Highlights max values in orange and min values in light blue.
function drawBarChart(canvasId, labels, data, label, baseColor) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (window[canvasId]) window[canvasId].destroy();

  const max = Math.max(...data);
  const min = Math.min(...data);

  // Assign colors based on value
  const colors = data.map(val => {
    if (val === max) return 'orange';
    if (val === min) return 'lightblue';
    return baseColor;
  });

  // Create chart
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

// ===============================
// COLOR SCALE FUNCTION
// ===============================
// Determines the background color for table cells based on value.
// Max values = orange, Min values = light blue, others = white.
function colorScale(value, array) {
  const max = Math.max(...array);
  const min = Math.min(...array);
  if (value === max) return 'orange';
  if (value === min) return 'lightblue';
  return '#ffffff';
}

// ===============================
// MENU TAB SWITCHING
// ===============================
// Handles switching between tabs when menu/submenu items are clicked.
// Also highlights the active menu item.
function showTab(tabId) {
  // Hide all tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');

  // Remove active from all menu items
  document.querySelectorAll('.menu-item, .submenu-item').forEach(item => {
    item.classList.remove('active');
  });

  // Highlight the clicked item
  const clickedItem = [...document.querySelectorAll('.menu-item, .submenu-item')]
    .find(item => item.getAttribute('onclick')?.includes(tabId));
  if (clickedItem) {
    clickedItem.classList.add('active');
    // If submenu item is active, also highlight the Data parent menu
    if (clickedItem.classList.contains('submenu-item')) {
      document.querySelector('.menu-item[onclick="toggleSubmenu()"]').classList.add('active');
    }
  }
}

// ===============================
// TOGGLE SUBMENU VISIBILITY
// ===============================
// Expands or collapses the Data submenu when clicked.
function toggleSubmenu() {
  const submenu = document.getElementById('dataSubmenu');
  submenu.style.display = submenu.style.display === 'flex' ? 'none' : 'flex';
}

// ===============================
// INITIAL LOAD
// ===============================
// Automatically load data when the page first opens.
refreshData();

// ===============================
// STATUS RIBBON FUNCTIONS
// ===============================

// Update the two lines of status ribbon
function updateStatus(line1, line2) {
  document.getElementById('statusLine1').textContent = line1;
  document.getElementById('statusLine2').textContent = line2;
}

// Pause execution when error occurs
function pauseOnError(errorMsg) {
  updateStatus("⚠️ Error occurred", errorMsg);
  // Disable Continue button until user clicks
  document.getElementById('continueBtn').disabled = false;
}

// Continue execution after pause
function continueExecution() {
  updateStatus("▶ Continuing...", "Resuming functions...");
  // You can re-trigger refresh or resume logic here
  refreshData();
  document.getElementById('continueBtn').disabled = true;
}

// Example usage inside existing functions
// Add updateStatus calls in your loadWindData and loadSolarData
// For example, at the start of loadWindData:
updateStatus("Loading wind data...", "Fetching forecast from OpenWeather API");

// And inside catch blocks:
.catch(err => {
  console.error('Error loading wind data:', err);
  pauseOnError("Wind data fetch failed.");
});
