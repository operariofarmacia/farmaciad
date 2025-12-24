import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { userProfileRef } from "./paths.js";
import { getDeviceId } from "./firebase.js";

// --- Schedule Logic ---
export function isWithinSchedule(profileData, now = new Date()) {
    if (!profileData.schedule) return true; // No schedule defined = allowed

    const { allowedDays, shiftStart, shiftEnd } = profileData.schedule;
    
    // 1. Day Check
    const daysMap = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
    const currentDay = daysMap[now.getDay()];
    
    if (allowedDays && allowedDays.length > 0 && !allowedDays.includes(currentDay)) {
        return false;
    }

    // 2. Time Check
    if (!shiftStart || !shiftEnd) return true;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = shiftStart.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    
    const [endH, endM] = shiftEnd.split(':').map(Number);
    const endTotal = endH * 60 + endM;

    if (endTotal < startTotal) {
        // Overnight shift (e.g. 22:00 to 06:00)
        return currentMinutes >= startTotal || currentMinutes <= endTotal;
    } else {
        // Standard shift (e.g. 08:00 to 17:00)
        return currentMinutes >= startTotal && currentMinutes <= endTotal;
    }
}

// --- Main Guard ---
export function requireAuthAndProfile({ auth, db, onLock, allowAdminBypass = true }) {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = "index.html";
                return;
            }

            try {
                const snap = await getDoc(userProfileRef(db, user.uid));
                if (!snap.exists()) throw new Error("Perfil no encontrado.");
                
                const profile = snap.data();
                const deviceId = getDeviceId();
                const isAdmin = profile.role === 'admin';

                // 1. Single Session Check (Device ID vs Active Session)
                if (profile.security && profile.security.activeSessionId) {
                     // Check if active session matches this device
                     if (profile.security.activeSessionId !== deviceId) {
                         // Only enforce strict single-session if not admin (or force everyone)
                         if (!isAdmin) {
                             await signOut(auth);
                             onLock("Sesión activa en otro dispositivo.");
                             return;
                         }
                     }
                }

                // 2. Schedule Check
                // Admins can bypass schedule check if allowed
                const skipSchedule = isAdmin && allowAdminBypass;
                if (!skipSchedule && !isWithinSchedule(profile)) {
                    await signOut(auth);
                    onLock("Fuera de horario laboral asignado.");
                    return;
                }

                resolve({ user, profile });

            } catch (error) {
                console.error("Guard Error:", error);
                await signOut(auth);
                onLock("Error de seguridad: " + error.message);
            }
        });
    });
}

export function requireRole(profile, allowedRoles) {
    if (!allowedRoles.includes(profile.role)) {
        document.body.innerHTML = `<div class="h-screen flex items-center justify-center bg-gray-100 text-red-600 font-bold">Acceso Denegado: Rol ${profile.role} no autorizado.</div>`;
        throw new Error("Unauthorized Role");
    }
}
