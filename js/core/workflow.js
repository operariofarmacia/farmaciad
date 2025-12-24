import { updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { shipmentRef, shipmentsCol } from "./paths.js";

export const STATUS_ORDER = [
    "Nuevo",
    "En Proceso",
    "Confirmacion CC",
    "Retorno Farmacia",
    "Empaquetado",
    "Revision Calidad",
    "Listo Logistica",
    "En Ruta",
    "Entregado"
];

export function canTransition(role, fromStatus, toStatus) {
    if (role === 'admin') return true;

    // Logic based on requirements
    if (role === 'farmacia') {
        if (toStatus === 'Confirmacion CC') return true; // Created -> Confirm
        if (toStatus === 'Empaquetado') return true; // Retorno -> Empaquetado
        if (toStatus === 'Retorno Farmacia') return true; // Self-correction
    }
    if (role === 'contact_center') {
        if (fromStatus === 'Confirmacion CC' && toStatus === 'Retorno Farmacia') return true;
    }
    if (role === 'operaciones') {
        if (fromStatus === 'Empaquetado' && toStatus === 'Revision Calidad') return true;
    }
    if (role === 'calidad') {
        if (fromStatus === 'Revision Calidad' && toStatus === 'Listo Logistica') return true;
    }
    if (role === 'logistica') {
        if (fromStatus === 'Listo Logistica' && toStatus === 'En Ruta') return true;
    }
    if (role === 'repartidor') { // role is usually 'repartidor' or 'delivery'
        if (fromStatus === 'En Ruta' && toStatus === 'Entregado') return true;
    }
    return false;
}

export async function updateShipmentStatus({ db, shipId, newStatus, actor }) {
    const ref = shipmentRef(db, shipId);
    
    const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        lastActor: { uid: actor.uid, name: actor.name, role: actor.role }
    };

    // Specific timestamps
    const ts = serverTimestamp();
    const actorData = { uid: actor.uid, name: actor.name };

    if (newStatus === 'Retorno Farmacia') {
        updateData.ccConfirmedAt = ts;
        updateData.ccConfirmedBy = actorData;
    } else if (newStatus === 'Empaquetado') {
        updateData.dispensedAt = ts;
        updateData.dispensedBy = actorData;
    } else if (newStatus === 'Revision Calidad') {
        updateData.operationsAt = ts;
        updateData.operationsBy = actorData;
    } else if (newStatus === 'Listo Logistica') {
        updateData.qualityAt = ts;
        updateData.qualityBy = actorData;
    } else if (newStatus === 'En Ruta') {
        updateData.logisticsAt = ts;
        updateData.logisticsBy = actorData;
    } else if (newStatus === 'Entregado') {
        updateData.deliveredAt = ts;
        updateData.deliveredBy = actorData;
    }

    await updateDoc(ref, updateData);
}

export async function createShipmentLines({ db, beneficiary, assignedPharma, assignedCC, pickupCounter, lines, actor }) {
    // lines: [{date:"YYYY-MM-DD", meds:[{name,qty}]}]
    const promises = lines.map(line => {
        return addDoc(shipmentsCol(db), {
            beneficiaryId: beneficiary.id,
            beneficiaryName: beneficiary.name,
            beneficiaryPhone: beneficiary.phone || "",
            scheduledDate: line.date,
            meds: line.meds,
            status: "Confirmacion CC",
            assignedPharma: assignedPharma, // {uid, name}
            assignedCC: assignedCC,         // {uid, name} or "ventanilla" logic
            pickupCounter: pickupCounter,
            createdAt: serverTimestamp(),
            createdBy: { uid: actor.uid, name: actor.name, role: actor.role },
            printed: false
        });
    });
    return Promise.all(promises);
}
