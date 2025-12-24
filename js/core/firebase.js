// ./js/core/firebase.js
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAF7-qRJRi8Du5qe66hjviKZ3VG9A3ij6Y",
  authDomain: "farmaciadomi-97f94.firebaseapp.com",
  projectId: "farmaciadomi-97f94",
  storageBucket: "farmaciadomi-97f94.firebasestorage.app",
  messagingSenderId: "893008623562",
  appId: "1:893008623562:web:860d3b20a339efd1180133",
};

// Inicializa app UNA sola vez (evita duplicados)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Constantes del proyecto
const APP_ID = "fdihss-mediflow-v2-modular";
const DOMAIN_SUFFIX = "@mediflow.sys";

// Device ID estable
function getDeviceId() {
  let did = localStorage.getItem("mediflow_device_id");
  if (!did) {
    did = crypto.randomUUID();
    localStorage.setItem("mediflow_device_id", did);
  }
  return did;
}

// Auth secundario para crear usuarios sin sacar al admin
function createSecondaryAuth() {
  const name = "SecondaryApp";
  const secondaryApp = getApps().some(a => a.name === name)
    ? getApp(name)
    : initializeApp(firebaseConfig, name);

  return getAuth(secondaryApp);
}

export {
  firebaseConfig,
  app,
  auth,
  db,
  APP_ID,
  DOMAIN_SUFFIX,
  getDeviceId,
  createSecondaryAuth,
};
