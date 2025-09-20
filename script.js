const defaultCities = ['Manila', 'Tokyo', 'New York', 'London'];
//const weatherKey = 'wind1'; //0723d71a05e58ae3f7fc91e39a901e6b
//const solarKey = 'solar1'; //e645925cfe8367841ad656678b7c3acc
const weatherKey = '0723d71a05e58ae3f7fc91e39a901e6b'; 
const solarKey = 'e645925cfe8367841ad656678b7c3acc'; 

function loadWeatherData() {
  const cityInput = document.getElementById('cityInput').value.trim();
  const cities = cityInput ? [cityInput] : defaultCities;
  const tableBody = document.querySelector('#weatherTable tbody');
  tableBody.innerHTML = '';

  cities.forEach(city => {
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${weatherKey}`)
      .then(res => res.json())
      .then(data => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${city}</td>
          <td>${data.main.temp}</td>
          <td>${data.main.humidity}</td>
          <td>${data.main.pressure}</td>
          <td>${data.wind.speed}</td>
          <td>${data.weather[0].description}</td>
        `;
        tableBody.appendChild(row);
      })
      .catch(err => console.error(`Weather error for ${city}:`, err));
  });
}

function loadSolarData() {
  const cityInput = document.getElementById('cityInput').value.trim();
  const cities = cityInput ? [cityInput] : defaultCities;
  const tableBody = document.querySelector('#solarTable tbody');
  tableBody.innerHTML = '';

  cities.forEach(city => {
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
      })
      .catch(err => console.error(`Solar error for ${city}:`, err));
  });
}

// Auto-load on page start
loadWeatherData();
loadSolarData();
