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

//#region metodi helper
function checkName(name){
  db.ref('users/').on('value', (snapshot)=>{
    var listUsers = [];
    snapshot.forEach((item) =>{
      var itemVal = item.val();
      listUsers.push(itemVal);
    })
    //console.log(listUsers);
    for(element of listUsers){
      if(element[`username`]==name){
        console.log("name already exists");
        return false;
      }
    }
  });
  return true;
}
//#endregion

//#region autenticazione

function registerUser(){
    //console.log("cia");
    var name = document.getElementById("name").value;
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    //i nomi devono essere univoci
    if(checkName(name)){
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
    //Email e nome saranno univoci
    
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

      if(snapshot.val().isAdmin){
        var ad = document.getElementsByName("admin-mode");
        for(element of ad){
          element.style.display = "block";
        }
      }
    })
    var user = userCredential.user;
    console.log(user);
    console.log(currentUser);
    
    document.getElementById("chat-section").style.display = "block";
    document.getElementById("login-section").style.display = "none";
    // ...
    chat();
    showChannels();
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
function chat(){
  console.log(currentUser);
db.ref('messages/').on("child_added", function (snapshot) {
  const messages = snapshot.val();
  const message = `<li class=${
    currentUser === messages.name ? "sent" : "receive"
  }><span>${messages.name}: </span>${messages.message}</li>`;
  // append the message on the page
  document.getElementById("messages").innerHTML += message;
});
}

//#endregion

//#region Canali

function channelSection(){
  document.getElementById("list-user").innerHTML = "";
  document.getElementById("chat-section").style.display = "none";
  document.getElementById("createchannel-section").style.display = "block";
  
  db.ref('users/').on('value', (snapshot)=>{
    var listUsers = [];
    snapshot.forEach((item) =>{
      var itemVal = item.val();
      listUsers.push(itemVal);
    })
    //console.log(listUsers);
    for(element of listUsers){
      console.log(element[`username`]);
      var aUser = `<input type="checkbox" name="user" id="${element[`username`]}" value="${element[`username`]}"><label for="${element[`username`]}">${element[`username`]}</label><br>`;
      
        console.log(aUser);
      document.getElementById("list-user").innerHTML += aUser;
    }
  });
  
}

function createChannel(){
  var nameChannel = document.getElementById("name-channel").value;
  if(nameChannel === ''){
    return false; 
  }
  
  //inserisci gli utenti selezionati nell'array
  usersSelected = [];
  var users = document.getElementById("list-user").children;
  Array.from(users).forEach(input =>{
    if(input.checked){
      usersSelected.push(input.id);
    }
  });

  db.ref('channels/' + nameChannel).set({
    name: nameChannel,
    users: usersSelected,
  });

  document.getElementById("createchannel-section").style.display = "none";
  document.getElementById("chat-section").style.display = "block";
}


//da finire
function showChannels(){
  db.ref('channels/').on("child_added", function (snapshot) {
    const channels = Object.entries(snapshot.val());
    for(elements of channels){

      for(user of elements.users){
        if(currentUser == user){
          const channel = `<li><span>${element.name}</span></li>`;
          document.getElementById("channels").innerHTML += channel;
        }
      }
    }
  });
}

//#endregion

