// netlify/functions/uploadImage.js (FINAL, SECURE VERSION)

const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Securely get both the key and the album ID from environment variables
    const { IMGBB_API_KEY, IMGBB_ALBUM_ID } = process.env;

    if (!IMGBB_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured.' }) };
    }

    // Construct the API URL. If no album ID is configured, it will be ignored.
    let apiUrl = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
    if (IMGBB_ALBUM_ID) {
        apiUrl += `&album=${IMGBB_ALBUM_ID}`;
    }

    try {
        const { image, name } = JSON.parse(event.body);
        if (!image) {
            return { statusCode: 400, body: JSON.stringify({ error: 'No image data provided.' }) };
        }

        const imageBuffer = Buffer.from(image, 'base64');
        const formData = new FormData();
        formData.append('image', imageBuffer, { filename: name || 'upload.jpg' });

        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error?.message || 'Unknown error from imgbb API');
        }

        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ url: result.data.url })
        };

    } catch (error) {
        console.error("Upload function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};