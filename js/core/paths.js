import { collection, doc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { APP_ID } from "./firebase.js";

export const userProfileRef = (db, uid) => doc(db, 'artifacts', APP_ID, 'users', uid, 'profile', 'data');
export const usersDirectoryCol = (db) => collection(db, 'artifacts', APP_ID, 'public', 'data', 'users_directory');
export const beneficiariesCol = (db) => collection(db, 'artifacts', APP_ID, 'public', 'data', 'beneficiaries');
export const beneficiaryRef = (db, id) => doc(db, 'artifacts', APP_ID, 'public', 'data', 'beneficiaries', id);
export const shipmentsCol = (db) => collection(db, 'artifacts', APP_ID, 'public', 'data', 'shipments');
export const shipmentRef = (db, id) => doc(db, 'artifacts', APP_ID, 'public', 'data', 'shipments', id);
export const geographicAreasCol = (db) => collection(db, 'artifacts', APP_ID, 'public', 'data', 'geographic_areas');
export const notificationsCol = (db) => collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications');
