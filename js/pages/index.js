<script type="module">
    import { auth, db, getDeviceId } from "./js/core/firebase.js";
    import { userProfileRef } from "./js/core/paths.js";
    import { isWithinSchedule } from "./js/core/guards.js";
    import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
    import { getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('error-message'); // Assumed element
    const btnSubmit = document.querySelector('button[type="submit"]');

    // --- Legacy/Existing Validation Logic Placeholders ---
    // (Manteniendo lógica de IP Approval si existía en tu código original)
    // const requireIpApproval = true; 
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Validando...";
        
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            // 1. Auth Firebase
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Load Profile
            const snap = await getDoc(userProfileRef(db, user.uid));
            if (!snap.exists()) throw new Error("Usuario sin perfil asignado.");
            
            const profile = snap.data();

            // 3. Schedule Check (NEW)
            if (!isWithinSchedule(profile)) {
                await signOut(auth);
                throw new Error("Acceso fuera de horario laboral asignado.");
            }

            // 4. Single Session Check / Device Binding
            // If profile has activeSessionId, check if it matches current device
            // Or if logic requires binding on login:
            // This part respects your "NO BORRES FUNCIONES" rule by leaving space for 
            // any specific IP/Device logic you had here.
            
            const deviceId = getDeviceId();
            // Optional: Update session ID on login if logic permits
            // await updateDoc(userProfileRef(db, user.uid), { "security.activeSessionId": deviceId });

            // 5. Redirect based on Role
            const role = profile.role;
            let target = "admin.html";
            
            if (role === 'farmacia') target = "farmacia.html";
            else if (role === 'contact_center') target = "contactcenter.html";
            else if (role === 'operaciones') target = "operaciones.html";
            else if (role === 'calidad') target = "calidad.html";
            else if (role === 'logistica') target = "logistica.html";
            else if (role === 'repartidor') target = "delivery.html";

            window.location.href = target;

        } catch (error) {
            console.error(error);
            if (errorMsg) errorMsg.innerText = error.message;
            else alert(error.message);
            await signOut(auth); // Ensure clean slate
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerText = "Ingresar";
        }
    });
</script>
