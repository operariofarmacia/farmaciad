import { auth, db } from "../core/firebase.js";
import { requireAuthAndProfile, requireRole } from "../core/guards.js";
import { createShell } from "../core/uiShell.js";
import { shipmentsCol, updateShipmentStatus } from "../core/workflow.js";
import { query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let currentUser, currentProfile;

async function init() {
    const { user, profile } = await requireAuthAndProfile({ auth, db, onLock: alert });
    currentUser = user;
    currentProfile = profile;
    requireRole(profile, ['calidad', 'admin']);

    createShell({ auth, title: "Control de Calidad", subtitle: "Aprobación Final", roleLabel: "CALIDAD", userName: profile.name });
    document.getElementById('main-content').innerHTML = `<div id="quality-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6"></div>`;

    onSnapshot(query(shipmentsCol(db), where("status", "==", "Revision Calidad")), snap => {
        const grid = document.getElementById('quality-grid');
        grid.innerHTML = "";
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = "bg-white p-4 rounded shadow border-l-4 border-red-500";
            div.innerHTML = `
                <h3 class="font-bold">${data.beneficiaryName}</h3>
                <p class="text-xs text-gray-500 mb-2">Empacado por: ${data.dispensedBy?.name || 'N/A'}</p>
                <button onclick="window.approve('${doc.id}')" class="w-full bg-green-600 text-white py-1 rounded">Aprobar</button>
            `;
            grid.appendChild(div);
        });
    });
}

window.approve = async (id) => {
    if(!confirm("¿Calidad Aprobada?")) return;
    await updateShipmentStatus({
        db, shipId: id, newStatus: "Listo Logistica",
        actor: { uid: currentUser.uid, name: currentProfile.name, role: currentProfile.role }
    });
};
init();
