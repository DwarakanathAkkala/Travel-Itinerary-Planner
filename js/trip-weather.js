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

    const locationMap = new Map(); // Use a Map to store location and its first date

    // Add the main destination with the trip's start date
    if (tripData.destination) {
        locationMap.set(tripData.destination, tripData.startDate);
    }
    // Add itinerary items, overwriting date only if it's new
    if (tripData.itinerary) {
        Object.values(tripData.itinerary).forEach(item => {
            if (item.location && !locationMap.has(item.location)) {
                locationMap.set(item.location, item.date);
            }
        });
    }

    // Populate the dropdown
    locationMap.forEach((date, location) => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        // Add the date as a data attribute
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

/**
 * Handles the event when a new location is selected.
 * @param {Event} e - The change event.
 */
async function handleLocationChange(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const locationName = selectedOption.value;
    // Get the date from the option's data attribute
    const itemDate = selectedOption.dataset.date;

    if (!locationName) return;

    forecastDisplay.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const coords = await getCoordinatesForLocation(locationName);
        if (!coords) {
            throw new Error('Coordinates not found');
        }

        // Pass the itemDate to the weather fetching function
        const weatherData = await fetchWeatherForCoordinates(coords, itemDate);
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

async function fetchWeatherForCoordinates(coords, itemDateStr) {
    // --- DATE CALCULATION LOGIC ---
    const targetDate = itemDateStr ? new Date(itemDateStr) : new Date();

    // Go back 3 days from the target date
    const startDate = new Date(targetDate);
    startDate.setDate(targetDate.getDate() - 3);

    // Go forward 3 days from the target date
    const endDate = new Date(targetDate);
    endDate.setDate(targetDate.getDate() + 3);

    // Format dates into YYYY-MM-DD strings for the API
    const formatDate = (d) => d.toISOString().split('T')[0];
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max&start_date=${startDateStr}&end_date=${endDateStr}&timezone=auto`;

    console.log("Fetching weather from URL:", apiUrl); // For debugging

    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error(`Weather API failed with status ${response.status}`);
    }
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