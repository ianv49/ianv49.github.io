const cities = ['Manila', 'Tokyo', 'New York', 'London'];
const apiKey = 'wind1'; // Replace with your actual key if needed

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
