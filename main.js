import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// CONFIG
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://TU_PROJECT_ID.firebaseio.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "xxx",
  appId: "xxx"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// elementos
const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");
const deviceSection = document.getElementById("deviceSection");
const panelSection = document.getElementById("panelSection");

// login
document.getElementById("loginBtn").addEventListener("click", () => {
  const email = loginEmail.value;
  const pass = loginPass.value;
  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      loginSection.style.display = "none";
      deviceSection.style.display = "block";
    })
    .catch(err => alert(err.message));
});

document.getElementById("registerRedirectBtn").addEventListener("click", () => {
  loginSection.style.display = "none";
  registerSection.style.display = "block";
});

document.getElementById("backLoginBtn").addEventListener("click", () => {
  registerSection.style.display = "none";
  loginSection.style.display = "block";
});

// registro
document.getElementById("registerBtn").addEventListener("click", () => {
  const email = registerEmail.value;
  const pass = registerPass.value;
  createUserWithEmailAndPassword(auth, email, pass)
    .then(() => {
      registerSection.style.display = "none";
      deviceSection.style.display = "block";
    })
    .catch(err => alert(err.message));
});

// asociar dispositivo
document.getElementById("vincularBtn").addEventListener("click", () => {
  const id = deviceID.value.trim();
  const nombre = deviceName.value.trim();
  const user = auth.currentUser.email.replace(".","_");

  get(ref(db, `listaDeviceIDs/${id}`)).then(snapshot => {
    if (snapshot.exists() && snapshot.val() === true) {
      const path = `dispositivos/${id}`;
      get(ref(db, path)).then(deviceSnap => {
        if (!deviceSnap.exists()) {
          // crear rama base
          set(ref(db, path), {
            admin: user,
            nombreDispositivo: nombre,
            clave: "1234",
            relay1: false,
            codigoCapturado: 0,
            modoEscucha: false,
            salida: {
              estado: false,
              nombre: "",
              direccion: "",
              timestamp: 0
            },
            transmisores: [],
            usuarios: {
              [user]: true
            }
          });
        } else {
          // añadir como invitado
          update(ref(db, path + "/usuarios"), { [user]: true });
        }
        deviceSection.style.display = "none";
        panelSection.style.display = "block";
        document.getElementById("nombreDispositivo").innerText = nombre;
      });
    } else {
      alert("Device ID no válido");
    }
  });
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth);
  location.reload();
});

