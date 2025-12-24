import { auth, db } from "../core/firebase.js";
import { requireAuthAndProfile, requireRole } from "../core/guards.js";
import { createShell } from "../core/uiShell.js";
import { shipmentsCol, updateShipmentStatus, usersDirectoryCol } from "../core/workflow.js";
import { userProfileRef, shipmentRef } from "../core/paths.js";
import { query, where, onSnapshot, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let currentUser, currentProfile;
let drivers = [];

async function init() {
    const { user, profile } = await requireAuthAndProfile({ auth, db, onLock: alert });
    currentUser = user;
    currentProfile = profile;
    requireRole(profile, ['logistica', 'admin']);

    createShell({ auth, title: "Logística y Despacho", subtitle: "Asignación de Rutas", roleLabel: "LOGISTICA", userName: profile.name });
    document.getElementById('main-content').innerHTML = `<div id="log-grid" class="grid grid-cols-1 lg:grid-cols-2 gap-6"></div>`;

    // Load Drivers
    const dSnap = await getDocs(query(usersDirectoryCol(db), where("role", "==", "repartidor")));
    drivers = dSnap.docs.map(d => ({uid: d.id, ...d.data()}));

    const q = query(shipmentsCol(db), where("status", "in", ["Listo Logistica", "En Ruta", "Entregado"]));
    onSnapshot(q, snap => {
        const grid = document.getElementById('log-grid');
        grid.innerHTML = "";
        snap.forEach(doc => {
            const data = doc.data();
            const isReady = data.status === "Listo Logistica";
            const driverOptions = drivers.map(d => `<option value="${d.uid}">${d.displayName || d.name}</option>`).join("");
            
            const div = document.createElement('div');
            div.className = "bg-white p-4 rounded shadow border-l-4 " + (isReady ? "border-green-500" : "border-gray-500");
            div.innerHTML = `
                <div class="flex justify-between">
                    <h3 class="font-bold">${data.beneficiaryName}</h3>
                    <span class="text-xs uppercase font-bold">${data.status}</span>
                </div>
                ${isReady ? `
                    <div class="mt-4 flex gap-2">
                        <select id="sel-${doc.id}" class="border p-2 rounded text-sm flex-1">
                            <option value="">Seleccionar Motorista</option>
                            ${driverOptions}
                        </select>
                        <button onclick="window.assignAndDispatch('${doc.id}')" class="bg-[#003366] text-white px-4 rounded text-sm">Salir a Ruta</button>
                    </div>
                ` : `
                    <p class="text-sm mt-2 text-gray-500">Motorista: ${data.assignedDelivery?.name || 'N/A'}</p>
                `}
            `;
            grid.appendChild(div);
        });
    });
}

window.assignAndDispatch = async (id) => {
    const sel = document.getElementById(`sel-${id}`);
    const driverUid = sel.value;
    if(!driverUid) return alert("Seleccione motorista");
    
    const driver = drivers.find(d => d.uid === driverUid);
    
    // Update assignedDelivery AND Status
    const ref = shipmentRef(db, id);
    await updateDoc(ref, {
        assignedDelivery: { uid: driver.uid, name: driver.displayName || driver.name },
        assignedDeliveryAt: new Date()
    });

    await updateShipmentStatus({
        db, shipId: id, newStatus: "En Ruta",
        actor: { uid: currentUser.uid, name: currentProfile.name, role: currentProfile.role }
    });
};
init();
