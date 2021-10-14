// Import the functions you need from the SDKs you need
//import { initializeApp } from "https://www.gstatic.com/firebasejs/8.2.1/firebase-app.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

//import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.1.2/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCeNUoQTugxpUtwBY05z0bneqa4fRSMm94",
  authDomain: "chat-d9ed7.firebaseapp.com",
  databaseURL: "https://chat-d9ed7-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "chat-d9ed7",
  storageBucket: "chat-d9ed7.appspot.com",
  messagingSenderId: "1017316498618",
  appId: "1:1017316498618:web:8d82c647cf37d8e142f683"
};


// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Initialize database
//const db = database();

function registerUser(){
    var name = document.getElementById("name").value;
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;
    const auth = firebase.auth();

    auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        //Signed in
        const user = userCredential.user;
        console.log("user");
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorMessage);
    });
}