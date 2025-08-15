// js/trip-weather.js

const locationSelect = document.getElementById('weather-location-select');
const forecastDisplay = document.getElementById('weather-forecast-display');
let locationCache = {}; // Local cache for this module

/**
 * Initializes the weather feature.
 * @param {object} tripData - The full data object for the current trip.
 */
export function initializeWeatherFeature(tripData) {
    locationCache = {};
    locationSelect.innerHTML = '';
    forecastDisplay.innerHTML = '<p class="weather-prompt">Select a location to see its forecast.</p>';

    const locations = new Set();
    if (tripData.destination) locations.add(tripData.destination);
    if (tripData.itinerary) {
        Object.values(tripData.itinerary).forEach(item => {
            if (item.location) locations.add(item.location);
        });
    }

    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        locationSelect.appendChild(option);
    });

    locationSelect.addEventListener('change', handleLocationChange);

    if (locations.size > 0) {
        locationSelect.dispatchEvent(new Event('change'));
    }
}

/**
 * Handles the event when a new location is selected.
 * @param {Event} e - The change event.
 */
async function handleLocationChange(e) {
    const locationName = e.target.value;
    if (!locationName) return;

    forecastDisplay.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const coords = await getCoordinatesForLocation(locationName);
        if (!coords) throw new Error('Coordinates not found');

        const weatherData = await fetchWeatherForCoordinates(coords);
        renderWeatherForecast(weatherData);

    } catch (error) {
        console.error("Weather fetch error:", error);
        forecastDisplay.innerHTML = `<p class="weather-prompt">Could not load weather for this location.</p>`;
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

async function fetchWeatherForCoordinates(coords) {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&timezone=auto`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    return data.daily;
}

function renderWeatherForecast(dailyData) {
    forecastDisplay.innerHTML = '';
    dailyData.time.forEach((dateStr, index) => {
        const card = document.createElement('div');
        card.className = 'weather-card';
        const date = new Date(dateStr);
        const day = date.toLocaleDateString(undefined, { weekday: 'short' });
        const dayAndMonth = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        const code = dailyData.weathercode[index];
        const tempMax = Math.round(dailyData.temperature_2m_max[index]);
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

// --- THIS IS THE CORRECTED AND COMPLETE FUNCTION ---
function generateWeatherAdvice(code, tempMax, precipProb, windspeed) {
    // Precipitation-related advice (highest priority)
    if (code >= 51 && code <= 67 || code >= 80) return "Rain is likely. Pack an umbrella or raincoat!";
    if (code >= 71 && code <= 77) return "Snowfall expected. Dress in warm layers!";
    if (code >= 95) return "Thunderstorms possible. Plan for indoor activities.";
    if (precipProb > 40) return "A chance of precipitation. It's wise to carry a light jacket.";

    // Wind-related advice
    if (windspeed > 30) return "It will be quite windy. A windbreaker is recommended.";

    // Temperature-related advice
    if (tempMax > 30) return "Hot weather ahead. Stay hydrated and wear light clothing.";
    if (tempMax > 20) return "Pleasantly warm. Great for sightseeing and outdoor activities.";
    if (tempMax < 10) return "Chilly weather. Be sure to pack a warm coat.";

    // General conditions
    if (code >= 45 && code <= 48) return "Expect fog, which may reduce visibility for driving or views.";
    if (code <= 2) return "Clear skies or a few clouds. Perfect for photos and exploring!";

    // --- THE CRUCIAL FALLBACK ---
    // If none of the above conditions are met, this will be returned.
    return "Enjoy your day! The weather looks pleasant.";
}