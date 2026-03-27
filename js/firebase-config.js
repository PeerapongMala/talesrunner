const firebaseConfig = {
  apiKey: "AIzaSyC-R8wnPsPIHfYoVw_HjimthCqTa_PZCjw",
  authDomain: "telesrunner-afab6.firebaseapp.com",
  projectId: "telesrunner-afab6",
  storageBucket: "telesrunner-afab6.firebasestorage.app",
  messagingSenderId: "454814765823",
  appId: "1:454814765823:web:ae0572cbdaa3711f2132ca",
  measurementId: "G-1DP2XH12LE"
};

// Init Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
