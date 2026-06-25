// firebase-init.js
const firebaseConfig = {
  apiKey: "AIzaSyAEUHTr9b3K-Dn7X7bwN8zmEEnH8zZu2XE",
  authDomain: "snk-work.firebaseapp.com",
  projectId: "snk-work",
  storageBucket: "snk-work.firebasestorage.app",
  messagingSenderId: "922160751773",
  appId: "1:922160751773:web:af0bd401f95bf8836c6074",
  // The database URL for the asia-southeast1 region
  databaseURL: "https://snk-work-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
console.log("Firebase Initialized");
