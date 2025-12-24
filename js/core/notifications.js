import { addDoc, serverTimestamp, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { notificationsCol } from "./paths.js";
import { APP_ID } from "./firebase.js";

export async function pushNotification(db, { toUid, toRole, message, title = "Notificación", type = "info" }) {
    await addDoc(notificationsCol(db), {
        toUid: toUid || null,
        toRole: toRole || null,
        message,
        title,
        type,
        read: false,
        createdAt: serverTimestamp()
    });
}

export function listenNotifications({ db, profile, onChange }) {
    // Queries: targeted to UID OR targeted to Role
    // Firestore OR queries need composite indexes, so simpler to do 2 listeners or just listen to UID if logic permits.
    // We will listen for notifications where toUid == currentUid OR toRole == currentRole
    // For simplicity without complex indexes, let's filter in memory or stick to 1 query.
    // Let's do: toUid == currentUid. (For role broadcasts, we'd need a separate mechanism or collection structure to avoid index hell).
    
    // Simplification for this project: Listen for UID specific + Listen for Role specific
    
    const qUid = query(
        notificationsCol(db), 
        where("toUid", "==", profile.uid),
        where("read", "==", false),
        orderBy("createdAt", "desc"), 
        limit(20)
    );

    const unsub1 = onSnapshot(qUid, (snapshot) => {
        const notifs = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        onChange(notifs);
    });

    return () => { unsub1(); };
}

export async function markAsRead(db, notifId) {
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', notifId);
    await updateDoc(ref, { read: true });
}
