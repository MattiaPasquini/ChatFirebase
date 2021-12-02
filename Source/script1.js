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
function checkName(name) {
  db.ref('users/').once('value', (snapshot) => {
      var listUsers = [];
      snapshot.forEach((item) => {
          var itemVal = item.val();
          listUsers.push(itemVal);
      })
      //console.log(listUsers);
      for (element of listUsers) {
          if (element[`username`] == name) {
              console.log("name already exists");
              return false;
          }
      }
  });
  return true;
}
//#endregion

//#region autenticazione

function registerUser() {
  var name = document.getElementById("name").value;
  var email = document.getElementById("email").value;
  var password = document.getElementById("password").value;

  //i nomi devono essere univoci
  if (checkName(name)) {
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
}


function loginUser() {
  var email = document.getElementById("email").value;
  var password = document.getElementById("password").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {

          // Signed in
          db.ref('users/' + userCredential.user.uid).once("value", (snapshot) => {
              currentUser = snapshot.val().username;
              console.log(currentUser);
              document.getElementById("user").innerHTML = "User: " + currentUser;

              if (snapshot.val().isAdmin) {
                  var ad = document.getElementsByName("admin-mode");
                  for (element of ad) {
                      element.style.display = "block";
                  }
              }
          })
          var user = userCredential.user;
          console.log(user);
          console.log(currentUser);

          document.getElementById("login-section").style.display = "none";
          document.getElementById("principal-section").style.display = "block";
          document.getElementById("settings").style.display = "block";
          //document.getElementById("chat-section").style.display = "block";
          // ...
          showChannels();
          //addAllListeners();
      })
      .catch((error) => {
          var errorCode = error.code;
          var errorMessage = error.message;
          console.log(errorMessage);
      });
}

function logoutUser() {
  firebase.auth().signOut().then(() => {
      location.reload();
  }).catch((error) => {
      // An error happened.
  });
}
//#endregion

//#region invio e recezione messaggi

/**
* evento in ascolto nel bottone invio del messaggio e 
* quando triggera invoca metodo sendMessage
*/
var a = document.getElementById("message-form")
if (a) { addEventListener("submit", sendMessage); }

function sendMessage(e) {
  e.preventDefault();


  // get values to be submitted
  const timestamp = Date.now();
  const messageInput = document.getElementById("message-input");
  const message = messageInput.value.trim();
  if (message == "") {
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
  var scroll = document.getElementById(currentChannel);
  scroll.scrollTop = scroll.scrollHeight;
}

//#endregion

//#region Canali

function createChannelSection() {
  document.getElementById("list-user").innerHTML = "";

  db.ref('users/').on('value', (snapshot) => {
      var listUsers = [];
      snapshot.forEach((item) => {
          var itemVal = item.val();
          listUsers.push(itemVal['username']);
      });
      listUsers.sort();
      console.log(listUsers);


      //console.log(listUsers);
      for (element of listUsers) {
          //console.log(element[`username`]);
          var aUser = `<input type="checkbox" name="user" id="${element}" value="${element}"><label for="${element}">${element}</label><br>`;

          //console.log(aUser);
          document.getElementById("list-user").innerHTML += aUser;
      }
  });
}



function createChannel() {
  var nameChannel = document.getElementById("name-channel").value;

  if (nameChannel === '') {
      return false;
  }

  //inserisci gli utenti selezionati nell'array
  usersSelected = [];
  var users = document.getElementById("list-user").children;

  Array.from(users).forEach(input => {
      if (input.checked) {
          usersSelected.push(input.id);
      }
  });

  db.ref('channels/' + nameChannel).set({
      name: nameChannel,
      users: usersSelected,
  });

  exitCreateChannel();

}


function exitCreateChannel() {
  $("#createChannel").modal('hide'); //chiude modal
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

function showChannels() {

  //aggiunta canali
  db.ref('channels/').on("child_added", (snapshot) => {

      var channel = snapshot.val();

      console.log(channel);

      for (user of channel.users) {
          if (currentUser == user) {
              const aChannel = channel.name;
              console.log(aChannel);

              const aChannelSection = `<a href="#" class="list-group-item list-group-item-action btn-group dropend" onclick="selectChannel('${channel.name}')">${channel.name}</a>`;
              console.log(aChannelSection);
              document.getElementById("channels").innerHTML += aChannelSection;

              const divSectionChat =
                  `<div id="${channel.name}" style="display: none; overflow-y: scroll; height:calc(100vh - 170px);"></div>`;

              document.getElementById("channelschat-section").innerHTML += divSectionChat;




              db.ref(`channels/${aChannel}/messages/`).on("child_added", function (snapshot) {

                  const messages = snapshot.val();
                  const message = `<div class=${currentUser === messages.name ? "sent" : "receive"
                      }><b>${messages.name}: </b>${messages.message}</div>`;

                  console.log("inserito un messaggio");
                  // append the message on the page

                  console.log(aChannel);
                  document.getElementById(aChannel).innerHTML += message;

                  var scroll = document.getElementById(aChannel);
                  scroll.scrollTop = scroll.scrollHeight;
              });
          }

      }
  });
}


function selectChannel(channel) {
  if (currentChannel == channel) {
      return;
  } else {
      if (currentChannel != null) {
          document.getElementById(currentChannel).style.display = "none";
      }
  }
  document.getElementById("message-form").style.display = "block";
  currentChannel = channel;
  document.getElementById(currentChannel).style.display = "block";
  document.getElementById("navbar-channel").style.display = "block";

  document.getElementById("channel-name").innerHTML = currentChannel;
  document.getElementById("modifyChannelModalLabel").innerHTML = currentChannel;

  var scroll = document.getElementById(currentChannel);
  scroll.scrollTop = scroll.scrollHeight;
}

/**
* Funzione che permette di eliminare il canale selezionato e poi fa
* refresh nella lista dei canali nell'interfaccia
*/
function deleteChannel() {

  document.getElementById(currentChannel).style.display = "none";
  document.getElementById("navbar-channel").style.display = "none";

  db.ref('channels/' + currentChannel).remove();
  document.getElementById("channels").innerHTML = "";

  db.ref('channels/').once("value", (snapshot) => {
      var channels = snapshot.val();
      channels = Object.values(channels);
      console.log(channels);
      for (channel of channels) {
          for (user of channel.users) {
              if (currentUser == user) {
                  const aChannel = channel.name;
                  console.log(aChannel);

                  const aChannelSection = `<a href="#" class="list-group-item list-group-item-action btn-group dropend" onclick="selectChannel('${channel.name}')">${channel.name}</a>`;
                  console.log(aChannelSection);
                  document.getElementById("channels").innerHTML += aChannelSection;

                  const divSectionChat =
                      `<div id="${channel.name}" style="display: none; overflow-y: scroll; height:calc(100vh - 170px);"></div>`;

                  document.getElementById("channelschat-section").innerHTML += divSectionChat;

              }
          }
      }
  });
}

function modifyChannel(){
  
}



//#endregion

//#region comandi per amministratori
//#endregion