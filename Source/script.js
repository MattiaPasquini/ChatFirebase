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
var currentUserIsAdmin = false;
var currentChannel = null;

//#region metodi helper

/**
 * Controlla se il nome dell'utente è univoca
 * @param {string} name nome utente
 * @returns se il nome è univoca
 */
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

/**
 * Registrazione per nuovi utenti, creando un account
 * con mail e password.
 * E mette userId, username, email, isAdmin, isBanned nel database su firebase
 */
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
                    isAdmin: false,
                    isBanned: false
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

/**
 * Login per gli utenti già registrati. 
 * Poi controlla se è admin, se è amministratore mette visibile
 * alcuni elementi (crea canale, broadcast, ...)
 */
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
                    currentUserIsAdmin = true;
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

/**
 * Logout dell'utente
 */
function logoutUser() {
    firebase.auth().signOut().then(() => {
        location.reload();
    }).catch((error) => {
        // An error happened.
    });
}
//#endregion

//#region invio e recezione messaggi

var a = document.getElementById("message-form")
if (a) { addEventListener("submit", sendMessage); }

/**
 * Invia il messaggio in un canale corrente, mettendo
 * il contenuto, l'utente che ha mandato e la data dell'invio (timestamp)
 */
function sendMessage(e) {
    if(currentChannel == null){
        return;
    }
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

/**
 * Funzione per mostrare la lista dei canali e la chat.
 * Viene utilizzato due ascolti per l'aggiunta (child_added), 
 * uno per canale e uno per gli utenti, così da mostrare solo
 * i canali per gli utenti correnti che ne fanno parte. E per
 * aggiungere il canale o utente e mostra subito visivamente senza
 * dover fare refresh sulla pagina. Questo vale lo stesso anche per la 
 * rimozione dell'utente dal canale e rimozione del canale dalla piattaforma
 */
function showChannels() {

    //aggiunta canali
    db.ref('channels/').on("child_added", (snapshot) => {
        var channel = snapshot.val();
        console.log(channel);

         /**
          * all'inizio 
          * ascolto quando vengono aggiunti nuovi utenti.
          * Se vengono aggiunti più utenti, vengono richiamati questo listener il numero di volte
          * degli utenti aggiunti
          */
        db.ref(`channels/${channel.name}/users/`).on("child_added", (snapshot1) => {

            if (currentUser == snapshot1.val()) {
                const aChannel = channel.name;
                console.log(aChannel);

                const aChannelsSection = `<a id="${channel.name}Channel" href="#" class="list-group-item list-group-item-action btn-group dropend" onclick="selectChannel('${channel.name}')">${channel.name}</a>`;
                console.log(aChannelsSection);
                document.getElementById("channels").innerHTML += aChannelsSection;

                const divSectionChat =
                    `<div id="${channel.name}" style="display: none; overflow-y: scroll; height:calc(100vh - 170px);"></div>`;

                document.getElementById("channelschat-section").innerHTML += divSectionChat;

                //ascolto quando arrivano nuovi messaggi
                db.ref(`channels/${aChannel}/messages/`).on("child_added", (snapshot2) => {
                    var width = document.getElementById("channel-section").style.width;
                    const messages = snapshot2.val();
                    const message = `<div class=${currentUser === messages.name ? "sent" : "receive"
                        } style="word-wrap: break-word;"><b>${messages.name}: </b>${messages.message}</div>`;

                    console.log("inserito un messaggio");
                    // append the message on the page

                    console.log(aChannel);
                    document.getElementById(aChannel).innerHTML += message;

                    var scroll = document.getElementById(aChannel);
                    scroll.scrollTop = scroll.scrollHeight;
                });

                //ascolto quando un utente viene rimosso dal gruppo
                db.ref(`channels/${aChannel}/users`).on("child_removed", (snapshot2) => {
                    var user = snapshot2.val();
                    
                    console.log(user);

                    if(user == currentUser){
                        //il canale eliminato viene rimosso nella lista
                        document.getElementById(channel.name + "Channel").remove();

                        //il chat del canale eliminato viene rimosso
                        document.getElementById(channel.name).remove();
                        currentChannel = null;

                        document.getElementById("navbar-channel").style.display = "none";
                        db.ref(`channels/${aChannel}/messages/`).off('child_added');
                    }
                });
            }
        });
    });

    //ascolto quando elimini il canale
    db.ref('channels/').on("child_removed", (snapshot) => {
        var channel = snapshot.val();
        //il canale eliminato viene rimosso nella lista
        document.getElementById(channel.name + "Channel").remove();

        //il chat del canale eliminato viene rimosso
        document.getElementById(channel.name).remove();
        currentChannel = null;

        document.getElementById("navbar-channel").style.display = "none";
    });
}

/**
 * Cambiare il canale corrente
 * @param channel canale selezionato
 */
function selectChannel(channel) {
    if (currentChannel == channel) {
        return;
    } else {
        if (currentChannel != null) {
            console.log(currentChannel);
            document.getElementById(currentChannel).style.display = "none";
        }
    }
    document.getElementById("message-form").style.display = "block";
    currentChannel = channel;
    document.getElementById(currentChannel).style.display = "block";
    document.getElementById("navbar-channel").style.display = "block";

    document.getElementById("channel-name").innerHTML = currentChannel;
    document.getElementById("infoChannelModalLabel").innerHTML = currentChannel;

    var scroll = document.getElementById(currentChannel);
    scroll.scrollTop = scroll.scrollHeight;
}

/**
 * Serve per mostrare visivamente le informazioni del canale
 * corrente, il nome del canale, la lista degli utenti presenti in quel gruppo
 * e se si è amministratore mostra anche il bottone per eliminare il canale, 
 * il bottone per aggiungere gli utenti, link per rimuovere gli utenti e cambio
 * nome del canale
 */
function infoChannelSection() {
    db.ref(`channels/${currentChannel}/users/`).on('value', (snapshot) => {
        document.getElementById("list-user-channel").innerHTML = "";

        var users = snapshot.val();

        document.getElementById("list-user-channel").innerHTML += "<li style='list-style-type: none;'> Tu </li>";
        for (element of users) {
            
            //console.log(element[`username`]);
            if(currentUser != element){
                var aUser = `<li style="list-style-type: none;">${element}`;
                if(currentUserIsAdmin){
                    aUser += `<a href="#" style="float: right; margin-right:20px;" onclick="removeUser('${element}')">remove</a>`;
                }
                aUser != `</li>`;
                document.getElementById("list-user-channel").innerHTML += aUser;
            }
        }
    });
}



//#endregion

//#region comandi per amministratori

function createChannelSection() {
    document.getElementById("createChannelError").innerHTML = "";
    document.getElementById("list-user").innerHTML = "";

    db.ref('users/').on('value', (snapshot) => {

        //ottieni la lista degli utenti
        var listUsers = [];
        snapshot.forEach((item) => {
            var itemVal = item.val();
            if(itemVal['username'] != currentUser){
                listUsers.push(itemVal['username']);
            }
        });
        listUsers.sort();
        console.log(listUsers);


        for (element of listUsers) {
            //console.log(element[`username`]);
            var aUser = `<input type="checkbox" name="user" id="${element}User" value="${element}"><label for="${element}User"> ${element}</label><br>`;

            //console.log(aUser);
            document.getElementById("list-user").innerHTML += aUser;
        }
    });
}

function createChannel() {
    document.getElementById("createChannelError").innerHTML = "";
    var nameChannel = document.getElementById("name-channel").value.trim();

    if (nameChannel === '') {
        return;
    }
    if(nameChannel.length > 20){
        document.getElementById("createChannelError").innerHTML += "Maximum 20 characters!<br>";
        return;
    }

    //inserisci gli utenti selezionati nell'array
    var usersSelected = [];
    var users = document.getElementById("list-user").children;

    Array.from(users).forEach(input => {
        if (input.checked) {
            usersSelected.push(input.value);
        }
    });

    if(usersSelected.length < 1){
        document.getElementById("createChannelError").innerHTML += "Select at least one user";
        return;
    }

    
    //inserisci anche utente corrente (creatore gruppo)
    usersSelected.push(currentUser);

    db.ref('channels/' + nameChannel).set({
        name: nameChannel,
        users: usersSelected,
    });
    document.getElementById("name-channel").value = "";
    $("#createChannel").modal('hide'); //chiude modal
}

function deleteChannel() {
    db.ref('channels/' + currentChannel).remove();
    $("#deleteChannel").modal('hide'); //chiude modal
}

/**
 * Prende la lista utenti nel gruppo e la lista utenti nella piattaforma
 * e poi filtrare, così da rimanere solo utenti che non fanno parte di quel gruppo
 * e far visualizzare la lista sull'interfaccia
 */
 function addUserList() {
    db.ref(`channels/${currentChannel}/users/`).once('value', (snapshot1) => {
        document.getElementById("list-addUser").innerHTML = "";
        //ottieni la lista degli utenti del gruppo
        var groupUsers = snapshot1.val();
        db.ref('users/').once('value', (snapshot2) => {

            //ottieni la lista degli utenti della piattaforma
            var listUsers = [];
            snapshot2.forEach((item) => {
                var itemVal = item.val();
                listUsers.push(itemVal['username']);
            });
            listUsers.sort();
            console.log(listUsers);

            //filtra utenti
            listUsers = listUsers.filter(function (item) {
                return !groupUsers.includes(item);
            });
            console.log(listUsers);

            for (element of listUsers) {
                //console.log(element[`username`]);
                if(currentUser != element){
                    var aUser = `<input type="checkbox" name="user" id="${element}" value="${element}"><label for="${element}"> ${element}</label><br>`;
                }
                //console.log(aUser);
                document.getElementById("list-addUser").innerHTML += aUser;
            }
        });
    });
}

function addUser() {
    usersSelected = [];
    var users = document.getElementById("list-addUser").children;

    Array.from(users).forEach(input => {
        if (input.checked) {
            usersSelected.push(input.value);
        }
    });

    db.ref(`channels/${currentChannel}/users`).once('value', (snapshot) => {
        db.ref('channels/' + currentChannel).update({
            users: snapshot.val().concat(usersSelected)
        });
    });

    $("#addUser").modal('hide'); //chiude modal
}

function removeUser(user){
    db.ref(`channels/${currentChannel}/users`).once('value', (snapshot) => {
        var userRemove = snapshot.val();
        var index = userRemove.indexOf(user);
        userRemove.splice(index, 1);

        //console.log(users);
        db.ref('channels/' + currentChannel).update({
            users: userRemove
        });
    });
}

function broadcastMessage(){
    // get values to be submitted
    const timestamp = Date.now();
    const messageInput = document.getElementById("broadcastMessage");
    const message = messageInput.value.trim();
    if (message == "") {
        return;
    }
    // clear the input box
    messageInput.value = "";

    db.ref('channels/').once("value", (snapshot) => {
        for(channel of Object.values(snapshot.val())){
            if(channel.users.indexOf(currentUser) != -1){
                var channelMessage = `channels/${channel.name}/messages/`;
                db.ref(channelMessage + timestamp).set({
                    name: currentUser,
                    message: message,
                });
            }
        }
    });
}
//#endregion