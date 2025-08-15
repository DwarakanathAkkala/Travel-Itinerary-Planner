// js/trip-weather.js

// This function will be the main entry point, called by trip.js
export function initializeWeatherFeature(tripData, locationCache) {
    console.log("Initializing Weather Feature with data:", tripData, locationCache);
    // Future logic will go here
}

/**
 * Generates actionable, generic advice based on weather conditions.
 * @param {number} code - The weather code from the API.
 * @param {number} tempMax - The maximum temperature.
 * @param {number} precipProb - The precipitation probability (%).
 * @param {number} windspeed - The windspeed.
 * @returns {string} - The generated advice string.
 */
function generateWeatherAdvice(code, tempMax, precipProb, windspeed) {
    // Precipitation-related advice (highest priority)
    if (code >= 51 && code <= 67 || code >= 80) { // Rain codes
        return "Rain is likely. Pack an umbrella or raincoat!";
    }
    if (code >= 71 && code <= 77) { // Snow codes
        return "Snowfall expected. Dress in warm layers!";
    }
    if (code >= 95) { // Thunderstorm codes
        return "Thunderstorms possible. Plan for indoor activities.";
    }
    if (precipProb > 40) {
        return "A chance of precipitation. It's wise to carry a light jacket or umbrella.";
    }

    // Wind-related advice
    if (windspeed > 30) {
        return "It will be quite windy. A windbreaker is recommended.";
    }

    // Temperature-related advice
    if (tempMax > 30) {
        return "Hot weather ahead. Stay hydrated and wear light clothing.";
    }
    if (tempMax > 20) {
        return "Pleasantly warm. Great for sightseeing and outdoor activities.";
    }
    if (tempMax < 10) {
        return "Chilly weather. Be sure to pack a warm coat.";
    }

    // General conditions
    if (code >= 45 && code <= 48) { // Fog codes
        return "Expect fog, which may reduce visibility for driving or views.";
    }
    if (code === 0) { // Sunny code
        return "Clear sunny skies! Perfect for photos. Don't forget sunscreen.";
    }

    return "Enjoy your day! The weather looks pleasant."; // Default advice
}