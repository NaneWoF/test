// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getDatabase, ref, get, set, onValue, child } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://TU_PROJECT_ID.firebaseio.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "xxx",
  appId: "xxx"
};

// inicializa
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// referencias de interfaz
const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");
const deviceSection = document.getElementById("deviceSection");
const panelSection = document.getElementById("panelSection");
const listaSection = document.getElementById("listaSection");
const formSection = document.getElementById("formSection");

const loginBtn = document.getElementById("loginBtn");
const registerRedirectBtn = document.getElementById("registerRedirectBtn");
const registerBtn = document.getElementById("registerBtn");
const backLoginBtn = document.getElementById("backLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const vincularBtn = document.getElementById("vincularBtn");
const panelAdminBtn = document.getElementById("panelAdminBtn");
const btnProgramar = document.getElementById("btnProgramar");
const guardarBtn = document.getElementById("guardarBtn");
const volverPanelBtn = document.getElementById("volverPanelBtn");

// global
let currentUser = null;
let currentDeviceID = "";
let currentAdmin = false;

// login
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPass").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    console.log("Logueado OK");
  } catch (e) {
    alert(e.message);
  }
});

// redirige a registro
registerRedirectBtn.addEventListener("click", () => {
  loginSection.style.display = "none";
  registerSection.style.display = "block";
});

// volver
backLoginBtn.addEventListener("click", () => {
  registerSection.style.display = "none";
  loginSection.style.display = "block";
});

// registrar
registerBtn.addEventListener("click", async () => {
  const email = document.getElementById("registerEmail").value;
  const pass = document.getElementById("registerPass").value;
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    alert("✅ Cuenta creada, ya puedes iniciar sesión.");
    registerSection.style.display = "none";
    loginSection.style.display = "block";
  } catch (e) {
    alert(e.message);
  }
});

// logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  location.reload();
});

// sesion
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loginSection.style.display = "none";
    deviceSection.style.display = "block";
  } else {
    currentUser = null;
    loginSection.style.display = "block";
    deviceSection.style.display = "none";
  }
});

// vincular
vincularBtn.addEventListener("click", async () => {
  const deviceID = document.getElementById("deviceID").value.trim();
  const nombreDispositivo = document.getElementById("deviceName").value.trim();

  if (!/^[A-Za-z0-9]{6,20}$/.test(deviceID)) {
    alert("Device ID no válido (solo letras/números, 6-20 caracteres)");
    return;
  }
  if (nombreDispositivo.length < 3) {
    alert("Nombre de dispositivo muy corto");
    return;
  }

  const userKey = currentUser.email.replaceAll(".", "_");

  const pathLista = `listaDeviceIDs/${deviceID}`;
  const snap = await get(child(ref(db), pathLista));
  if (snap.exists() && snap.val() === true) {
    // OK
    const pathDispositivo = `dispositivos/${deviceID}`;
    const dispoSnap = await get(child(ref(db), pathDispositivo));
    if (!dispoSnap.exists()) {
      // crear rama
      const initData = {
        admin: userKey,
        clave: "1234",
        modoEscucha: false,
        codigoCapturado: 0,
        relay1: false,
        nombreDispositivo: nombreDispositivo,
        salida: {
          estado: false,
          nombre: "",
          direccion: "",
          timestamp: 0
        },
        transmisores: [],
        usuarios: { [userKey]: true }
      };
      await set(ref(db, pathDispositivo), initData);
      alert("✅ Dispositivo vinculado y registrado");
    }
    currentDeviceID = deviceID;
    cargarPanel();
  } else {
    alert("DeviceID no encontrado en lista de autorizados");
  }
});

// cargar panel
async function cargarPanel() {
  deviceSection.style.display = "none";
  panelSection.style.display = "block";

  const pathDispo = `dispositivos/${currentDeviceID}`;
  const snap = await get(child(ref(db), pathDispo));
  if (snap.exists()) {
    const data = snap.val();
    currentAdmin = (data.admin === currentUser.email.replaceAll(".", "_"));
    document.getElementById("nombreDispositivo").textContent = data.nombreDispositivo || currentDeviceID;

    panelAdminBtn.style.display = currentAdmin ? "block" : "none";
  }
}

// renombrar
window.renombrarDispositivo = async function() {
  if (!currentAdmin) {
    alert("Solo el administrador puede renombrar el dispositivo");
    return;
  }
  const nuevoNombre = prompt("Nuevo nombre:");
  if (nuevoNombre && nuevoNombre.trim().length >= 3) {
    await set(ref(db, `dispositivos/${currentDeviceID}/nombreDispositivo`), nuevoNombre);
    document.getElementById("nombreDispositivo").textContent = nuevoNombre;
    alert("✅ Renombrado");
  }
};

// lista transmisores
panelAdminBtn.addEventListener("click", async () => {
  panelSection.style.display = "none";
  listaSection.style.display = "block";
  await cargarListaTransmisores();
});

// cargar lista
async function cargarListaTransmisores() {
  const ul = document.getElementById("lista");
  ul.innerHTML = "";
  const snap = await get(child(ref(db), `dispositivos/${currentDeviceID}/transmisores`));
  if (snap.exists()) {
    const arr = snap.val();
    arr.forEach((tx, index) => {
      const li = document.createElement("li");
      li.textContent = `${tx.nombre} (${tx.direccion}) [${tx.codigo}]`;
      if (currentAdmin) {
        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";
        btnEditar.onclick = () => editarTransmisor(index);
        li.appendChild(btnEditar);

        const btnBorrar = document.createElement("button");
        btnBorrar.textContent = "Borrar";
        btnBorrar.onclick = () => borrarTransmisor(index);
        li.appendChild(btnBorrar);
      }
      ul.appendChild(li);
    });
  }
}

// programar
btnProgramar.addEventListener("click", async () => {
  if (!currentAdmin) {
    alert("Solo administrador puede programar transmisores");
    return;
  }
  listaSection.style.display = "none";
  formSection.style.display = "block";
  // espera a que el ESP32 mande el código capturado a Firebase
  const snap = await get(child(ref(db), `dispositivos/${currentDeviceID}/codigoCapturado`));
  if (snap.exists() && snap.val() > 0) {
    document.getElementById("codigoDetectado").textContent = snap.val();
  }
});

// guardar transmisor
guardarBtn.addEventListener("click", async () => {
  if (!currentAdmin) {
    alert("Solo administrador");
    return;
  }
  const nombre = document.getElementById("nombre").value;
  const direccion = document.getElementById("direccion").value;
  const idWeb = document.getElementById("idWeb").value;
  const codigo = Number(document.getElementById("codigoDetectado").textContent);

  if (!nombre || !direccion || !idWeb) {
    alert("Completa todos los campos");
    return;
  }

  const snap = await get(child(ref(db), `dispositivos/${currentDeviceID}/transmisores`));
  let arr = [];
  if (snap.exists()) arr = snap.val();
  if (arr.some(tx => tx.codigo === codigo)) {
    alert("Ya existe transmisor con este código");
    return;
  }
  arr.push({ nombre, direccion, idWeb, codigo });
  await set(ref(db, `dispositivos/${currentDeviceID}/transmisores`), arr);

  alert("✅ Transmisor guardado");
  formSection.style.display = "none";
  cargarListaTransmisores();
});

// editar transmisor
async function editarTransmisor(index) {
  const nombre = prompt("Nuevo nombre:");
  const direccion = prompt("Nueva dirección:");
  const idWeb = prompt("Nuevo ID web:");

  const snap = await get(child(ref(db), `dispositivos/${currentDeviceID}/transmisores`));
  if (snap.exists()) {
    const arr = snap.val();
    arr[index].nombre = nombre || arr[index].nombre;
    arr[index].direccion = direccion || arr[index].direccion;
    arr[index].idWeb = idWeb || arr[index].idWeb;
    await set(ref(db, `dispositivos/${currentDeviceID}/transmisores`), arr);
    cargarListaTransmisores();
  }
}

// borrar transmisor
async function borrarTransmisor(index) {
  if (!confirm("¿Seguro de borrar?")) return;
  const snap = await get(child(ref(db), `dispositivos/${currentDeviceID}/transmisores`));
  if (snap.exists()) {
    const arr = snap.val();
    arr.splice(index, 1);
    await set(ref(db, `dispositivos/${currentDeviceID}/transmisores`), arr);
    cargarListaTransmisores();
  }
}

// transferir admin
async function transferirAdmin() {
  if (!currentAdmin) {
    alert("Solo administrador");
    return;
  }
  const nuevo = prompt("Correo del nuevo administrador:");
  if (!nuevo.includes("@")) {
    alert("Correo no válido");
    return;
  }
  const nuevoKey = nuevo.replaceAll(".", "_");
  const userSnap = await get(child(ref(db), `dispositivos/${currentDeviceID}/usuarios/${nuevoKey}`));
  if (userSnap.exists() && userSnap.val()) {
    await set(ref(db, `dispositivos/${currentDeviceID}/admin`), nuevoKey);
    alert(`✅ Nuevo admin: ${nuevo}`);
  } else {
    alert("Ese correo no tiene permisos en el dispositivo");
  }
}

// volver a panel
volverPanelBtn.addEventListener("click", () => {
  listaSection.style.display = "none";
  panelSection.style.display = "block";
});
