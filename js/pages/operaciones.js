import { auth, db } from "../core/firebase.js";
import { requireAuthAndProfile, requireRole } from "../core/guards.js";
import { createShell } from "../core/uiShell.js";
import { shipmentsCol, updateShipmentStatus } from "../core/workflow.js";
import { query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let currentUser, currentProfile;

async function init() {
    const { user, profile } = await requireAuthAndProfile({ auth, db, onLock: alert });
    currentUser = user;
    currentProfile = profile;
    requireRole(profile, ['operaciones', 'admin']);

    createShell({
        auth, title: "Operaciones", subtitle: "Empaquetado y Revisión",
        roleLabel: "OPERACIONES", userName: profile.name
    });

    const container = document.getElementById('main-content');
    container.innerHTML = `<div id="ops-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6"></div>`;

    // Status == Empaquetado
    const q = query(shipmentsCol(db), where("status", "==", "Empaquetado"), orderBy("createdAt", "asc"));
    
    onSnapshot(q, snap => {
        const grid = document.getElementById('ops-grid');
        grid.innerHTML = "";
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = "bg-white p-4 rounded shadow border-l-4 border-purple-600";
            div.innerHTML = `
                <div class="font-bold text-lg">${data.beneficiaryName}</div>
                <div class="text-sm text-gray-500 mb-4">Farmacia: ${data.assignedPharma.name}</div>
                <button onclick="window.sendToQuality('${doc.id}')" class="w-full bg-[#003366] text-white py-2 rounded hover:bg-[#002244]">Empaque Listo</button>
            `;
            grid.appendChild(div);
        });
    });
}

window.sendToQuality = async (id) => {
    await updateShipmentStatus({
        db, shipId: id, newStatus: "Revision Calidad",
        actor: { uid: currentUser.uid, name: currentProfile.name, role: currentProfile.role }
    });
};
init();
