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
var isBanned = null;
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

/**
 * Login per gli utenti già registrati. 
 * Poi controlla se è admin, se è amministratore mette visibile
 * alcuni elementi (crea canale, broadcast, ...)
 */
function loginUser() {
    isBanned = false;
    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    db.ref('ban/').once('value', (snapshot) => {
        if (snapshot.val() != null) {
            var listBan = Object.entries(snapshot.val());
            for (var record of listBan) {
                if (record[1].email == email) {
                    //console.log(Date.now() < record[1].endBan);
                    if (Date.now() < record[1].endBan) {
                        console.log(record[1].endBan);
                        var date = new Date(record[1].endBan);
                        console.log(date);
                        document.getElementById("errorLogin").innerHTML = `You are banned until ${date.toLocaleString()}`;
                        isBanned = true;
                    } else {
                        console.log("falsato");
                        db.ref(`ban/${record[0]}`).remove();
                        isBanned = false;
                    }
                }
            }
        }

        if (!isBanned) {
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
                    document.getElementById("login-section").style.display = "none";
                    document.getElementById("principal-section").style.display = "block";
                    document.getElementById("settings").style.display = "block";
                    showChannels();
                })
                .catch((error) => {
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    console.log(errorMessage);
                });
        }
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
    if (currentChannel == null) {
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
        time: timestamp
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

        db.ref(`channels/${channel.name}/users/`).on("child_added", (snapshot1) => {

            if (currentUser == snapshot1.val()) {
                const aChannel = channel.name;

                const aChannelsSection = `<a id="${channel.name}Channel" href="#" class="list-group-item list-group-item-action btn-group dropend" onclick="selectChannel('${channel.name}')">${channel.name}</a>`;

                document.getElementById("channels").innerHTML += aChannelsSection;

                const divSectionChat =
                    `<div id="${channel.name}" style="display: none; overflow-y: scroll; height:calc(100vh - 170px);"></div>`;

                document.getElementById("channelschat-section").innerHTML += divSectionChat;

                //ascolto quando arrivano nuovi messaggi
                db.ref(`channels/${aChannel}/messages/`).on("child_added", (snapshot2) => {
                    var width = document.getElementById("channel-section").style.width;
                    const messages = snapshot2.val();
                    console.log(messages);

                    var message = `<div class=${currentUser === messages.name ? "sent" : "receive"} style="word-wrap: break-word;" id='${messages.time}'>`;

                    message += `<div><b>${messages.name}: </b>${messages.message}</div>`;
                    message += `<div onclick="deleteMessage(${messages.time})">delete</div>`;
                    message += `</div>`;

                    // append the message on the page
                    document.getElementById(aChannel).innerHTML += message;

                    var scroll = document.getElementById(aChannel);
                    scroll.scrollTop = scroll.scrollHeight;

                });
                db.ref(`channels/${aChannel}/messages/`).on("child_removed", (snapshot2) => {
                    var messageDeleted = snapshot2.val();
                    document.getElementById(messageDeleted.time).remove();
                });
            }
        });

        //ascolto quando un utente viene rimosso dal gruppo
        db.ref(`channels/${channel.name}/users/`).on("child_removed", (snapshot1) => {
            console.log(snapshot1.val());

            if (currentUser == snapshot1.val()) {
                //il canale che l'utente viene rimosso, viene rimosso nella lista
                document.getElementById(channel.name + "Channel").remove();

                //il chat del canale che l'utente viene rimosso, viene rimosso
                document.getElementById(channel.name).remove();
                currentChannel = null;

                document.getElementById("navbar-channel").style.display = "none";
                db.ref(`channels/${channel.name}/messages/`).off('child_added');
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
            document.getElementById(currentChannel).style.display = "none";
        }else{
			document.getElementById("message-form").style.display = "block";
		}
    }
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
        for (element of (users).sort()) {

            if (currentUser != element) {
                var aUser = `<li style="list-style-type: none;">${element}`;
                if (currentUserIsAdmin) {
                    aUser += `<a href="#" style="float: right; margin-right:20px;" onclick="removeUser('${element}')">remove</a>`;
                }
                aUser != `</li>`;
                document.getElementById("list-user-channel").innerHTML += aUser;
            }
        }
    });
}



//#endregion

//#region comandi per amministratori (ulteriore controllo se è amministratore)

function createChannelSection() {
    document.getElementById("createChannelError").innerHTML = "";
    document.getElementById("list-user").innerHTML = "";

    db.ref('users/').on('value', (snapshot) => {

        //ottieni la lista degli utenti
        var listUsers = [];
        snapshot.forEach((item) => {
            var itemVal = item.val();
            listUsers.push(itemVal['username']);

        });
        listUsers.sort();
        console.log(listUsers);


        for (element of listUsers) {
            if (element != currentUser) {
                var aUser = `<input type="checkbox" name="user" id="${element}User" value="${element}"><label for="${element}User"> ${element}</label><br>`;
                document.getElementById("list-user").innerHTML += aUser;
            }
        }
    });
}

function createChannel() {
    //controlli
    document.getElementById("createChannelError").innerHTML = "";
    var nameChannel = document.getElementById("name-channel").value.trim();

    if (nameChannel === '') {
		document.getElementById("createChannelError").innerHTML += "Channel name should not be empty";
        return;
    }
    if (nameChannel.length > 20) {
        document.getElementById("createChannelError").innerHTML += "Maximum 20 characters!<br>";
        return;
    }

    //inserisci gli utenti selezionati nell'array
    var usersSelected = [];
    var users = document.getElementById("list-user").children;

    //inserisci anche utente corrente (creatore gruppo)
    usersSelected.push(currentUser);
    Array.from(users).forEach(input => {
        if (input.checked) {
            usersSelected.push(input.value);
        }
    });

    if (usersSelected.length < 2) {
        document.getElementById("createChannelError").innerHTML += "Select at least one user";
        return;
    }

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
                if (currentUser != element) {
                    var aUser = `<input type="checkbox" name="user" id="${element}" value="${element}"><label for="${element}"> ${element}</label><br>`;
                }
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

function removeUser(user) {
    db.ref(`channels/${currentChannel}/users`).once('value', (snapshot) => {
        console.log(user);
        var supp;
        var userRemove = snapshot.val();
        console.log(userRemove);

        var index = userRemove.indexOf(user);
        supp = userRemove[index];
        userRemove[index] = userRemove[userRemove.length - 1];
        userRemove[userRemove.length - 1] = supp;

        db.ref('channels/' + currentChannel).update({
            users: userRemove
        });

        userRemove.splice(userRemove.length - 1, 1);
        console.log(userRemove);

        db.ref('channels/' + currentChannel).update({
            users: userRemove
        });
    });
}

function deleteMessage(timestampMessage) {
    $("#deleteMessage").modal('show'); //mostra modal

    $(".btnDeleteMessage").click(function () {
        db.ref(`channels/${currentChannel}/messages/${timestampMessage}`).remove();
        $("#deleteMessage").modal('hide');
    });

    console.log("messaggio eliminato");
}

function broadcastMessage() {
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
        for (channel of Object.values(snapshot.val())) {
            if (channel.users.indexOf(currentUser) != -1) {
                var channelMessage = `channels/${channel.name}/messages/`;
                db.ref(channelMessage + timestamp).set({
                    name: currentUser,
                    message: message,
                });
            }
        }
    });
}

function listBanUsers() {
    const listBanUsers = document.getElementById("list-banUsers");
    listBanUsers.innerHTML = "<option value=''></option>";
    db.ref('users/').once('value', (snapshot) => {
        var listUsers = Object.values(snapshot.val());

        for (user of listUsers) {
            listBanUsers.innerHTML += `<option value="${user.email}">${user.username}</option>`;
        }
    });
}

function banUser() {
    if (currentUserIsAdmin) {
        document.getElementById("banError").innerHTML = "";
        var email = document.getElementById("list-banUsers").value;
        var reason = (document.getElementById("reason").value).trim();
        var period = document.getElementById("period").value;

        if (email == "") {
            document.getElementById("banError").innerHTML = "Select a user.";
			return;
        }
        if (reason == "") {
            document.getElementById("banError").innerHTML = "You should write a reason";
			return;
        }
        if (period == "" || parseInt(period) <= 0) {
            document.getElementById("banError").innerHTML = "The period value is not valid";
			return;
        }
        var endBan = Date.now() + parseInt(period) * 3600 * 1000;

        db.ref('ban/').push({
            email: email,
            reason: reason,
            endBan: endBan
        });
    }
}
//#endregion