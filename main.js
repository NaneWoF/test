// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getDatabase, ref, get, set, onValue, child } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB4OFajtU-bKi7wuN5B1N_1x71hDo4nf8U",
  authDomain: "alarmaswof.firebaseapp.com",
  databaseURL: "https://alarmaswof-default-rtdb.firebaseio.com",
  projectId: "alarmaswof",
  storageBucket: "alarmaswof.appspot.com",
  messagingSenderId: "xxx",
  appId: "1:xxx:web:xxx"
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
    // -------- AQUI --------
    const userEmail = auth.currentUser.email.replace(".", "_");
    const dispositivosRef = ref(database, "dispositivos");
    get(dispositivosRef).then((snapshot) => {
      if (snapshot.exists()) {
        const dispositivos = snapshot.val();
        let found = false;
        for (let id in dispositivos) {
          const data = dispositivos[id];
          if (
            data.admin === userEmail ||
            (data.usuarios && data.usuarios[userEmail])
          ) {
            found = true;
            console.log("Dispositivo vinculado:", id);
            document.getElementById("nombreDispositivo").textContent =
              data.nombreDispositivo || id;
            selectedDeviceID = id;
            document.getElementById("panelSection").style.display = "block";
            document.getElementById("loginSection").style.display = "none";
          }
        }
        if (!found) {
          // Si no tiene dispositivos, pedirle asociar uno
          document.getElementById("deviceSection").style.display = "block";
          document.getElementById("loginSection").style.display = "none";
        }
      } else {
        // si no hay ningún dispositivo en la db
        document.getElementById("deviceSection").style.display = "block";
        document.getElementById("loginSection").style.display = "none";
      }
    });

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

// Vincular dispositivo
vincularBtn.addEventListener("click", async () => {
  const deviceID = document.getElementById("deviceID").value.trim();
  const nombreDispositivo = document.getElementById("deviceName").value.trim();
  const user = auth.currentUser;

  if (!user) {
    alert("Debes estar logueado.");
    return;
  }

  // transformar el correo a clave segura
  const safeEmail = user.email.replace(/\./g, "_");

  try {
    const listaPath = `listaDeviceIDs/${deviceID}`;
    const snapshot = await get(ref(database, listaPath));

    if (snapshot.exists() && snapshot.val() === true) {
      const pathDispositivo = `dispositivos/${deviceID}`;
      const dispositivoSnapshot = await get(ref(database, pathDispositivo));

      if (!dispositivoSnapshot.exists()) {
        // el dispositivo no existe, inicializar
        const initData = {
          admin: safeEmail,
          clave: "1234",
          modoEscucha: false,
          codigoCapturado: 0,
          relay1: false,
          nombreDispositivo: nombreDispositivo,
          salida: {
            estado: false,
            nombre: "",
            direccion: "",
            timestamp: 0,
          },
          transmisores: [],
          usuarios: {
            [safeEmail]: true
          },
        };
        await set(ref(database, pathDispositivo), initData);
        console.log("🌟 Dispositivo inicializado en la DB.");
      }

      panelSection.style.display = "block";
      deviceSection.style.display = "none";
      document.getElementById("nombreDispositivo").innerText = nombreDispositivo;
    } else {
      alert("DeviceID no válido o no registrado.");
    }
  } catch (error) {
    console.error(error);
    alert("Error vinculando el dispositivo.");
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

  // activar modo escucha en Firebase
  await set(ref(db, `dispositivos/${currentDeviceID}/modoEscucha`), true);

  listaSection.style.display = "none";
  formSection.style.display = "block";

  alert("Se activó el modo escucha, presione el transmisor RF ahora.");

  // opcional: refrescar cada 2s para ver si capturó un código
  const interval = setInterval(async () => {
    const snap = await get(child(ref(db), `dispositivos/${currentDeviceID}/codigoCapturado`));
    if (snap.exists() && snap.val() > 0) {
      clearInterval(interval);
      document.getElementById("codigoDetectado").textContent = snap.val();
      alert(`Código capturado: ${snap.val()}`);
    }
  }, 2000);
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
