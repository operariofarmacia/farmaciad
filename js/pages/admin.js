<script type="module">
    import { auth, db, getDeviceId, createSecondaryAuth } from "./js/core/firebase.js";
    import { userProfileRef, usersDirectoryCol } from "./js/core/paths.js";
    import { requireAuthAndProfile, isWithinSchedule } from "./js/core/guards.js";
    import { signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
    import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

    // Global state
    let currentUser = null;
    let currentProfile = null;
    const secondaryAuth = createSecondaryAuth(); // For creating users without logging out admin

    async function initAdmin() {
        try {
            // Guard: Validates Auth, Profile, Single Session, Schedule (Admin bypass allowed)
            const { user, profile } = await requireAuthAndProfile({ 
                auth, db, 
                onLock: (msg) => { alert(msg); window.location.href = 'index.html'; },
                allowAdminBypass: true 
            });
            
            currentUser = user;
            currentProfile = profile;

            if (profile.role !== 'admin') {
                alert("Acceso solo para administradores.");
                window.location.href = 'index.html';
                return;
            }

            console.log("Admin Loaded:", profile.name);
            // Initialize your existing Admin UI functions here
            // loadUsers(); 
            // setupCharts();

        } catch (e) {
            console.error("Admin Init Error:", e);
        }
    }

    // --- User Creation Logic (Modular) ---
    // Expose to window if your existing HTML buttons call onclick="createUser()"
    window.createUser = async (email, pass, name, role, scheduleData) => {
        try {
            // 1. Create Auth User (Secondary App)
            const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
            const newUid = userCred.user.uid;

            // 2. Create Profile Data
            const profileData = {
                uid: newUid,
                name: name,
                role: role,
                email: email,
                schedule: scheduleData || {}, // { allowedDays: [], shiftStart: "08:00", shiftEnd: "17:00" }
                createdAt: serverTimestamp(),
                isActive: true,
                security: {
                    activeSessionId: null,
                    ipWhitelist: []
                }
            };

            // 3. Write to /users/{uid}/profile/data
            await setDoc(userProfileRef(db, newUid), profileData);

            // 4. Write to public directory (for lookups)
            await setDoc(doc(usersDirectoryCol(db), newUid), {
                name: name,
                role: role,
                email: email,
                uid: newUid
            });

            alert("Usuario creado exitosamente");
            // refreshUserTable();

        } catch (e) {
            console.error(e);
            alert("Error creando usuario: " + e.message);
        }
    };

    // Logout handler
    const logoutBtn = document.getElementById('logout-btn'); // Assumed ID
    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = 'index.html';
        });
    }

    initAdmin();
</script>
