import { auth, db } from "../core/firebase.js";
import { requireAuthAndProfile, requireRole } from "../core/guards.js";
import { createShell } from "../core/uiShell.js";
import { shipmentsCol, updateShipmentStatus } from "../core/workflow.js";
import { pushNotification } from "../core/notifications.js";
import { query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let currentUser, currentProfile;

async function init() {
    const { user, profile } = await requireAuthAndProfile({ auth, db, onLock: alert });
    currentUser = user;
    currentProfile = profile;
    // Allow 'repartidor' or 'delivery'
    if(profile.role !== 'repartidor' && profile.role !== 'admin') {
         document.body.innerHTML = "Acceso Denegado"; return;
    }

    createShell({ auth, title: "Reparto", subtitle: "Envíos en Curso", roleLabel: "DELIVERY", userName: profile.name });
    document.getElementById('main-content').innerHTML = `<div id="del-grid" class="grid grid-cols-1 gap-6"></div>`;

    const q = query(shipmentsCol(db), where("assignedDelivery.uid", "==", currentUser.uid), where("status", "==", "En Ruta"));
    onSnapshot(q, snap => {
        const grid = document.getElementById('del-grid');
        grid.innerHTML = "";
        snap.forEach(doc => {
            const data = doc.data();
            const div = document.createElement('div');
            div.className = "bg-white p-6 rounded shadow-lg border-t-4 border-blue-600";
            div.innerHTML = `
                <h1 class="text-2xl font-bold mb-2">${data.beneficiaryName}</h1>
                <p class="text-gray-600 mb-6">Dirección: Ver detalles en app móvil</p>
                <button onclick="window.confirmDelivery('${doc.id}', '${data.beneficiaryName}', '${data.assignedCC?.uid}')" class="w-full bg-green-600 text-white py-4 rounded text-xl font-bold shadow">ENTREGADO</button>
            `;
            grid.appendChild(div);
        });
    });
}

window.confirmDelivery = async (id, name, ccUid) => {
    if(!confirm("¿Confirmar entrega exitosa?")) return;
    
    await updateShipmentStatus({
        db, shipId: id, newStatus: "Entregado",
        actor: { uid: currentUser.uid, name: currentProfile.name, role: currentProfile.role }
    });

    // Notify Logistics
    await pushNotification(db, {
        toRole: 'logistica', 
        message: `Entrega confirmada: ${name} (${id})`,
        type: 'success'
    });

    // Notify CC if exists
    if(ccUid && ccUid !== 'ventanilla') {
        await pushNotification(db, {
            toUid: ccUid,
            message: `Tu gestión fue entregada: ${name}`,
            type: 'success'
        });
    }
};
init();
