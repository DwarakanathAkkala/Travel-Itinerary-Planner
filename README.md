Of course. It's crucial to keep the documentation updated with the project's progress.

Here is the complete, updated `README.md` file. I have incorporated the new **Seamless Trip Sharing** feature, added the new files to the directory structure, and updated the usage instructions.

You can replace the entire content of your existing `README.md` with this new version.

---

# Wanderlust - A Travel Itinerary Planner

## Introduction
Wanderlust is a dynamic, client-side web application designed to simplify the trip-planning process. It provides travelers like Lucy with a comprehensive, single-page platform to organize all their travel details in one place. From building a day-by-day itinerary and visualizing destinations on an interactive map to tracking expenses and sharing plans with others, Wanderlust aims to make travel planning structured, enjoyable, and stress-free. This project leverages the power of Firebase for its backend services, including authentication and a real-time database, to create a seamless and responsive user experience.

## Project Type
Frontend | Serverless Backend (Firebase)

## Deployed App
**Live Site:** [https://travel-itinerary-planner-dwaraka.netlify.app/]

**Database:** The project uses Google's Firebase Realtime Database, which can be viewed in the [Firebase Console](https://console.firebase.google.com/) (requires project access).

## Directory Structure
```
Wanderlust/
├── assets/
│   ├── css/
│   │   ├── dashboard.css
│   │   ├── expense.css
│   │   ├── share.css
│   │   ├── trip.css
│   │   └── trip-form.css
│   └── images/
│
├── js/
│   ├── auth.js
│   ├── dashboard.js
│   ├── share.js
│   ├── trip.js
│   ├── trip-expenses.js
│   ├── trip-itinerary.js
│   ├── trip-map.js
│   └── trip-share.js
│
├── index.html          (Landing Page)
├── login.html
├── signup.html
├── dashboard.html      (Main user dashboard)
├── share.html          (Public, read-only trip page)
├── trip.html           (Trip detail page)
├── trip-form.html
├── itinerary-form.html
├── expense-form.html
└── firebase-messaging-sw.js
```

## Video Walkthrough of the project
*[Link to your 1-3 minute video demonstrating the user-facing features of the live application]*

## Video Walkthrough of the codebase
*[Link to your 1-5 minute video explaining the project structure, how the files are organized, the role of each JS module, and how Firebase is integrated]*

## Features
- **Secure User Authentication:** Users can sign up or log in using Email/Password or their Google account.
- **Trip Creation & Management:** A central dashboard where users can create, view, and manage all their upcoming trips.
- **Intuitive Itinerary Builder:** For any trip, users can add, edit, and delete itinerary items (flights, lodging, activities, etc.), which are automatically sorted by date and time.
- **Interactive Map Integration:** Displays all itinerary items with a location as custom, color-coded markers on an interactive Leaflet map. The map automatically adjusts its view to fit all markers.
- **Real-Time Directions:** Users can get real-time driving directions from their current location to any itinerary item directly on the map.
- **Comprehensive Expense Tracker:** Users can add, edit, delete, and categorize trip-specific expenses to monitor their budget in real-time.
- **Seamless Trip Sharing:** Users can generate a unique, read-only link for their trip to share with friends and family. The feature uses the native Web Share API on supported devices for a seamless experience and provides a copy-to-clipboard fallback for others.
- **Responsive Design:** The entire application is fully responsive and provides a seamless experience on desktop, tablet, and mobile devices.

## Design Decisions or Assumptions
- **Serverless Architecture:** I chose Firebase for all backend services (Auth, Realtime Database) to create a powerful application without needing to manage my own server. This simplifies deployment and scaling.
- **Modular JavaScript:** As the application grew, the `trip.js` file was refactored into smaller, feature-specific modules (`trip-map.js`, `trip-itinerary.js`, `trip-expenses.js`, `trip-share.js`) to improve code organization, maintainability, and separation of concerns.
- **Client-Side Rendering:** All HTML is rendered dynamically in the browser using data fetched from Firebase. This creates a fast, single-page application feel.
- **Free-Tier APIs:** For the map features, I opted for Leaflet.js with the free Nominatim geocoding service and OpenStreetMap tiles to deliver full functionality without incurring API costs.
- **Security through Firebase Rules:** Instead of hiding API keys with environment variables (which is not possible in this static-site setup), security is enforced through robust Firebase Security Rules and Google Cloud API key restrictions, which is the recommended approach for client-side applications. Read access for shared trips is explicitly controlled by an `isShared` flag in the database.

## Installation & Getting started
This is a client-side application and does not require a build step or package manager. To run it locally, you can use any simple local server. Python's built-in server is a great option.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/DwarakanathAkkala/Travel-Itinerary-Planner
    cd your-repo-name

2.  **Set up Firebase:**
    - You will need to create your own project on [Firebase](https://firebase.google.com/).
    - Enable Authentication (Email/Password and Google providers).
    - Enable the Realtime Database.
    - Copy your project's Firebase configuration object into `js/firebase-config.js`.
    - **Crucially, update your Realtime Database Security Rules** with the rules provided in this project to enable secure sharing.

3.  **Run a local server:**
    If you have Python 3 installed:
    ```bash
    python -m http.server
    ```
    If you have Python 2 installed:
    ```bash
    python -m SimpleHTTPServer
    ```
4.  **Open the application:**
    Navigate to `http://localhost:8000` in your web browser.

## Usage
1.  Navigate to the deployed app URL.
2.  Sign up for a new account or log in with the provided credentials.
3.  On the dashboard, click "Add Trip" to create your first trip.
4.  Once a trip is created, click "View Details".
5.  On the trip detail page, you can:
    - Click "Add Item" to add itinerary events.
    - Click "Add Expense" to log your spending.
    - Click "Share Trip" to get a read-only link to send to others.

## Credentials
To review the authenticated pages, you can use the following credentials or sign up for a new account:

-   **Email:** `dwaraka@example.com`
-   **Password:** `dwarakatest`

## APIs Used
-   **Firebase Authentication:** For user sign-up and login.
-   **Firebase Realtime Database:** For all data storage (trips, itinerary, expenses).
-   **Leaflet.js:** Open-source library for the interactive map display.
-   **OpenStreetMap:** Provides the free map tile layers for Leaflet.
-   **Nominatim API:** A free geocoding service from OpenStreetMap to convert location names into latitude/longitude coordinates.
-   **Web Share API:** A browser API for accessing a device's native sharing capabilities.
-   **Leaflet Routing Machine:** Plugin for Leaflet to calculate and display routes on the map.

## API Endpoints
This is a client-side application that communicates directly with the Firebase SDKs. It does not have its own REST or GraphQL API endpoints.

## Technology Stack
-   **HTML5**
-   **CSS3:** Including Flexbox, Grid, and media queries for responsive design.
-   **JavaScript (ES6+):** Vanilla JS with a modular structure (`import`/`export`).
-   **Firebase:**
    -   Firebase Authentication
    -   Firebase Realtime Database
-   **Leaflet.js:** For all mapping features.
-   **Netlify:** For hosting and continuous deployment.