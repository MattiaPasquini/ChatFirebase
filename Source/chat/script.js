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
const db = firebase.database();

//#region 
function registerUser(){
    var name = document.getElementById("name").value;
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    //Email sarà univoco e 
    firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        //Signed in
        const user = userCredential.user;
        var uid = user.uid;
        db.ref('users/' + uid).set({
            userId: uid,
            username: name,
            email: email,
            isAdmin: false
        })
        console.log(user);
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorMessage);
    });
}

var currentUser = null;

function loginUser(){
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {

    // Signed in
    db.ref('users/' + userCredential.user.uid).on("value", (snapshot)=>{
      currentUser = snapshot.val().username;
      console.log(currentUser);
    })
    var user = userCredential.user;
    console.log(user);
    console.log(currentUser);
    
    document.getElementById("chat-section").style.display = "block";
    document.getElementById("login-section").style.display = "none";
    // ...
    
  })
  .catch((error) => {
    var errorCode = error.code;
    var errorMessage = error.message;
    console.log(errorMessage);
  });
  
  
}
//#endregion

//#region invio e recezione messaggi

//evento in ascolto nel bottone invio del messaggio e 
//quando triggera invoca metodo sendMessage
var a = document.getElementById("message-form")
if(a){addEventListener("submit", sendMessage);}

function sendMessage(e){
    e.preventDefault();

    // get values to be submitted
    const timestamp = Date.now();
    const messageInput = document.getElementById("message-input");
    const message = messageInput.value;
  
    // clear the input box
    messageInput.value = "";
  
    //auto scroll to bottom
    document
      .getElementById("messages")
      .scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  
    // create db collection and send in the data
    db.ref("messages/" + timestamp).set({
      name: currentUser,
      message: message,
    });
}

//se ci sono nuovi messaggi, vengono aggiunto
console.log(currentUser);
db.ref('messages/').on("child_added", function (snapshot) {
  const messages = snapshot.val();
  const message = `<li class=${
    currentUser === messages.name ? "sent" : "receive"
  }><span>${messages.name}: </span>${messages.message}</li>`;
  // append the message on the page
  document.getElementById("messages").innerHTML += message;
});
//#endregion