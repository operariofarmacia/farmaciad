<script type="module">
  import { auth, db, DOMAIN_SUFFIX, getDeviceId } from "./js/core/firebase.js";
  import { userProfileRef, usersDirectoryDoc } from "./js/core/paths.js";
  import { isWithinSchedule } from "./js/core/guards.js";

  import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
  } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

  import {
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion
  } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

  // ====== CONFIG EMERGENCY ADMIN ======
  const EMERGENCY_EMAIL = `admin${DOMAIN_SUFFIX}`;   // admin@mediflow.sys
  const EMERGENCY_PASS_REAL = "admin123";            // password real en Firebase (cambiala luego)

  const $ = (id) => document.getElementById(id);

  function toggleLoading(isLoading) {
    const errDiv = $("error-msg");
    const loadDiv = $("loading-msg");
    const btn = $("btn-login");
    const btnText = $("btn-text");
    const btnIcon = $("btn-icon");
    const btnSpinner = $("btn-spinner");

    if (isLoading) {
      errDiv?.classList.add("hidden");
      loadDiv?.classList.remove("hidden");
      btn.disabled = true;
      if (btnText) btnText.innerText = "VERIFICANDO...";
      btnIcon?.classList.add("hidden");
      btnSpinner?.classList.remove("hidden");
    } else {
      loadDiv?.classList.add("hidden");
      btn.disabled = false;
      if (btnText) btnText.innerText = "INGRESAR";
      btnIcon?.classList.remove("hidden");
      btnSpinner?.classList.add("hidden");
    }
  }

  function showError(msg) {
    const err = $("error-msg");
    if (!err) return alert(msg);
    err.innerText = msg;
    err.classList.remove("hidden");
  }

  function safeNavigate(targetUrl) {
    try { window.location.href = targetUrl; }
    catch { window.location.assign(targetUrl); }
  }

  function roleToPage(role) {
    const map = {
      admin: "admin.html",
      farmacia: "farmacia.html",
      contact_center: "contactcenter.html",
      operaciones: "operaciones.html",
      calidad: "calidad.html",
      logistica: "logistica.html",
      repartidor: "delivery.html"
    };
    return map[role] || null;
  }

  async function ensureAdminDocs(user) {
    const deviceId = getDeviceId();
    const profileRef = userProfileRef(db, user.uid);
    const snap = await getDoc(profileRef);

    if (!snap.exists()) {
      await setDoc(profileRef, {
        uid: user.uid,
        name: "Super Admin",
        role: "admin",
        username: "admin",
        dni: "",
        jobTitle: ["Super Admin"],
        requireIpApproval: false,
        ipUnlockKey: "",
        authorizedDevices: [deviceId],
        activeSessionId: deviceId,
        status: "online",
        lastLogin: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        allowedDays: [],
        shiftStart: "",
        shiftEnd: ""
      }, { merge: true });
    } else {
      await updateDoc(profileRef, {
        role: "admin",
        requireIpApproval: false,
        activeSessionId: deviceId,
        status: "online",
        lastLogin: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        authorizedDevices: arrayUnion(deviceId)
      });
    }

    // Directorio público (para listados)
    await setDoc(usersDirectoryDoc(db, user.uid), {
      uid: user.uid,
      name: "Super Admin",
      role: "admin",
      username: "admin",
      jobTitle: ["Super Admin"],
      status: "online",
      lastUpdate: new Date().toISOString()
    }, { merge: true });
  }

  async function emergencyAdminLogin() {
    try {
      const cred = await signInWithEmailAndPassword(auth, EMERGENCY_EMAIL, EMERGENCY_PASS_REAL);
      await ensureAdminDocs(cred.user);
      safeNavigate("admin.html");
    } catch (e) {
      const created = await createUserWithEmailAndPassword(auth, EMERGENCY_EMAIL, EMERGENCY_PASS_REAL);
      await ensureAdminDocs(created.user);
      safeNavigate("admin.html");
    }
  }

  // ====== LOGIN NORMAL + DEVICE APPROVAL ======
  let pendingUser = null;
  let pendingProfile = null;

  window.verifyDevice = async () => {
    const inputKey = ($("device-key")?.value || "").trim();
    const correctKey = (pendingProfile?.ipUnlockKey || "").trim();
    if (!inputKey || inputKey !== correctKey) return alert("Llave incorrecta.");

    const deviceId = getDeviceId();
    await updateDoc(userProfileRef(db, pendingUser.uid), {
      authorizedDevices: arrayUnion(deviceId)
    });

    await finalizeLogin(pendingUser, pendingProfile);
  };

  window.cancelLogin = async () => {
    await signOut(auth);
    window.location.reload();
  };

  async function finalizeLogin(user, profile) {
    const deviceId = getDeviceId();

    // Horario (admin bypass)
    if (profile.role !== "admin" && !isWithinSchedule(profile)) {
      await signOut(auth);
      throw new Error("Acceso fuera de horario laboral asignado.");
    }

    // Single session (no admin)
    if (profile.role !== "admin" && profile.activeSessionId && profile.activeSessionId !== deviceId) {
      await signOut(auth);
      throw new Error("Sesión iniciada en otro dispositivo.");
    }

    await updateDoc(userProfileRef(db, user.uid), {
      activeSessionId: deviceId,
      status: "online",
      lastLogin: new Date().toISOString(),
      lastUpdate: new Date().toISOString()
    });

    const target = roleToPage(profile.role);
    if (!target) throw new Error("Rol inválido.");
    safeNavigate(target);
  }

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    toggleLoading(true);

    const usernameRaw = (document.getElementById("email").value || "").trim().toLowerCase();
    const passRaw = (document.getElementById("pass").value || "").trim(); // 👈 tu HTML usa pass

    try {
      // Emergency admin (admin/admin)
      if (usernameRaw === "admin" && passRaw === "admin") {
        await emergencyAdminLogin();
        return;
      }

      const email = usernameRaw.includes("@") ? usernameRaw : `${usernameRaw}${DOMAIN_SUFFIX}`;
      const cred = await signInWithEmailAndPassword(auth, email, passRaw);

      const snap = await getDoc(userProfileRef(db, cred.user.uid));
      if (!snap.exists()) throw new Error("Usuario sin perfil asignado.");

      const profile = snap.data();
      const deviceId = getDeviceId();

      // Device approval si aplica
      const requireIpApproval = profile.requireIpApproval === true;
      const authorizedDevices = profile.authorizedDevices || [];

      pendingUser = cred.user;
      pendingProfile = profile;

      if (profile.role !== "admin" && requireIpApproval && !authorizedDevices.includes(deviceId)) {
        document.getElementById("login-card")?.classList.add("hidden");
        document.getElementById("device-modal")?.classList.remove("hidden");
        return;
      }

      await finalizeLogin(cred.user, profile);

    } catch (err) {
      console.error(err);
      try { await signOut(auth); } catch {}
      showError(err.message || "Error de login.");
    } finally {
      toggleLoading(false);
    }
  });
</script>
