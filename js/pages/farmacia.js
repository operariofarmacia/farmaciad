import { auth, db } from "../core/firebase.js";
import { requireAuthAndProfile, requireRole } from "../core/guards.js";
import { createShell } from "../core/uiShell.js";
import { shipmentsCol, updateShipmentStatus, createShipmentLines } from "../core/workflow.js";
import { query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { usersDirectoryCol } from "../core/paths.js";

let currentUser = null;
let currentProfile = null;

async function init() {
    try {
        const { user, profile } = await requireAuthAndProfile({ auth, db, onLock: (msg) => alert(msg) });
        currentUser = user;
        currentProfile = profile;
        requireRole(profile, ['farmacia', 'admin']);

        createShell({
            auth,
            title: "Gestión de Farmacia",
            subtitle: "Creación y Dispensación",
            roleLabel: "FARMACIA",
            userName: profile.name,
            onLogout: () => console.log("Logout")
        });

        loadShipments();
        renderActions();

    } catch (e) {
        console.error(e);
    }
}

function renderActions() {
    const main = document.getElementById('main-content');
    const actionsHtml = `
        <div class="mb-6 flex flex-wrap gap-4">
            <button id="btn-create" class="bg-[#003366] text-white px-4 py-2 rounded shadow hover:bg-[#002244]">
                <i class="fas fa-plus mr-2"></i> Nuevo Envío
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="shipments-grid"></div>
    `;
    main.innerHTML = actionsHtml;
    
    document.getElementById('btn-create').onclick = showCreateModal;
}

function loadShipments() {
    // Filter: assignedPharma == currentUid AND status IN ["Confirmacion CC","Retorno Farmacia","Empaquetado"]
    // Note: 'in' query supports up to 10 values.
    const q = query(
        shipmentsCol(db),
        where("assignedPharma.uid", "==", currentUser.uid),
        where("status", "in", ["Confirmacion CC", "Retorno Farmacia", "Empaquetado"]),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snap) => {
        const grid = document.getElementById('shipments-grid');
        grid.innerHTML = "";
        
        snap.forEach(doc => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = "bg-white p-4 rounded-lg shadow border-l-4 " + getStatusColor(data.status);
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-bold uppercase text-gray-500">${data.status}</span>
                    <span class="text-xs text-gray-400">${data.scheduledDate || "S/F"}</span>
                </div>
                <h3 class="font-bold text-lg text-gray-800">${data.beneficiaryName}</h3>
                <p class="text-sm text-gray-600 mb-2">Meds: ${data.meds.length} items</p>
                <div class="mt-4 flex gap-2">
                    ${getActionButtons(doc.id, data)}
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

function getStatusColor(status) {
    if(status === 'Confirmacion CC') return "border-yellow-500";
    if(status === 'Retorno Farmacia') return "border-blue-500";
    if(status === 'Empaquetado') return "border-purple-500";
    return "border-gray-300";
}

function getActionButtons(id, data) {
    if (data.status === 'Retorno Farmacia') {
        return `
            <button onclick="window.markPrinted('${id}')" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 rounded text-sm">Imprimir</button>
            <button onclick="window.sendToOps('${id}')" class="flex-1 bg-[#06b6d4] hover:bg-[#0596b0] text-white py-1 rounded text-sm">A Empaque</button>
        `;
    }
    if (data.status === 'Empaquetado') {
        return `<span class="text-xs text-green-600 font-bold">Listo para Operaciones</span>`;
    }
    return `<span class="text-xs text-yellow-600">Esperando CC...</span>`;
}

// Global Actions for HTML onclick
window.sendToOps = async (id) => {
    if(!confirm("¿Enviar a Operaciones/Empaquetado?")) return;
    await updateShipmentStatus({ 
        db, shipId: id, newStatus: 'Empaquetado', 
        actor: { uid: currentUser.uid, name: currentProfile.name, role: currentProfile.role } 
    });
};

window.markPrinted = async (id) => {
    // Implementation for printing flag
    alert("Marcado como impreso (Simulación)");
};

function showCreateModal() {
    // Simplified modal logic
    const modal = document.createElement('div');
    modal.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-50";
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg w-96">
            <h2 class="text-xl font-bold mb-4">Nuevo Envío</h2>
            <input id="new-ben-id" placeholder="ID Beneficiario" class="w-full border p-2 mb-2 rounded">
            <input id="new-ben-name" placeholder="Nombre" class="w-full border p-2 mb-2 rounded">
            <input type="date" id="new-date" class="w-full border p-2 mb-2 rounded">
            <div class="flex justify-end gap-2 mt-4">
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500">Cancelar</button>
                <button id="btn-confirm-create" class="bg-[#003366] text-white px-4 py-2 rounded">Crear</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-confirm-create').onclick = async () => {
        const benId = document.getElementById('new-ben-id').value;
        const name = document.getElementById('new-ben-name').value;
        const date = document.getElementById('new-date').value;
        
        if(!benId || !name || !date) return alert("Datos incompletos");

        // Mock objects
        const beneficiary = { id: benId, name: name };
        const assignedPharma = { uid: currentUser.uid, name: currentProfile.name };
        const assignedCC = { uid: "pending", name: "Por Asignar" }; // Should pick from directory

        await createShipmentLines({
            db, beneficiary, assignedPharma, assignedCC, pickupCounter: 1,
            lines: [{ date, meds: [{name: "Generico", qty: 1}] }],
            actor: { uid: currentUser.uid, name: currentProfile.name, role: currentProfile.role }
        });
        
        modal.remove();
    };
}

init();
