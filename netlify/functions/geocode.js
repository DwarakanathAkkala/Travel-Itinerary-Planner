exports.handler = async function (event, context) {
    // Get the location query parameter from the request
    const location = event.queryStringParameters.location;

    if (!location) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Location parameter is required." })
        };
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;

    try {
        const response = await fetch(nominatimUrl, {
            headers: {
                // It's still good practice to identify ourselves
                'User-Agent': 'WanderlustTravelPlanner/1.0 (https://travel-itinerary-planner-dwaraka.netlify.app/)'
            }
        });

        if (!response.ok) {
            // Pass through the error from Nominatim
            return { statusCode: response.status, body: response.statusText };
        }

        const data = await response.json();

        // Return the successful response
        return {
            statusCode: 200,
            headers: {
                // This is the "permission slip" that fixes CORS for our browser
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch geocoding data." })
        };
    }
};