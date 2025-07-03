import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB4OFajtU-bKi7wuN5B1N_1x71hDo4nf8U",
  authDomain: "alarmaswof.firebaseapp.com",
  databaseURL: "https://alarmaswof-default-rtdb.firebaseio.com",
  projectId: "alarmaswof",
  storageBucket: "alarmaswof.appspot.com",
  messagingSenderId: "xxx",
  appId: "1:xxx:web:xxx"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentDeviceID = null;

// referencias DOM
const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");
const deviceSection = document.getElementById("deviceSection");
const panelSection = document.getElementById("panelSection");
const listaSection = document.getElementById("listaSection");
const formSection = document.getElementById("formSection");

// login
document.getElementById("loginBtn").addEventListener("click", () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value.trim();
  signInWithEmailAndPassword(auth, email, pass).catch(() =>
    alert("Error al iniciar sesión")
  );
});

// registro
document.getElementById("registerBtn").addEventListener("click", () => {
  const email = document.getElementById("registerEmail").value.trim();
  const pass = document.getElementById("registerPass").value.trim();
  createUserWithEmailAndPassword(auth, email, pass).catch(() =>
    alert("Error al crear cuenta")
  );
});

// logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth);
  location.reload();
});

// cambios de sesión
onAuthStateChanged(auth, user => {
  if (user) {
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    deviceSection.style.display = "block";
    cargarDispositivos(user.email);
  } else {
    loginSection.style.display = "block";
    registerSection.style.display = "block";
    deviceSection.style.display = "none";
    panelSection.style.display = "none";
  }
});

// vincular dispositivo
document.getElementById("vincularBtn").addEventListener("click", () => {
  const id = document.getElementById("deviceID").value.trim();
  const nombre = document.getElementById("deviceName").value.trim();
  const user = auth.currentUser;
  if (id && user) {
    const userKey = user.email.replace(/\./g, "_");
    set(ref(db, `relacionesUsuarios/${userKey}`), id)
      .then(() => {
        currentDeviceID = id;
        // si es nuevo, inicializa nombreDispositivo
        set(ref(db, `dispositivos/${id}/nombreDispositivo`), nombre || "Mi Dispositivo")
          .then(() => mostrarPanel());
      });
  }
});

// panel admin
document.getElementById("panelAdminBtn").addEventListener("click", () => {
  listaSection.style.display = "block";
  panelSection.style.display = "none";
  cargarLista();
});

// volver
document.getElementById("volverPanelBtn").addEventListener("click", () => {
  listaSection.style.display = "none";
  panelSection.style.display = "block";
});

// agregar transmisor
document.getElementById("btnProgramar").addEventListener("click", () => {
  if (!currentDeviceID) return;
  set(ref(db, `dispositivos/${currentDeviceID}/modoEscucha`), true);
  alert("Presione el transmisor ahora...");
});

// escucha de código
onAuthStateChanged(auth, user => {
  if (!user) return;
  onValue(ref(db, `dispositivos/${currentDeviceID}/codigoCapturado`), snap => {
    const val = snap.val();
    if (val && val !== 0) {
      document.getElementById("codigoDetectado").textContent = val;
      formSection.style.display = "block";
    }
  });
});

// guardar transmisor
document.getElementById("guardarBtn").addEventListener("click", () => {
  const nombre = document.getElementById("nombre").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const idWeb = document.getElementById("idWeb").value.trim();
  const codigo = parseInt(document.getElementById("codigoDetectado").textContent);

  if (!nombre || !direccion || !codigo) {
    alert("Faltan datos");
    return;
  }

  get(ref(db, `dispositivos/${currentDeviceID}/transmisores`)).then(snap => {
    let arr = snap.exists() ? snap.val() : [];
    arr.push({ codigo, nombre, direccion, idWeb });
    set(ref(db, `dispositivos/${currentDeviceID}/transmisores`), arr)
      .then(() => {
        formSection.style.display = "none";
        alert("Transmisor guardado");
      });
  });
});

function cargarDispositivos(email) {
  const userKey = email.replace(/\./g, "_");
  get(ref(db, `relacionesUsuarios/${userKey}`)).then(snap => {
    if (snap.exists()) {
      currentDeviceID = snap.val();
      mostrarPanel();
    } else {
      deviceSection.style.display = "block";
    }
  });
}

function mostrarPanel() {
  deviceSection.style.display = "none";
  panelSection.style.display = "block";

  // leer nombre del dispositivo
  get(ref(db, `dispositivos/${currentDeviceID}/nombreDispositivo`)).then(snap => {
    if (snap.exists()) {
      document.getElementById("nombreDispositivo").textContent = snap.val();
    } else {
      document.getElementById("nombreDispositivo").textContent = "(sin nombre)";
    }
  });
}

// renombrar
window.renombrarDispositivo = function() {
  const nuevoNombre = prompt("Nuevo nombre para el dispositivo:");
  if (!nuevoNombre || !currentDeviceID) return;
  set(ref(db, `dispositivos/${currentDeviceID}/nombreDispositivo`), nuevoNombre)
    .then(() => {
      document.getElementById("nombreDispositivo").textContent = nuevoNombre;
      alert("Nombre actualizado");
    });
}

// lista transmisores
function cargarLista() {
  const contenedor = document.getElementById("lista");
  get(ref(db, `dispositivos/${currentDeviceID}/transmisores`)).then(snap => {
    contenedor.innerHTML = "";
    if (!snap.exists()) {
      contenedor.innerHTML = "<li>No hay transmisores</li>";
      return;
    }
    const datos = snap.val();
    datos.forEach((tx, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${tx.nombre}</strong> - ${tx.direccion} (${tx.idWeb || "-"})<br>
        Código: ${tx.codigo}
        <button onclick="editar(${index})">Editar</button>
        <button onclick="borrar(${index})">Eliminar</button>
      `;
      contenedor.appendChild(li);
    });
  });
}

window.editar = function(pos) {
  get(ref(db, `dispositivos/${currentDeviceID}/transmisores`)).then(snap => {
    if (!snap.exists()) return;
    let arr = snap.val();
    const nuevoNombre = prompt("Nuevo nombre:", arr[pos].nombre);
    const nuevaDireccion = prompt("Nueva dirección:", arr[pos].direccion);
    const nuevoIdWeb = prompt("Nuevo ID Web:", arr[pos].idWeb);
    if (nuevoNombre && nuevaDireccion) {
      arr[pos].nombre = nuevoNombre;
      arr[pos].direccion = nuevaDireccion;
      arr[pos].idWeb = nuevoIdWeb;
      set(ref(db, `dispositivos/${currentDeviceID}/transmisores`), arr)
        .then(() => cargarLista());
    }
  });
}

window.borrar = function(pos) {
  get(ref(db, `dispositivos/${currentDeviceID}/transmisores`)).then(snap => {
    if (!snap.exists()) return;
    let arr = snap.val();
    arr.splice(pos, 1);
    set(ref(db, `dispositivos/${currentDeviceID}/transmisores`), arr)
      .then(() => cargarLista());
  });
};
