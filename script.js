const cities = ['Manila', 'Tokyo', 'New York', 'London'];
// const apiKey = 'wind1'; // Replace with your actual key if needed
// https://api.openweathermap.org/data/2.5/weather?q=CityName&appid=YOUR_API_KEY
// api key solar1 e645925cfe8367841ad656678b7c3acc
// api key wind1 0723d71a05e58ae3f7fc91e39a901e6b
const apiKey = '0723d71a05e58ae3f7fc91e39a901e6b'; // Replace with your actual key if needed
const tableBody = document.querySelector('#weatherTable tbody');

cities.forEach(city => {
  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`)
    .then(response => response.json())
    .then(data => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${city}</td>
        <td>${data.main.temp}</td>
        <td>${data.main.humidity}</td>
        <td>${data.wind.speed}</td>
      `;
      tableBody.appendChild(row);
    })
    .catch(error => {
      console.error(`Error fetching data for ${city}:`, error);
    });
});
