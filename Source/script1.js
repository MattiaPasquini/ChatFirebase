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

//variabili globali
var currentUser = null;
var currentChannel = null;

//#region metodi helper
function checkName(name){
  db.ref('users/').once('value', (snapshot)=>{
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



function loginUser(){
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {

    // Signed in
    db.ref('users/' + userCredential.user.uid).once("value", (snapshot)=>{
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
    
    document.getElementById("login-section").style.display = "none";
    document.getElementById("principal-section").style.display = "block";
    //document.getElementById("chat-section").style.display = "block";
    // ...
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
    if(message == ""){
      return;
    }
    // clear the input box
    messageInput.value = "";
  
    //auto scroll to bottom
    document
      .getElementById(currentChannel)
      .scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  
    // create db collection and send in the data
    var channelMessage = `channels/${currentChannel}/messages/`;
    db.ref(channelMessage + timestamp).set({
      name: currentUser,
      message: message,
    });
}



//#endregion

//#region Canali

function createChannelSection(){
  document.getElementById("list-user").innerHTML = "";

  document.getElementById("principal-section").style.display = "none";
  document.getElementById("createchannel-section").style.display = "block";
  
  db.ref('users/').on('value', (snapshot)=>{
    var listUsers = [];
    snapshot.forEach((item) =>{
      var itemVal = item.val();
      listUsers.push(itemVal);
    })
    //console.log(listUsers);
    for(element of listUsers){
      //console.log(element[`username`]);
      var aUser = `<input type="checkbox" name="user" id="${element[`username`]}" value="${element[`username`]}"><label for="${element[`username`]}">${element[`username`]}</label><br>`;
      
      //console.log(aUser);
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


  //quando crei un gruppo, ristampa la lista dei gruppi
  db.ref('channels/').once("value", (snapshot) => {
    document.getElementById("channels").innerHTML = "";
    channels = Object.entries(snapshot.val());
    for(channel of channels){
      for(user of channel[1].users){
        if(currentUser == user){
          const aChannel = `<li><a onclick="selectChannel('${channel[1].name}')">${channel[1].name}</a></li>`;
          document.getElementById("channels").innerHTML += aChannel;
          const divSection = `<ul id="${channel[1].name}"></ul>`;
          document.getElementById("channelschat-section").innerHTML += divSection;
        }
      }
    }
  });

  exitCreateChannel();
}

function exitCreateChannel(){
  document.getElementById("createchannel-section").style.display = "none";
  document.getElementById("principal-section").style.display = "block";
}


/* 
  channels = Object.entries(snapshot.val());
  output => 0: Array(2)
              0: "gruppo1"
              1:
                name: "gruppo1"
                users: (2) ['user1', 'user2']
*/
function showChannels(){
  db.ref('channels/').once("value", (snapshot) => {
    document.getElementById("channels").innerHTML = "";
    channels = Object.entries(snapshot.val());
    for(channel of channels){
      for(user of channel[1].users){
        if(currentUser == user){
          const aChannel = `<li><a onclick="selectChannel('${channel[1].name}')">${channel[1].name}</a></li>`;
          document.getElementById("channels").innerHTML += aChannel;
          const divSection = `<ul id="${channel[1].name}" style="display: none"></ul>`;
          document.getElementById("channelschat-section").innerHTML += divSection;

          ///FINIRE, LEGGERE I MESSAGGI GIa SCRITTI
          ///FINIRE, LEGGERE I MESSAGGI GIa SCRITTI
          ///FINIRE, LEGGERE I MESSAGGI GIa SCRITTI
          ///FINIRE, LEGGERE I MESSAGGI GIa SCRITTI

          //crea un listener, che poi ogni volta che viene aggiunto un messaggio viene eseguito
          db.ref(`channels/${channel[1].name}/messages/`).on("child_added", function (snapshot) {
            
            const messages = snapshot.val();
            const message = `<li class=${
              currentUser === messages.name ? "sent" : "receive"
            }><span>${messages.name}: </span>${messages.message}</li>`;
            console.log("inserito un messaggio");
            // append the message on the page

            
            document.getElementById(channel[1].name).innerHTML += message;
            
          });
        }
      }
    }
  });
}

function selectChannel(channel){
  if(currentChannel == channel){
    return;
  }else{
    if(currentChannel != null){
      document.getElementById(currentChannel).style.display = "none";
    }
  }
  document.getElementById("chat-section").style.display = "block";
  currentChannel = channel;
  document.getElementById(currentChannel).style.display = "block";
}



//#endregion

//#region comandi per amministratori
//#endregion