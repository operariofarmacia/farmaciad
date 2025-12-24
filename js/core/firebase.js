import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAF7-qRJRi8Du5qe66hjviKZ3VG9A3ij6Y",
    authDomain: "farmaciadomi-97f94.firebaseapp.com",
    projectId: "farmaciadomi-97f94",
    storageBucket: "farmaciadomi-97f94.firebasestorage.app",
    messagingSenderId: "893008623562",
    appId: "1:893008623562:web:860d3b20a339efd1180133"
};

// Initialize Primary App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Constants
const APP_ID = "fdihss-mediflow-v2-modular";
const DOMAIN_SUFFIX = "@mediflow.sys";

// Device ID Logic
function getDeviceId() {
    let did = localStorage.getItem("mediflow_device_id");
    if (!did) {
        did = crypto.randomUUID();
        localStorage.setItem("mediflow_device_id", did);
    }
    return did;
}

// Secondary Auth for Admin User Creation (prevents logout of admin)
function createSecondaryAuth() {
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    return getAuth(secondaryApp);
}

export { firebaseConfig, app, auth, db, APP_ID, DOMAIN_SUFFIX, getDeviceId, createSecondaryAuth };
