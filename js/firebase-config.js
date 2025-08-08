// js/firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyDB6K82XO8VMBpgovePMbs1uIytC-_tK2c", // Must be valid
    authDomain: "travel-planner-dwaraka.firebaseapp.com", // Format must match exactly
    databaseURL: "https://travel-planner-dwaraka-default-rtdb.firebaseio.com/",
    projectId: "travel-planner-dwaraka",
    storageBucket: "travel-planner-dwaraka.appspot.com",
};
firebase.initializeApp(firebaseConfig);