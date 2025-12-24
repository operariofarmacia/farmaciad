import { auth, db } from "../core/firebase.js";
import { requireAuthAndProfile, requireRole } from "../core/guards.js";
import { createShell } from "../core/uiShell.js";
import { shipmentsCol, updateShipmentStatus } from "../core/workflow.js";
import { query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let currentUser, currentProfile;

async function init() {
    const { user, profile } = await requireAuthAndProfile({ auth, db, onLock: msg => alert(msg) });
    currentUser = user;
    currentProfile = profile;
    requireRole(profile, ['contact_center', 'admin']);

    createShell({
        auth, title: "Contact Center", subtitle: "Confirmación de Envíos",
        roleLabel: "CC AGENT", userName: profile.name
    });

    const grid = document.createElement('div');
    grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
    grid.id = "cc-grid";
    document.getElementById('main-content').appendChild(grid);

    loadTasks();
}

function loadTasks() {
    // assignedCC.uid == currentUid AND status == "Confirmacion CC"
    const q = query(
        shipmentsCol(db),
        where("assignedCC.uid", "==", currentUser.uid),
        where("status", "==", "Confirmacion CC"),
        orderBy("createdAt", "asc")
    );

    onSnapshot(q, (snap) => {
        const grid = document.getElementById('cc-grid');
        grid.innerHTML = "";
        if (snap.empty) grid.innerHTML = "<p class='text-gray-500'>No hay confirmaciones pendientes.</p>";

        snap.forEach(doc => {
            const data = doc.data();
            const el = document.createElement('div');
            el.className = "bg-white p-4 rounded shadow border-l-4 border-yellow-500";
            el.innerHTML = `
                <h3 class="font-bold">${data.beneficiaryName}</h3>
                <p class="text-sm">Tel: ${data.beneficiaryPhone || "N/A"}</p>
                <div class="mt-4">
                    <button onclick="window.confirmShipment('${doc.id}')" class="w-full bg-green-600 text-white py-2 rounded">Confirmar</button>
                </div>
            `;
            grid.appendChild(el);
        });
    });
}

window.confirmShipment = async (id) => {
    if(!confirm("¿Confirmar datos con paciente?")) return;
    await updateShipmentStatus({
        db, shipId: id, newStatus: "Retorno Farmacia",
        actor: { uid: currentUser.uid, name: currentProfile.name, role: currentProfile.role }
    });
};

init();
