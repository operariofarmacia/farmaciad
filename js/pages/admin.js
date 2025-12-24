<script type="module">
  import { auth, db, createSecondaryAuth, getDeviceId, DOMAIN_SUFFIX } from "./js/core/firebase.js";
  import { userProfileRef, usersDirectoryDoc } from "./js/core/paths.js";
  import { requireAuthAndProfile } from "./js/core/guards.js";

  import { signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
  import { setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

  // ✅ Estado global (por si lo ocupás en otras funciones)
  window.currentUser = null;
  window.currentProfile = null;

  // ✅ Secondary auth para crear usuarios sin botar al admin
  const secondaryAuth = createSecondaryAuth();

  function safeGo(url) {
    try { window.location.href = url; } catch { window.location.assign(url); }
  }

  async function markOnline(profile) {
    // Mantiene tu "sesión activa" y status
    try {
      const deviceId = getDeviceId();
      await updateDoc(userProfileRef(db, profile.uid), {
        activeSessionId: deviceId,
        status: "online",
        lastLogin: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      });

      // directorio público (para listados)
      await setDoc(usersDirectoryDoc(db, profile.uid), {
        uid: profile.uid,
        name: profile.name || "Admin",
        role: profile.role,
        username: profile.username || "",
        jobTitle: profile.jobTitle || [],
        status: "online",
        lastUpdate: new Date().toISOString()
      }, { merge: true });

    } catch (e) {
      console.warn("No se pudo marcar online:", e.message);
    }
  }

  async function initAdmin() {
    try {
      // ✅ Guard: auth + profile + single session + schedule (admin bypass)
      const { user, profile } = await requireAuthAndProfile({
        auth,
        db,
        onLock: (msg) => { alert(msg); safeGo("index.html"); },
        allowAdminBypass: true
      });

      window.currentUser = user;
      window.currentProfile = profile;

      if (profile.role !== "admin") {
        alert("Acceso solo para administradores.");
        await signOut(auth);
        safeGo("index.html");
        return;
      }

      console.log("✅ Admin Loaded:", profile.name || user.email);
      await markOnline(profile);

      // 🔥 NO tocamos tu UI. Si tenés funciones para arrancar tablas:
      // Ej: window.bootAdminUI?.();
      // o loadUsers(); renderDashboard();
      // Llamalas aquí si ya existen:
      if (typeof window.bootAdminUI === "function") {
        window.bootAdminUI();
      }

    } catch (e) {
      console.error("Admin Init Error:", e);
    }
  }

  /**
   * ✅ Create User (compatible con tu proyecto)
   * Podés llamarla desde tu UI:
   * window.createUser({ username, pass, name, role, dni, jobTitle, requireIpApproval, ipUnlockKey, allowedDays, shiftStart, shiftEnd })
   */
  window.createUser = async (payload) => {
    try {
      const {
        username,     // "juan" (sin @)
        email,        // opcional si ya viene completo
        pass,
        name,
        role,
        dni = "",
        jobTitle = [],
        requireIpApproval = false,
        ipUnlockKey = "",
        allowedDays = [],
        shiftStart = "",
        shiftEnd = ""
      } = payload || {};

      if ((!username && !email) || !pass || !name || !role) {
        alert("Faltan datos (username/email, pass, name, role).");
        return;
      }

      // ✅ Normalizar correo
      const finalEmail = (email && email.includes("@"))
        ? email.toLowerCase().trim()
        : `${String(username).toLowerCase().trim()}${DOMAIN_SUFFIX}`;

      // 1) Crear usuario en Auth (secondary)
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, pass);
      const newUid = userCred.user.uid;

      // Importante: cerrar sesión del secondary para no “ensuciar”
      await signOut(secondaryAuth);

      // 2) Perfil con tu schema real (NO schedule:{})
      const deviceId = getDeviceId();
      const profileData = {
        uid: newUid,
        dni,
        name,
        username: (username || finalEmail.split("@")[0]).toLowerCase(),
        email: finalEmail,
        role,
        jobTitle: Array.isArray(jobTitle) ? jobTitle : [jobTitle],

        // Seguridad real de tu flujo:
        requireIpApproval: !!requireIpApproval,
        ipUnlockKey: String(ipUnlockKey || ""),
        authorizedDevices: [],           // se llenará en el primer login autorizado
        activeSessionId: null,
        status: "offline",

        // Horarios reales:
        allowedDays: Array.isArray(allowedDays) ? allowedDays : [],
        shiftStart: String(shiftStart || ""),
        shiftEnd: String(shiftEnd || ""),

        createdAt: serverTimestamp(),
        lastUpdate: new Date().toISOString(),
        isActive: true
      };

      // 3) Guardar perfil
      await setDoc(userProfileRef(db, newUid), profileData, { merge: true });

      // 4) Guardar en directory (docId = uid => fácil para borrar/editar)
      await setDoc(usersDirectoryDoc(db, newUid), {
        uid: newUid,
        dni,
        name,
        username: profileData.username,
        email: finalEmail,
        role,
        jobTitle: profileData.jobTitle,
        status: "offline",
        lastUpdate: new Date().toISOString()
      }, { merge: true });

      alert("✅ Usuario creado exitosamente");
      // Si tu UI tiene refresh:
      if (typeof window.refreshUserTable === "function") window.refreshUserTable();

    } catch (e) {
      console.error(e);
      alert("Error creando usuario: " + (e.message || e));
    }
  };

  // ✅ Logout compatible con tu HTML (onclick="logout()")
  window.logout = async () => {
    if (!confirm("¿Cerrar sesión?")) return;
    await signOut(auth);
    safeGo("index.html");
  };

  // Si tenés botón con id logout-btn también
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", window.logout);

  initAdmin();
</script>
