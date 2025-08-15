// js/trip-weather.js

const locationSelect = document.getElementById('weather-location-select');
const forecastDisplay = document.getElementById('weather-forecast-display');
const spinnerContainer = document.getElementById('weather-spinner-container'); // Get the dedicated container
let locationCache = {};

export function initializeWeatherFeature(tripData) {
    locationCache = {};
    locationSelect.innerHTML = '';
    forecastDisplay.innerHTML = '<p class="weather-prompt">Select a location to see its forecast.</p>';
    spinnerContainer.style.display = 'none'; // Ensure spinner is hidden initially

    const locationMap = new Map();
    if (tripData.destination) {
        locationMap.set(tripData.destination, tripData.startDate);
    }
    if (tripData.itinerary) {
        Object.values(tripData.itinerary).forEach(item => {
            if (item.location && !locationMap.has(item.location)) {
                locationMap.set(item.location, item.date);
            }
        });
    }

    locationMap.forEach((date, location) => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        if (date) {
            option.dataset.date = date;
        }
        locationSelect.appendChild(option);
    });

    locationSelect.addEventListener('change', handleLocationChange);

    if (locationMap.size > 0) {
        locationSelect.dispatchEvent(new Event('change'));
    }
}

async function handleLocationChange(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const locationName = selectedOption.value;
    const itemDate = selectedOption.dataset.date;

    if (!locationName) return;

    // The foolproof loading logic
    forecastDisplay.innerHTML = ''; // 1. Clear the old cards or error message
    spinnerContainer.style.display = 'block'; // 2. Show the dedicated, isolated spinner

    try {
        const coords = await getCoordinatesForLocation(locationName);
        if (!coords) throw new Error(`Could not find geographic coordinates for "${locationName}".`);

        const weatherData = await fetchWeatherForCoordinates(coords, itemDate);
        if (!weatherData) throw new Error("The weather service did not return any data for this location.");

        renderWeatherForecast(weatherData);

    } catch (error) {
        console.error("Weather fetch error:", error);
        forecastDisplay.innerHTML = `
            <div class="weather-error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        // 3. ALWAYS hide the spinner when done
        spinnerContainer.style.display = 'none';
    }
}

async function getCoordinatesForLocation(locationName) {
    if (locationCache[locationName]) return locationCache[locationName];
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
        const coords = { lat: data[0].lat, lng: data[0].lon };
        locationCache[locationName] = coords;
        return coords;
    }
    return null;
}

async function fetchWeatherForCoordinates(coords, itemDateStr) {
    const targetDate = itemDateStr ? new Date(itemDateStr) : new Date();
    const startDate = new Date(targetDate);
    startDate.setDate(targetDate.getDate() - 3);
    const endDate = new Date(targetDate);
    endDate.setDate(targetDate.getDate() + 3);
    const formatDate = (d) => d.toISOString().split('T')[0];
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&start_date=${startDateStr}&end_date=${endDateStr}&timezone=auto`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Weather API failed with status ${response.status}`);
    const data = await response.json();
    return data.daily;
}

function renderWeatherForecast(dailyData) {
    forecastDisplay.innerHTML = '';
    dailyData.time.forEach((dateStr, index) => {
        const card = document.createElement('div');
        const code = dailyData.weathercode[index];
        const tempMax = Math.round(dailyData.temperature_2m_max[index]);
        card.className = `weather-card ${getWeatherThemeClass(code, tempMax)}`;
        const date = new Date(dateStr);
        const day = date.toLocaleDateString(undefined, { weekday: 'short' });
        const dayAndMonth = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        const tempMin = Math.round(dailyData.temperature_2m_min[index]);
        const precipProb = dailyData.precipitation_probability_max[index];
        const windspeed = Math.round(dailyData.windspeed_10m_max[index]);
        const iconClass = getWeatherIcon(code);
        const advice = generateWeatherAdvice(code, tempMax, precipProb, windspeed);
        card.innerHTML = `
            <div class="day">${day}</div>
            <div class="date">${dayAndMonth}</div>
            <div class="icon"><i class="fas ${iconClass}"></i></div>
            <div class="temps">${tempMax}°<span>/${tempMin}°</span></div>
            <div class="detail"><i class="fas fa-tint"></i> ${precipProb}%</div>
            <div class="detail"><i class="fas fa-wind"></i> ${windspeed} km/h</div>
            <div class="advice">${advice}</div>
        `;
        forecastDisplay.appendChild(card);
    });
}

function getWeatherThemeClass(code, temp) {
    if (code >= 51 && code <= 67 || code >= 80 && code <= 82 || code >= 95) return 'rainy';
    if (code >= 71 && code <= 77 || code >= 85) return 'snowy';
    if (temp > 28) return 'hot';
    if (temp > 20) return 'warm';
    if (temp > 15) return 'mild';
    if (temp > 5) return 'cool';
    return 'cold';
}

function getWeatherIcon(code) {
    if (code === 0) return 'fa-sun';
    if (code <= 2) return 'fa-cloud-sun';
    if (code === 3) return 'fa-cloud';
    if (code <= 48) return 'fa-smog';
    if (code <= 55) return 'fa-cloud-rain';
    if (code <= 65) return 'fa-cloud-showers-heavy';
    if (code <= 67) return 'fa-snowflake';
    if (code <= 77) return 'fa-snowflake';
    if (code <= 82) return 'fa-cloud-showers-heavy';
    if (code <= 86) return 'fa-snowflake';
    if (code >= 95) return 'fa-bolt';
    return 'fa-question-circle';
}

function generateWeatherAdvice(code, tempMax, precipProb, windspeed) {
    if (code >= 51 && code <= 67 || code >= 80) return "Rain is likely. Pack an umbrella or raincoat!";
    if (code >= 71 && code <= 77) return "Snowfall expected. Dress in warm layers!";
    if (code >= 95) return "Thunderstorms possible. Plan for indoor activities.";
    if (precipProb > 40) return "A chance of precipitation. It's wise to carry a light jacket.";
    if (windspeed > 30) return "It will be quite windy. A windbreaker is recommended.";
    if (tempMax > 30) return "Hot weather ahead. Stay hydrated and wear light clothing.";
    if (tempMax > 20) return "Pleasantly warm. Great for sightseeing and outdoor activities.";
    if (tempMax < 10) return "Chilly weather. Be sure to pack a warm coat.";
    if (code >= 45 && code <= 48) return "Expect fog, which may reduce visibility for driving or views.";
    if (code <= 2) return "Clear skies or a few clouds. Perfect for photos and exploring!";
    return "Enjoy your day! The weather looks pleasant.";
}